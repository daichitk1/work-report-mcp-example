/**
 * このテストを読む前に（読む順番 13）
 * 種類: E2Eテスト（ブラウザ内の表示経路）
 * 対応する実装: apps/web/src/mcp-app/main.tsx からWorkReportApp・Hook・Viewまで
 *
 * Playwrightの実ブラウザで画面幅ごとの描画、はみ出し、アクセシビリティ、Sheet操作を確認する。
 * componentテストだけでは見つけにくいレイアウトやfocusの問題を防ぐ。
 * HostはE2E専用のFakeに置き換えるため、実ChatGPT・MCP Server・Auth0を通す全系試験ではない。
 */
// Synthetic example data; not an actual work log or repository file inventory.
import type { WorkReport } from "@work-report-mcp/contracts";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const report: WorkReport = {
  title: "ログイン状態が切れる問題を修正",
  summary: "Cookie設定を変更し、関連する確認を行いました。",
  completedWork: [
    {
      id: "work-1",
      title: "Cookie設定を変更",
      description: "ログイン状態を維持するため、Cookie属性を調整しました。",
      technicalDetail: "SameSite属性を見直しました。",
      files: ["apps/api/src/auth/session.ts"],
    },
  ],
  decisions: [
    {
      id: "decision-1",
      description: "Cookie設定が問題に関係していると判断しました",
      reason: "ログイン状態の維持条件とCookie属性が一致していなかったためです。",
      relatedWorkIds: ["work-1"],
    },
  ],
  verification: [
    {
      id: "verification-1",
      description: "型の不整合がないか確認しました",
      status: "completed",
      result: "問題はありませんでした。",
      relatedWorkIds: ["work-1"],
    },
    {
      id: "verification-2",
      description: "実ブラウザでログイン継続を確認",
      status: "not_completed",
      relatedWorkIds: ["work-1"],
      action: {
        label: "ブラウザで確認",
        prompt: "今回の変更を実ブラウザで確認して",
      },
    },
  ],
  remainingWork: [],
  references: [],
  suggestedActions: [
    {
      id: "action-1",
      label: "ブラウザで確認",
      prompt: "今回の変更を実ブラウザで確認して",
    },
  ],
};

/**
 * Playwright process側でReact componentをSSRせず、実ブラウザ内の本番entrypointを使う。
 *
 * e2e build (`vite --mode e2e`) のときだけmain.tsxがこのHost factoryを読む。
 * Production buildではMODEがproductionなのでtest Hostは利用されない。
 * Tool Result受信以降はWorkReportApp / hooks / WorkReportViewの本番経路をそのまま通す。
 */
const installWorkReportHost = async (page: Page): Promise<void> => {
  await page.addInitScript((initialReport) => {
    type ToolResultHandler = (params: { structuredContent?: unknown }) => void;
    type E2EWindow = Window & {
      __WORK_REPORT_E2E_CREATE_APP__?: () => {
        addEventListener: (event: "toolresult", handler: ToolResultHandler) => void;
        connect: () => Promise<void>;
        openLink: (params: { url: string }) => Promise<{ isError?: boolean }>;
        sendMessage: (message: unknown) => Promise<{ isError?: boolean }>;
      };
    };

    (window as E2EWindow).__WORK_REPORT_E2E_CREATE_APP__ = () => {
      let toolResultHandler: ToolResultHandler | undefined;

      return {
        addEventListener: (_event, handler) => {
          toolResultHandler = handler;
        },
        connect: async () => {
          queueMicrotask(() => {
            toolResultHandler?.({ structuredContent: initialReport });
          });
        },
        openLink: async () => ({}),
        sendMessage: async () => ({}),
      };
    };
  }, report);
};

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
  { name: "compact", width: 320, height: 812 },
]) {
  test(`${viewport.name} renders the real Work Report without overflow or axe violations`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installWorkReportHost(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: report.title })).toBeVisible();
    await expect(page.getByLabel("作業 1件")).toBeVisible();
    await expect(page.getByLabel("確認済み 1件")).toBeVisible();
    await expect(page.getByLabel("未確認 1件")).toBeVisible();

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

test("mobile Bottom Sheet works in a real browser", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await installWorkReportHost(page);
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "作業: Cookie設定を変更" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "項目の詳細" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("ログイン状態を維持するため、Cookie属性を調整しました。");

  const close = page.getByRole("button", { name: "詳細を閉じる" });
  await expect(close).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
