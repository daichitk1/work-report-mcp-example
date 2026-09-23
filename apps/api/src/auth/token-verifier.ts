/**
 * このファイルを読む前に（読む順番 8-2）
 *
 * 役割: Auth0のAccess Tokenをjoseで検証し、認可判定に使うscopeだけを返す。
 * 前: authorization.tsは「検証済みTokenに必要scopeがあるか」を判断する。
 * 次: oauth-http.tsで、検証を含む判定結果がHTTP応答になる過程を読む。
 * 理解したいこと: JWTは署名付きのデータだが、受信した文字列を読むだけでは信用できない。
 * 改ざんされていないか、正しい発行者・宛先か、期限内かをServer側で検証する必要がある。
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

import type { WorkReportOAuthConfig } from "./config.js";

// 検証済みJWTの全payloadを広めず、authorization.tsに必要な権限一覧だけを渡す。
export type VerifiedAccessToken = {
  scopes: string[];
};

// 成功するとscopeを返し、検証失敗はPromiseのrejectで知らせる関数の型。
export type AccessTokenVerifier = (token: string) => Promise<VerifiedAccessToken>;

// scopeは許可された操作の名前を空白区切りで並べたclaim（JWT本文の項目）。
// 無い場合や文字列でない場合は権限なしにし、後段の認可で拒否できるようにする。
const resolveScopes = (scope: unknown): string[] => {
  if (typeof scope !== "string") return [];
  return scope.split(/\s+/u).filter(Boolean);
};

/**
 * create-auth-handlers.tsが設定から検証関数を作り、リクエスト間で再利用する。
 * JWKSは署名検証用の公開鍵セット。createRemoteJWKSetは設定URLから鍵を取得する。
 * Token自身が指定する任意のURLから鍵を取得する設計ではない。
 * テストではgetKeyにローカルの公開鍵セットを渡し、実Auth0への通信を分離している。
 */
export const createJwtAccessTokenVerifier = (
  config: WorkReportOAuthConfig,
  getKey: JWTVerifyGetKey = createRemoteJWKSet(new URL(config.jwksUri)),
): AccessTokenVerifier => {
  return async (token) => {
    // jwtVerifyは署名とclaimの条件を検証する。JWTをデコードするだけの処理とは異なる。
    const { payload } = await jwtVerify(token, getKey, {
      // issuer（iss）: 想定する発行者であるAuth0のURLか。
      issuer: config.issuer,
      // audience（aud）: このMCP API向けのTokenか。他のAPI宛てを受け入れない。
      audience: config.audience,
      // algorithm（alg）: 許可する署名方式をRS256に限定する。
      algorithms: ["RS256"],
      // expは有効期限。期限切れを検証するだけでなく、このclaim自体も必須にする。
      // nbf（利用開始時刻）がある場合もjoseが検証し、開始前の利用を拒否する。
      requiredClaims: ["exp"],
    });

    return { scopes: resolveScopes(payload.scope) };
  };
};
