import type { WorkReport } from "@work-report-mcp/contracts";

import type { WorkReportSecurityIssue } from "./security-issue.js";

const sensitiveQueryKeys = new Set([
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "key",
  "secret",
  "password",
  "passwd",
  "session",
  "session_id",
  "client_secret",
  "authorization",
  "auth",
]);

const normalizeQueryKey = (key: string): string => key.toLowerCase().replaceAll("-", "_");

const inspectReferenceUrl = (value: string, path: string): WorkReportSecurityIssue | undefined => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { path, category: "invalid_reference_url" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { path, category: "unsafe_reference_scheme" };
  }

  if (url.username || url.password) {
    return { path, category: "reference_embedded_credentials" };
  }

  for (const key of url.searchParams.keys()) {
    if (sensitiveQueryKeys.has(normalizeQueryKey(key))) {
      return { path, category: "reference_sensitive_query" };
    }
  }

  return undefined;
};

export const inspectReferenceUrlPolicy = (report: WorkReport): WorkReportSecurityIssue[] => {
  const issues: WorkReportSecurityIssue[] = [];

  report.references.forEach((reference, referenceIndex) => {
    const issue = inspectReferenceUrl(reference.url, `references.${referenceIndex}.url`);
    if (issue) issues.push(issue);
  });

  return issues;
};
