/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/auth/create-auth-handlers.ts
 *
 * 設定解決の再利用、設定不足時の503、公開Metadataの条件を保証する。
 * 設定読込の失敗も再利用されることを確認し、設定不足で認証を省略する退行を防ぐ。
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkReportOAuthRuntime } from "../../../src/auth/oauth-http.js";
import {
  createMcpRequestAuthorizer,
  createOAuthRuntimeResolver,
  createProtectedResourceMetadataHandler,
} from "../../../src/auth/create-auth-handlers.js";
import type { SecurityEvent } from "../../../src/logging/security-event.js";

const OAUTH_ENV_KEYS = [
  "WORK_REPORT_AUTH_ISSUER",
  "WORK_REPORT_AUTH_AUDIENCE",
  "WORK_REPORT_MCP_RESOURCE_URL",
  "WORK_REPORT_AUTH_JWKS_URI",
] as const;

const clearOAuthEnv = () => {
  for (const key of OAUTH_ENV_KEYS) vi.stubEnv(key, "");
};

const collectEvents = () => {
  const events: SecurityEvent[] = [];
  return { events, logger: (event: SecurityEvent) => events.push(event) };
};

const fakeRuntime = (): WorkReportOAuthRuntime => ({
  config: {
    issuer: "https://example.auth0.com/",
    audience: "https://example.com/mcp",
    resourceUrl: "https://example.com/mcp",
    jwksUri: "https://example.auth0.com/.well-known/jwks.json",
    resourceMetadataUrl: "https://example.com/.well-known/oauth-protected-resource/mcp",
  },
  verifyAccessToken: async () => ({ scopes: [] }),
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createOAuthRuntimeResolver", () => {
  it("returns the injected runtime without reading the environment", () => {
    const runtime = fakeRuntime();
    const resolve = createOAuthRuntimeResolver(runtime);

    expect(resolve()).toBe(runtime);
  });

  /** 設定が揃わない場合は公開fallbackせず、undefinedのままにする。 */
  it("resolves to undefined when the OAuth configuration is incomplete", () => {
    clearOAuthEnv();
    const resolve = createOAuthRuntimeResolver();

    expect(resolve()).toBeUndefined();
  });

  it("does not retry a failed configuration load on every request", () => {
    clearOAuthEnv();
    const resolve = createOAuthRuntimeResolver();

    expect(resolve()).toBeUndefined();
    expect(resolve()).toBeUndefined();
  });
});

describe("createMcpRequestAuthorizer", () => {
  it("fails closed with 503 and records an unavailable event", async () => {
    const { events, logger } = collectEvents();
    const authorize = createMcpRequestAuthorizer(() => undefined, logger);

    const response = await authorize(new Request("https://example.com/mcp"));

    expect(response?.status).toBe(503);
    expect(events).toEqual([
      { event: "oauth.configuration_unavailable", result: "unavailable", route: "/mcp" },
    ]);
  });
});

describe("createProtectedResourceMetadataHandler", () => {
  it("does not publish metadata while the configuration is unavailable", async () => {
    const { events, logger } = collectEvents();
    const handler = createProtectedResourceMetadataHandler(() => undefined, logger);

    const response = handler();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "auth_unavailable" });
    expect(events).toEqual([
      { event: "oauth.configuration_unavailable", result: "unavailable", route: "/mcp" },
    ]);
  });

  it("publishes metadata that carries no credential once configured", async () => {
    const { events, logger } = collectEvents();
    const handler = createProtectedResourceMetadataHandler(() => fakeRuntime(), logger);

    const metadata: unknown = await handler().json();

    expect(JSON.stringify(metadata)).not.toContain("secret");
    expect(events).toEqual([]);
  });
});
