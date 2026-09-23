/**
 * このファイルを読む前に（読む順番 7）
 *
 * 役割: HonoでHTTPの入口を作り、認可済みのMCPリクエストをTransportへ渡す。
 * 前: mcp/handle-http-request.tsでHTTPとMCPの接続を確認する。
 * 次: auth/authorization.tsから、OAuthの各部品の判定・検証・組立を順に読む。
 * 理解したいこと: /mcpはRequest Size Limit → OAuth Authorization → handleMcpRequest
 * → MCP Transportの順に通る。途中で拒否した場合は後続へ進めない。
 */
import { healthResponseSchema } from "@work-report-mcp/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import type { WorkReportOAuthRuntime } from "./auth/oauth-http.js";
import {
  createMcpRequestAuthorizer,
  createOAuthRuntimeResolver,
  createProtectedResourceMetadataHandler,
  type McpRequestAuthorizer,
} from "./auth/create-auth-handlers.js";
import { handleMcpRequest } from "./mcp/handle-http-request.js";
import {
  consoleSecurityEventLogger,
  emitSecurityEvent,
  type SecurityEventLogger,
} from "./logging/security-event.js";

export const MCP_SERVICE_NAME = "work-report-mcp";
// MCPメッセージを含むHTTP本文全体の上限。Tool入力だけの64 KiB上限とは対象が違う。
export const MAX_MCP_HTTP_REQUEST_BYTES = 256 * 1024;

// テストでは認可やloggerを差し替えられる。指定のない通常起動ではOAuth検証を組み立てる。
type CreateAppOptions = {
  oauthRuntime?: WorkReportOAuthRuntime;
  mcpRequestAuthorizer?: McpRequestAuthorizer;
  securityEventLogger?: SecurityEventLogger;
};

/**
 * * healthはpublicのまま維持し、MCP endpointだけをOAuth Resource Serverとして保護する。
 *
 * このmoduleはHTTP routingだけを担当し、OAuth判断は`auth/create-auth-handlers.ts`、
 * MCP transportは`mcp/handle-http-request.ts`へ委譲する。
 */
export const createApp = (options: CreateAppOptions = {}) => {
  // HonoはURLとHTTPメソッドに処理を割り当てるWebフレームワーク。
  // このアプリを作る段階と、開発サーバーやVercelがHTTPを受け付ける段階は別。
  const app = new Hono();
  const securityEventLogger = options.securityEventLogger ?? consoleSecurityEventLogger;
  const resolveOAuthRuntime = createOAuthRuntimeResolver(options.oauthRuntime);
  const authorizeRequest =
    options.mcpRequestAuthorizer ??
    createMcpRequestAuthorizer(resolveOAuthRuntime, securityEventLogger);
  const metadataHandler = createProtectedResourceMetadataHandler(
    resolveOAuthRuntime,
    securityEventLogger,
  );

  // app.getはGETへの応答を登録する。ここではClientへ認可サーバー等を知らせる。
  // Metadataはログイン処理やToken発行ではない。両パスで同じ情報を返す。
  app.get("/.well-known/oauth-protected-resource", metadataHandler);
  app.get("/.well-known/oauth-protected-resource/mcp", metadataHandler);

  // app.useは後続のルート処理の前に通すmiddlewareを登録する。
  // /mcpの本文が大きすぎる場合は413を返し、OAuthやTransportへ進ませない。
  app.use(
    "/mcp",
    bodyLimit({
      maxSize: MAX_MCP_HTTP_REQUEST_BYTES,
      onError: (context) => {
        emitSecurityEvent(securityEventLogger, {
          event: "mcp.request_too_large",
          result: "rejected",
          route: "/mcp",
        });
        return context.json({ error: "payload_too_large" }, 413);
      },
    }),
  );

  // app.allは全HTTPメソッドを受ける。許可するMCPの通信方法はTransport側が判断する。
  // ContextはHonoのRequest/Response操作用の窓口で、req.rawはWeb標準のRequest。
  app.all("/mcp", async (context) => {
    // Responseがあれば拒否、undefinedなら通過。この判定をMCP処理より先に行う。
    const authResponse = await authorizeRequest(context.req.raw);
    if (authResponse) return authResponse;
    return handleMcpRequest(context.req.raw, securityEventLogger);
  });

  // 稼働確認用の公開Endpoint。OAuthの成功やAuth0との接続成功までは示さない。
  app.get("/health", (context) =>
    context.json(
      healthResponseSchema.parse({
        status: "ok",
        service: MCP_SERVICE_NAME,
        timestamp: new Date().toISOString(),
      }),
      200,
    ),
  );

  // app.notFoundは登録していないURLへの応答。内部構造を含めず404を返す。
  app.notFound((context) => context.json({ error: "not_found" }, 404));

  // app.onErrorは処理中の未処理例外の受け皿。例外本文やstackを応答へ流さない。
  app.onError((_error, context) => {
    emitSecurityEvent(securityEventLogger, {
      event: "runtime.unhandled_error",
      result: "error",
      route: "api",
    });
    return context.json({ error: "internal_error" }, 500);
  });

  return app;
};
