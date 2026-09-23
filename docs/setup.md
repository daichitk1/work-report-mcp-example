# セットアップ

このリポジトリには、**コードと画面をローカルで検証する**手順と、**自分のAuth0・HTTPS環境を用意してChatGPTから使う**手順があります。前者はAuth0アカウントなしで進められます。後者では、公開可能なHTTPSのMCP URLが必要です。

ChatGPTから接続する場合は、自分でデプロイしたMCP Serverと自分のAuth0テナントを使います。OpenAI API keyや独自のLLM API key、Databaseは必要ありません。

> **確認範囲:** これは自分の環境で接続を試すための設定例と確認手順です。`pnpm check` とE2Eは実際のAuth0ログインやChatGPTとのOAuth接続を検証しません。最後まで動くかどうかは、手順5の認証経路と手順6のTool・UIを実環境で確認して判断してください。Auth0やChatGPTの接続画面が示す値を、本文の例より優先します。

## 1. ローカルでインストール・検証する

Node.jsは `.nvmrc`（22.23.2）、pnpmは `package.json` の `packageManager`（11.20.0）に合わせます。

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm check
pnpm --filter @work-report-mcp/web exec playwright install chromium
pnpm test:e2e
```

`.env` がすでにある場合は上書きせず、必要な設定だけ加えます。`.env.example` のAuth0 URLとMCP URLはダミーです。コピーしただけではAuth0へログインできません。

別々のターミナルで起動します。

```bash
pnpm dev:mcp-app
```

```bash
pnpm dev:mcp-server
```

- UI開発サーバー: `http://127.0.0.1:5173`
- Remote MCP: `http://127.0.0.1:8787/mcp`
- Health check: `http://127.0.0.1:8787/health`

```bash
curl -i http://127.0.0.1:8787/health
curl -i http://127.0.0.1:8787/mcp
```

`/health` の200はサーバーの起動確認だけです。OAuth設定が使えない場合、`/mcp` は503で閉じます。構文上有効なダミー設定が入っていてtokenがない場合は401になります。どちらもChatGPTで認証済みのToolを使えた証拠にはなりません。

`pnpm check` とE2Eはローカルの実装・テストを確認するものです。開発用UIをブラウザで開くだけでも、ChatGPT Hostとの連携確認にはなりません。

## 2. ChatGPTで使うHTTPSのMCP URLを決める

例として、**自分が管理する**次の固定URLを使います。以降はこの値を `MCP_URL` と呼びます。

```text
MCP_URL=https://your-mcp.example.com/mcp
```

Vercelを使う場合は、まず自分のコピーしたリポジトリからVercel Projectを作成し、Root Directoryをリポジトリ直下にしてProduction URLを確定します。実際の固定HTTPS URLに置き換え、URLのpathは `/mcp` にしてください。URLにquery、fragment、ユーザー名・パスワードを含めません。Auth0のAPI Identifier、MCP Serverの環境変数、ChatGPTに登録するURLは同じ `MCP_URL` を使います。

ローカルの `http://127.0.0.1:8787/mcp` は、この実装のOAuth resource URLには設定できません。ChatGPTで動作を確認するときはHTTPSで到達できるMCP URLを用意してください。

## 3. 自分のAuth0を設定する

このMCP ServerはOAuthの**Resource Server**です。ログイン画面・ユーザー認証・access tokenの発行はAuth0、OAuth Clientとしての接続はChatGPTが担当します。React UIにAuth0 SDKを導入する構成ではありません。

1. Auth0 Dashboardの **Applications → APIs** で自分のAPIを作成する。Identifierに `MCP_URL` をそのまま指定し、署名方式にRS256を設定する。
2. APIのpermission（scope）として `work-report:show` を作成する。
3. このToolを使わせるユーザーとOAuth Clientを決める。自分だけで試すなら、Auth0側のRBACやユーザーへの権限割り当てを使って、そのユーザーだけに `work-report:show` を付与する。必要に応じて登録可能なClientも制限する。
4. Auth0のOAuth discovery、Authorization Code + PKCE（S256）、`resource` parameterへの対応を確認する。Auth0環境によってはResource Parameter Compatibility Profile等の設定が必要になる。
5. ChatGPT側の接続画面でOAuth Clientの方式を選ぶ。Auth0環境がCIMDに対応する場合はCIMDを優先し、利用できない場合は対応する登録方式を選ぶ。手動でClientやcallback URLを登録する場合は、**その接続画面に表示される実際のclient情報とredirect URIを正確に使う**。固定のcallback URLを推測して登録しない。

Serverの `apps/api/src/auth/token-verifier.ts` は署名・issuer・audience・有効期限を検証し、`authorization.ts` はJWTの `scope` claimに `work-report:show` があるかを確認します。Auth0側でpermissionを定義するだけでは利用者に権限を付与したことにはなりません。また、`permissions` claimだけに権限があっても、`scope` claimに含まれなければこの実装は403で拒否します。

**このServerには、ユーザーIDによる所有者allowlistはありません。** 正しいaudience・署名と `work-report:show` を持つtokenを発行できるユーザーはToolを呼べます。自分専用にしたい場合はAuth0側で発行対象を制限してください。

