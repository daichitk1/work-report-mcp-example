/**
 * このファイルを読む前に（読む順番 8-3）
 *
 * 役割: OAuthの利用可否の判定をHTTP Responseとログ用イベントへ変換する。
 * 前: authorization.tsが判定を行い、token-verifier.tsがJWTを検証する。
 * 次: create-auth-handlers.tsが設定・検証関数・このHTTP変換を組み立てる。
 * 理解したいこと: missing_token / invalid_tokenは401、insufficient_scopeは403。
 * authorizedはResponseを返さず、app.tsが後続のMCP処理へ進む。
 */
import {
  authorizeMcpAccess,
  WORK_REPORT_REQUIRED_SCOPE,
  type AuthorizationDecision,
} from "./authorization.js";
import type { WorkReportOAuthConfig } from "./config.js";
import type { AccessTokenVerifier } from "./token-verifier.js";
import {
  emitSecurityEvent,
  noopSecurityEventLogger,
  type SecurityEvent,
  type SecurityEventLogger,
} from "../logging/security-event.js";

// HTTPで使う公開設定と、実際のToken検証関数を一組にした実行時の依存部品。
export type WorkReportOAuthRuntime = {
  config: WorkReportOAuthConfig;
  verifyAccessToken: AccessTokenVerifier;
};

// Clientが認可先を発見する公開情報。Tokenやログイン状態を返すEndpointではない。
export const createProtectedResourceMetadata = (config: WorkReportOAuthConfig) => ({
  resource: config.resourceUrl,
  authorization_servers: [config.issuer],
  scopes_supported: [WORK_REPORT_REQUIRED_SCOPE],
});

// WWW-Authenticateで「認可先をどこから調べ、どのscopeを要求するか」をClientへ伝える。
// JSONのエラー本文だけでは、Clientは認可を開始する手掛かりを得られない。
const challengeValue = (
  config: WorkReportOAuthConfig,
  error?: "invalid_token" | "insufficient_scope",
): string => {
  const parts = [
    `Bearer resource_metadata="${config.resourceMetadataUrl}"`,
    `scope="${WORK_REPORT_REQUIRED_SCOPE}"`,
  ];
  if (error) parts.splice(1, 0, `error="${error}"`);
  return parts.join(", ");
};

const jsonAuthError = (
  status: 401 | 403,
  config: WorkReportOAuthConfig,
  error: "invalid_token" | "insufficient_scope",
): Response =>
  Response.json(
    { error },
    {
      status,
      headers: { "WWW-Authenticate": challengeValue(config, error) },
    },
  );

export const unauthorizedDiscoveryResponse = (config: WorkReportOAuthConfig): Response =>
  Response.json(
    { error: "unauthorized" },
    {
      status: 401,
      headers: { "WWW-Authenticate": challengeValue(config) },
    },
  );

/**
 * 認可の成否とHTTPの都合をここで接続する。undefinedは処理を通してよいという合図。
 * Tokenなしはdiscovery用challenge、無効Token・scope不足は理由付きchallengeを返す。
 */
export const authorizationDecisionToResponse = (
  decision: AuthorizationDecision,
  config: WorkReportOAuthConfig,
): Response | undefined => {
  switch (decision.type) {
    case "authorized":
      return undefined;
    case "missing_token":
      return unauthorizedDiscoveryResponse(config);
    case "invalid_token":
      return jsonAuthError(401, config, "invalid_token");
    case "insufficient_scope":
      return jsonAuthError(403, config, "insufficient_scope");
  }
};

// Token本文や検証例外を記録せず、拒否理由の種類だけを監視できる形へ変える。
const securityEventForDecision = (
  decision: Exclude<AuthorizationDecision, { type: "authorized" }>,
): SecurityEvent => {
  switch (decision.type) {
    case "missing_token":
      return { event: "oauth.missing_token", result: "rejected", route: "/mcp" };
    case "invalid_token":
      return { event: "oauth.invalid_token", result: "rejected", route: "/mcp" };
    case "insufficient_scope":
      return { event: "oauth.insufficient_scope", result: "rejected", route: "/mcp" };
  }
};

// createMcpRequestAuthorizerから呼び、Headerを判定層へ渡し、拒否の記録とHTTP変換を行う。
export const authorizeMcpHttpRequest = async (
  request: Request,
  runtime: WorkReportOAuthRuntime,
  securityEventLogger: SecurityEventLogger = noopSecurityEventLogger,
): Promise<Response | undefined> => {
  const decision = await authorizeMcpAccess(
    request.headers.get("authorization"),
    runtime.verifyAccessToken,
  );

  if (decision.type !== "authorized") {
    emitSecurityEvent(securityEventLogger, securityEventForDecision(decision));
  }

  return authorizationDecisionToResponse(decision, runtime.config);
};

// 設定不足は利用者のToken不備とは異なるため503。認証を省略して通過はさせない。
export const authUnavailableResponse = (): Response =>
  Response.json({ error: "auth_unavailable" }, { status: 503 });
