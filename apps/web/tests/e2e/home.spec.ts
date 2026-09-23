/**
 * このテストを読む前に（読む順番 13）
 * 種類: E2Eテスト
 * 対応する実装: apps/web/src/mcp-app/main.tsx と WorkReportApp.tsx
 *
 * Playwrightの実ブラウザでアプリの入口・画面幅・アクセシビリティを確認する。
 * 読み込みや狭い画面での退行を防ぐ。Tool結果を使う詳細表示の試験はwork-report.spec.tsで読む。
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Product entrypointはWork Report MCP Apps UIであり、Starter health画面ではない。
for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
  { name: "compact", width: 320, height: 812 },
]) {
  test(`${viewport.name} serves the Work Report app shell`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page).toHaveTitle("Work Report");
    await expect(page.locator("#root")).toBeAttached();
    await expect(page.getByText("work-report-mcp-api")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /AI開発/u })).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBe(0);

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
  });
}
