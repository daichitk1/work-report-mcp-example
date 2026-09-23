/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/work-report/input-validation/ 配下の各Policyとsecurity-issue.ts
 *
 * 各拒否categoryが定義と一致し、検査結果へ検出値を含めないことを保証する。
 * 入力を拒否できても、応答やログ用のissueに機密値を複製してしまう不具合を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { describe, expect, it } from "vitest";

import { inspectCredentialPolicy } from "../../../../src/work-report/input-validation/credential-policy.js";
import { inspectFilePathPolicy } from "../../../../src/work-report/input-validation/file-path-policy.js";
import {
  MAX_WORK_REPORT_BYTES,
  inspectPayloadPolicy,
} from "../../../../src/work-report/input-validation/payload-policy.js";
import { inspectReferenceUrlPolicy } from "../../../../src/work-report/input-validation/reference-url-policy.js";
import {
  WORK_REPORT_SECURITY_CATEGORIES,
  type WorkReportSecurityCategory,
  type WorkReportSecurityIssue,
} from "../../../../src/work-report/input-validation/security-issue.js";

const report = (overrides: Partial<WorkReport> = {}): WorkReport => ({
  title: "Security policy fixture",
  summary: "作業の意味だけを記録します。",
  completedWork: [],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
  ...overrides,
});

const reportWithSummary = (summary: string): WorkReport => report({ summary });

const reportWithReferenceUrl = (url: string): WorkReport =>
  report({ references: [{ id: "reference-1", title: "参考", url }] });

/**
 * 各Security categoryを実際に発生させる最小入力。
 *
 * `Record<WorkReportSecurityCategory, ...>` にしているため、categoryをunionへ
 * 追加したのにsampleを追加していない場合はcompile errorになる。
 */
const categorySamples: Record<WorkReportSecurityCategory, () => WorkReportSecurityIssue[]> = {
  invalid_payload: () => inspectPayloadPolicy(undefined),
  payload_too_large: () =>
    inspectPayloadPolicy(reportWithSummary("あ".repeat(MAX_WORK_REPORT_BYTES))),

  api_key: () => inspectCredentialPolicy(reportWithSummary("sk-abcdefghijklmnopqrst")),
  github_token: () => inspectCredentialPolicy(reportWithSummary("ghp_abcdefghijklmnopqrstuvwx")),
  github_pat: () =>
    inspectCredentialPolicy(reportWithSummary("github_pat_abcdefghijklmnopqrstuvwx")),
  aws_access_key: () => inspectCredentialPolicy(reportWithSummary("AKIAIOSFODNN7EXAMPLE")),
  bearer_token: () => inspectCredentialPolicy(reportWithSummary("Bearer abcdefghijklmnop")),
  jwt: () =>
    inspectCredentialPolicy(
      reportWithSummary("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27u"),
    ),
  cookie: () => inspectCredentialPolicy(reportWithSummary("Cookie: session=abc123def456")),
  private_key: () => inspectCredentialPolicy(reportWithSummary("-----BEGIN PRIVATE KEY-----")),
  email: () => inspectCredentialPolicy(reportWithSummary("contact@example.com")),
  credential_assignment: () => inspectCredentialPolicy(reportWithSummary("password: hunter22")),
  sensitive_env: () => inspectCredentialPolicy(reportWithSummary("DATABASE_TOKEN=abcdef123456")),

  unsafe_file_path: () =>
    inspectFilePathPolicy(
      report({
        completedWork: [
          { id: "work-1", title: "作業", description: "説明", files: ["/etc/passwd"] },
        ],
      }),
    ),

  invalid_reference_url: () => inspectReferenceUrlPolicy(reportWithReferenceUrl("not-a-url")),
  unsafe_reference_scheme: () =>
    inspectReferenceUrlPolicy(reportWithReferenceUrl("javascript:alert(1)")),
  reference_embedded_credentials: () =>
    inspectReferenceUrlPolicy(reportWithReferenceUrl("https://user:pass@example.com/")),
  reference_sensitive_query: () =>
    inspectReferenceUrlPolicy(reportWithReferenceUrl("https://example.com/?token=abcdef")),
};

describe("Work Report Security category contract", () => {
  it("declares every category exactly once", () => {
    expect(new Set(WORK_REPORT_SECURITY_CATEGORIES).size).toBe(
      WORK_REPORT_SECURITY_CATEGORIES.length,
    );
  });

  it("covers every declared category with a sample input", () => {
    expect(Object.keys(categorySamples).toSorted()).toEqual(
      [...WORK_REPORT_SECURITY_CATEGORIES].toSorted(),
    );
  });

  it.each(WORK_REPORT_SECURITY_CATEGORIES)("reports %s for its sample input", (category) => {
    const issues = categorySamples[category]();

    expect(issues.map((issue) => issue.category)).toEqual([category]);
  });

  it("never carries the inspected value into the issue", () => {
    const secret = "ghp_abcdefghijklmnopqrstuvwx";
    const issues = inspectCredentialPolicy(reportWithSummary(secret));

    for (const issue of issues) {
      expect(Object.keys(issue).toSorted()).toEqual(["category", "path"]);
      expect(JSON.stringify(issue)).not.toContain(secret);
    }
  });
});
