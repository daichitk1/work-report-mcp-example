/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/web/src/mcp-app/WorkReportApp.tsx と state/useWorkReportHost.ts
 *
 * Fake HostからのTool結果がHookを通って表示され、受信前はレポートを作らないことを保証する。
 * 個別部品のテストでは見落とす、イベント受信からReact描画への接続漏れを防ぐ。
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkReportApp } from "../../src/mcp-app/WorkReportApp";
import { createWorkReportFixture } from "../fixtures/work-report";
import { createFakeWorkReportHost } from "../helpers/work-report-host";

const report = createWorkReportFixture;

describe("WorkReportApp", () => {
  it("shows the Work Report that the first tool result carried", async () => {
    const fake = createFakeWorkReportHost();

    render(<WorkReportApp createApp={() => fake.app} />);
    fake.emitToolResult({ structuredContent: report() });

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "ログイン状態が切れる問題を修正",
    );
  });

  it("shows no Work Report before the first tool result arrives", () => {
    const fake = createFakeWorkReportHost();

    render(<WorkReportApp createApp={() => fake.app} />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
