/**
 * Work Report Security Policyが返せる違反categoryの全体。
 *
 * 任意文字列にしないのは、categoryのtypoと未定義categoryの追加を
 * compile errorとして検出するため。新しいPolicyを追加するときは、
 * まずこのlistへcategoryを追加する。
 */
export const WORK_REPORT_SECURITY_CATEGORIES = [
  // Payload Policy
  "invalid_payload",
  "payload_too_large",

  // Credential Policy
  "api_key",
  "github_token",
  "github_pat",
  "aws_access_key",
  "bearer_token",
  "jwt",
  "cookie",
  "private_key",
  "email",
  "credential_assignment",
  "sensitive_env",

  // File Path Policy
  "unsafe_file_path",

  // Reference URL Policy
  "invalid_reference_url",
  "unsafe_reference_scheme",
  "reference_embedded_credentials",
  "reference_sensitive_query",
] as const;

export type WorkReportSecurityCategory = (typeof WORK_REPORT_SECURITY_CATEGORIES)[number];

/**
 * どの入力fieldにどのPolicy違反があったかだけを表す。
 * 検出した値そのものは保持しない。
 */
export type WorkReportSecurityIssue = {
  path: string;
  category: WorkReportSecurityCategory;
};
