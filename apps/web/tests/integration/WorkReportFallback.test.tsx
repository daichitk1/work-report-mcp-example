/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/web/src/mcp-app/WorkReportApp.tsx・state/useWorkReportHost.ts・view/
 *
 * 不正データ受信後のFallbackと、受信前・空配列の表示を区別する。
 * 未受信をエラー扱いしたり、ない項目を推測して画面に足したりする不具合を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkReportApp } from "../../src/mcp-app/WorkReportApp";
import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";
import { createFakeWorkReportHost } from "../helpers/work-report-host";

const emptyReport = (): WorkReport => ({
  title: "空状態を確認",
  summary: "存在する情報だけを表示します。",
  completedWork: [],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
});

describe("WorkReport fallback and empty state", () => {
  it("shows an explicit fallback after an invalid Work Report arrives", async () => {
    const fake = createFakeWorkReportHost();

    render(<WorkReportApp createApp={() => fake.app} />);
    fake.emitToolResult({
      structuredContent: {
        title: "不正なデータ",
        summary: "",
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Work Reportを表示できませんでした");
    expect(screen.queryByText("不正なデータ")).not.toBeInTheDocument();
  });

  it("does not show the fallback before the first Tool Result arrives", () => {
    const fake = createFakeWorkReportHost();

    render(<WorkReportApp createApp={() => fake.app} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not invent sections or nodes from empty collections", () => {
    render(<WorkReportView report={emptyReport()} />);

    expect(screen.queryByRole("group", { name: "AIによる判断" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "やったこと" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "確認したこと" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "参考情報" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "残っていること" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "次にできること" })).not.toBeInTheDocument();
  });
});
