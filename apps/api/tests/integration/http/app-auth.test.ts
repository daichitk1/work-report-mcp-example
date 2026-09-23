/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/api/src/app.ts と auth/create-auth-handlers.ts・oauth-http.ts
 *
 * HTTPルートとOAuthを組み合わせ、Metadata公開・未認証の拒否・公開healthを確認する。
 * 個々の認可関数が正しくても、/mcpへの接続を忘れて認証なしで通す不具合を防ぐ。
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../../src/app.js";

const originalEnv = {
  issuer: process.env.WORK_REPORT_AUTH_ISSUER,
  audience: process.env.WORK_REPORT_AUTH_AUDIENCE,
  resource: process.env.WORK_REPORT_MCP_RESOURCE_URL,
};

beforeEach(() => {
  process.env.WORK_REPORT_AUTH_ISSUER = "https://example.auth0.com/";
  process.env.WORK_REPORT_AUTH_AUDIENCE = "https://work-report.example.com/mcp";
  process.env.WORK_REPORT_MCP_RESOURCE_URL = "https://work-report.example.com/mcp";
});

afterEach(() => {
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  restore("WORK_REPORT_AUTH_ISSUER", originalEnv.issuer);
  restore("WORK_REPORT_AUTH_AUDIENCE", originalEnv.audience);
  restore("WORK_REPORT_MCP_RESOURCE_URL", originalEnv.resource);
});

const metadataPaths = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
];

const expectedChallenge = [
  'Bearer resource_metadata="https://work-report.example.com/.well-known/oauth-protected-resource/mcp",',
  'scope="work-report:show"',
].join(" ");

describe("Remote MCP OAuth boundary", () => {
  it.each(metadataPaths)("publishes protected resource metadata at %s", async (path) => {
    const response = await createApp().request(path);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      resource: "https://work-report.example.com/mcp",
      authorization_servers: ["https://example.auth0.com/"],
      scopes_supported: ["work-report:show"],
    });
  });

  it("rejects an unauthenticated MCP request with an OAuth discovery challenge", async () => {
    const response = await createApp().request("/mcp", {
      headers: { accept: "application/json, text/event-stream" },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(expectedChallenge);
  });

  it("keeps the health endpoint public and generic", async () => {
    const response = await createApp().request("/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("www-authenticate")).toBeNull();
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", service: "work-report-mcp" });
    expect(body).not.toHaveProperty("user");
    expect(body).not.toHaveProperty("token");
  });
});
