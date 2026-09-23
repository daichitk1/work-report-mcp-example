/**
 * このファイルを読む前に（読む順番 8-4）
 *
 * 役割: OAuthの部品をapp.tsから使える関数へ組み立てるComposition Layer（組立層）。
 * 前: oauth-http.tsのHTTP変換と、authorization.ts / token-verifier.tsの判定を読む。
 * 次: config.tsで、組立に使う環境変数と設定の整合性を確認する。
 * 理解したいこと: createOAuthRuntimeResolverが設定と検証関数を提供し、
 * createMcpRequestAuthorizerとcreateProtectedResourceMetadataHandlerが同じresolverを使う。
 */
import { loadWorkReportOAuthConfig } from "./config.js";
import { createJwtAccessTokenVerifier } from "./token-verifier.js";
import {
  authUnavailableResponse,
  authorizeMcpHttpRequest,
  createProtectedResourceMetadata,
  type WorkReportOAuthRuntime,
} from "./oauth-http.js";
import { emitSecurityEvent, type SecurityEventLogger } from "../logging/security-event.js";

/** `/mcp` を通してよいか判断し、拒否する場合だけResponseを返す。 */
export type McpRequestAuthorizer = (request: Request) => Promise<Response | undefined>;

export type ResolveOAuthRuntime = () => WorkReportOAuthRuntime | undefined;

/**
 * OAuth設定の読み込みを最初のRequestまで遅らせ、結果を再利用する。
 * 設定が揃わない場合は例外にせずundefinedを返し、呼び出し側でfail closedにする。
 */
export const createOAuthRuntimeResolver = (
  provided?: WorkReportOAuthRuntime,
): ResolveOAuthRuntime => {
  let initialized = provided !== undefined;
  let runtime = provided;

  return () => {
    // 成功だけでなく失敗もこのresolver内で再利用する。環境変数の毎回読込を避ける。
    // 設定変更後の再読込には新しいresolver（通常はアプリの再生成）が必要。
    if (initialized) return runtime;
    initialized = true;

    try {
      const config = loadWorkReportOAuthConfig();
      runtime = {
        config,
        verifyAccessToken: createJwtAccessTokenVerifier(config),
      };
    } catch {
      runtime = undefined;
    }

    return runtime;
  };
};

// fail closedは、検証できないとき利用を許可せず閉じる方針。
// 設定ミスで認証を無効化すると、公開していないつもりのMCPが利用可能になってしまう。
const unavailable = (securityEventLogger: SecurityEventLogger): Response => {
  emitSecurityEvent(securityEventLogger, {
    event: "oauth.configuration_unavailable",
    result: "unavailable",
    route: "/mcp",
  });
  return authUnavailableResponse();
};

/**
 * OAuth設定が無いときに公開fallbackせず、fail closedで返す。
 */
export const createMcpRequestAuthorizer = (
  resolveOAuthRuntime: ResolveOAuthRuntime,
  securityEventLogger: SecurityEventLogger,
): McpRequestAuthorizer => {
  return async (request) => {
    // app.tsの/mcpルートから呼ばれる。設定がなければ503でここで止める。
    const runtime = resolveOAuthRuntime();
    if (!runtime) return unavailable(securityEventLogger);

    return authorizeMcpHttpRequest(request, runtime, securityEventLogger);
  };
};

/**
 * Protected Resource Metadataはpublicだが、設定が無い状態では公開しない。
 */
export const createProtectedResourceMetadataHandler = (
  resolveOAuthRuntime: ResolveOAuthRuntime,
  securityEventLogger: SecurityEventLogger,
): (() => Response) => {
  return () => {
    // app.getへ渡すhandler。設定が有効な場合だけ、認証先の公開情報を返す。
    const runtime = resolveOAuthRuntime();
    if (!runtime) return unavailable(securityEventLogger);

    return Response.json(createProtectedResourceMetadata(runtime.config));
  };
};
