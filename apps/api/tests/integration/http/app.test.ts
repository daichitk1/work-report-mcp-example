/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/api/src/app.ts
 *
 * HonoへRequestを渡し、公開healthと未登録ルートの応答を確認する。
 * 不要なルートの露出や、404に内部情報を含める退行を防ぐ。
 */
import { describe, expect, it } from "vitest";

import { createApp, MCP_SERVICE_NAME } from "../../../src/app.js";

describe("MVP runtime", () => {
  it("answers the health check of the Remote MCP Server", async () => {
    const response = await createApp().request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: MCP_SERVICE_NAME,
    });
  });

  it("does not expose the starter product routes", async () => {
    for (const route of ["/api/health", "/api/starter"]) {
      const response = await createApp().request(route);

      expect(response.status).toBe(404);
    }
  });

  it("does not expose an internal stack for unknown routes", async () => {
    const response = await createApp().request("/unknown");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });
});
