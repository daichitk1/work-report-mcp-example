# 設計

[要件定義](./requirements.md) を、ChatGPTから呼び出せる1つのTool、OAuthで保護したRemote MCP Server、ChatGPT内で描画するMCP Apps UIとして実現します。この文書はシステムの構成と動作を説明します。

## 全体構成

ChatGPTが結果を構造化して `show_work_report` を呼び、Remote MCP Serverが認証と入力を検証します。返された結果をMCP Apps UIが表示し、ユーザーは必要なら次の依頼へ進めます。Auth0はChatGPTからMCP ServerへアクセスするためのOAuth認可を担当します。

| 部分                                | 役割                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------- |
| ChatGPT                             | Toolを使うか判断し、実施・判断・確認・残作業を1依頼分にまとめる            |
| MCP Server（Hono / MCP SDK）        | OAuth、入力の上限・Schema・安全性を検証し、Tool結果とUI Resourceを配信する |
| 共通Contract（Zod）                 | ServerとUIでWork Reportの形式を共有する                                    |
| MCP Apps UI（React / MCP Apps SDK） | 受け取った結果を再検証し、選択・展開・次の依頼への操作を提供する           |

Serverはレポートを再要約せず、独自LLMも呼びません。レポート履歴をアプリケーションのDatabaseに保存しません。ただし、ChatGPTやホスティング事業者側の保存を否定するものではありません。

## 公開する経路

Remote MCP ServerはVercelのFunctionで動かし、ChatGPTに `https://<host>/mcp` を登録します。

| 経路                                        | 役割                  | アクセス                 |
| ------------------------------------------- | --------------------- | ------------------------ |
| `/mcp`                                      | MCP ToolとUI Resource | OAuth必須                |
| `/.well-known/oauth-protected-resource`     | 認証先の発見          | 公開                     |
| `/.well-known/oauth-protected-resource/mcp` | `/mcp` 用の発見       | 公開                     |
| `/health`                                   | 起動状態              | 公開、秘密情報を含めない |

Auth0をAuthorization Server、MCP ServerをResource Serverとします。ChatGPTが認可を経てBearer tokenを送ったら、ServerはJWKS署名、issuer、`https://<host>/mcp` に対応するaudience、`exp`・`nbf`、`work-report:show` scopeを要求ごとに確認します。Auth0 client secretはResource Serverに置きません。利用者が設定する値と実接続の確認手順は [セットアップ](./setup.md) を参照してください。

## Toolとデータの流れ

`show_work_report` はWork Reportを入力として受け、検証できた結果を `structuredContent` に返します。UIのビルド結果は別のMCP UI Resourceとして配信し、HostがTool結果をUIへ渡します。

1. HTTP本文のサイズを確認し、OAuthでアクセスを認可します。
2. Tool入力の64 KiB上限と共通Schemaを確認します。
3. 秘密値・ファイルパス・参照URLを検査します。
4. 有効な入力だけを `structuredContent` として返し、UIで再検証して表示します。

認証、Schema、入力の安全性で問題があれば後続へ渡しません。Serverが秘密値を検出した場合はレポート全体を拒否し、マスクして通すことはしません。エラーとログには値ではなく違反した項目や分類など、必要な情報だけを残します。

## データモデル

共通Schemaは [`packages/contracts/src/work-report.ts`](https://github.com/daichitk1/work-report-mcp-example/blob/main/packages/contracts/src/work-report.ts) にあります。レポートの先頭に `title` と `summary` を置き、以下の6種類の配列を持ちます。

| 配列               | 主な内容                             | 他の項目との関係              |
| ------------------ | ------------------------------------ | ----------------------------- |
| `completedWork`    | 実施した作業・技術詳細・変更ファイル | `id` が関連付けの基点         |
| `decisions`        | AIの判断・理由                       | `relatedWorkIds` で作業を参照 |
| `verification`     | 確認事項・状態・結果・次の依頼       | `relatedWorkIds` で作業を参照 |
| `remainingWork`    | 残作業・次の依頼                     | 必要な場合だけ `action`       |
| `references`       | 実際に参照したURL・目的              | 安全なHTTP(S) URL             |
| `suggestedActions` | 次に依頼できる内容                   | ChatGPTへのメッセージ         |

すべての項目IDは1レポート内で一意とし、`relatedWorkIds` は存在する `completedWork.id` を参照します。6配列は必須ですが空配列を許します。`verification.status` は実施・未実施・不明を別々に保持し、検証結果の成否は `result` に記録します。

文字数・件数の上限は共通Schemaの `WORK_REPORT_LIMITS` に集約します。最大件数は作業・判断・確認がそれぞれ30、残作業・参考情報がそれぞれ20、次の依頼が10です。さらにTool入力のJSONは64 KiB以内とし、HTTP本文も別に制限します。いずれも超過を拒否し、内容を切り詰めません。

## 表示と操作

画面上部には結果、作業数、確認済み・未確認・不明の数を示します。作業・判断・確認の各項目を選択すると、その説明や関連項目を詳細欄で確認できます。判断には「AIによる判断」と明示し、作業を完了したことと検証を実施したことを区別します。

最初は平易な日本語を表示し、技術詳細やファイル名は展開して確認します。狭い画面では詳細をシートとして表示します。参考URLは表示と開く前に確認し、次の操作はHostを通じてChatGPTの次のユーザーメッセージへつなぎます。

UIは受信したデータをSchemaで再確認し、不正なデータを描画しません。Hostとの接続・取得・操作が失敗した場合は状況を表示し、成功した体裁でレポートを補完しません。

## 信頼境界

送信前のTool説明は秘密値を含めないようモデルに伝えますが、送信前の完全な保護にはなりません。Remote MCPへ到達した入力は信頼せず、API keyやtoken、Cookie、password、private key、不要な個人識別子、危険なファイルパスやURLを検査します。

`completedWork.files` はリポジトリ相対パスだけを許し、絶対パスや親ディレクトリ参照を拒否します。参考URLはHTTP(S)に限定し、認証情報や秘密値を含むURLを拒否します。ログは認証失敗や入力拒否などの限定したイベントのみを記録し、tokenやWork Report本文を残しません。検査対象と制限は [Security Boundaries](./security/boundaries.md) にまとめています。

## ドキュメントの配信

このドキュメントサイトはGitHub Pagesで配信する静的サイトです。MCP ServerとChatGPT内のUIはVercelから配信し、Pagesの公開だけではTool接続は動きません。サイト用のビルド結果だけをPagesへ渡します。
