# コードガイド

「何を変更したいか」から、開くファイルを見つけるためのガイドです。
コードを追う順番は本ガイドの「コードを読む順番」にまとめています。セットアップ手順と実環境での確認範囲は [セットアップ](./setup.md) を参照してください。
コードへのリンクはGitHub上のリポジトリを開きます。リポジトリが非公開の間は閲覧権限が必要です。

## リポジトリ全体

```text
work-report-mcp/
├── api/
│   └── index.ts                Vercel Functionの入口
├── apps/
│   ├── api/                    Hono製MCP Server・OAuth・レポート入力検査
│   │   ├── src/                サーバーの実装
│   │   └── tests/              サーバーの単体・結合テスト
│   └── web/                    React製MCP Apps UI
│       ├── src/mcp-app/        Host接続・画面状態・表示
│       └── tests/              UI・Host接続・E2Eテスト
├── packages/
│   └── contracts/              APIとUIで共有するSchema・型
├── tests/                      リポジトリ横断の構成・依存方向の検査
├── docs/                       セットアップ・コード・安全性の案内
└── .github/workflows/           CI・CodeQL
```

ルートの `api/index.ts` はVercel用の薄い入口です。機能を変更するときは `apps/api/src/` を開きます。
`packages/contracts/src/work-report.ts` がレポートの項目・型・上限を定義し、APIとUIの両方から参照されます。

## 技術スタックと担当

| 領域     | 技術                      | 主な配置                                           | 担当                                  |
| -------- | ------------------------- | -------------------------------------------------- | ------------------------------------- |
| Frontend | React + TypeScript + Vite | `apps/web/`                                        | MCP Appsとして表示するWork Report UI  |
| Backend  | Hono + TypeScript         | `apps/api/`                                        | HTTPルーティング、OAuth、MCP Tool実行 |
| MCP      | MCP SDK / MCP Apps SDK    | `apps/api/src/mcp/` / `apps/web/src/mcp-app/host/` | Tool・UI Resource・Host接続           |
| Contract | Zod + TypeScript          | `packages/contracts/`                              | APIとUIで共有するSchema・型           |
| Auth     | Auth0 / OAuth 2.0         | `apps/api/src/auth/`                               | Token検証とアクセス制御               |
| Deploy   | Node.js + Vercel          | `api/index.ts` / `vercel.json`                     | Remote MCP Serverの公開               |

大きく分けると、**`apps/web` がReact製のフロントエンド、`apps/api` がHono製のバックエンド**です。
フロントエンドは独立した一般Web画面ではなく、MCP AppsのUI ResourceとしてChatGPT内で使う画面です。

## APIのフォルダ構造

<!-- api-source-tree:start -->

```text
apps/api/src/
├── app.ts                              HTTPルーティング・リクエスト上限
├── dev-server.ts                       ローカル開発用の起動処理
├── index.ts                            APIパッケージの入口
├── auth/                               誰が利用できるか
│   ├── config.ts                       OAuth設定の読込と整合性検査
│   ├── token-verifier.ts               JWTの署名・issuer・audience・期限の検証
│   ├── authorization.ts                Bearerと必要scopeから利用可否を判断
│   ├── oauth-http.ts                   認可結果を401・403等のHTTP応答に変換
│   └── create-auth-handlers.ts          設定・認可・メタデータ応答を組み立てる
├── mcp/                                MCPの通信とサーバー構成
│   ├── server.ts                       ToolとUI Resourceを登録
│   └── handle-http-request.ts          HTTPリクエストをMCP Transportへ渡す
├── work-report/                        Work Reportという機能
│   ├── tool-definition.ts              AIへ伝えるToolの説明・入力形式
│   ├── register-tool.ts                定義と処理をMCP Serverへ登録
│   ├── handle-tool-call.ts             入力を検査して結果を返す
│   ├── ui-resource.ts                  ビルド済みの表示用HTMLを配信
│   └── input-validation/               レポート内容の入力検査
│       ├── inspect-report.ts           各検査の取りまとめ
│       ├── credential-policy.ts        秘密情報などの検出
│       ├── file-path-policy.ts         ファイルパスの検査
│       ├── payload-policy.ts           レポートのデータサイズを検査
│       ├── reference-url-policy.ts     参考URLの検査
│       └── security-issue.ts           入力検査で見つかった問題の型
└── logging/                            イベントの記録
    └── security-event.ts               認証失敗・入力拒否などのログ出力
```

<!-- api-source-tree:end -->

