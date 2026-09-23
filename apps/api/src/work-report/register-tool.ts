/**
 * このファイルを読む前に（読む順番 4）
 *
 * 役割: Tool Definition + Tool HandlerをMCP Serverへ登録する接続部分。
 * 前: tool-definition.tsは「何のToolか」、handle-tool-call.tsは「実行時に何をするか」。
 * 次: ../mcp/server.tsがこの登録関数を呼び、UI Resourceとともに公開する。
 * 理解したいこと: 定義・実処理・登録を分けると、公開内容と検証処理を別々に読める。
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { noopSecurityEventLogger, type SecurityEventLogger } from "../logging/security-event.js";
import { SHOW_WORK_REPORT_TOOL_NAME, showWorkReportToolConfig } from "./tool-definition.js";
import { handleShowWorkReport } from "./handle-tool-call.js";

export type RegisterShowWorkReportToolOptions = {
  // Server側で選んだloggerをHandlerまで渡す。登録層自身は検査やログ出力をしない。
  securityEventLogger?: SecurityEventLogger;
};

/** Tool定義とRuntime handlerをMCP Serverへ接続するだけの責務。 */
export const registerShowWorkReportTool = (
  server: McpServer,
  options: RegisterShowWorkReportToolOptions = {},
): void => {
  const securityEventLogger = options.securityEventLogger ?? noopSecurityEventLogger;

  // 名前・公開設定・実行用callbackをSDKへ登録する。この時点ではToolを実行しない。
  // Clientがこの名前のToolを呼ぶと、SDKがcallbackへ入力を渡し、その結果を応答する。
  server.registerTool(SHOW_WORK_REPORT_TOOL_NAME, showWorkReportToolConfig, (input) =>
    handleShowWorkReport(input, securityEventLogger),
  );
};
