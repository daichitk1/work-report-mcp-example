/**
 * このファイルを読む前に（読む順番 9）
 *
 * 役割: MCP Apps SDKを通して、React UIの外側にいるChatGPT Hostと通信する。
 * 前: APIのOAuthとMCP処理を読み、Tool ResultのstructuredContentが返ることを確認する。
 * 次: ../state/useWorkReportHost.tsが、ここで受けた値と操作結果をReact stateへ変換する。
 * 理解したいこと: このMCP Appは、Hostに埋め込まれた画面としてTool結果を受け取る。
 * 通常のReact画面のように自分でAPIからレポートを取得する構成ではない。
 * MCP Server → Tool Result → ChatGPT Host → toolresultイベント → MCP Appの順で届く。
 */
import { App } from "@modelcontextprotocol/ext-apps";

// Hostとの通信境界ではデータの正しさを断定しない。unknownの検証はstate層が担当する。
export type WorkReportToolResult = {
  structuredContent?: unknown;
  isError?: boolean | undefined;
};

type WorkReportChatMessage = {
  role: "user";
  content: {
    type: "text";
    text: string;
  }[];
};

type WorkReportHostResult = {
  isError?: boolean | undefined;
};

/** MCP Apps Appのうち、Work Report UIが必要とする部分だけ。 */
export type WorkReportAppLike = {
  addEventListener: (event: "toolresult", handler: (params: WorkReportToolResult) => void) => void;
  connect: () => Promise<void>;
  openLink: (params: { url: string }) => Promise<WorkReportHostResult>;
  sendMessage: (message: WorkReportChatMessage) => Promise<WorkReportHostResult>;
};

/**
 * Hostへ依頼したActionの結果を1つの形へそろえる。
 * Host側の`isError`とPromise rejectを、UIが同じ失敗として扱えるようにする。
 */
type WorkReportActionOutcome = "succeeded" | "failed";

const runHostAction = async (
  request: () => Promise<{ isError?: boolean | undefined }>,
): Promise<WorkReportActionOutcome> => {
  try {
    const result = await request();
    return result.isError === true ? "failed" : "succeeded";
  } catch {
    return "failed";
  }
};

type ConnectWorkReportAppOptions = {
  /** Tool ResultのstructuredContentをそのまま受け取る。 */
  onToolResult: (structuredContent: unknown) => void;
  createApp?: () => WorkReportAppLike;
};

const WORK_REPORT_APP_INFO = { name: "work-report-app", version: "0.1.0" } as const;

/**
 * SDKのオブジェクトを、UIが必要とする操作だけの窓口へ包む。
 * connectWorkReportAppが使い、テストでは同じ形のFake Hostへ差し替えられる。
 */
export const createWorkReportApp = (): WorkReportAppLike => {
  // AppはReact componentではなく、埋め込み先のHostと接続・通信するSDKオブジェクト。
  const app = new App(WORK_REPORT_APP_INFO, {});

  return {
    addEventListener: (event, handler) => {
      app.addEventListener(event, (params) => handler(params));
    },
    // connectでHostとの通信を開始し、Tool結果や操作のやり取りを可能にする。
    connect: () => app.connect(),
    // openLinkは外部リンクを開くようHostへ依頼する。Viewから直接ブラウザを操作しない。
    openLink: (params) => app.openLink(params),
    // sendMessageはユーザーメッセージの送信をHostへ依頼する。
    // 例えば「再確認して」という文面をUI自身が実行するわけではない。
    sendMessage: (message) => app.sendMessage(message),
  };
};

/**
 * Work ReportのAction promptを加工せずuser messageとしてHostへ送る。
 * 送信できたかどうかだけを返し、Host側のerror詳細はUIへ渡さない。
 */
export const sendWorkReportMessage = (
  app: Pick<WorkReportAppLike, "sendMessage">,
  prompt: string,
): Promise<WorkReportActionOutcome> =>
  runHostAction(() =>
    app.sendMessage({
      role: "user",
      content: [{ type: "text", text: prompt }],
    }),
  );

/** Hostへ渡してよいReference URLのscheme。 */
const SAFE_REFERENCE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * UIはHostから届くTool Resultをblind trustしない。
 * Schema上URLとして妥当でもjavascript: / data: / file:等はHostへ渡さない。
 */
export const isSafeWorkReportReferenceUrl = (value: string): boolean => {
  try {
    return SAFE_REFERENCE_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
};

/**
 * Tool Resultに存在するReference URLだけをHostへ渡す。
 * http / https以外のschemeはHostへ渡さずfail closedにする。
 * 開けたかどうかだけを返し、Host側のerror詳細はUIへ渡さない。
 */
export const openWorkReportLink = (
  app: Pick<WorkReportAppLike, "openLink">,
  url: string,
): Promise<WorkReportActionOutcome> => {
  if (!isSafeWorkReportReferenceUrl(url)) return Promise.resolve("failed");

  return runHostAction(() => app.openLink({ url }));
};

/**
 * Hostからの最初のTool Resultを受け取り、内容を変更せずViewへ渡す。
 * handlerはconnectの前に登録し、初回Tool Resultを取りこぼさない。
 */
export const connectWorkReportApp = async ({
  onToolResult,
  createApp = createWorkReportApp,
}: ConnectWorkReportAppOptions): Promise<WorkReportAppLike> => {
  const app = createApp();

  // 接続時に初回結果が届く場合にも備え、connectより先に受信handlerを登録する。
  // 受信後はstructuredContentだけをstate層へ渡し、表示内容の推測や加工はしない。
  app.addEventListener("toolresult", (params) => {
    onToolResult(params.structuredContent);
  });

  await app.connect();

  return app;
};
