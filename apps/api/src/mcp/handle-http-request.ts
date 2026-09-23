/**
 * このファイルを読む前に（読む順番 6）
 *
 * 役割: HTTP Request → MCP Transport → MCP Serverという通信経路を接続する。
 * 前: server.tsで公開するToolとUI Resourceを組み立てる。
 * 次: ../app.tsで、サイズ制限とOAuthを通過したRequestがここへ届く流れを読む。
 * 理解したいこと: TransportはHTTP上のMCPメッセージの受信・応答を扱う通信部品。
 * ServerはToolやResourceを処理する部品であり、Transportとは別の役割を持つ。
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createMcpServer } from "./server.js";
import type { SecurityEventLogger } from "../logging/security-event.js";

/**
 * Stateless Streamable HTTPとしてMCPを公開する。
 * sessionIdGeneratorを渡さないことでsessionを持たず、Requestごとに新しいServerを使う。
 */
export const handleMcpRequest = async (
  request: Request,
  securityEventLogger: SecurityEventLogger,
): Promise<Response> => {
  const server = createMcpServer({ securityEventLogger });
  // Web標準のRequest / Responseを使うStreamable HTTP実装。
  // Hono固有のContextを渡さずに、SDKへHTTP上のMCP通信を任せられる。
  const transport = new WebStandardStreamableHTTPServerTransport({});

  // ServerとTransportのメッセージ処理を結び付け、通信できる状態にする。
  // この呼び出し自体は、引数のHTTP Requestを処理するものではない。
  await server.connect(transport);

  // 今回のRequestを実際に処理し、Tool実行等によるHTTP Responseを返す。
  return transport.handleRequest(request);
};
