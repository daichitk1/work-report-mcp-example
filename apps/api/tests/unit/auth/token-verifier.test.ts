/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/auth/token-verifier.ts
 *
 * 署名・issuer・audience・期限・利用開始時刻と、scopeだけを後段へ渡す境界を確認する。
 * ローカルで生成した鍵とJWTを使う。実Auth0へのログイン試験ではなく、不正Tokenの受理を防ぐ。
 */
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { describe, expect, it } from "vitest";

import type { WorkReportOAuthConfig } from "../../../src/auth/config.js";
import { createJwtAccessTokenVerifier } from "../../../src/auth/token-verifier.js";

const config = (): WorkReportOAuthConfig => ({
  issuer: "https://example.auth0.com/",
  audience: "https://work-report.example.com/mcp",
  resourceUrl: "https://work-report.example.com/mcp",
  jwksUri: "https://example.auth0.com/.well-known/jwks.json",
  resourceMetadataUrl: "https://work-report.example.com/.well-known/oauth-protected-resource/mcp",
});

const createSignedTokenFixture = async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = (await exportJWK(publicKey)) as JWK;
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  jwk.use = "sig";

  const getKey = createLocalJWKSet({ keys: [jwk] });

  const sign = async (
    options: {
      issuer?: string;
      audience?: string;
      expiresAt?: number;
      notBefore?: number;
      scope?: string;
      includeExpiration?: boolean;
    } = {},
  ) => {
    const now = Math.floor(Date.now() / 1000);
    let builder = new SignJWT(
      options.scope === undefined ? { scope: "work-report:show" } : { scope: options.scope },
    )
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(options.issuer ?? config().issuer)
      .setAudience(options.audience ?? config().audience)
      .setIssuedAt(now);

    if (options.includeExpiration !== false) {
      builder = builder.setExpirationTime(options.expiresAt ?? now + 300);
    }
    if (options.notBefore !== undefined) {
      builder = builder.setNotBefore(options.notBefore);
    }

    return builder.sign(privateKey);
  };

  return { getKey, sign };
};

describe("access token verifier", () => {
  it("returns only scopes for a valid access token", async () => {
    const { getKey, sign } = await createSignedTokenFixture();
    const verify = createJwtAccessTokenVerifier(config(), getKey);

    await expect(verify(await sign({ scope: "openid work-report:show profile" }))).resolves.toEqual(
      {
        scopes: ["openid", "work-report:show", "profile"],
      },
    );
  });

  it("returns no identity claims downstream", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = (await exportJWK(publicKey)) as JWK;
    jwk.kid = "identity-key";
    jwk.alg = "RS256";
    jwk.use = "sig";
    const verify = createJwtAccessTokenVerifier(config(), createLocalJWKSet({ keys: [jwk] }));

    const token = await new SignJWT({
      scope: "work-report:show",
      email: "private@example.com",
      name: "Private User",
    })
      .setProtectedHeader({ alg: "RS256", kid: "identity-key" })
      .setIssuer(config().issuer)
      .setAudience(config().audience)
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(verify(token)).resolves.toEqual({ scopes: ["work-report:show"] });
  });

  it("rejects wrong issuer, wrong audience, expired, and not-yet-valid tokens", async () => {
    const { getKey, sign } = await createSignedTokenFixture();
    const verify = createJwtAccessTokenVerifier(config(), getKey);
    const now = Math.floor(Date.now() / 1000);

    await expect(verify(await sign({ issuer: "https://wrong.example.com/" }))).rejects.toThrow();
    await expect(
      verify(await sign({ audience: "https://wrong.example.com/mcp" })),
    ).rejects.toThrow();
    await expect(verify(await sign({ expiresAt: now - 60 }))).rejects.toThrow();
    await expect(verify(await sign({ notBefore: now + 600 }))).rejects.toThrow();
  });

  it("rejects a correctly signed token that has no expiration claim", async () => {
    const { getKey, sign } = await createSignedTokenFixture();
    const verify = createJwtAccessTokenVerifier(config(), getKey);

    await expect(verify(await sign({ includeExpiration: false }))).rejects.toThrow();
  });

  it("rejects a token signed by an unknown key", async () => {
    const { getKey } = await createSignedTokenFixture();
    const verify = createJwtAccessTokenVerifier(config(), getKey);
    const { privateKey } = await generateKeyPair("RS256");

    const token = await new SignJWT({ scope: "work-report:show" })
      .setProtectedHeader({ alg: "RS256", kid: "unknown-key" })
      .setIssuer(config().issuer)
      .setAudience(config().audience)
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(verify(token)).rejects.toThrow();
  });

  it("normalizes a missing or non-string scope to an empty list", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = (await exportJWK(publicKey)) as JWK;
    jwk.kid = "scope-key";
    jwk.alg = "RS256";
    jwk.use = "sig";
    const verify = createJwtAccessTokenVerifier(config(), createLocalJWKSet({ keys: [jwk] }));

    const token = await new SignJWT({ scope: ["work-report:show"] })
      .setProtectedHeader({ alg: "RS256", kid: "scope-key" })
      .setIssuer(config().issuer)
      .setAudience(config().audience)
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(verify(token)).resolves.toEqual({ scopes: [] });
  });
});
