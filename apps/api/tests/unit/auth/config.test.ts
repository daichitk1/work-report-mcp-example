/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/auth/config.ts
 *
 * 必須環境変数、HTTPS URLの条件、audienceとresourceの一致、JWKS設定を確認する。
 * 合成した設定で試し、宛先違いや不正URLを有効なOAuth設定として扱うことを防ぐ。
 */
import { describe, expect, it } from "vitest";

import { loadWorkReportOAuthConfig, type WorkReportOAuthConfig } from "../../../src/auth/config.js";

const expectedConfig = (): WorkReportOAuthConfig => ({
  issuer: "https://example.auth0.com/",
  audience: "https://work-report.example.com/mcp",
  resourceUrl: "https://work-report.example.com/mcp",
  jwksUri: "https://example.auth0.com/.well-known/jwks.json",
  resourceMetadataUrl: "https://work-report.example.com/.well-known/oauth-protected-resource/mcp",
});

describe("OAuth configuration", () => {
  it("loads and normalizes the public Resource Server configuration", () => {
    expect(
      loadWorkReportOAuthConfig({
        WORK_REPORT_AUTH_ISSUER: "https://example.auth0.com",
        WORK_REPORT_AUTH_AUDIENCE: "https://work-report.example.com/mcp",
        WORK_REPORT_MCP_RESOURCE_URL: "https://work-report.example.com/mcp",
      }),
    ).toEqual(expectedConfig());
  });

  it("allows an explicit HTTPS JWKS URL", () => {
    expect(
      loadWorkReportOAuthConfig({
        WORK_REPORT_AUTH_ISSUER: "https://example.auth0.com/",
        WORK_REPORT_AUTH_AUDIENCE: "https://work-report.example.com/mcp",
        WORK_REPORT_MCP_RESOURCE_URL: "https://work-report.example.com/mcp",
        WORK_REPORT_AUTH_JWKS_URI: "https://keys.example.com/jwks.json",
      }).jwksUri,
    ).toBe("https://keys.example.com/jwks.json");
  });

  it.each([
    {},
    {
      WORK_REPORT_AUTH_ISSUER: "http://example.auth0.com/",
      WORK_REPORT_AUTH_AUDIENCE: "https://work-report.example.com/mcp",
      WORK_REPORT_MCP_RESOURCE_URL: "https://work-report.example.com/mcp",
    },
    {
      WORK_REPORT_AUTH_ISSUER: "https://example.auth0.com/",
      WORK_REPORT_AUTH_AUDIENCE: "https://another.example.com/mcp",
      WORK_REPORT_MCP_RESOURCE_URL: "https://work-report.example.com/mcp",
    },
    {
      WORK_REPORT_AUTH_ISSUER: "https://example.auth0.com/",
      WORK_REPORT_AUTH_AUDIENCE: "https://work-report.example.com/mcp",
      WORK_REPORT_MCP_RESOURCE_URL: "https://work-report.example.com/not-mcp",
    },
    {
      WORK_REPORT_AUTH_ISSUER: "https://example.auth0.com/",
      WORK_REPORT_AUTH_AUDIENCE: "https://work-report.example.com/mcp",
      WORK_REPORT_MCP_RESOURCE_URL: "https://work-report.example.com/mcp",
      WORK_REPORT_AUTH_JWKS_URI: "http://keys.example.com/jwks.json",
    },
  ])("fails closed for invalid configuration", (env) => {
    expect(() => loadWorkReportOAuthConfig(env)).toThrow("OAuth configuration is unavailable");
  });
});