`auth/` はアクセスしてよいか、`input-validation/` はレポートの入力を受け取ってよいか、`logging/` は何が起きたかの記録を担当します。同じ「セキュリティに関わる処理」でも、担当する仕事で置き場所を分けます。

`mcp/` には通信とサーバーの組立だけを置きます。Toolの説明、処理、レポート固有の入力検査は `work-report/` に集めます。

## 何を変更するとき、どこを開くか

| 変更したいこと                      | 開くファイル・フォルダ                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| Auth0のissuer・audience等の設定条件 | `apps/api/src/auth/config.ts`                                |
| トークンを検証する条件              | `apps/api/src/auth/token-verifier.ts`                        |
| 必要なscopeや利用可否の判断         | `apps/api/src/auth/authorization.ts`                         |
| 認証エラーや認証先メタデータの応答  | `apps/api/src/auth/oauth-http.ts`、`create-auth-handlers.ts` |
| MCPのHTTP通信・Tool登録の組立       | `apps/api/src/mcp/`                                          |
| AIへ伝えるToolの説明・使用条件      | `apps/api/src/work-report/tool-definition.ts`                |
| Tool入力の検査順序・結果の作成      | `apps/api/src/work-report/handle-tool-call.ts`               |
| 許可しない秘密情報・パス・URL       | `apps/api/src/work-report/input-validation/`                 |
| ログの種類と出力方法                | `apps/api/src/logging/security-event.ts`                     |
| レポートの項目・文字数や件数の上限  | `packages/contracts/src/work-report.ts`                      |
| Hostとの接続・メッセージ送信        | `apps/web/src/mcp-app/host/`                                 |
| 接続失敗・操作失敗や画面の選択状態  | `apps/web/src/mcp-app/state/`                                |
| 画面の見た目・情報の並べ方          | `apps/web/src/mcp-app/view/`                                 |

## 1リクエストの流れ

```text
api/index.ts または apps/api/src/dev-server.ts
  ↓
apps/api/src/app.ts
  ├── /health                       Health check
  ├── /.well-known/...              認証先のメタデータ
  └── /mcp
        ↓ HTTPリクエストのサイズ制限
      auth/create-auth-handlers.ts
        ↓ OAuth設定・JWT検証・必要scopeの確認
      mcp/handle-http-request.ts
        ↓
      mcp/server.ts
        ├── work-report/register-tool.ts
        │     ↓ Toolが呼ばれたとき
        │   work-report/handle-tool-call.ts
        │     ↓ サイズ → Schema → 秘密情報・パス・URLの検査
        │   structuredContent
        └── work-report/ui-resource.ts
              ↓ Resourceが要求されたとき
            ビルド済みHTML
```

Tool結果とHTML Resourceは別の応答です。`ui-resource.ts` は画面を描画するコードではなく、`apps/web` でビルドしたHTMLをMCP経由で配信します。
実際の描画は `apps/web/src/mcp-app/` が担当します。サーバー側ではレポートを再要約したり、独自LLMを呼んだりしません。

HTTPリクエストの256 KiB上限は `app.ts`、Work Report入力の64 KiB上限は `payload-policy.ts` にあります。適用する対象と段階が異なるため、別の制限として維持します。
入力検査は補助的な検出であり、秘密情報が必ず検出される保証ではありません。

## Web側の案内

```text
apps/web/src/mcp-app/
├── main.tsx                    Reactを起動
├── WorkReportApp.tsx            接続状態に応じて画面を選ぶ
├── host/                       MCP Apps SDKとの接続
├── state/                      接続・操作結果・選択・展開の状態
└── view/                       Header・作業一覧・詳細・次の操作の表示
```

SDKを扱うのは `host/work-report-host.ts`、Tool結果の受け取りと状態管理は `state/useWorkReportHost.ts`、レイアウトは `view/WorkReportView.tsx` です。

## テストの場所

APIのテストは実装と同じ責務名で探せます。

```text
apps/api/tests/
├── unit/
│   ├── auth/                       設定・JWT・認可・HTTP応答
│   └── work-report/                Tool処理・UI Resource
│       └── input-validation/       秘密情報・パス・サイズ・URLの検査
├── integration/
│   ├── http/                       HTTP入口・OAuth・リクエスト上限
│   ├── mcp/                        MCP Clientとの通信・Resource
│   └── work-report/                Tool結果・入力拒否・ログの非漏えい
├── fixtures/                       テスト用のサンプルデータ
└── helpers/                        テスト専用の接続処理など
```

