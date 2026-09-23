/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: packages/contracts/src/work-report.ts
 *
 * 必須項目・確認状態・IDの一意性・relatedWorkIdsの参照先を保証する。
 * 判断や確認が別の作業を指す、空配列や省略項目から情報を勝手に補う、といった不具合を防ぐ。
 */
import { describe, expect, it } from "vitest";

import { workReportSchema, type WorkReport } from "../src/index.js";

const canonicalReport = (): WorkReport => ({
  title: "ログイン状態が切れる問題を修正",
  summary: "Cookie設定を変更し、関連する確認を行いました。",
  completedWork: [
    {
      id: "work-1",
      title: "Cookie設定を変更",
      description: "ログイン状態を維持するため、Cookie属性を調整しました。",
      technicalDetail: "SameSite属性を調整しました",
      files: ["src/auth/cookie.ts"],
    },
    {
      id: "work-2",
      title: "型定義を修正",
      description: "変更に合わせて型定義を更新しました。",
    },
  ],
  decisions: [
    {
      id: "decision-1",
      description: "Cookie設定が問題に関係していると判断しました",
      reason: "ログアウトの発生条件がCookieの有効期限と一致していたためです。",
      relatedWorkIds: ["work-1"],
    },
  ],
  verification: [
    {
      id: "verification-1",
      description: "型の不整合がないか確認しました",
      status: "completed",
      result: "問題なし",
      relatedWorkIds: ["work-1", "work-2"],
    },
    {
      id: "verification-2",
      description: "実ブラウザ確認",
      status: "not_completed",
      relatedWorkIds: ["work-1"],
      action: {
        label: "ブラウザで確認",
        prompt: "今回の変更を実ブラウザで確認して",
      },
    },
    {
      id: "verification-3",
      description: "他環境での再現確認",
      status: "unknown",
    },
  ],
  remainingWork: [
    {
      id: "remaining-1",
      description: "セッション期限の設計を見直す",
      action: {
        label: "残りを整理する",
        prompt: "セッション期限の設計方針を整理して",
      },
    },
  ],
  references: [
    {
      id: "reference-1",
      title: "Set-Cookie - HTTP | MDN",
      url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Set-Cookie",
      reason: "SameSite属性の既定値を確認するため",
    },
  ],
  suggestedActions: [
    {
      id: "suggested-1",
      label: "PR用にまとめる",
      prompt: "今回の変更をPR説明用にまとめて",
    },
  ],
});

const emptyReport = (): WorkReport => ({
  title: "調査結果を整理",
  summary: "調査した内容を整理しました。",
  completedWork: [],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
});

