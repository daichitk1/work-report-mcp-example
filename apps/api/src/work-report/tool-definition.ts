/**
 * このファイルを読む前に（読む順番 2）
 *
 * 役割: ChatGPTへ公開するToolの名前・説明・入力と出力の形・UIとの対応を定義する。
 * 前: packages/contracts/src/work-report.tsが、渡すデータの意味と条件を定義している。
 * 次: handle-tool-call.tsで、Toolが呼ばれた後の実際の検証と応答を読む。
 * 理解したいこと: Toolの説明はLLMの選択材料、Schemaは入出力の契約である。
 * 定義はregister-tool.tsからMCP Serverへ登録され、HostによるTool一覧取得で公開される。
 */
import { workReportSchema } from "@work-report-mcp/contracts";

// Tool呼び出しで指定する識別名。表示用titleとは別で、登録先と呼び出し先を一致させる。
// 通常発火 (A AND B AND C) と明示発火、非発火をModelへ伝えるTool description。
export const SHOW_WORK_REPORT_TOOL_NAME = "show_work_report";

// Tool ResultをWork Report UIへ接続するMCP Apps Resource URI。
// URIは通常のWebページのURLではなく、ui-resource.tsが登録するMCP Resourceの識別子。
export const WORK_REPORT_UI_RESOURCE_URI = "ui://work-report/work-report.html";

export const SHOW_WORK_REPORT_TOOL_TITLE = "Work Reportを表示";

/**
 * 人間向けの説明に加え、LLMが「いつ使い、何を入力するか」を判断する情報。
 * 説明だけで入力の安全性やTool選択を強制できないため、Handlerでも検証する。
 * この文字列自体が公開するTool Definitionの一部であり、コードコメントとは異なる。
 */
export const SHOW_WORK_REPORT_TOOL_DESCRIPTION = [
  "直前の1つのユーザー依頼に対して行った作業を、人間が理解できるWork Reportとして表示する。",
  "",
  "次の3条件をすべて満たすときに使用する。",
  "1. 具体的な作業依頼を受けている",
  "2. その依頼を完了するまでに複数の工程（調査・判断・変更・確認など）を行った",
  "3. 作業が完了し、ユーザーへ最終結果を返す段階である",
  "",
  "ユーザーがWork Report相当の内容を明示的に要求した場合は、上の3条件に関係なく使用できる。",
  "例: 今回何やった？ / 今回の作業をまとめて / 何を変更して何を確認した？",
  "",
  "次の場合は使用しない。",
  "単純な知識質問、雑談、アイデア相談だけ、1工程だけの軽微な回答、作業途中の進捗報告、挨拶やお礼。",
  "",
  "対象は直前の1つのユーザー依頼だけとする。会話全体・セッション全体・1日の作業・過去の別依頼を混ぜない。",
  "実施した作業はcompletedWork、AIの判断はdecisions、実際の確認はverificationへ分けて渡す。",
  "行っていない作業・実行していない検証・参照していないURL・存在しない残作業を作らない。",
  "",
  "Work Reportには秘密情報・credential・個人識別子の実値を含めない。",
  "API key、token、Authorization/Cookie/Session ID、password、private key、.envのsecret値を送らない。",
  "ファイル本文やRaw Tool Logを送らず、作業の意味だけを記録する。",
  "filesにはrepository-relative pathだけを記録し、absolute local pathを送らない。",
].join("\n");

/**
 * Modelへ公開するTool契約。Runtime handlerを読み込まずに参照できるよう、
 * 発火条件（description）とSchemaだけをこのmoduleへ置く。
 */
export const showWorkReportToolConfig = {
  title: SHOW_WORK_REPORT_TOOL_TITLE,
  description: SHOW_WORK_REPORT_TOOL_DESCRIPTION,
  // ChatGPTが生成する引数の形。shapeは各フィールドの定義をSDKへ渡すためのもの。
  // Contract全体のsuperRefineによるID検査は、HandlerのsafeParseで実施する。
  inputSchema: workReportSchema.shape,
  // 成功時のstructuredContentの形。画面はこの構造化データを受け取って描画する。
  outputSchema: workReportSchema.shape,
  // HostがTool結果に対応する表示用HTMLを見つけるための関連付け。
  // HTML Resourceの取得とTool Resultの受信は別で、結果にHTMLを埋め込む指定ではない。
  _meta: { ui: { resourceUri: WORK_REPORT_UI_RESOURCE_URI } },
} as const;
