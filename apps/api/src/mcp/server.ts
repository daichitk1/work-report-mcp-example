/**
 * このファイルを読む前に（読む順番 5）
 *
 * 役割: MCP Serverを組み立て、Tool（show_work_report）とResource（Work Report UI）を公開する。
 * 前: ../work-report/register-tool.tsでTool定義とHandlerの接続を確認する。
 * 次: handle-http-request.tsで、このServerをHTTP Transportに接続する。
 * 理解したいこと: ServerはMCPの機能一覧と処理を持ち、HTTP通信はTransportが担当する。
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerShowWorkReportTool } from "../work-report/register-tool.js";
import { registerWorkReportUiResource } from "../work-report/ui-resource.js";
import { noopSecurityEventLogger, type SecurityEventLogger } from "../logging/security-event.js";

// MCPの接続時にClientへ知らせるServer識別情報。HTTPの待受先を指定する値ではない。
export const MCP_SERVER_NAME = "work-report-mcp";
export const MCP_SERVER_VERSION = "0.1.0";

/**
 * show_work_report ToolとMCP Apps UI Resourceだけを公開する
 * Remote MCP Server。RequestごとにServerを作り、Work Reportを保持しない。
 */
type CreateMcpServerOptions = {
  securityEventLogger?: SecurityEventLogger;
};

export const createMcpServer = (options: CreateMcpServerOptions = {}): McpServer => {
  // handleMcpRequestがRequestごとに呼ぶため、レポートを共有するServerを使い回さない。
  // new McpServerだけではHTTPの待受は始まらず、後からTransportを接続する。
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  const securityEventLogger = options.securityEventLogger ?? noopSecurityEventLogger;

  // Toolは入力を検証してstructuredContentを返す。
  registerShowWorkReportTool(server, { securityEventLogger });
  // Resourceはビルド済みHTMLを返す。登録処理は../work-report/ui-resource.tsで読める。
  // HTMLに個別レポートを保存せず、Hostが後からTool ResultをUIへ届ける。
  registerWorkReportUiResource(server);

  return server;
};
