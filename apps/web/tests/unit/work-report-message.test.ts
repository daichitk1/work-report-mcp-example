/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/web/src/mcp-app/host/work-report-host.ts のsendWorkReportMessage
 *
 * 受信したpromptを、そのままuserのテキストメッセージとしてHostへ依頼することを確認する。
 * UIが次の依頼文を勝手に書き換える不具合を防ぐ。依頼された作業の実行完了を保証するものではない。
 */
import { describe, expect, it, vi } from "vitest";

import {
  sendWorkReportMessage,
  type WorkReportAppLike,
} from "../../src/mcp-app/host/work-report-host";

describe("sendWorkReportMessage", () => {
  it("sends the exact prompt as a user text message", async () => {
    const prompt = "今回の変更を実ブラウザで確認して";
    const sendMessage = vi.fn(async () => ({ isError: false }));
    const host: Pick<WorkReportAppLike, "sendMessage"> = { sendMessage };

    await sendWorkReportMessage(host, prompt);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      role: "user",
      content: [{ type: "text", text: prompt }],
    });
  });
});
