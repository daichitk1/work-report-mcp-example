import type { WorkReport } from "@work-report-mcp/contracts";

import type { WorkReportSecurityCategory, WorkReportSecurityIssue } from "./security-issue.js";

type SensitivePattern = {
  category: WorkReportSecurityCategory;
  pattern: RegExp;
};

const redactedValuePattern = /^(?:<redacted>|\[redacted\]|\*{3,}|x{4,}|redacted)$/iu;

const directSensitivePatterns: SensitivePattern[] = [
  {
    category: "api_key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/u,
  },
  {
    category: "github_token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/u,
  },
  {
    category: "github_pat",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/u,
  },
  {
    category: "aws_access_key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u,
  },
  {
    category: "bearer_token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{12,}={0,2}\b/iu,
  },
  {
    category: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
  },
  {
    category: "cookie",
    pattern: /\b(?:Cookie|Set-Cookie)\s*:\s*[^\r\n]*=[^\r\n]+/iu,
  },
  {
    category: "private_key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  },
  {
    category: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  },
];

const assignmentPatterns: SensitivePattern[] = [
  {
    category: "credential_assignment",
    pattern: /\b(?:password|passwd|secret)\b\s*[:=]\s*["']?([^\s"',;]{6,})/iu,
  },
  {
    category: "credential_assignment",
    pattern: /\bapi[_-]?key\b\s*[:=]\s*["']?([^\s"',;]{6,})/iu,
  },
  {
    category: "credential_assignment",
    pattern: /\b(?:access|refresh)[_-]?token\b\s*[:=]\s*["']?([^\s"',;]{6,})/iu,
  },
  {
    category: "credential_assignment",
    pattern: /\b(?:session[_-]?id|client[_-]?secret)\b\s*[:=]\s*["']?([^\s"',;]{6,})/iu,
  },
  {
    category: "sensitive_env",
    pattern: /\b[A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*([^\s#]{6,})/u,
  },
  {
    category: "sensitive_env",
    pattern: /\b[A-Z0-9_]*(?:PRIVATE_KEY|SESSION_ID|CLIENT_SECRET)\s*=\s*([^\s#]{6,})/u,
  },
];

const findSensitiveCategory = (value: string): WorkReportSecurityCategory | undefined => {
  for (const { category, pattern } of directSensitivePatterns) {
    if (pattern.test(value)) return category;
  }

  for (const { category, pattern } of assignmentPatterns) {
    const assignedValue = value.match(pattern)?.[1];
    if (assignedValue && !redactedValuePattern.test(assignedValue)) {
      return category;
    }
  }

  return undefined;
};

const isReferenceUrlPath = (path: string, key: string): boolean =>
  key === "url" && /^references\.\d+$/u.test(path);

const inspectStrings = (value: unknown, path: string, issues: WorkReportSecurityIssue[]): void => {
  if (typeof value === "string") {
    const category = findSensitiveCategory(value);
    if (category) issues.push({ path, category });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectStrings(item, `${path}.${index}`, issues));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (isReferenceUrlPath(path, key)) continue;
      inspectStrings(child, path ? `${path}.${key}` : key, issues);
    }
  }
};

export const inspectCredentialPolicy = (report: WorkReport): WorkReportSecurityIssue[] => {
  const issues: WorkReportSecurityIssue[] = [];
  inspectStrings(report, "", issues);
  return issues;
};
