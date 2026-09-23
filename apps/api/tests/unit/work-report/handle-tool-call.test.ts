/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/work-report/handle-tool-call.ts
 *
 * Handlerを直接呼び、成功時のstructuredContentと構造・サイズ・秘密情報の拒否を確認する。
 * MCP通信を挟まず、検査結果・ログへ機密値を渡さない境界と返却データを確かめる。
 */
import { describe, expect, it } from "vitest";

import type { SecurityEvent } from "../../../src/logging/security-event.js";
import { handleShowWorkReport } from "../../../src/work-report/handle-tool-call.js";
import {
  createOversizedWorkReportFixture,
  createWorkReportFixture,
} from "../../fixtures/work-report.js";

const collectEvents = () => {
  const events: SecurityEvent[] = [];
  return { events, logger: (event: SecurityEvent) => events.push(event) };
};

/**
 * Tool定義から分離したRuntime handlerを、MCP Serverを起動せずに直接検証する。
 * 検査順序はPayload → Schema → Sensitive Dataとする。
 */
describe("handleShowWorkReport", () => {
  it("returns the validated Work Report as structuredContent", () => {
    const report = createWorkReportFixture();

    const result = handleShowWorkReport(report);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(report);
    expect(result.content[0]?.text).toBe(report.title);
  });

  it("rejects an invalid structure without echoing the input", () => {
    const result = handleShowWorkReport({ title: "壊れたReport" });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(result.content[0]?.text).toContain("構造が正しくありません");
    expect(JSON.stringify(result)).not.toContain("壊れたReport");
  });

  it("rejects an oversized payload and records a payload event", () => {
    const { events, logger } = collectEvents();

    const result = handleShowWorkReport(createOversizedWorkReportFixture(), logger);

    expect(result.isError).toBe(true);
    expect(events).toEqual([
      { event: "work_report.payload_rejected", result: "rejected", route: "show_work_report" },
    ]);
  });

  it("rejects a sensitive value and records a security event without the value", () => {
    const { events, logger } = collectEvents();
    const secret = "ghp_abcdefghijklmnopqrstuvwx";

    const result = handleShowWorkReport(
      createWorkReportFixture({
        completedWork: [
          { id: "work-1", title: "作業", description: "説明", technicalDetail: secret },
        ],
      }),
      logger,
    );

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(events).toEqual([
      { event: "work_report.security_rejected", result: "rejected", route: "show_work_report" },
    ]);
  });

  it("emits no security event for a normal Work Report", () => {
    const { events, logger } = collectEvents();

    handleShowWorkReport(createWorkReportFixture(), logger);

    expect(events).toEqual([]);
  });
});