describe("workReportSchema", () => {
  it("accepts the canonical Work Report data model", () => {
    const report = canonicalReport();

    expect(workReportSchema.parse(report)).toEqual(report);
  });

  it("requires title and summary text", () => {
    expect(workReportSchema.safeParse({ ...emptyReport(), title: "" }).success).toBe(false);
    expect(workReportSchema.safeParse({ ...emptyReport(), summary: "" }).success).toBe(false);
  });

  it("accepts only the three verification states", () => {
    for (const status of ["completed", "not_completed", "unknown"] as const) {
      const report = emptyReport();
      report.verification = [{ id: "verification-1", description: "確認", status }];

      expect(workReportSchema.safeParse(report).success).toBe(true);
    }

    const report = emptyReport();
    report.verification = [
      { id: "verification-1", description: "確認", status: "passed" as never },
    ];

    expect(workReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects duplicated item ids inside one collection", () => {
    const report = emptyReport();
    report.completedWork = [
      { id: "work-1", title: "作業A", description: "説明A" },
      { id: "work-1", title: "作業B", description: "説明B" },
    ];

    const result = workReportSchema.safeParse(report);

    expect(result.success).toBe(false);
  });

  it("rejects an item id reused across collections", () => {
    const report = emptyReport();
    report.completedWork = [{ id: "item-1", title: "作業A", description: "説明A" }];
    report.verification = [{ id: "item-1", description: "確認", status: "completed" }];

    const result = workReportSchema.safeParse(report);

    expect(result.success).toBe(false);
  });

  it("accepts relatedWorkIds that point at existing completedWork items", () => {
    const report = emptyReport();
    report.completedWork = [{ id: "work-1", title: "作業A", description: "説明A" }];
    report.decisions = [{ id: "decision-1", description: "判断", relatedWorkIds: ["work-1"] }];
    report.verification = [
      {
        id: "verification-1",
        description: "確認",
        status: "completed",
        relatedWorkIds: ["work-1"],
      },
    ];

    expect(workReportSchema.safeParse(report).success).toBe(true);
  });

  it("rejects relatedWorkIds that point at unknown ids", () => {
    const report = emptyReport();
    report.completedWork = [{ id: "work-1", title: "作業A", description: "説明A" }];
    report.decisions = [{ id: "decision-1", description: "判断", relatedWorkIds: ["work-404"] }];

    expect(workReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects relatedWorkIds that point at non completedWork items", () => {
    const report = emptyReport();
    report.completedWork = [{ id: "work-1", title: "作業A", description: "説明A" }];
    report.decisions = [{ id: "decision-1", description: "判断" }];
    report.verification = [
      {
        id: "verification-1",
        description: "確認",
        status: "completed",
        relatedWorkIds: ["decision-1"],
      },
    ];

    expect(workReportSchema.safeParse(report).success).toBe(false);
  });

  it("validates reference url as a url", () => {
    const report = emptyReport();
    report.references = [
      {
        id: "reference-1",
        title: "MDN",
        url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Set-Cookie",
      },
    ];

    expect(workReportSchema.safeParse(report).success).toBe(true);

    report.references = [{ id: "reference-1", title: "MDN", url: "参考にしたページ" }];

    expect(workReportSchema.safeParse(report).success).toBe(false);
  });

  it("validates the action structure used to continue the next request", () => {
    const withAction = (action: unknown): WorkReport => {
      const report = emptyReport();
      report.remainingWork = [
        { id: "remaining-1", description: "残作業", action: action as never },
      ];
      return report;
    };

    expect(
      workReportSchema.safeParse(withAction({ label: "続きを依頼", prompt: "残りを進めて" }))
        .success,
    ).toBe(true);
    expect(workReportSchema.safeParse(withAction({ label: "続きを依頼" })).success).toBe(false);
    expect(
      workReportSchema.safeParse(withAction({ label: "", prompt: "残りを進めて" })).success,
    ).toBe(false);
    expect(
      workReportSchema.safeParse(withAction({ label: "続きを依頼", prompt: "" })).success,
    ).toBe(false);
  });

  it("requires label and prompt for suggestedActions", () => {
    const report = emptyReport();
    report.suggestedActions = [{ id: "suggested-1", label: "PR用にまとめる", prompt: "" as never }];

    expect(workReportSchema.safeParse(report).success).toBe(false);
  });

  it("accepts empty collections and does not complete missing information", () => {
    const report = emptyReport();

    const parsed = workReportSchema.parse(report);

    expect(parsed).toEqual(report);
    expect(parsed.completedWork).toEqual([]);
    expect(parsed.references).toEqual([]);
  });

  it("does not add optional fields that the report did not provide", () => {
    const report = emptyReport();
    report.completedWork = [{ id: "work-1", title: "作業A", description: "説明A" }];

    const parsed = workReportSchema.parse(report);

    expect(parsed.completedWork[0]).not.toHaveProperty("technicalDetail");
    expect(parsed.completedWork[0]).not.toHaveProperty("files");
  });

  it("requires every collection to be present", () => {
    const { references: _references, ...withoutReferences } = emptyReport();

    expect(workReportSchema.safeParse(withoutReferences).success).toBe(false);
  });
});
