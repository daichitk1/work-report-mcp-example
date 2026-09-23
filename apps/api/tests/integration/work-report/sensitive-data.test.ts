/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/api/src/work-report/ のToolとinput-validation/
 *
 * MCP Tool経由でも秘密情報・path・URL・総量の検査が効くことを代表例で確認する。
 * 単体のPolicyを実際のTool経路へつなぎ忘れる不具合を防ぐ。検出値を応答へ返さないことも確認する。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { afterEach, describe, expect, it } from "vitest";

import { SHOW_WORK_REPORT_TOOL_NAME } from "../../../src/work-report/tool-definition.js";
import {
  createOversizedWorkReportFixture,
  createWorkReportFixture,
} from "../../fixtures/work-report.js";
import { createMcpClientHarness } from "../../helpers/mcp-client.js";

const harness = createMcpClientHarness("work-report-security-test");

const callTool = async (report: WorkReport) => {
  const client = await harness.connect();
  return client.callTool({
    name: SHOW_WORK_REPORT_TOOL_NAME,
    // MCP SDKのcallTool argumentsはRecordを要求するため、ここだけcastが必要。
    arguments: report as unknown as Record<string, unknown>,
  });
};

const report = (): WorkReport =>
  createWorkReportFixture({
    verification: [
      {
        id: "verification-1",
        description: "型の確認",
        status: "completed",
        result: "問題なし",
        relatedWorkIds: ["work-1"],
      },
    ],
  });

const oversizedReport = createOversizedWorkReportFixture;

const expectSecurityRejection = async (value: WorkReport, secret?: string) => {
  const result = await callTool(value);

  expect(result.isError).toBe(true);
  expect(result.structuredContent).toBeUndefined();

  const responseText = JSON.stringify(result.content);
  expect(responseText).toContain("安全");
  if (secret) {
    expect(responseText).not.toContain(secret);
  }
};

const sensitiveValues = [
  "sk-proj-1234567890abcdefgh",
  "ghp_123456789012345678901234567890123456",
  "github_pat_11AA1234567890abcdefghijklmnop",
  "AKIA1234567890ABCDEF",
  "Authorization: Bearer secret-token-value-123456",
  "eyJheader12345.eyJpayload12345.signature12345",
  "Cookie: session=abcdef1234567890",
  "client_secret=super-secret-value",
  "OPENAI_API_KEY=super-secret-value",
  "-----BEGIN PRIVATE KEY-----\nabcdef123456\n-----END PRIVATE KEY-----",
  "example-user@example.com",
];

const unsafePaths = [
  "/Users/example-user/private/auth.ts",
  "~/private/auth.ts",
  "../private/auth.ts",
  "src/../../private/auth.ts",
  "C:\\Users\\example-user\\private\\auth.ts",
  "https://example.com/source.ts",
];

afterEach(async () => {
  await harness.closeAll();
});

describe("show_work_report Sensitive Data Boundary", () => {
  it("rejects representative sensitive values without echoing them", async () => {
    for (const secret of sensitiveValues) {
      const value = report();
      value.completedWork[0]!.technicalDetail = secret;

      await expectSecurityRejection(value, secret);
    }
  });

  it("rejects non repository-relative file paths", async () => {
    for (const filePath of unsafePaths) {
      const value = report();
      value.completedWork[0]!.files = [filePath];

      await expectSecurityRejection(value, filePath);
    }
  });

  it.each(["https://user:password@example.com/docs", "ftp://example.com/private"])(
    "rejects an unsafe Reference URL without echoing it: %s",
    async (url) => {
      const value = report();
      value.references = [
        {
          id: "reference-1",
          title: "参考情報",
          url,
          reason: "確認に使用",
        },
      ];

      await expectSecurityRejection(value, url);
    },
  );

  it("rejects a Work Report larger than 64 KiB", async () => {
    await expectSecurityRejection(oversizedReport());
  });

  it("keeps a normal Work Report working", async () => {
    const value = report();
    const result = await callTool(value);

    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent).toEqual(value);
  });

  it("tells the model not to send secrets, raw logs, or file contents", async () => {
    const client = await harness.connect();
    const { tools } = await client.listTools();
    const description = tools[0]?.description ?? "";

    expect(description).toContain("秘密情報");
    expect(description).toContain("Raw");
    expect(description).toContain("ファイル本文");
  });
});
