import type { WorkReportVerificationStatus } from "@work-report-mcp/contracts";

/** Verificationの3状態をそのまま表示するラベル。状態を作り替えない。 */
export const verificationStatusLabels: Record<WorkReportVerificationStatus, string> = {
  completed: "✓ 確認済み",
  not_completed: "○ 未確認",
  unknown: "? 不明",
};
