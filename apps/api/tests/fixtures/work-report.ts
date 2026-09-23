// Synthetic example data; not an actual work log or repository file inventory.
import { WORK_REPORT_LIMITS, type WorkReport } from "@work-report-mcp/contracts";

/**
 * Schema上妥当な最小のWork Report。
 * 必要な範囲だけoverrideして使う。Security用とUI用を1つへ統合しない。
 */
export const createWorkReportFixture = (overrides: Partial<WorkReport> = {}): WorkReport => ({
  title: "認証処理を修正",
  summary: "認証処理の問題を修正しました。",
  completedWork: [
    {
      id: "work-1",
      title: "認証処理を変更",
      description: "認証情報の扱いを見直しました。",
      technicalDetail: "Authorization headerの生成処理を変更しました。",
      files: ["src/auth/session.ts"],
    },
  ],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
  ...overrides,
});

/**
 * Schema上の意味上限は満たすが、64 KiB payload上限は超えるWork Report。
 * 2つの上限は役割が違い、どちらも他方を代替しない。
 */
export const createOversizedWorkReportFixture = (): WorkReport =>
  createWorkReportFixture({
    completedWork: Array.from({ length: WORK_REPORT_LIMITS.completedWork }, (_, index) => ({
      id: `work-${index}`,
      title: "作業",
      description: "説明",
      technicalDetail: "a".repeat(WORK_REPORT_LIMITS.technicalDetail),
    })),
  });