`tests/architecture-boundary.test.ts` は実装の依存方向を検査します。
`tests/repository-layout.test.ts` は、このガイドのAPIツリーと実ファイルの一致を検査します。
本番コードから直接呼ばれないテスト・開発用サーバーも、それぞれ用途のある入口です。

## ファイルを追加・移動するときのルール

- 認証は `auth/`、MCP通信は `mcp/`、レポートの機能は `work-report/`、イベント出力は `logging/` に置きます。名前が曖昧な共通フォルダへまとめません。
- 入力検査はHTTP・MCP Transport・ログ出力・UIに依存させず、検査結果を返します。ログは呼び出し元で出力し、本文やトークンの実値を渡しません。
- `logging/` から `auth/`・`mcp/`・`work-report/` を参照しません。呼び出す側がloggerを渡します。
- ファイル移動時はimport、対応テスト、関連資料、本ガイドを同時に更新します。配置だけを変える場合、認証や入力検査の順序・エラー応答は変えません。

APIのファイル追加・削除時は上のAPIツリーも更新してください。READMEは入口の案内にとどめ、詳細な構造と役割はこのガイドで管理します。

## コードを読む順番

データの意味を先に理解し、それを公開・検証・表示する部品へ進む学習順です。実行時の呼び出し順とは異なります。各ファイルの先頭コメントで前後の関係を確認し、重要な関数のコメントと処理を照らし合わせてください。

