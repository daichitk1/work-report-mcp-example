/**
 * このファイルを読む前に（読む順番 5の補足）
 *
 * 役割: apps/webでビルドしたHTMLを、MCP Apps用のUI Resourceとして配信する。
 * 前: ../mcp/server.tsはToolとこのResourceを同じServerへ登録する。
 * 次: ../mcp/handle-http-request.tsで、Resource取得も通るTransportの接続を確認する。
 * 理解したいこと: Toolの_meta.ui.resourceUriと登録URIが一致することで、
 * Hostは対応するUIを取得できる。HTMLと個別のWork Reportは別々に渡される。
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { WORK_REPORT_UI_RESOURCE_URI } from "./tool-definition.js";

// MCP Apps specification 2026-01-26: HTML UI ResourceのMIME type。
export const WORK_REPORT_UI_RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

export const WORK_REPORT_UI_RESOURCE_NAME = "work_report_ui";

const BUNDLED_UI_HTML_URL = new URL("../../../web/dist/index.html", import.meta.url);

/**
 * Bundled MCP Apps UIのpath。deploy先でbundleの位置が変わる場合は
 * `WORK_REPORT_UI_HTML_PATH` で上書きする。
 */
export const resolveWorkReportUiHtmlPath = (): string =>
  process.env.WORK_REPORT_UI_HTML_PATH ?? fileURLToPath(BUNDLED_UI_HTML_URL);

export const readWorkReportUiHtml = async (): Promise<string> =>
  readFile(resolveWorkReportUiHtmlPath(), "utf8");

/**
 * Tool Resultを表示するMCP Apps UIをResourceとして公開する。
 * Server側ではHTMLを生成せず、buildされたbundleをそのまま返す。
 */
export const registerWorkReportUiResource = (server: McpServer): void => {
  server.registerResource(
    WORK_REPORT_UI_RESOURCE_NAME,
    WORK_REPORT_UI_RESOURCE_URI,
    {
      title: "Work Report UI",
      description: "show_work_reportのTool Resultを表示するMCP Apps UI。",
      mimeType: WORK_REPORT_UI_RESOURCE_MIME_TYPE,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: WORK_REPORT_UI_RESOURCE_MIME_TYPE,
          text: await readWorkReportUiHtml(),
        },
      ],
    }),
  );
};
