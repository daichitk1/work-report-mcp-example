# Security Policy

## 位置付け

Work Report MCPは個人開発のMCP Apps実装例です。セキュリティ監査の認証や、対応期限・可用性の保証を提供するものではありません。修正の検討対象は原則として最新の `main` とし、過去バージョンの保守は約束しません。

## 脆弱性の報告

公開IssueやPRに、脆弱性の悪用手順、credential、token、個人情報を投稿しないでください。

リポジトリのSecurityタブに **Report a vulnerability** が表示される場合は、GitHubのPrivate Vulnerability Reportingを利用してください。報告前に、非公開で送信できる経路か確認してください。

非公開の報告経路が利用できない場合、公開Issueでは「非公開でセキュリティ上の連絡をしたい」という連絡だけにとどめてください。詳細は非公開の連絡先が確定するまで送らないでください。存在を確認できていない連絡先や応答期限は案内しません。

## 対象と信頼境界

- OAuth token validation、`/mcp` authorization、Protected Resource Metadata
- 入力サイズ、Schema、Sensitive Data Guard、file path / reference URL validation
- MCP Apps UIのHost接続と外部リンク処理、Vercelの公開経路

OAuthは署名・issuer・audience・期限・scopeを検証します。設定できない場合はfail closedとし、認証を無効化して回避しません。ログインできることと、作者の本番環境を任意の第三者が利用してよいことは別です。

Vercel Deployment ProtectionとアプリケーションのOAuthは別の境界です。最新Productionだけでなく、古いPreviewの固定URL・alias・共有リンク・bypass設定も確認します。

## 入力と保存

Work Reportには作業の要約だけを渡します。秘密情報、個人情報、非公開ファイルの本文、Raw Tool Logを入力しないでください。検出ルールには見逃しがあるため、Sensitive Data Guardを情報漏えい防止の保証として扱いません。

アプリケーションはWork ReportをDatabaseへ永続化しません。一方、Hostの会話履歴、Vercelのリクエスト・実行ログ、Auth0の認証ログは別管理です。運用時は各事業者の保持期間・アクセス権・ログ設定を確認してください。

## SecretsとGit履歴

access token、refresh token、client secret、private key、Cookie、Session IDをcommitしないでください。`.env.example` にはplaceholderのみを置き、実値を含む `.env` は追跡しません。

秘密情報がcommitされた疑いがある場合、まず発行元で失効・再発行と利用状況の確認を行います。最新ファイルからの削除や履歴の書き換えだけで、コピー済みの情報を無効化することはできません。

履歴の書き換えや既存リポジトリの削除は、影響範囲とバックアップを確認して管理者が判断します。監査結果には秘密情報の実値を転記しません。

構成・設定手順は [セットアップ](docs/setup.md)、実装の境界は [Security Boundaries](docs/security/boundaries.md) を参照してください。
