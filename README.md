# Work Report MCP

**ChatGPTが1つの依頼に対して行った作業を、見やすい作業レポートとして表示する個人開発のMCP Appです。**

MCP AppsのUI、Tool設計、Auth0を使ったOAuth対応を試しています。継続的なサービス提供やサポートを約束するものではありません。

```text
1ユーザー依頼 = 1 Work Report
```

## 表示する内容

今回の結果、判断の理由、実施した作業、確認済み・未確認、参考情報、次に依頼できる操作を1画面で確認できます。

Raw Tool Logや会話全体を表示するものではありません。レポートはモデルが整理した作業結果であり、実行の完全な監査証跡ではありません。

## Toolを使う場面

モデルに公開するWork Report用Toolは `show_work_report` の1つです。

通常は次の3条件をすべて満たす場合に使用します。

1. 具体的な作業依頼を受けている
2. 調査・判断・変更・確認など複数工程を行った
3. 最終結果を返す段階である

「今回何やった？」のような明示要求でも使用できます。単純な質問、雑談、アイデア相談だけ、作業途中の進捗報告では原則使用しません。これはTool選択の指示であり、毎回の自動発火を保証するものではありません。

## 構成

```text
ChatGPT ── OAuth認可 ── Auth0
   │
   │ Bearer Token付きMCPリクエスト
   ▼
Remote MCP Server
   │ OAuth / 入力サイズ / Schema / Sensitive Dataの検証
   ▼
structuredContent
   │
   ▼
ChatGPT内のMCP Apps UI
```

Server側で再要約や独自LLM推論は行いません。Tool ResultをUIの入力とします。アプリケーションはWork ReportをDatabaseへ永続化しませんが、ChatGPTの会話やホスティング事業者のログまで保存されないという意味ではありません。

## Tech Stack

| 領域             | 主な技術                  | 役割                                            |
| ---------------- | ------------------------- | ----------------------------------------------- |
| Frontend         | React + TypeScript + Vite | MCP AppsとしてChatGPT内に表示するWork Report UI |
| Backend          | Hono + TypeScript         | Remote MCP ServerのHTTP入口、OAuth、Tool実行    |
| MCP              | MCP SDK / MCP Apps SDK    | Tool・UI Resource・Host連携                     |
| Auth             | Auth0 / OAuth 2.0         | `/mcp`へのアクセス制御                          |
| Validation       | Zod                       | Work ReportのSchema検証と共通contract           |
| Runtime / Deploy | Node.js / Vercel          | Remote MCP ServerとUI Resourceの配信            |

つまり、`apps/web` が **ReactのMCP Apps UI**、`apps/api` が **HonoのRemote MCP Server** です。

## Repository structure

```text
apps/
  api/src/        Hono + TypeScript
    auth/          OAuth・トークン検証・利用可否の判断
    mcp/           MCP通信・サーバーの組立
    work-report/   Tool定義・入力検査・UI Resource
    logging/       認証失敗・入力拒否などのログ
  web/src/mcp-app/  React + TypeScript / MCP Apps UI
packages/
  contracts/       APIとUIの共通Schema・型
api/
  index.ts         Vercel Functionの入口
tests/             リポジトリ横断の構成・依存方向の検査
docs/              要件・設計・セットアップ・コードガイド・セキュリティ
```

**何を直すとき、どのファイルを開くかは [コードガイド](docs/code-guide.md) にまとめています。**
APIの全ファイルの役割、リクエストの流れ、テストの配置も確認できます。

DatabaseやWork Reportの履歴保存はMVPに含みません。

## 学習するときの読み方

