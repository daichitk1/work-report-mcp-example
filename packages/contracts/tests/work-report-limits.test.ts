/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: packages/contracts/src/work-report.ts
 *
 * 文字数・件数の上限ちょうどを許し、超過は切り詰めず拒否することを保証する。
 * Tool入力のバイト上限とは別の、レポートとしての情報量の境界を確認する。
 */
import { describe, expect, it } from "vitest";

import { WORK_REPORT_LIMITS, workReportSchema, type WorkReport } from "../src/index.js";

const baseReport = (overrides: Partial<WorkReport> = {}): WorkReport => ({
  title: "ログイン状態が切れる問題を修正",
  summary: "Cookie設定を変更し、関連する確認を行いました。",
  completedWork: [],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
  ...overrides,
});

const text = (length: number): string => "あ".repeat(length);

const workItems = (count: number): WorkReport["completedWork"] =>
  Array.from({ length: count }, (_, index) => ({
    id: `work-${index}`,
    title: "作業",
    description: "説明",
  }));

const references = (count: number): WorkReport["references"] =>
  Array.from({ length: count }, (_, index) => ({
    id: `reference-${index}`,
    title: "参考",
    url: `https://example.com/${index}`,
  }));

const suggestedActions = (count: number): WorkReport["suggestedActions"] =>
  Array.from({ length: count }, (_, index) => ({
    id: `action-${index}`,
    label: "次の依頼",
    prompt: "続きをお願いします",
  }));

describe("Work Report semantic limits", () => {
  it("accepts a field at its maximum length", () => {
    const parsed = workReportSchema.safeParse(
      baseReport({ title: text(WORK_REPORT_LIMITS.title) }),
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects a field one character over its maximum length", () => {
    const parsed = workReportSchema.safeParse(
      baseReport({ title: text(WORK_REPORT_LIMITS.title + 1) }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("applies a maximum length to summary as well", () => {
    expect(
      workReportSchema.safeParse(baseReport({ summary: text(WORK_REPORT_LIMITS.summary) })).success,
    ).toBe(true);
    expect(
      workReportSchema.safeParse(baseReport({ summary: text(WORK_REPORT_LIMITS.summary + 1) }))
        .success,
    ).toBe(false);
  });

  it("accepts a collection at its maximum count", () => {
    const parsed = workReportSchema.safeParse(
      baseReport({ completedWork: workItems(WORK_REPORT_LIMITS.completedWork) }),
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects a collection one item over its maximum count", () => {
    const parsed = workReportSchema.safeParse(
      baseReport({ completedWork: workItems(WORK_REPORT_LIMITS.completedWork + 1) }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["completedWork"]);
  });

  it("limits references and suggestedActions counts", () => {
    expect(
      workReportSchema.safeParse(
        baseReport({ references: references(WORK_REPORT_LIMITS.references + 1) }),
      ).success,
    ).toBe(false);
    expect(
      workReportSchema.safeParse(
        baseReport({ suggestedActions: suggestedActions(WORK_REPORT_LIMITS.suggestedActions + 1) }),
      ).success,
    ).toBe(false);
  });

  it("limits nested item text as well", () => {
    const parsed = workReportSchema.safeParse(
      baseReport({
        completedWork: [
          {
            id: "work-1",
            title: "作業",
            description: text(WORK_REPORT_LIMITS.description + 1),
          },
        ],
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["completedWork", 0, "description"]);
  });

  /** 上限超過はrejectする。Serverがtruncateして通すことはしない。 */
  it("never truncates an over-limit value into a successful parse", () => {
    const parsed = workReportSchema.safeParse(
      baseReport({ title: text(WORK_REPORT_LIMITS.title + 50) }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.data).toBeUndefined();
  });

  it("keeps every limit positive and declared", () => {
    for (const [name, limit] of Object.entries(WORK_REPORT_LIMITS)) {
      expect(limit, name).toBeGreaterThan(0);
    }
  });
});
