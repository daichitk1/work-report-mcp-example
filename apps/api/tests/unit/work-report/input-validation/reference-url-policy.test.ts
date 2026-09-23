/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/work-report/input-validation/reference-url-policy.ts
 *
 * 参考URLの許可・拒否条件を代表例で確認する。
 * URLとして解釈できるだけで、許可しないschemeや機密値を含むURLまで通す退行を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { describe, expect, it } from "vitest";

import { inspectReferenceUrlPolicy } from "../../../../src/work-report/input-validation/reference-url-policy.js";

const report = (url: string): WorkReport => ({
  title: "調査",
  summary: "確認しました。",
  completedWork: [],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [
    {
      id: "reference-1",
      title: "参考情報",
      url,
    },
  ],
  suggestedActions: [],
});

describe("Reference URL policy", () => {
  it.each([
    "https://example.com/docs",
    "http://localhost:3000/docs?page=2&lang=ja",
    "https://example.com/docs?utm_source=chatgpt",
  ])("allows normal HTTP(S) reference: %s", (url) => {
    expect(inspectReferenceUrlPolicy(report(url))).toEqual([]);
  });

  it.each([
    ["ftp://example.com/private", "unsafe_reference_scheme"],
    ["mailto:private@example.com", "unsafe_reference_scheme"],
    ["https://user@example.com/docs", "reference_embedded_credentials"],
    ["https://user:password@example.com/docs", "reference_embedded_credentials"],
    ["https://example.com/docs?token=secret-value", "reference_sensitive_query"],
    ["https://example.com/docs?api-key=secret-value", "reference_sensitive_query"],
    ["https://example.com/docs?session_id=secret-value", "reference_sensitive_query"],
    ["https://example.com/docs?client-secret=secret-value", "reference_sensitive_query"],
  ])("rejects unsafe reference without echoing it: %s", (url, category) => {
    const issues = inspectReferenceUrlPolicy(report(url));

    expect(issues).toEqual([
      {
        path: "references.0.url",
        category,
      },
    ]);
    expect(JSON.stringify(issues)).not.toContain(url);
  });
});