[コードを読む順番](docs/code-guide.md#コードを読む順番)に沿って、共通Contract、Tool定義、Handler、登録、MCP Server、Transport、Hono / OAuth、Host接続、React state、UI、テストの順に読めます。各対象ファイルの先頭に、役割・前後のファイルとの関係・理解したいことを日本語コメントで記載しています。

実行時は、ChatGPTが `show_work_report` の入力を作り、HostがHonoの `/mcp` へ送ります。HTTP本文のサイズ制限とOAuth認可を通過すると、TransportがMCP Serverへつなぎ、Tool Handlerが入力を検証します。返された `structuredContent` はHostからReact MCP Appへ届き、再検証後に表示されます。表示用HTMLは、Toolに関連付けたUI Resourceとして別に取得されます。

## ローカルで確認する

Node.jsは `.nvmrc`、pnpmは `package.json` の `packageManager` に合わせます。

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm check
```

別ターミナルで起動します。

```bash
pnpm dev:mcp-app
pnpm dev:mcp-server
```

- UI開発サーバー: `http://127.0.0.1:5173`
- Remote MCP: `http://127.0.0.1:8787/mcp`
- Health check: `http://127.0.0.1:8787/health`

APIの開発・起動コマンドはリポジトリ直下の `.env` を読み込みます。設定例はダミーのURLであり、そのままAuth0にログインできるものではありません。OAuthはローカルでも無効化しません。

MCP Appsとしての表示には対応Hostが必要です。ブラウザで開発用UIを開くだけでは、ChatGPTとの接続を確認したことにはなりません。

Auth0の設定、UIのビルド、Hostとの接続手順は [セットアップ](docs/setup.md) を参照してください。

## 検証

```bash
pnpm check
pnpm --filter @work-report-mcp/web exec playwright install chromium
pnpm test:e2e
```

`pnpm check` はlint、format、typecheck、unit test、Repository Test、buildを実行します。実Auth0ログインやVercelの保護設定は別途確認が必要です。

## デプロイと公開の範囲

コードの公開と、作者の本番MCP Serverを第三者へ開放することは別です。自分で試す場合は、自分のAuth0・Vercel環境を設定してください。

- `/mcp`: OAuth必須
- `/.well-known/oauth-protected-resource`: 認証先のメタデータ
- `/.well-known/oauth-protected-resource/mcp`: path付きメタデータ
- `/health`: health check

Git pushごとのVercel自動deploymentは無効です。通常はlocalとGitHub Actionsで検証し、Vercel上でしか確認できない場合だけPreview、本番反映が必要な場合だけProductionを明示的にdeployします。

```bash
# Vercel上のruntime確認が必要な場合だけ
vercel deploy

# 本番反映が承認された場合だけ
vercel deploy --prod
```

GitHub Releaseの作成は必須ではありません。

運用時はOAuthの利用権限に加え、Previewの保護と不要なデプロイ・共有リンク・bypass設定を確認してください。

## セキュリティ

実際のAPI key、token、Cookie、Session ID、password、private key、非公開のファイル本文やRaw Tool Logを送らないでください。Sensitive Data Guardは補助的な検出であり、秘密情報を必ず除去する保証はありません。

詳細は [Security Boundaries](docs/security/boundaries.md) と [SECURITY.md](SECURITY.md) を参照してください。

## ドキュメント

- [ドキュメントサイト](https://daichitk1.github.io/work-report-mcp-example/)（GitHub Pagesを有効化・デプロイした後に閲覧可能）
- [要件定義](docs/requirements.md)
- [設計](docs/design.md)
- [Code Guide](docs/code-guide.md)
- [セットアップ](docs/setup.md)
- [Security Boundaries](docs/security/boundaries.md)
- [Security Policy](SECURITY.md)

ドキュメントサイトは `pnpm docs:build` で生成し、main更新時にGitHub ActionsからPagesへ配信します。リポジトリの **Settings → Pages → Build and deployment → Source** は **GitHub Actions** を選択してください。Pagesは仕様文書用で、MCP Serverの配信先ではありません。

## 対象外

会話全体・セッション全体・1日のまとめ、GitHubやCIの自動取得、Databaseへの履歴保存、独自LLM API、レポートからの自動再実行はMVPに含みません。

## ライセンス

現時点ではライセンス未設定です。再利用・改変・再配布を包括的に許諾するものではありません。依存パッケージや第三者の同梱物には、それぞれの利用条件が適用されます。
