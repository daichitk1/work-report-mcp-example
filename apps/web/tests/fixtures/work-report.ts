// Synthetic example data; not an actual work log or repository file inventory.
import type { WorkReport } from "@work-report-mcp/contracts";

/**
 * UI Testで使う最小のWork Report。
 * 必要な範囲だけoverrideして使い、画面ごとの意味が違うfixtureを無理に統合しない。
 */
export const createWorkReportFixture = (overrides: Partial<WorkReport> = {}): WorkReport => ({
  title: "ログイン状態が切れる問題を修正",
  summary: "Cookie設定を変更し、関連する確認を行いました。",
  completedWork: [{ id: "work-1", title: "Cookie設定を変更", description: "属性を調整しました。" }],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
  ...overrides,
});
