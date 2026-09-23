import type { WorkReport } from "@work-report-mcp/contracts";

import { inspectCredentialPolicy } from "./credential-policy.js";
import { inspectFilePathPolicy } from "./file-path-policy.js";
import { inspectPayloadPolicy } from "./payload-policy.js";
import { inspectReferenceUrlPolicy } from "./reference-url-policy.js";

export type { WorkReportSecurityIssue } from "./security-issue.js";

export const inspectWorkReportInputSize = inspectPayloadPolicy;

export const inspectWorkReportSecurity = (report: WorkReport) => [
  ...inspectCredentialPolicy(report),
  ...inspectFilePathPolicy(report),
  ...inspectReferenceUrlPolicy(report),
];
