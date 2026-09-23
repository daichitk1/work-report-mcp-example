/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/work-report/input-validation/payload-policy.ts
 *
 * JSONをUTF-8で測る64 KiB上限と、JSON化できない入力の拒否を保証する。
 * Schemaの文字数制限では捉えられない総量を制限する。HTTP全体の上限はapp.tsの別テスト。
 */
import { describe, expect, it } from "vitest";

import {
  MAX_WORK_REPORT_BYTES,
  inspectPayloadPolicy,
} from "../../../../src/work-report/input-validation/payload-policy.js";

describe("payload policy", () => {
  it("keeps the 64 KiB UTF-8 JSON limit", () => {
    expect(MAX_WORK_REPORT_BYTES).toBe(64 * 1024);

    const input = { summary: "a".repeat(70 * 1024) };

    expect(inspectPayloadPolicy(input)).toEqual([
      {
        path: "(root)",
        category: "payload_too_large",
      },
    ]);
  });

  it("accepts a small serializable payload", () => {
    expect(inspectPayloadPolicy({ title: "ok" })).toEqual([]);
  });

  it("fails closed when JSON serialization fails", () => {
    const input: Record<string, unknown> = {};
    input.self = input;

    expect(inspectPayloadPolicy(input)).toEqual([
      {
        path: "(root)",
        category: "invalid_payload",
      },
    ]);
  });
});
