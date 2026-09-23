import type { WorkReport } from "@work-report-mcp/contracts";

import type { WorkReportSecurityIssue } from "./security-issue.js";

export const isRepositoryRelativePath = (value: string): boolean => {
  if (value.length === 0 || value.includes("\0") || value.includes("\\")) return false;
  if (value.startsWith("/") || value === "~" || value.startsWith("~/")) return false;
  if (/^[A-Za-z]:/u.test(value)) return false;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(value)) return false;

  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
};

export const inspectFilePathPolicy = (report: WorkReport): WorkReportSecurityIssue[] => {
  const issues: WorkReportSecurityIssue[] = [];

  report.completedWork.forEach((work, workIndex) => {
    work.files?.forEach((file, fileIndex) => {
      if (!isRepositoryRelativePath(file)) {
        issues.push({
          path: `completedWork.${workIndex}.files.${fileIndex}`,
          category: "unsafe_file_path",
        });
      }
    });
  });

  return issues;
};