## 4. MCP ServerにAuth0の公開設定を渡してデプロイする

Vercel ProjectのProduction環境変数へ、**自分の**Auth0 tenantと `MCP_URL` を設定します。

```dotenv
WORK_REPORT_AUTH_ISSUER=https://your-tenant.auth0.com/
WORK_REPORT_AUTH_AUDIENCE=https://your-mcp.example.com/mcp
WORK_REPORT_MCP_RESOURCE_URL=https://your-mcp.example.com/mcp
```

`WORK_REPORT_AUTH_AUDIENCE` と `WORK_REPORT_MCP_RESOURCE_URL` は完全に一致させます。`WORK_REPORT_AUTH_ISSUER` はAuth0が発行するtokenのissuerと一致させます。標準以外のJWKS endpointを使う場合にだけ `WORK_REPORT_AUTH_JWKS_URI` を指定します。

このResource ServerにAuth0のclient secret、access token、refresh tokenを設定する必要はありません。実値をGit、`.env.example`、Issue、ログへ入れないでください。

`vercel.json` ではGit push時の自動deploymentを無効にしています。環境変数を設定した後、Vercelでデプロイを明示的に行います。手元からデプロイする場合は、リポジトリのルートで `vercel link` を使って自分のVercel Projectへ接続してから実行します。

```bash
vercel deploy --prod
```

ProductionとPreviewは別の公開経路です。Previewを作る場合はVercel Deployment Protectionと古い固定URL・alias・bypass設定も確認し、本番の認証設定を無条件に流用しないでください。

## 5. 認証前の公開経路を確認する

`MCP_URL` のホスト名を自分のデプロイ先に置き換えます。

```bash
curl -i https://your-mcp.example.com/health
curl -i https://your-mcp.example.com/.well-known/oauth-protected-resource/mcp
curl -i https://your-mcp.example.com/mcp
```

- `/health`: 200。サーバーが動いている。
- `/.well-known/oauth-protected-resource/mcp`: 200。`resource` が `MCP_URL`、`authorization_servers` が自分のAuth0 issuer、`scopes_supported` に `work-report:show` がある。
- 認証なしの `/mcp`: 401と、Protected Resource Metadataを指す `WWW-Authenticate`。**認証なしで200にならないこと**を確認する。

ここまでは認証済みの成功経路を証明しません。実際のBearer Tokenを使った接続確認は次の手順で行います。

## 6. ChatGPTに接続して画面を確認する

1. ChatGPTの **Settings → Security and login** でDeveloper modeを有効にする。利用できるかはアカウントやworkspace設定によります。
2. **ChatGPT Plugins** でプラスボタンから新規接続を作り、MCP Server URLに `MCP_URL`（`/mcp` まで）を入力する。
3. 発見された `show_work_report` とOAuthの接続情報を確認する。認証が求められたら自分のAuth0アカウントでログイン・認可する。
4. 新しいチャットで接続したPluginを選び、例えば「次の文を校正し、変更点とその理由を説明して。最後に、実際に行った作業を `show_work_report` で表示して：『このアプリは作業のけっかを見やすく表示します。』」と依頼する。
5. Tool Callが成功し、MCP AppsのWork Report画面が表示されることを確認する。表示用HTMLは `apps/web` のビルド結果をMCP UI Resourceとして配信しています。

Toolの説明・Schema・UI ResourceやOAuth設定を変更した場合は再デプロイし、ChatGPT側の接続情報をRefreshして新しいチャットで試してください。

## うまくいかないとき

| 見えた状態                       | 最初に確認する場所                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `/health` は200、`/mcp` が503    | 必須環境変数の有無、HTTPS URL、`/mcp` path、audience/resourceの一致。設定変更後の再デプロイ |
| 認証なしの `/mcp` が401          | 正常な認証要求。`WWW-Authenticate` とresource metadataを確認                                |
| ログイン後も401                  | tokenのissuer・audience・署名・期限、Auth0の`resource`対応、ChatGPTに登録したURL            |
| ログイン後に403                  | tokenの `scope` claimに `work-report:show` があるか。RBACとユーザーへの権限割り当て         |
| Toolは呼べるがUIが出ない         | `pnpm build` で作られるWeb bundleとMCP UI Resourceの配信、Host側の接続状態                  |
| Toolが一覧にない・更新が見えない | MCP URL、OAuth discovery、ChatGPT側のRefreshと新規チャット                                  |
| OAuth callback error             | ChatGPTの接続管理画面に表示されるclient情報・redirect URIとAuth0の登録内容                  |

実環境での完了条件は、**Auth0でのログイン → `show_work_report` の呼び出し → MCP Apps UIの表示**です。テストのPASS、`/health` の200、認証なしの401だけを成功扱いにしません。拒否時や成功時のログにtoken本文やWork Reportの本文が出ていないことも確認してください。

## 参考

- [OpenAI: MCP Serverの接続とテスト](https://developers.openai.com/plugins/deploy/connect-chatgpt/)
- [OpenAI: MCPの認証](https://developers.openai.com/plugins/build/auth/)
- [MCP Authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization)
- [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection)