| 順序 | 場所                                                                                                                                                              | 読み取る内容                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0    | [README.md](https://github.com/daichitk1/work-report-mcp-example/blob/main/README.md)                                                                             | アプリの目的と全体像                                                 |
| 1    | [packages/contracts/src/work-report.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/packages/contracts/src/work-report.ts)                     | Zod、実行時検証、6つの項目、IDの参照関係                             |
| 2    | [apps/api/src/work-report/tool-definition.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/work-report/tool-definition.ts)         | LLMへ公開する説明、入出力Schema、UI Resourceとの対応                 |
| 3    | [apps/api/src/work-report/handle-tool-call.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/work-report/handle-tool-call.ts)       | unknownからサイズ・Schema・秘密情報を検証してstructuredContentを返す |
| 4    | [apps/api/src/work-report/register-tool.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/work-report/register-tool.ts)             | Tool定義とHandlerをServerへ登録する                                  |
| 5    | [apps/api/src/mcp/server.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/mcp/server.ts)                                           | ToolとResourceを持つMCP Serverの組立                                 |
| 6    | [apps/api/src/mcp/handle-http-request.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/mcp/handle-http-request.ts)                 | ServerとTransportの違い、connectとhandleRequestの役割                |
| 7    | [apps/api/src/app.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/app.ts)                                                         | Honoの入口、サイズ制限、OAuth、MCPへの委譲                           |
| 8    | 下表の `apps/api/src/auth/` 5ファイル                                                                                                                             | 認可判定、JWT検証、HTTP変換、組立、設定                              |
| 9    | [apps/web/src/mcp-app/host/work-report-host.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/web/src/mcp-app/host/work-report-host.ts)     | Host接続、toolresult、メッセージ送信・リンク操作の依頼               |
| 10   | [apps/web/src/mcp-app/state/useWorkReportHost.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/web/src/mcp-app/state/useWorkReportHost.ts) | unknownの再検証、判別可能なunion、React stateへの変換                |
| 11   | [apps/web/src/mcp-app/WorkReportApp.tsx](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/web/src/mcp-app/WorkReportApp.tsx)                   | 状態ごとの表示と、再試行を案内する条件                               |
| 12   | [apps/web/src/mcp-app/view/WorkReportView.tsx](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/web/src/mcp-app/view/WorkReportView.tsx)       | 各表示componentの担当とDesktop / Mobileの切替                        |
| 13   | 各実装に対応する `tests/`                                                                                                                                         | 保証する境界と、防ぎたい不具合                                       |

OAuthは次の順に読みます。認可の判断を先に理解し、最後に設定と組立の関係を確認します。

| 順序 | ファイル                                                                                                                            | 読み取る内容                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 8-1  | [authorization.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/auth/authorization.ts)               | Bearer取得、検証関数の呼び出し、必要scopeの確認         |
| 8-2  | [token-verifier.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/auth/token-verifier.ts)             | 署名・issuer・audience・期限とJWKS、検証後のscope       |
| 8-3  | [oauth-http.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/auth/oauth-http.ts)                     | 判定を401 / 403等へ変換し、認可先をClientへ知らせる     |
| 8-4  | [create-auth-handlers.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/auth/create-auth-handlers.ts) | 共通resolverによる組立と、設定不足時に503で拒否する理由 |
| 8-5  | [config.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/auth/config.ts)                             | 環境変数の読込、URLの正規化、audienceとresourceの一致   |

手順5の補足として [ui-resource.ts](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/src/work-report/ui-resource.ts) を読むと、Toolに関連付けたHTMLの配信も確認できます。手順12では、`WorkReportView.tsx` の先頭にあるcomponentの案内から、見たい区画の実装へ進めます。

Tool定義の `inputSchema` / `outputSchema` はContractの `shape` をSDKへ公開します。レポート全体に対する `superRefine` のID重複・参照先検査は、HandlerとUIが完成した `workReportSchema` を検証するときに実行されます。TypeScriptの型が付くことと、通信で届いた値を実行時に検証することは別です。

`completedWork` と `verification` は別の意味です。コードを変更したことと、変更後の動作を確認したことを混同しません。
Serverは入力を検査しますが、報告された作業が本当に実施されたかを独立したログから確認するわけではありません。
UIは受け取ったデータを表示し、不足した情報を推測して補完しません。

## 表示状態と制約

| 状態               | 表示・操作                                                 |
| ------------------ | ---------------------------------------------------------- |
| `waiting`          | Tool結果を待つ。レポートを仮生成しない                     |
| `invalid`          | データを検証できない。推測補完や接続の再試行では修復しない |
| `connection_error` | Hostへ接続できない。接続の再試行を案内する                 |
| `ready`            | 検証できたレポートを表示する                               |
| `action_error`     | 本文を残し、失敗した送信・リンク操作の再試行を案内する     |

Hostへ送る操作は、ユーザーの次の依頼につなぐものです。画面がGit操作や作業の再実行を直接行うわけではありません。
サーバー側とブラウザ側の入力検査はそれぞれ必要です。秘密情報の検出は補助的なもので、見逃しがない保証はしません。
アプリケーションはレポートをDatabaseへ保存しませんが、Hostの会話履歴や事業者のログまで保存されないという意味ではありません。

## テストの範囲

対応するテストの先頭コメントに、対象実装・保証内容・防ぐ不具合を記載しています。

| 種類                  | 主に確認すること                                               | 読む例                                                                                                                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit（単体）          | 関数やSchemaを直接呼び、条件と返却値を確認する                 | [Handler](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/tests/unit/work-report/handle-tool-call.test.ts)、[Contract](https://github.com/daichitk1/work-report-mcp-example/blob/main/packages/contracts/tests/work-report.test.ts)               |
| integration（結合）   | HTTP・認可・MCP、またはHost・state・Viewの接続を確認する       | [MCP通信](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/api/tests/integration/mcp/remote-server.test.ts)、[画面の失敗状態](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/web/tests/integration/WorkReportAppFailure.test.tsx) |
| component             | Reactの表示とクリックをDOM上で確認する                         | [WorkReportView](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/web/tests/component/WorkReportView.test.tsx)                                                                                                                                         |
| architecture-boundary | importの依存方向が責務の境界を越えていないか確認する           | [依存方向の検査](https://github.com/daichitk1/work-report-mcp-example/blob/main/tests/architecture-boundary.test.ts)                                                                                                                                                      |
| repository-layout     | 実ファイルの配置とCode Guideの案内が一致するか確認する         | [配置の検査](https://github.com/daichitk1/work-report-mcp-example/blob/main/tests/repository-layout.test.ts)                                                                                                                                                              |
| e2e                   | Playwrightの実ブラウザで表示・操作・画面幅による違いを確認する | [Work Reportの表示](https://github.com/daichitk1/work-report-mcp-example/blob/main/apps/web/tests/e2e/work-report.spec.ts)                                                                                                                                                |

このリポジトリのUI E2EではHostをFakeへ置き換え、受信後の本番UI経路を通します。MCPのHTTP結合テストでも認可関数を差し替えます。それぞれの対象範囲を読むことで、実Auth0・ChatGPTまで接続した確認と区別できます。

`pnpm check` は型・単体テスト・構成境界・ビルド等を検証します。`pnpm test:e2e` はブラウザ上の表示・操作を検証します。
これらだけで、実Auth0ログインやChatGPT上の認可成功を確認したことにはなりません。

モデルのTool選択の評価は、このリポジトリの通常CIには含みません。
通常のテスト用データと実ユーザーの作業記録は区別してください。テストのファイルパス・レポートは合成サンプルであり、このリポジトリの実ファイル一覧や実施済み作業の記録ではありません。
