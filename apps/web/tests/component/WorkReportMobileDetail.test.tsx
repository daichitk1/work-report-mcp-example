/**
 * このテストを読む前に（読む順番 13）
 * 種類: componentテスト
 * 対応する実装: apps/web/src/mcp-app/view/WorkReportView.tsx・WorkReportDetailSheet.tsx と state/
 *
 * 画面幅を模擬し、DesktopのPanelとMobileのSheetの切替・開閉・focusを確認する。
 * 狭い画面に横並び詳細を出し続ける不具合や、詳細を閉じた後にfocusを失う問題を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";
import { WORK_REPORT_MOBILE_MEDIA_QUERY } from "../../src/mcp-app/view/styles";

const detailReport = (): WorkReport => ({
  title: "ログイン状態が切れる問題を修正",
  summary: "Cookie設定を変更し、関連する確認を行いました。",
  completedWork: [
    {
      id: "work-1",
      title: "Cookie設定を変更",
      description: "ログイン状態を維持するため、Cookie属性を調整しました。",
      technicalDetail: "pnpm typecheck",
      files: ["apps/api/src/session.ts"],
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
  remainingWork: [],
  references: [],
  suggestedActions: [],
});

/** Viewportの判定だけをstubし、他の描画経路は本番と同じにする。 */
const stubViewport = (isMobile: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === WORK_REPORT_MOBILE_MEDIA_QUERY ? isMobile : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
};

const selectWorkItem = () => {
  const trigger = screen.getByRole("button", { name: "作業: Cookie設定を変更" });
  fireEvent.click(trigger);
  return trigger;
};

describe("WorkReport mobile detail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not place the detail panel beside the flow on a mobile viewport", () => {
    stubViewport(true);

    render(<WorkReportView report={detailReport()} />);

    expect(screen.getByRole("region", { name: "作業フロー" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "項目の詳細" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the Bottom Sheet when a flow item is selected on a mobile viewport", () => {
    stubViewport(true);

    render(<WorkReportView report={detailReport()} />);
    selectWorkItem();

    const sheet = screen.getByRole("dialog", { name: "項目の詳細" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(sheet).toHaveTextContent("ログイン状態を維持するため、Cookie属性を調整しました。");
  });

  it("shows the same detail content as the desktop panel", () => {
    stubViewport(false);
    const desktop = render(<WorkReportView report={detailReport()} />);
    selectWorkItem();
    const desktopDetail = screen.getByRole("region", { name: "項目の詳細" }).textContent ?? "";
    desktop.unmount();

    expect(desktopDetail).not.toBe("");

    stubViewport(true);
    render(<WorkReportView report={detailReport()} />);
    selectWorkItem();

    expect(screen.getByRole("dialog", { name: "項目の詳細" }).textContent).toContain(desktopDetail);
  });

  it("moves focus into the Bottom Sheet and returns it to the selected item on close", () => {
    stubViewport(true);

    render(<WorkReportView report={detailReport()} />);
    const trigger = selectWorkItem();

    const close = screen.getByRole("button", { name: "詳細を閉じる" });
    expect(close).toHaveFocus();

    fireEvent.click(close);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the Bottom Sheet with the Escape key", () => {
    stubViewport(true);

    render(<WorkReportView report={detailReport()} />);
    const trigger = selectWorkItem();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "項目の詳細" }), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps the desktop two column layout when the viewport is not mobile", () => {
    stubViewport(false);

    render(<WorkReportView report={detailReport()} />);
    selectWorkItem();

    expect(screen.getByRole("region", { name: "項目の詳細" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "詳細を閉じる" })).not.toBeInTheDocument();
  });
});
