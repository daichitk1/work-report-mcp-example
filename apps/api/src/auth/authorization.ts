/**
 * このファイルを読む前に（読む順番 8-1）
 *
 * 役割: /mcpを利用してよいかを、HTTP応答の形式とは切り離して判断する。
 * 前: ../app.tsはMCP処理へ進む前に認可を要求する。
 * 次: token-verifier.tsで、ここへ渡されるToken検証関数の実装を読む。
 * 理解したいこと: Authorization Header → Bearer Token取得 → Token検証 → scope確認
 * → authorizedまたは拒否理由、という順序。結果はoauth-http.tsがHTTP応答に変換する。
 */
import type { AccessTokenVerifier } from "./token-verifier.js";

// このAPIの利用に必要な権限名。署名の正しいTokenでも、このscopeがなければ拒否する。
export const WORK_REPORT_REQUIRED_SCOPE = "work-report:show";

// 判定理由をtypeで区別するunion型。HTTPのstatusやTokenの実値は持たせず、
// oauth-http.tsが判定結果を401/403等へ変換できる最小限の情報だけを返す。
export type AuthorizationDecision =
  | { type: "authorized" }
  | { type: "missing_token" }
  | { type: "invalid_token" }
  | { type: "insufficient_scope" };

// この実装が受け付けるBearer形式だけを取り出す。形式違いもmissing_tokenとして扱う。
const getBearerToken = (authorizationHeader: string | null): string | undefined => {
  if (!authorizationHeader) return undefined;
  return authorizationHeader.match(/^Bearer ([^\s]+)$/u)?.[1];
};

/**
 * oauth-http.tsから呼ばれる認可判定。検証関数を引数にすることで、
 * JWTの暗号処理と「どのscopeが必要か」という方針を分けて確認できる。
 * 未検証のJWT本文からscopeを読み取って許可すると、偽造した値を信用してしまう。
 */
export const authorizeMcpAccess = async (
  authorizationHeader: string | null,
  verifyAccessToken: AccessTokenVerifier,
): Promise<AuthorizationDecision> => {
  const token = getBearerToken(authorizationHeader);
  if (!token) return { type: "missing_token" };

  let verifiedToken;
  try {
    verifiedToken = await verifyAccessToken(token);
  } catch {
    // 検証失敗の詳細を外へ渡さず、すべてinvalid_tokenへまとめる。
    return { type: "invalid_token" };
  }

  if (!verifiedToken.scopes.includes(WORK_REPORT_REQUIRED_SCOPE)) {
    return { type: "insufficient_scope" };
  }

  return { type: "authorized" };
};
