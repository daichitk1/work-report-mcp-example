/**
 * このテストを読む前に（読む順番 13）
 * 種類: componentテスト
 * 対応する実装: apps/web/src/mcp-app/view/RemainingWorkSection.tsx・SuggestedActionsSection.tsx
 *
 * 残作業と次の操作を表示し、データにあるpromptだけをcallbackへ渡すことを確認する。
 * 存在しない操作ボタンを生成したり、次の依頼文を書き換えたりする退行を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";
import { createWorkReportFixture } from "../fixtures/work-report";

const suggestedPrompt = "今回の変更をPR説明用にまとめて";
const remainingPrompt = "セッション期限の設計方針を整理して";

const report = (): WorkReport =>
  createWorkReportFixture({
    title: "ログイン状態が切れる問題を修正",
    summary: "Cookie設定を変更し、次の作業候補を整理しました。",
    completedWork: [],
    remainingWork: [
      {
        id: "remaining-action",
        description: "セッション期限の設計を見直す",
        action: {
          label: "設計方針を整理",
          prompt: remainingPrompt,
        },
      },
      {
        id: "remaining-display-only",
        description: "ステージング環境の設定を確認する",
      },
    ],
    suggestedActions: [
      {
        id: "suggested-pr",
        label: "PR用にまとめる",
        prompt: suggestedPrompt,
      },
    ],
  });

describe("WorkReportView next actions", () => {
  it("shows suggested actions and sends the exact prompt", () => {
    const onSendMessage = vi.fn();
    render(<WorkReportView onSendMessage={onSendMessage} report={report()} />);

    const section = within(screen.getByRole("region", { name: "次にできること" }));
    const action = section.getByRole("button", { name: "PR用にまとめる" });

    fireEvent.click(action);

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith(suggestedPrompt);
  });

  it("shows remaining work and sends its action prompt without rewriting it", () => {
    const onSendMessage = vi.fn();
    render(<WorkReportView onSendMessage={onSendMessage} report={report()} />);

    const section = within(screen.getByRole("region", { name: "残っていること" }));
    expect(section.getByText("セッション期限の設計を見直す")).toBeInTheDocument();
    expect(section.getByText("ステージング環境の設定を確認する")).toBeInTheDocument();

    fireEvent.click(section.getByRole("button", { name: "設計方針を整理" }));

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith(remainingPrompt);
  });

  it("does not invent an action for remaining work that has no action data", () => {
    render(<WorkReportView onSendMessage={vi.fn()} report={report()} />);

    const section = within(screen.getByRole("region", { name: "残っていること" }));
    const displayOnlyItem = section.getByText("ステージング環境の設定を確認する");
    const item = displayOnlyItem.closest("li");

    expect(item).not.toBeNull();
    expect(within(item as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render empty next-action sections", () => {
    const emptyReport: WorkReport = {
      ...report(),
      remainingWork: [],
      suggestedActions: [],
    };

    render(<WorkReportView onSendMessage={vi.fn()} report={emptyReport} />);

    expect(screen.queryByRole("region", { name: "残っていること" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "次にできること" })).not.toBeInTheDocument();
  });
});
