import { createApp } from "@work-report-mcp/api";

/**
 * Remote MCP ServerのVercel Function entrypoint。
 *
 * Vercelは Web標準の `fetch` export をそのまま実行するため、
 * `apps/api` の `createApp()` が返すHono appを公開する以外の処理を持たせない。
 * routingとhandlerの正本は `apps/api/src/app.ts` のまま変えない。
 */
export default createApp();
