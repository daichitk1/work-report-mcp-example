/**
 * このテストを読む前に（読む順番 13）
 * 種類: componentテスト
 * 対応する実装: apps/web/src/mcp-app/view/DetailPanel.tsx
 *
 * 未確認の項目にactionがある場合の送信と、確認済みでは操作を出さないことを確認する。
 * 確認状態を無視した操作の提示を防ぐ。callbackへの送信を検査し、実Hostは呼ばない。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";
import { createWorkReportFixture } from "../fixtures/work-report";

const prompt = "今回の変更を実ブラウザで確認して";

const report = (): WorkReport =>
  createWorkReportFixture({
    title: "ログイン状態が切れる問題を修正",
    summary: "Cookie設定を変更し、確認状況を整理しました。",
    completedWork: [],
    verification: [
      {
        id: "verification-pending",
        description: "実ブラウザ確認",
        status: "not_completed",
        action: {
          label: "ブラウザで確認",
          prompt,
        },
      },
      {
        id: "verification-completed",
        description: "型チェック",
        status: "completed",
        action: {
          label: "型を再確認",
          prompt: "型チェックをもう一度実行して",
        },
      },
    ],
  });

describe("WorkReportView Verification Action", () => {
  it("sends the exact prompt from an action-bearing unverified verification", () => {
    const onSendMessage = vi.fn();
    render(<WorkReportView onSendMessage={onSendMessage} report={report()} />);

    fireEvent.click(screen.getByRole("button", { name: "確認: 実ブラウザ確認" }));

    const detail = within(screen.getByRole("region", { name: "項目の詳細" }));
    const action = detail.getByRole("button", { name: "ブラウザで確認" });
    fireEvent.click(action);

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith(prompt);
  });

  it("does not expose a verification action for a completed verification", () => {
    const onSendMessage = vi.fn();
    render(<WorkReportView onSendMessage={onSendMessage} report={report()} />);

    fireEvent.click(screen.getByRole("button", { name: "確認: 型チェック" }));

    const detail = within(screen.getByRole("region", { name: "項目の詳細" }));
    expect(detail.queryByRole("button", { name: "型を再確認" })).not.toBeInTheDocument();
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
