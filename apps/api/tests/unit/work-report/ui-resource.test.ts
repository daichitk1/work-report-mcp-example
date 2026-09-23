/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/work-report/ui-resource.ts
 *
 * ビルド済みHTMLの既定pathと、明示設定による上書きを保証する。
 * HTMLの配置を誤って解決する退行を防ぐ。Resource取得そのものはMCP結合テストで確認する。
 */
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { resolveWorkReportUiHtmlPath } from "../../../src/work-report/ui-resource.js";

const originalUiPath = process.env.WORK_REPORT_UI_HTML_PATH;

afterEach(() => {
  if (originalUiPath === undefined) delete process.env.WORK_REPORT_UI_HTML_PATH;
  else process.env.WORK_REPORT_UI_HTML_PATH = originalUiPath;
});

describe("Work Report UI resource location", () => {
  it("resolves the web bundle relative to the API module without an override", () => {
    delete process.env.WORK_REPORT_UI_HTML_PATH;
    const expected = fileURLToPath(new URL("../../../../web/dist/index.html", import.meta.url));

    expect(resolveWorkReportUiHtmlPath()).toBe(expected);
  });

  it("uses the explicitly configured bundle location", () => {
    process.env.WORK_REPORT_UI_HTML_PATH = "/tmp/work-report-fixture.html";

    expect(resolveWorkReportUiHtmlPath()).toBe("/tmp/work-report-fixture.html");
  });
});
