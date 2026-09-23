/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/auth/oauth-http.ts
 *
 * 判定結果からHTTP status・WWW-Authenticate・Metadataへの変換を保証する。
 * 認可成功を拒否したり、Tokenの実値を拒否応答へ含めたりする不具合を防ぐ。
 */
import { describe, expect, it } from "vitest";

import type { AuthorizationDecision } from "../../../src/auth/authorization.js";
import type { WorkReportOAuthConfig } from "../../../src/auth/config.js";
import {
  authorizationDecisionToResponse,
  authorizeMcpHttpRequest,
  createProtectedResourceMetadata,
} from "../../../src/auth/oauth-http.js";

const config = (): WorkReportOAuthConfig => ({
  issuer: "https://example.auth0.com/",
  audience: "https://work-report.example.com/mcp",
  resourceUrl: "https://work-report.example.com/mcp",
  jwksUri: "https://example.auth0.com/.well-known/jwks.json",
  resourceMetadataUrl: "https://work-report.example.com/.well-known/oauth-protected-resource/mcp",
});

const expectedBaseChallenge = [
  'Bearer resource_metadata="https://work-report.example.com/.well-known/oauth-protected-resource/mcp",',
  'scope="work-report:show"',
].join(" ");

const responseFor = (decision: AuthorizationDecision) =>
  authorizationDecisionToResponse(decision, config());

describe("OAuth HTTP adapter", () => {
  it("publishes the existing Protected Resource Metadata contract", () => {
    expect(createProtectedResourceMetadata(config())).toEqual({
      resource: "https://work-report.example.com/mcp",
      authorization_servers: ["https://example.auth0.com/"],
      scopes_supported: ["work-report:show"],
    });
  });

  it("returns no response for an authorized decision", () => {
    expect(responseFor({ type: "authorized" })).toBeUndefined();
  });

  it("maps missing token to the existing discovery challenge", async () => {
    const response = responseFor({ type: "missing_token" });
    expect(response?.status).toBe(401);
    expect(response?.headers.get("www-authenticate")).toBe(expectedBaseChallenge);
    await expect(response?.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it.each([
    ["invalid_token", 401],
    ["insufficient_scope", 403],
  ] as const)("maps %s to its existing HTTP contract", async (type, status) => {
    const response = responseFor({ type });
    expect(response?.status).toBe(status);
    expect(response?.headers.get("www-authenticate")).toContain(`error="${type}"`);
    expect(response?.headers.get("www-authenticate")).toContain('scope="work-report:show"');
    await expect(response?.json()).resolves.toEqual({ error: type });
  });

  it("does not echo an invalid bearer token in the HTTP response", async () => {
    const secretToken = "secret-token-value";
    const response = await authorizeMcpHttpRequest(
      new Request("https://work-report.example.com/mcp", {
        headers: { Authorization: `Bearer ${secretToken}` },
      }),
      {
        config: config(),
        verifyAccessToken: async () => {
          throw new Error(`bad token: ${secretToken}`);
        },
      },
    );

    expect(response?.status).toBe(401);
    expect(await response?.text()).not.toContain(secretToken);
  });
});
