---
status: canonical
owner: security
update-when: Work Reportのtrust boundaryが変わる
---

# Security Boundaries

## Trust boundaries

```text
ChatGPT
  ↓
Remote MCP HTTP boundary
  ↓
OAuth authorization
  ↓
MCP transport
  ↓
Work Report validation
  ↓
MCP Apps UI
```

各境界でfail closedを基本とする。

## OAuth

`/mcp` ではrequestごとに次を検証する。

- Bearer tokenの存在
- JWKS signature
- issuer
- audience
- `exp`
- `nbf`
- required scope `work-report:show`

未認証は401、scope不足は403を返す。

`/health` とProtected Resource Metadataはpublicだが、credentialやidentityを返さない。

## Work Report input

Tool descriptionで秘密情報を送らないよう指示し、Server側でも入力を検証する。

拒否対象:

- API key / access token / refresh token
- Bearer token / JWT
- Cookie / Session ID
- password / secret / credential
- PEM / OpenSSH private key
- secretを含む `.env` 形式
- Work Reportに不要なemail address等の個人識別子
- absolute local path / home path / Windows drive path / parent traversal
- 64 KiBを超えるWork Report JSON
- credentialを含むReference URL

Sensitive Dataを検出した場合はmaskして続行せず、Report全体を拒否する。

### Security Issue contract

Policyが返すのは「どの入力fieldに、どの違反があったか」だけとする。

```ts
type WorkReportSecurityIssue = {
  path: string;
  category: WorkReportSecurityCategory;
};
```

`category` は closed union とし、任意文字列を許さない。categoryの一覧は
`apps/api/src/work-report/input-validation/security-issue.ts` の
`WORK_REPORT_SECURITY_CATEGORIES` を正とする。これにより、categoryのtypoと
未定義categoryの追加がcompile errorになる。

検出した値そのものはIssueへ入れない。error文面にもcategoryとpathだけを出す。

Security IssueとSecurity Eventは別Contractとして維持する。Issueは入力のどこが
違反したかを表し、Eventはruntimeで何が起きたかを表す。categoryをEventへ流さない。

## HTTP runtime

HTTP request bodyはTool payloadとは別に上限を持つ。

```text
Vercel platform protection
  ↓
HTTP request size boundary
  ↓
OAuth
  ↓
MCP transport
  ↓
Tool payload policy
```

unexpected errorではstack traceやlibrary内部情報をpublic responseへ出さない。

## Logging

Security eventはallowlistされたmetadataだけを記録する。

記録しないもの:

- Authorization header
- access / refresh token
- JWT payload
- Cookie / Session ID
- Work Report本文
- detected secret value
- password
- private key
- unnecessary PII

## UI

- stringをHTMLとして直接描画しない
- `dangerouslySetInnerHTML` を使用しない
- external navigationはvalidated Reference URLからだけ行う
- UI境界でもReference URLを再確認し、`http:` / `https:` 以外をHostの`openLink`へ渡さない
- Suggested Actionは外部処理を直接実行せず、次のChatGPT user messageへつなぐ

## Supply chain

- GitHub Actionsはcommit SHAへpinする
- workflow permissionは最小化する
- pnpm package updateは互換性とテスト結果を確認してから取り込む
- GitHub Actions updateはDependabotで作成する
- private repositoryでは追加依存なしのRepository SASTで高リスクなTypeScript / JavaScript sinkを継続検査する
- Public化後はCodeQLを追加レイヤーとしてJavaScript / TypeScript解析に使う
- untrusted PR codeへsecretを渡さない
