/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/api/src/app.ts・auth/・logging/security-event.ts
 *
 * HTTPサイズ上限、認可失敗、設定不足、未処理例外と安全なイベント出力を確認する。
 * loggerが失敗してもアクセスを許可せず、拒否したTokenや内部エラーの詳細を漏らさない境界を守る。
 */
import type { WorkReportOAuthRuntime } from "../../../src/auth/oauth-http.js";
import type { SecurityEvent } from "../../../src/logging/security-event.js";
import { describe, expect, it } from "vitest";

import { createApp, MAX_MCP_HTTP_REQUEST_BYTES } from "../../../src/app.js";

const oauthRuntime = (
  verifyAccessToken: WorkReportOAuthRuntime["verifyAccessToken"] = async () => ({
    scopes: ["work-report:show"],
  }),
): WorkReportOAuthRuntime => ({
  config: {
    issuer: "https://example.auth0.com/",
    audience: "https://work-report.example.com/mcp",
    resourceUrl: "https://work-report.example.com/mcp",
    jwksUri: "https://example.auth0.com/.well-known/jwks.json",
    resourceMetadataUrl: "https://work-report.example.com/.well-known/oauth-protected-resource/mcp",
  },
  verifyAccessToken,
});

describe("runtime security boundary", () => {
  it("records an allowlisted event for an unauthenticated MCP request", async () => {
    const events: SecurityEvent[] = [];
    const app = createApp({
      oauthRuntime: oauthRuntime(),
      securityEventLogger: (event) => events.push(event),
    });

    const response = await app.request("/mcp", {
      headers: { accept: "application/json, text/event-stream" },
    });

    expect(response.status).toBe(401);
    expect(events).toEqual([
      {
        event: "oauth.missing_token",
        result: "rejected",
        route: "/mcp",
      },
    ]);
  });

  it("rejects an oversized MCP HTTP request before the transport", async () => {
    const events: SecurityEvent[] = [];
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { payload: "a".repeat(MAX_MCP_HTTP_REQUEST_BYTES + 1024) },
    });

    const response = await createApp({
      mcpRequestAuthorizer: async () => undefined,
      securityEventLogger: (event) => events.push(event),
    }).request("/mcp", {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "content-length": String(new TextEncoder().encode(body).byteLength),
      },
      body,
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "payload_too_large" });
    expect(events).toEqual([
      {
        event: "mcp.request_too_large",
        result: "rejected",
        route: "/mcp",
      },
    ]);
  });

  it("records an allowlisted authorization event for insufficient scope", async () => {
    const events: SecurityEvent[] = [];
    const app = createApp({
      oauthRuntime: oauthRuntime(async () => ({ scopes: ["openid", "profile"] })),
      securityEventLogger: (event) => events.push(event),
    });

    const response = await app.request("/mcp", {
      headers: {
        accept: "application/json, text/event-stream",
        authorization: "Bearer valid-token",
      },
    });

    expect(response.status).toBe(403);
    expect(events).toEqual([
      {
        event: "oauth.insufficient_scope",
        result: "rejected",
        route: "/mcp",
      },
    ]);
  });

  it("does not put a rejected bearer token or verifier error into security events", async () => {
    const events: SecurityEvent[] = [];
    const secretToken = "secret-token-value";
    const app = createApp({
      oauthRuntime: oauthRuntime(async () => {
        throw new Error(`invalid token: ${secretToken}`);
      }),
      securityEventLogger: (event) => events.push(event),
    });

    const response = await app.request("/mcp", {
      headers: {
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${secretToken}`,
      },
    });

    expect(response.status).toBe(401);
    expect(events).toEqual([
      {
        event: "oauth.invalid_token",
        result: "rejected",
        route: "/mcp",
      },
    ]);
    expect(JSON.stringify(events)).not.toContain(secretToken);
  });

  it("does not fail open when the security logger throws", async () => {
    const response = await createApp({
      oauthRuntime: oauthRuntime(),
      securityEventLogger: () => {
        throw new Error("logger unavailable");
      },
    }).request("/mcp", {
      headers: { accept: "application/json, text/event-stream" },
    });

    expect(response.status).toBe(401);
  });

  it("records OAuth configuration failure without exposing environment values", async () => {
    const keys = [
      "WORK_REPORT_AUTH_ISSUER",
      "WORK_REPORT_AUTH_AUDIENCE",
      "WORK_REPORT_MCP_RESOURCE_URL",
    ] as const;
    const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    keys.forEach((key) => delete process.env[key]);

    try {
      const events: SecurityEvent[] = [];
      const response = await createApp({
        securityEventLogger: (event) => events.push(event),
      }).request("/mcp");

      expect(response.status).toBe(503);
      expect(events).toEqual([
        {
          event: "oauth.configuration_unavailable",
          result: "unavailable",
          route: "/mcp",
        },
      ]);
    } finally {
      for (const key of keys) {
        const value = original[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("records an allowlisted event for an unhandled runtime error", async () => {
    const events: SecurityEvent[] = [];
    const response = await createApp({
      mcpRequestAuthorizer: async () => {
        throw new Error("private runtime detail");
      },
      securityEventLogger: (event) => events.push(event),
    }).request("/mcp");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "internal_error" });
    expect(events).toEqual([
      {
        event: "runtime.unhandled_error",
        result: "error",
        route: "api",
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("private runtime detail");
  });
});
