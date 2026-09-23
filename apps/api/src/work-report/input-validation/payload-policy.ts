import type { WorkReportSecurityIssue } from "./security-issue.js";

export const MAX_WORK_REPORT_BYTES = 64 * 1024;

export const inspectPayloadPolicy = (input: unknown): WorkReportSecurityIssue[] => {
  let serialized: string | undefined;

  try {
    serialized = JSON.stringify(input);
  } catch {
    return [{ path: "(root)", category: "invalid_payload" }];
  }

  if (serialized === undefined) {
    return [{ path: "(root)", category: "invalid_payload" }];
  }

  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength <= MAX_WORK_REPORT_BYTES) return [];

  return [{ path: "(root)", category: "payload_too_large" }];
};
