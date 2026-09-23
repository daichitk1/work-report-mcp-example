/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/work-report/input-validation/credential-policy.ts
 *
 * 代表的な機密情報パターンの検出と、明示的に伏せた値の扱いを確認する。
 * 他のURL検査との責務分担も確認する。ここで扱う例の検出は、あらゆる秘密情報の検出保証ではない。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { describe, expect, it } from "vitest";

import { inspectCredentialPolicy } from "../../../../src/work-report/input-validation/credential-policy.js";

const report = (): WorkReport => ({
  title: "認証処理を修正",
  summary: "認証処理の問題を修正しました。",
  completedWork: [
    {
      id: "work-1",
      title: "認証処理を変更",
      description: "認証情報の扱いを見直しました。",
      technicalDetail: "Authorization headerの生成処理を変更しました。",
      files: ["src/auth/session.ts"],
    },
  ],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
});

describe("credential policy", () => {
  it.each([
    ["sk-proj-1234567890abcdefgh", "api_key"],
    ["ghp_123456789012345678901234567890123456", "github_token"],
    ["OPENAI_API_KEY=super-secret-value", "sensitive_env"],
    ["client_secret=super-secret-value", "credential_assignment"],
    ["daichi@example.com", "email"],
  ])("detects %s without returning the value", (value, category) => {
    const input = report();
    input.completedWork[0]!.technicalDetail = value;

    const issues = inspectCredentialPolicy(input);

    expect(issues).toEqual([
      {
        path: "completedWork.0.technicalDetail",
        category,
      },
    ]);
    expect(JSON.stringify(issues)).not.toContain(value);
  });

  it("allows explicitly redacted credential assignments", () => {
    const input = report();
    input.completedWork[0]!.technicalDetail = "client_secret=<redacted>";

    expect(inspectCredentialPolicy(input)).toEqual([]);
  });

  it("leaves references[].url to the Reference URL policy", () => {
    const input = report();
    input.references = [
      {
        id: "reference-1",
        title: "参考情報",
        url: "https://user:password@example.com/docs?token=secret-value",
      },
    ];

    expect(inspectCredentialPolicy(input)).toEqual([]);
  });
});
