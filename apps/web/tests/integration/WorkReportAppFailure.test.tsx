/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/web/src/mcp-app/WorkReportApp.tsx・state/useWorkReportHost.ts・host/
 *
 * 接続失敗と不正データの区別、再接続、操作失敗時の本文保持と再試行を確認する。
 * Fake HostのrejectとisError応答を使い、失敗を握り潰す・本文を消す・不適切なRetryを出す退行を防ぐ。
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkReportApp } from "../../src/mcp-app/WorkReportApp";
import { createWorkReportFixture } from "../fixtures/work-report";
import {
  createFakeWorkReportHost,
  type FakeWorkReportHostOptions,
} from "../helpers/work-report-host";

const report = () =>
  createWorkReportFixture({
    references: [
      {
        id: "reference-1",
        title: "MCP Apps仕様",
        url: "https://apps.extensions.modelcontextprotocol.io/",
      },
    ],
    suggestedActions: [
      { id: "action-1", label: "実ブラウザで確認して", prompt: "今回の変更を実ブラウザで確認して" },
    ],
  });

/** Host接続失敗をblank screenにせず、invalidと区別する。 */
describe("WorkReportApp host connection failure", () => {
  it("shows a connection failure notice instead of a blank screen when connect rejects", async () => {
    const fake = createFakeWorkReportHost({
      connect: async () => Promise.reject(new Error("host down")),
    });

    render(<WorkReportApp createApp={() => fake.app} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("ChatGPTとつながりませんでした");
  });

  it("separates a connection failure from an invalid tool result", async () => {
    const fake = createFakeWorkReportHost();

    render(<WorkReportApp createApp={() => fake.app} />);
    fake.emitToolResult({ structuredContent: { title: "壊れたWork Report" } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Work Reportを表示できませんでした");
    expect(alert).not.toHaveTextContent("ChatGPTとつながりませんでした");
  });

  it("offers a retry for a connection failure but not for an invalid tool result", async () => {
    const failing = createFakeWorkReportHost({
      connect: async () => Promise.reject(new Error("host down")),
    });

    const connectionView = render(<WorkReportApp createApp={() => failing.app} />);
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "接続をやり直す" })).toBeInTheDocument();
    connectionView.unmount();

    const invalid = createFakeWorkReportHost();
    render(<WorkReportApp createApp={() => invalid.app} />);
    invalid.emitToolResult({ structuredContent: { title: "壊れたWork Report" } });

    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "接続をやり直す" })).toBeNull();
  });

  it("reconnects to the host when the retry button is pressed", async () => {
    let shouldFail = true;
    const fake = createFakeWorkReportHost({
      connect: async () => {
        if (shouldFail) throw new Error("host down");
      },
    });

    render(<WorkReportApp createApp={() => fake.app} />);
    await screen.findByRole("alert");

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "接続をやり直す" }));

    await waitFor(() => expect(fake.connectCount()).toBe(2));

    fake.emitToolResult({ structuredContent: report() });

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "ログイン状態が切れる問題を修正",
    );
  });
});

/** Action失敗を伝えつつWork Report本文を残す。 */
describe("WorkReportApp host action failure", () => {
  const renderReadyApp = async (options: FakeWorkReportHostOptions) => {
    const fake = createFakeWorkReportHost(options);

    render(<WorkReportApp createApp={() => fake.app} />);
    fake.emitToolResult({ structuredContent: report() });
    await screen.findByRole("heading", { level: 1 });

    return fake;
  };

  it("tells the user when a Suggested Action is rejected by the host", async () => {
    await renderReadyApp({ sendMessage: async () => Promise.reject(new Error("send failed")) });

    fireEvent.click(screen.getByRole("button", { name: "実ブラウザで確認して" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ChatGPTへ送信できませんでした");
  });

  it("tells the user when a Suggested Action comes back as an error result", async () => {
    await renderReadyApp({ sendMessage: async () => ({ isError: true }) });

    fireEvent.click(screen.getByRole("button", { name: "実ブラウザで確認して" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ChatGPTへ送信できませんでした");
  });

  it("tells the user when opening a Reference is rejected by the host", async () => {
    await renderReadyApp({ openLink: async () => Promise.reject(new Error("open failed")) });

    fireEvent.click(screen.getByRole("button", { name: "MCP Apps仕様を開く" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("参考情報を開けませんでした");
  });

  it("tells the user when opening a Reference comes back as an error result", async () => {
    await renderReadyApp({ openLink: async () => ({ isError: true }) });

    fireEvent.click(screen.getByRole("button", { name: "MCP Apps仕様を開く" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("参考情報を開けませんでした");
  });

  it("keeps the Work Report body visible after an action failure", async () => {
    await renderReadyApp({ sendMessage: async () => ({ isError: true }) });

    fireEvent.click(screen.getByRole("button", { name: "実ブラウザで確認して" }));
    await screen.findByRole("alert");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "ログイン状態が切れる問題を修正",
    );
    expect(screen.getByText("Cookie設定を変更し、関連する確認を行いました。")).toBeInTheDocument();
  });

  it("clears the action failure notice when the retry succeeds", async () => {
    let shouldFail = true;
    await renderReadyApp({
      sendMessage: async () => ({ isError: shouldFail }),
    });

    fireEvent.click(screen.getByRole("button", { name: "実ブラウザで確認して" }));
    await screen.findByRole("alert");

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "もう一度試す" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "ログイン状態が切れる問題を修正",
    );
  });

  it("keeps a successful action silent", async () => {
    await renderReadyApp({ sendMessage: async () => ({ isError: false }) });

    fireEvent.click(screen.getByRole("button", { name: "実ブラウザで確認して" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
