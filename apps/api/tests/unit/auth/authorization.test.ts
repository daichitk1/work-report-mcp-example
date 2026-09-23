/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/auth/authorization.ts
 *
 * Bearer形式・検証失敗・必要scopeの有無から、認可の判定理由が決まることを保証する。
 * 検証関数を差し替え、JWTの暗号処理と認可方針を分離する。HTTPのstatusは別テストで確認する。
 */
import { describe, expect, it } from "vitest";

import { authorizeMcpAccess } from "../../../src/auth/authorization.js";
import type { AccessTokenVerifier } from "../../../src/auth/token-verifier.js";

const verifier =
  (scopes: string[]): AccessTokenVerifier =>
  async () => ({ scopes });

describe("authorization decision", () => {
  it("authorizes only when the required scope is present", async () => {
    await expect(
      authorizeMcpAccess("Bearer valid-token", verifier(["openid", "work-report:show"])),
    ).resolves.toEqual({ type: "authorized" });
  });

  it.each([null, "", "Basic abc", "Bearer", "Bearer token with spaces"])(
    "treats a missing or malformed Bearer header as missing token: %s",
    async (header) => {
      await expect(authorizeMcpAccess(header, verifier(["work-report:show"]))).resolves.toEqual({
        type: "missing_token",
      });
    },
  );

  it("returns invalid_token when verification fails without exposing the verifier error", async () => {
    const verify: AccessTokenVerifier = async () => {
      throw new Error("secret verifier details");
    };

    await expect(authorizeMcpAccess("Bearer secret-token-value", verify)).resolves.toEqual({
      type: "invalid_token",
    });
  });

  it("returns insufficient_scope without identity or HTTP details", async () => {
    await expect(
      authorizeMcpAccess("Bearer valid-token", verifier(["openid", "profile"])),
    ).resolves.toEqual({ type: "insufficient_scope" });
  });
});
