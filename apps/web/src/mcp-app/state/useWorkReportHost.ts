/**
 * このファイルを読む前に（読む順番 10）
 *
 * 役割: Hostの受信結果・接続失敗・操作結果をReact stateへ変換するcustom Hook。
 * 前: ../host/work-report-host.tsがSDKとの通信を引き受ける。
 * 次: ../WorkReportApp.tsxがstate.kindを見て表示する画面を決める。
 * 理解したいこと: Tool Resultのunknown → Zod safeParse → WorkReport → readyという境界。
 * Serverで検証済みでも、Hostから届く値が同じ契約を満たすかUI側で確かめる。
 * 欠損や契約の不一致を見逃すと、描画時の例外や推測による表示につながるため。
 */
import { workReportSchema, type WorkReport } from "@work-report-mcp/contracts";
import { useEffect, useRef, useState } from "react";

import {
  connectWorkReportApp,
  openWorkReportLink,
  sendWorkReportMessage,
  type WorkReportAppLike,
} from "../host/work-report-host.js";

/** Hostへ依頼する操作。失敗時に同じ操作をやり直すためstateへ保持する。 */
export type WorkReportHostAction =
  { kind: "send_message"; prompt: string } | { kind: "open_reference"; url: string };

/**
 * 初回Tool Result待ち、Schema Validation失敗、
 * Host接続失敗、Action失敗を別々の状態として扱う。
 * `action_error`はWork Report本文を保持し、失敗したActionだけを伝える。
 */
export type WorkReportState =
  // kindを判別子にするdiscriminated union（判別可能なunion）。
  // kindで分岐すると、TypeScriptはその状態にだけあるreportやactionを絞り込める。
  // waiting: まだTool結果を受け取っていない。仮のレポートは持たない。
  | { kind: "waiting" }
  // invalid: 届いたstructuredContentがWork ReportのSchemaを満たさない。
  | { kind: "invalid" }
  // connection_error: 待機中にHost接続が失敗し、本文を表示できない。
  | { kind: "connection_error" }
  // ready: 検証できたreportを表示できる。
  | { kind: "ready"; report: WorkReport }
  // action_error: 本文を残しつつ、失敗した操作を保持して再試行できる。
  | { kind: "action_error"; report: WorkReport; action: WorkReportHostAction };

type WorkReportHost = {
  state: WorkReportState;
  retryConnect: () => void;
  runAction: (action: WorkReportHostAction) => void;
  dismissActionError: (report: WorkReport) => void;
};

type UseWorkReportHostOptions = {
  createApp?: () => WorkReportAppLike;
};

/**
 * MCP Apps Hostとの接続と、Hostへ依頼した操作の結果だけを扱う。
 * Work Report本文はTool Resultが正であり、ここでは作り替えない。
 */
export const useWorkReportHost = ({ createApp }: UseWorkReportHostOptions = {}): WorkReportHost => {
  const [state, setState] = useState<WorkReportState>({ kind: "waiting" });
  // 再試行時に値を変え、接続用Effectをもう一度実行する。
  const [connectAttempt, setConnectAttempt] = useState(0);
  // SDKの接続先は表示データではないのでrefへ保持し、変更だけでは再描画させない。
  const appRef = useRef<WorkReportAppLike | null>(null);

  useEffect(() => {
    // 古い接続から遅れて届いた結果が、再接続後やunmount後の状態を上書きするのを防ぐ。
    let active = true;

    void connectWorkReportApp({
      ...(createApp ? { createApp } : {}),
      onToolResult: (structuredContent) => {
        if (!active) return;
        // APIと同じContractで形・IDの整合性を検証する。
        // API側の秘密情報検査をここで繰り返すわけではない。
        const parsed = workReportSchema.safeParse(structuredContent);
        setState(parsed.success ? { kind: "ready", report: parsed.data } : { kind: "invalid" });
      },
    })
      .then((app) => {
        if (active) appRef.current = app;
      })
      .catch(() => {
        if (!active) return;
        // 既にTool Resultを受け取っている場合はReport本文を失わせない。
        setState((current) =>
          current.kind === "waiting" ? { kind: "connection_error" } : current,
        );
      });

    return () => {
      // このEffectの結果を無効化する処理。SDK接続を閉じる処理ではない。
      active = false;
      appRef.current = null;
    };
  }, [createApp, connectAttempt]);

  /** Actionが失敗してもWork Report本文は保持し、失敗だけを伝える。 */
  const runAction = (action: WorkReportHostAction) => {
    // 操作の成否と本文の有効性は別。失敗しても読めていたreportを捨てない。
    const failAction = () =>
      setState((current) =>
        current.kind === "ready" || current.kind === "action_error"
          ? { kind: "action_error", report: current.report, action }
          : current,
      );

    const app = appRef.current;
    if (!app) {
      failAction();
      return;
    }

    const request =
      action.kind === "send_message"
        ? sendWorkReportMessage(app, action.prompt)
        : openWorkReportLink(app, action.url);

    void request.then((outcome) => {
      if (outcome === "failed") {
        failAction();
        return;
      }

      setState((current) =>
        current.kind === "action_error" ? { kind: "ready", report: current.report } : current,
      );
    });
  };

  return {
    state,
    runAction,

    retryConnect: () => {
      // 受信待ちに戻し、Effectによる新しいHost接続を開始する。
      setState({ kind: "waiting" });
      setConnectAttempt((attempt) => attempt + 1);
    },

    // 通知を閉じるだけで、失敗した操作を実行したことにはしない。
    dismissActionError: (report) => setState({ kind: "ready", report }),
  };
};
