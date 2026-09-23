/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/api/src/work-report/handle-tool-call.ts と logging/security-event.ts
 *
 * MCP経由の入力拒否が、実値を含めないイベントとして記録されることを確認する。
 * loggerの例外で入力を許可してしまうことや、拒否した機密値をログへ複製することを防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterEach, describe, expect, it } from "vitest";

import type { SecurityEvent } from "../../../src/logging/security-event.js";
import { SHOW_WORK_REPORT_TOOL_NAME } from "../../../src/work-report/tool-definition.js";
import {
  createOversizedWorkReportFixture,
  createWorkReportFixture,
} from "../../fixtures/work-report.js";
import { createMcpClientHarness } from "../../helpers/mcp-client.js";

const harness = createMcpClientHarness("work-report-security-log-test");

const connectClient = (
  events: SecurityEvent[],
  logger: (event: SecurityEvent) => void = (event) => events.push(event),
): Promise<Client> => harness.connect({ securityEventLogger: logger });

const report = (): WorkReport => createWorkReportFixture();

const oversizedReport = createOversizedWorkReportFixture;

afterEach(async () => {
  await harness.closeAll();
});

describe("Work Report security events", () => {
  it("records a generic security rejection without exposing the secret Work Report value", async () => {
    const events: SecurityEvent[] = [];
    const client = await connectClient(events);
    const secret = "sk-proj-1234567890abcdefgh";
    const input = report();
    input.completedWork[0]!.technicalDetail = secret;

    const result = await client.callTool({
      name: SHOW_WORK_REPORT_TOOL_NAME,
      arguments: input as unknown as Record<string, unknown>,
    });

    expect(result.isError).toBe(true);
    expect(events).toEqual([
      {
        event: "work_report.security_rejected",
        result: "rejected",
        route: "show_work_report",
      },
    ]);
    expect(JSON.stringify(events)).not.toContain(secret);
  });

  it("records an oversized Work Report as a generic payload rejection", async () => {
    const events: SecurityEvent[] = [];
    const client = await connectClient(events);
    const input = oversizedReport();

    const result = await client.callTool({
      name: SHOW_WORK_REPORT_TOOL_NAME,
      arguments: input as unknown as Record<string, unknown>,
    });

    expect(result.isError).toBe(true);
    expect(events).toEqual([
      {
        event: "work_report.payload_rejected",
        result: "rejected",
        route: "show_work_report",
      },
    ]);
  });

  it("keeps rejecting sensitive input when the logger throws", async () => {
    const events: SecurityEvent[] = [];
    const client = await connectClient(events, () => {
      throw new Error("logger unavailable");
    });
    const input = report();
    input.completedWork[0]!.technicalDetail = "sk-proj-1234567890abcdefgh";

    const result = await client.callTool({
      name: SHOW_WORK_REPORT_TOOL_NAME,
      arguments: input as unknown as Record<string, unknown>,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });
});
