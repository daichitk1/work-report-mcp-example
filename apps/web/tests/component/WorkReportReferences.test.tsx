/**
 * このテストを読む前に（読む順番 13）
 * 種類: componentテスト
 * 対応する実装: apps/web/src/mcp-app/view/ReferencesSection.tsx
 *
 * 参考情報のtitle・任意reasonを表示し、受信したURLだけをcallbackへ渡すことを確認する。
 * 参考情報や参照理由を捏造する表示、元と違うリンク先への依頼を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";
import { createWorkReportFixture } from "../fixtures/work-report";

const referenceUrl = "https://apps.extensions.modelcontextprotocol.io/";

const report = (references: WorkReport["references"]): WorkReport =>
  createWorkReportFixture({
    title: "MCP Appsのリンク表示を追加",
    summary: "参照した情報をWork Reportから確認できるようにします。",
    completedWork: [],
    references,
  });

describe("WorkReportView references", () => {
  it("shows reference title and reason and opens only the supplied URL", () => {
    const onOpenReference = vi.fn();
    const workReport = report([
      {
        id: "reference-1",
        title: "MCP Apps Documentation",
        url: referenceUrl,
        reason: "openLinkの仕様を確認するために参照しました。",
      },
    ]);

    render(<WorkReportView onOpenReference={onOpenReference} report={workReport} />);

    const section = within(screen.getByRole("region", { name: "参考情報" }));

    expect(section.getByText("MCP Apps Documentation")).toBeInTheDocument();
    expect(section.getByText("openLinkの仕様を確認するために参照しました。")).toBeInTheDocument();

    fireEvent.click(section.getByRole("button", { name: "MCP Apps Documentationを開く" }));

    expect(onOpenReference).toHaveBeenCalledTimes(1);
    expect(onOpenReference).toHaveBeenCalledWith(referenceUrl);
  });

  it("does not show a References section when the Tool Result has no references", () => {
    render(<WorkReportView onOpenReference={vi.fn()} report={report([])} />);

    expect(screen.queryByRole("region", { name: "参考情報" })).not.toBeInTheDocument();
  });

  it("does not invent a reason when the reference does not contain one", () => {
    const workReport = report([
      {
        id: "reference-2",
        title: "MCP Apps Specification",
        url: "https://modelcontextprotocol.io/",
      },
    ]);

    render(<WorkReportView onOpenReference={vi.fn()} report={workReport} />);

    const section = within(screen.getByRole("region", { name: "参考情報" }));

    expect(section.getByText("MCP Apps Specification")).toBeInTheDocument();
    expect(section.queryByText("参照目的不明")).not.toBeInTheDocument();
  });
});
