/**
 * このテストを読む前に（読む順番 13）
 * 種類: componentテスト
 * 対応する実装: apps/web/src/mcp-app/view/WorkReportView.tsx と ResultHeader・WorkFlow・DetailPanel
 *
 * 件数、一覧、確認状態、項目選択、relatedWorkIdsの関連表示をDOM上で確認する。
 * 作業実施と確認済みを混同する表示や、元データにない情報を足す退行を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";
import { createWorkReportFixture } from "../fixtures/work-report";

const report = (overrides: Partial<WorkReport> = {}): WorkReport =>
  createWorkReportFixture({
    title: "ログイン状態が切れる問題を修正",
    summary: "Cookie設定を変更し、関連する確認を行いました。",
    completedWork: [
      { id: "work-1", title: "Cookie設定を変更", description: "属性を調整しました。" },
      { id: "work-2", title: "型定義を更新", description: "型を更新しました。" },
    ],
    verification: [
      { id: "verification-1", description: "型チェック", status: "completed" },
      { id: "verification-2", description: "ブラウザ確認", status: "not_completed" },
      { id: "verification-3", description: "他環境確認", status: "unknown" },
    ],
    ...overrides,
  });

describe("WorkReportView Result Header", () => {
  it("shows the result title, summary, and separate work / verification counts", () => {
    render(<WorkReportView report={report()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "ログイン状態が切れる問題を修正" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cookie設定を変更し、関連する確認を行いました。")).toBeInTheDocument();

    expect(screen.getByRole("region", { name: "作業状況" })).toBeInTheDocument();
    expect(screen.getByLabelText("作業 2件")).toBeInTheDocument();
    expect(screen.getByLabelText("確認済み 1件")).toBeInTheDocument();
    expect(screen.getByLabelText("未確認 1件")).toBeInTheDocument();
    expect(screen.getByLabelText("不明 1件")).toBeInTheDocument();
  });

  it("shows zero counts without inventing a successful verification state", () => {
    render(
      <WorkReportView
        report={report({
          completedWork: [],
          verification: [],
        })}
      />,
    );

    expect(screen.getByLabelText("作業 0件")).toBeInTheDocument();
    expect(screen.getByLabelText("確認済み 0件")).toBeInTheDocument();
    expect(screen.getByLabelText("未確認 0件")).toBeInTheDocument();
    expect(screen.getByLabelText("不明 0件")).toBeInTheDocument();
    expect(screen.queryByText("すべて確認済み")).not.toBeInTheDocument();
  });
});

const flowReport = (): WorkReport =>
  report({
    completedWork: [
      {
        id: "work-1",
        title: "Cookie設定を変更",
        description: "ログイン状態を維持するため、Cookie属性を調整しました。",
        technicalDetail: "pnpm typecheck",
        files: ["read_file"],
      },
    ],
    decisions: [
      {
        id: "decision-1",
        description: "Cookie設定が問題に関係していると判断しました",
        relatedWorkIds: ["work-1"],
      },
    ],
    verification: [
      {
        id: "verification-1",
        description: "型の不整合がないか確認しました",
        status: "completed",
        relatedWorkIds: ["work-1"],
      },
    ],
    references: [
      {
        id: "reference-1",
        title: "Set-Cookie - HTTP | MDN",
        url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Set-Cookie",
      },
    ],
  });

describe("WorkReportView Navigation and Work Flow", () => {
  it("shows navigation and the full semantic flow on the initial view", () => {
    render(<WorkReportView report={flowReport()} />);

    const navigation = screen.getByRole("navigation", { name: "Work Report navigation" });
    for (const label of ["概要", "作業", "確認", "参考情報"]) {
      expect(within(navigation).getByText(label)).toBeInTheDocument();
    }

    const flow = screen.getByRole("region", { name: "作業フロー" });
    expect(within(flow).getByRole("group", { name: "AIによる判断" })).toBeInTheDocument();
    expect(within(flow).getByRole("group", { name: "やったこと" })).toBeInTheDocument();
    expect(within(flow).getByRole("group", { name: "確認したこと" })).toBeInTheDocument();

    const decision = "Cookie設定が問題に関係していると判断しました";
    const work = "Cookie設定を変更";
    const verification = "型の不整合がないか確認しました";

    expect(within(flow).getByText(decision)).toBeInTheDocument();
    expect(within(flow).getByText(work)).toBeInTheDocument();
    expect(within(flow).getByText(verification)).toBeInTheDocument();

    const flowText = flow.textContent ?? "";
    expect(flowText.indexOf(decision)).toBeLessThan(flowText.indexOf(work));
    expect(flowText.indexOf(work)).toBeLessThan(flowText.indexOf(verification));
  });

  it("keeps raw-oriented technical details out of the Work Flow", () => {
    render(<WorkReportView report={flowReport()} />);

    expect(screen.queryByText("pnpm typecheck")).not.toBeInTheDocument();
    expect(screen.queryByText("read_file")).not.toBeInTheDocument();
  });

  it("does not create nodes for empty flow kinds", () => {
    render(
      <WorkReportView
        report={report({
          decisions: [],
          verification: [],
        })}
      />,
    );

    const flow = screen.getByRole("region", { name: "作業フロー" });
    expect(within(flow).queryByRole("group", { name: "AIによる判断" })).not.toBeInTheDocument();
    expect(within(flow).getByRole("group", { name: "やったこと" })).toBeInTheDocument();
    expect(within(flow).queryByRole("group", { name: "確認したこと" })).not.toBeInTheDocument();
  });
});

const verificationReport = (): WorkReport =>
  report({
    completedWork: [
      {
        id: "work-1",
        title: "Cookie設定を変更",
        description: "Cookie属性を調整しました。",
      },
    ],
    verification: [
      {
        id: "verification-1",
        description: "Unit Test",
        status: "completed",
        result: "すべて成功",
        relatedWorkIds: ["work-1"],
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
  });

describe("WorkReportView Verification states", () => {
  it("shows completed, not completed, and unknown as different states", () => {
    render(<WorkReportView report={verificationReport()} />);

    const verification = screen.getByRole("group", { name: "確認したこと" });

    expect(within(verification).getByText("Unit Test")).toBeInTheDocument();
    expect(within(verification).getByText("✓ 確認済み")).toBeInTheDocument();

    expect(within(verification).getByText("実ブラウザ確認")).toBeInTheDocument();
    expect(within(verification).getByText("○ 未確認")).toBeInTheDocument();

    expect(within(verification).getByText("他環境での再現確認")).toBeInTheDocument();
    expect(within(verification).getByText("? 不明")).toBeInTheDocument();
  });

  it("shows a verification result only when it exists", () => {
    render(<WorkReportView report={verificationReport()} />);

    const verification = screen.getByRole("group", { name: "確認したこと" });

    expect(within(verification).getByText("すべて成功")).toBeInTheDocument();
    expect(within(verification).queryByText("まだ実施していません")).not.toBeInTheDocument();
  });

  it("keeps completed work and verification as different meanings", () => {
    render(<WorkReportView report={verificationReport()} />);

    const work = screen.getByRole("group", { name: "やったこと" });
    const verification = screen.getByRole("group", { name: "確認したこと" });

    expect(within(work).getByText("Cookie設定を変更")).toBeInTheDocument();
    expect(within(work).queryByText("✓ 確認済み")).not.toBeInTheDocument();
    expect(within(verification).getByText("✓ 確認済み")).toBeInTheDocument();
  });

  it("does not expose a verification action without a selected detail", () => {
    render(<WorkReportView report={verificationReport()} />);

    expect(screen.queryByRole("button", { name: "ブラウザで確認" })).not.toBeInTheDocument();
  });
});

const selectionReport = (): WorkReport =>
  report({
    completedWork: [
      {
        id: "work-1",
        title: "Cookie設定を変更",
        description: "ログイン状態を維持するため、Cookie属性を調整しました。",
        technicalDetail: "SameSite属性を調整しました",
        files: ["src/auth/cookie.ts"],
      },
    ],
    decisions: [
      {
        id: "decision-1",
        description: "Cookie設定が問題に関係していると判断しました",
        reason: "ログアウト条件がCookie期限と一致したためです。",
        relatedWorkIds: ["work-1"],
      },
    ],
    verification: [
      {
        id: "verification-1",
        description: "Unit Test",
        status: "completed",
        result: "すべて成功",
        relatedWorkIds: ["work-1"],
        action: {
          label: "再確認",
          prompt: "Unit Testをもう一度実行して",
        },
      },
    ],
  });

describe("WorkReportView Item Selection and Detail Panel", () => {
  it("selects work, decision, and verification and switches the detail", () => {
    render(<WorkReportView report={selectionReport()} />);

    const detail = screen.getByRole("region", { name: "項目の詳細" });

    fireEvent.click(screen.getByRole("button", { name: "作業: Cookie設定を変更" }));
    expect(
      within(detail).getByRole("heading", { level: 3, name: "Cookie設定を変更" }),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText("ログイン状態を維持するため、Cookie属性を調整しました。"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "判断: Cookie設定が問題に関係していると判断しました",
      }),
    );
    expect(
      within(detail).getByRole("heading", { level: 3, name: "AIによる判断" }),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText("Cookie設定が問題に関係していると判断しました"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "確認: Unit Test" }));
    expect(
      within(detail).getByRole("heading", { level: 3, name: "Unit Test" }),
    ).toBeInTheDocument();
    expect(within(detail).getByText("✓ 確認済み")).toBeInTheDocument();
    expect(within(detail).getByText("すべて成功")).toBeInTheDocument();
  });

  it("shows relations derived from relatedWorkIds", () => {
    render(<WorkReportView report={selectionReport()} />);

    const detail = screen.getByRole("region", { name: "項目の詳細" });

    fireEvent.click(
      screen.getByRole("button", {
        name: "判断: Cookie設定が問題に関係していると判断しました",
      }),
    );
    expect(
      within(within(detail).getByRole("group", { name: "関連する作業" })).getByText(
        "Cookie設定を変更",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "作業: Cookie設定を変更" }));
    expect(
      within(within(detail).getByRole("group", { name: "関連する判断" })).getByText(
        "Cookie設定が問題に関係していると判断しました",
      ),
    ).toBeInTheDocument();
    expect(
      within(within(detail).getByRole("group", { name: "関連する確認" })).getByText("Unit Test"),
    ).toBeInTheDocument();
  });

  it("does not expose later progressive details or actions", () => {
    render(<WorkReportView report={selectionReport()} />);

    const detail = screen.getByRole("region", { name: "項目の詳細" });

    fireEvent.click(screen.getByRole("button", { name: "作業: Cookie設定を変更" }));
    expect(within(detail).queryByText("SameSite属性を調整しました")).not.toBeInTheDocument();
    expect(within(detail).queryByText("src/auth/cookie.ts")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "判断: Cookie設定が問題に関係していると判断しました",
      }),
    );
    expect(
      within(detail).queryByText("ログアウト条件がCookie期限と一致したためです。"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "確認: Unit Test" }));
    expect(within(detail).queryByRole("button", { name: "再確認" })).not.toBeInTheDocument();
  });

  it("keeps the report read-only in the detail panel", () => {
    render(<WorkReportView report={selectionReport()} />);

    fireEvent.click(screen.getByRole("button", { name: "作業: Cookie設定を変更" }));
    const detail = screen.getByRole("region", { name: "項目の詳細" });

    expect(within(detail).queryByRole("textbox")).not.toBeInTheDocument();
    expect(detail.querySelector("[contenteditable='true']")).toBeNull();
  });
});
