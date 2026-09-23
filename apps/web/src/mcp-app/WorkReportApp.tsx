/**
 * このファイルを読む前に（読む順番 11）
 *
 * 役割: useWorkReportHostのstateを、待機・エラー・レポートの表示へ変換する。
 * 前: state/useWorkReportHost.tsが受信データを検証し、通信・操作の状態を管理する。
 * 次: view/WorkReportView.tsxが検証済みのWorkReportを各区画へ渡して描画する。
 * 理解したいこと: waitingは空表示、invalidは不正データ、connection_errorは接続失敗、
 * readyは本文表示、action_errorは本文を残した操作失敗通知、という対応。
 * このcomponent自身はSDKを直接呼ばず、ユーザー操作をHookへ渡す。
 */
import { type CSSProperties } from "react";

import type { WorkReportAppLike } from "./host/work-report-host";
import {
  useWorkReportHost,
  type WorkReportHostAction,
  type WorkReportState,
} from "./state/useWorkReportHost";
import { WorkReportView } from "./view/WorkReportView";
import { workReportShellStyle } from "./view/styles";

type WorkReportAppProps = {
  createApp?: () => WorkReportAppLike;
};

/**
 * やり直して結果が変わる失敗だけにretryを出す。
 * invalidなTool Resultは再接続しても同じ内容が届くため、retryを出さない。
 */
const isRetryable = (state: WorkReportState): boolean =>
  state.kind === "connection_error" || state.kind === "action_error";

/** Work Report本文を表示できない失敗。どちらの境界で失敗したかを言い分ける。 */
const fallbackMessages = {
  invalid: "Work Reportを表示できませんでした",
  connection_error: "ChatGPTとつながりませんでした",
} as const;

const actionFailureMessages: Record<WorkReportHostAction["kind"], string> = {
  send_message: "ChatGPTへ送信できませんでした",
  open_reference: "参考情報を開けませんでした",
};

const noticeStyle: CSSProperties = {
  margin: 0,
  padding: "16px",
  border: "1px solid #d4d4d4",
  borderRadius: "14px",
  background: "#fafafa",
  fontSize: "15px",
  lineHeight: 1.7,
};

const noticeTextStyle: CSSProperties = {
  margin: 0,
};

const noticeActionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
};

const noticeButtonStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #d4d4d4",
  borderRadius: "999px",
  background: "#ffffff",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

/**
 * 初回Tool ResultのstructuredContentを受け取り、
 * Work Report構造として検証できたものだけを表示する。
 * 検証できなかった場合は推測補完せずFallbackだけを表示する。
 *
 * Hostとの接続とAction実行は`useWorkReportHost`が持ち、
 * このcomponentは状態の見せ方だけを担当する。
 */
export const WorkReportApp = ({ createApp }: WorkReportAppProps) => {
  const host = useWorkReportHost({ ...(createApp ? { createApp } : {}) });
  const { state } = host;

  // waitingは表示待ちだが、この実装では待機文言も表示しない。結果を仮生成しないため。
  if (state.kind === "waiting") return null;

  // invalidを接続し直しても入力の不備は直らないため、接続失敗だけに再接続を案内する。
  if (state.kind === "invalid" || state.kind === "connection_error") {
    return (
      <main className="work-report" style={workReportShellStyle}>
        <div role="alert" style={noticeStyle}>
          <p style={noticeTextStyle}>{fallbackMessages[state.kind]}</p>
          {isRetryable(state) ? (
            <div style={noticeActionsStyle}>
              <button onClick={host.retryConnect} style={noticeButtonStyle} type="button">
                接続をやり直す
              </button>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  // ここへ来るstateはreadyかaction_errorで、どちらも検証済みreportを持つ。
  // 操作失敗は本文の代わりにせず、本文の上に置く通知としてViewへ渡す。
  const notice =
    state.kind === "action_error" ? (
      <div role="alert" style={noticeStyle}>
        <p style={noticeTextStyle}>{actionFailureMessages[state.action.kind]}</p>
        <div style={noticeActionsStyle}>
          <button
            onClick={() => host.runAction(state.action)}
            style={noticeButtonStyle}
            type="button"
          >
            もう一度試す
          </button>
          <button
            onClick={() => host.dismissActionError(state.report)}
            style={noticeButtonStyle}
            type="button"
          >
            閉じる
          </button>
        </div>
      </div>
    ) : undefined;

  // ViewからのクリックをHostへ依頼する操作へ変換する。本文はstate.reportが正本。
  return (
    <WorkReportView
      {...(notice ? { notice } : {})}
      onOpenReference={(url) => host.runAction({ kind: "open_reference", url })}
      onSendMessage={(prompt) => host.runAction({ kind: "send_message", prompt })}
      report={state.report}
    />
  );
};
