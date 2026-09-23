/**
 * このテストを読む前に（読む順番 13）
 * 種類: componentテスト
 * 対応する実装: apps/web/src/mcp-app/view/DetailPanel.tsx と state/useWorkReportSelection.ts
 *
 * 技術詳細・変更ファイル・判断理由を必要時に展開し、情報がなければ操作を出さないことを確認する。
 * 最初から細部を並べ過ぎる表示や、ない任意項目を補う退行を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";
import { createWorkReportFixture } from "../fixtures/work-report";

const workButtonName = "作業: Cookie設定を変更";
const decisionButtonName = "判断: Cookie設定が問題に関係していると判断しました";
const technicalDetail = "SameSite属性を調整しました";
const decisionReason = "ログアウト条件がCookie期限と一致したためです。";
const fileName = "src/auth/cookie.ts";

const report = (): WorkReport =>
  createWorkReportFixture({
    title: "ログイン状態が切れる問題を修正",
    summary: "Cookie設定を変更し、関連する確認を行いました。",
    completedWork: [
      {
        id: "work-1",
        title: "Cookie設定を変更",
        description: "ログイン状態を維持するため、Cookie属性を調整しました。",
        technicalDetail,
        files: [fileName],
      },
    ],
    decisions: [
      {
        id: "decision-1",
        description: "Cookie設定が問題に関係していると判断しました",
        reason: decisionReason,
        relatedWorkIds: ["work-1"],
      },
    ],
  });

const getDetail = () => screen.getByRole("region", { name: "項目の詳細" });

const selectItem = (name: string) => {
  fireEvent.click(screen.getByRole("button", { name }));
};

describe("WorkReportView Progressive Disclosure", () => {
  it("reveals technical detail before weaker file information", () => {
    render(<WorkReportView report={report()} />);

    selectItem(workButtonName);
    const detail = getDetail();
    const detailQueries = within(detail);

    expect(detailQueries.queryByText(technicalDetail)).not.toBeInTheDocument();
    expect(detailQueries.queryByText(fileName)).not.toBeInTheDocument();

    fireEvent.click(detailQueries.getByRole("button", { name: "技術詳細を見る" }));
    expect(detailQueries.getByText(technicalDetail)).toBeInTheDocument();
    expect(detailQueries.queryByText(fileName)).not.toBeInTheDocument();

    fireEvent.click(detailQueries.getByRole("button", { name: "変更ファイルを見る" }));
    expect(detailQueries.getByText(fileName)).toBeInTheDocument();
  });

  it("reveals the AI decision reason only when requested", () => {
    render(<WorkReportView report={report()} />);

    selectItem(decisionButtonName);
    const detail = getDetail();
    const detailQueries = within(detail);

    expect(
      detailQueries.getByRole("heading", {
        level: 3,
        name: "AIによる判断",
      }),
    ).toBeInTheDocument();
    expect(detailQueries.queryByText(decisionReason)).not.toBeInTheDocument();

    fireEvent.click(detailQueries.getByRole("button", { name: "判断理由を見る" }));

    expect(detailQueries.getByText(decisionReason)).toBeInTheDocument();
    expect(
      detailQueries.getByRole("heading", {
        level: 3,
        name: "AIによる判断",
      }),
    ).toBeInTheDocument();
  });

  it("does not invent controls when optional detail is absent", () => {
    const plainReport: WorkReport = {
      ...report(),
      completedWork: [
        {
          id: "work-plain",
          title: "設定を変更",
          description: "設定値を更新しました。",
        },
      ],
      decisions: [
        {
          id: "decision-plain",
          description: "設定変更が必要だと判断しました",
          relatedWorkIds: ["work-plain"],
        },
      ],
    };

    render(<WorkReportView report={plainReport} />);

    selectItem("作業: 設定を変更");
    let detailQueries = within(getDetail());

    const technicalButton = detailQueries.queryByRole("button", { name: "技術詳細を見る" });
    const filesButton = detailQueries.queryByRole("button", { name: "変更ファイルを見る" });

    expect(technicalButton).not.toBeInTheDocument();
    expect(filesButton).not.toBeInTheDocument();

    selectItem("判断: 設定変更が必要だと判断しました");
    detailQueries = within(getDetail());

    const reasonButton = detailQueries.queryByRole("button", { name: "判断理由を見る" });
    expect(reasonButton).not.toBeInTheDocument();
  });
});
