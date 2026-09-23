/**
 * このテストを読む前に（読む順番 13）
 * 種類: Visual確認用のブラウザテスト
 * 対応する実装: apps/web/src/mcp-app/main.tsx と WorkReportApp.tsx
 *
 * アプリのスクリーンショットを保存し、人が見た目を確認できるようにする。
 * 画像を作るだけで見た目が正しいと判定するものではなく、目視レビュー用の材料を残す。
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

// Product entrypointの見た目を人が確認するための証跡。
test("@visual captures the Work Report app shell for human review", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).toBeAttached();

  const output = path.resolve("test-results/visual");
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, "work-report-app-shell.png"), fullPage: true });
});
