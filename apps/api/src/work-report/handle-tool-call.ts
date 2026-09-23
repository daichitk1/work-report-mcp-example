/**
 * このファイルを読む前に（読む順番 3）
 *
 * 役割: ChatGPTが生成したTool入力を検証し、MCPのTool Resultを返す。
 * 前: tool-definition.tsは外部へ公開する説明とSchemaを定義する。
 * 次: register-tool.tsが、その定義とこのHandlerをMCP Serverへ接続する。
 * 理解したいこと: unknown → Payload Size → Zod Schema → Sensitive Data → structuredContent。
 * Server側でLLMによる再要約や事実の追加は行わない。検証成功は作業実施の証明ではない。
 */
import { workReportSchema, type WorkReport } from "@work-report-mcp/contracts";

import {
  emitSecurityEvent,
  noopSecurityEventLogger,
  type SecurityEventLogger,
} from "../logging/security-event.js";
import {
  inspectWorkReportInputSize,
  inspectWorkReportSecurity,
  type WorkReportSecurityIssue,
} from "./input-validation/inspect-report.js";

// contentは文字として伝える結果、structuredContentはUIへ渡す構造化された本文。
// 検証失敗時はisErrorを付け、表示用のWork Reportを返さない。
export type ShowWorkReportResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  structuredContent?: WorkReport;
};

const formatValidationError = (issues: { path: PropertyKey[]; message: string }[]): string =>
  [
    "Work Reportの構造が正しくありません。",
    ...issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`),
  ].join("\n");

/** errorへはfield pathとcategoryだけを出し、検出した値を出さない。 */
const formatSecurityError = (issues: WorkReportSecurityIssue[]): string =>
  [
    "Work Reportを安全に送信できません。",
    "秘密情報・個人識別子・ローカル情報の実値を除き、作業の意味だけにして再作成してください。",
    ...issues.map((issue) => `- ${issue.path}: ${issue.category}`),
  ].join("\n");

// Toolとしての失敗を返す。HTTPの401/403を返すOAuth層とは別の境界。
const rejection = (text: string): ShowWorkReportResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

/**
 * Serverは構造を検証するだけで、再要約も新しい事実の追加も行わない。
 *
 * Payload Size → Schema → Sensitive Dataの順に検査する。
 */
export const handleShowWorkReport = (
  // 通信由来の値はTypeScriptの型を信用できない。検査前にWorkReportと断定しない。
  input: unknown,
  securityEventLogger: SecurityEventLogger = noopSecurityEventLogger,
): ShowWorkReportResult => {
  // 1. 詳細なSchema検証より先にJSONのサイズ等を検査する。
  // app.tsのHTTP全体の上限とは別に、Tool入力そのものを制限する。
  const inputSizeIssues = inspectWorkReportInputSize(input);
  if (inputSizeIssues.length > 0) {
    emitSecurityEvent(securityEventLogger, {
      event: "work_report.payload_rejected",
      result: "rejected",
      route: "show_work_report",
    });
    return rejection(formatSecurityError(inputSizeIssues));
  }

  // 2. safeParseは例外ではなくsuccessで成否を返す。IDの一意性・参照先もここで検査する。
  const parsed = workReportSchema.safeParse(input);
  if (!parsed.success) {
    return rejection(formatValidationError(parsed.error.issues));
  }

  // 3. 形が分かった値に対し、秘密情報・ファイルパス・参考URLの条件を検査する。
  // これは検出ルールによる補助的な検査で、すべての秘密情報を検出する保証ではない。
  const securityIssues = inspectWorkReportSecurity(parsed.data);
  if (securityIssues.length > 0) {
    emitSecurityEvent(securityEventLogger, {
      event: "work_report.security_rejected",
      result: "rejected",
      route: "show_work_report",
    });
    return rejection(formatSecurityError(securityIssues));
  }

  return {
    content: [{ type: "text", text: parsed.data.title }],
    // 4. Zodの検証結果をHost経由でMCP Apps UIへ渡す。入力を再要約しない。
    // UI側はこの値を受け取り、再度Schemaを検証してready状態にする。
    structuredContent: parsed.data,
  };
};
