/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/web/src/mcp-app/host/work-report-host.ts
 *
 * 接続前のtoolresult購読と、structuredContentを加工せず渡すことを保証する。
 * Fake Hostを使って初回結果の取りこぼしや欠損値の隠蔽を防ぐ。実ChatGPTとの接続試験ではない。
 */
import { describe, expect, it, vi } from "vitest";

import { connectWorkReportApp } from "../../src/mcp-app/host/work-report-host";
import { createFakeWorkReportHost } from "../helpers/work-report-host";

describe("connectWorkReportApp", () => {
  it("listens for the first tool result before connecting to the host", async () => {
    const fake = createFakeWorkReportHost();

    await connectWorkReportApp({ createApp: () => fake.app, onToolResult: () => {} });

    expect(fake.events).toEqual(["listen:toolresult", "connect"]);
  });

  it("passes the tool result to the view without changing it", async () => {
    const fake = createFakeWorkReportHost();
    const onToolResult = vi.fn();
    const structuredContent = {
      title: "ログイン状態が切れる問題を修正",
      summary: "Cookie設定を変更しました。",
      completedWork: [],
      decisions: [],
      verification: [],
      remainingWork: [],
      references: [],
      suggestedActions: [],
    };

    await connectWorkReportApp({ createApp: () => fake.app, onToolResult });
    fake.emitToolResult({ structuredContent });

    expect(onToolResult).toHaveBeenCalledTimes(1);
    expect(onToolResult.mock.calls[0]?.[0]).toBe(structuredContent);
  });

  it("reports a tool result that carries no Work Report as missing", async () => {
    const fake = createFakeWorkReportHost();
    const onToolResult = vi.fn();

    await connectWorkReportApp({ createApp: () => fake.app, onToolResult });
    fake.emitToolResult({ isError: true });

    expect(onToolResult).toHaveBeenCalledWith(undefined);
  });
});
