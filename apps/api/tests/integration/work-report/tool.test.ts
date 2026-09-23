/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/api/src/work-report/tool-definition.ts・register-tool.ts・handle-tool-call.ts
 *
 * MCP Client経由でTool一覧・Schema・説明・UI URI・実行結果を確認する。
 * 定義だけ正しくてもHandlerの登録やstructuredContentの返却を誤る、といった接続の退行を防ぐ。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { afterEach, describe, expect, it } from "vitest";

import {
  SHOW_WORK_REPORT_TOOL_NAME,
  WORK_REPORT_UI_RESOURCE_URI,
} from "../../../src/work-report/tool-definition.js";
import { createMcpClientHarness } from "../../helpers/mcp-client.js";

const harness = createMcpClientHarness();
const connectClient = () => harness.connect();

const callTool = async (report: unknown) => {
  const client = await connectClient();
  return client.callTool({
    name: SHOW_WORK_REPORT_TOOL_NAME,
    arguments: report as Record<string, unknown>,
  });
};

const listTool = async () => {
  const client = await connectClient();
  const { tools } = await client.listTools();
  return { tools, tool: tools[0] };
};

const canonicalReport = (): WorkReport => ({
  title: "ログイン状態が切れる問題を修正",
  summary: "Cookie設定を変更し、関連する確認を行いました。",
  completedWork: [
    {
      id: "work-1",
      title: "Cookie設定を変更",
      description: "ログイン状態を維持するため、Cookie属性を調整しました。",
      technicalDetail: "SameSite属性を調整しました",
      files: ["src/auth/cookie.ts"],
    },
  ],
  decisions: [
    {
      id: "decision-1",
      description: "Cookie設定が問題に関係していると判断しました",
      reason: "ログアウトの発生条件がCookieの有効期限と一致していたためです。",
      relatedWorkIds: ["work-1"],
    },
  ],
  verification: [
    {
      id: "verification-1",
      description: "型の不整合がないか確認しました",
      status: "completed",
      result: "問題なし",
      relatedWorkIds: ["work-1"],
    },
    {
      id: "verification-2",
      description: "実ブラウザ確認",
      status: "not_completed",
      action: { label: "ブラウザで確認", prompt: "今回の変更を実ブラウザで確認して" },
    },
  ],
  remainingWork: [{ id: "remaining-1", description: "セッション期限の設計を見直す" }],
  references: [
    {
      id: "reference-1",
      title: "Set-Cookie - HTTP | MDN",
      url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Set-Cookie",
      reason: "SameSite属性の既定値を確認するため",
    },
  ],
  suggestedActions: [
    { id: "suggested-1", label: "PR用にまとめる", prompt: "今回の変更をPR説明用にまとめて" },
  ],
});

const emptyReport = (): WorkReport => ({
  title: "調査結果を整理",
  summary: "調査した内容を整理しました。",
  completedWork: [],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
});

afterEach(async () => {
  await harness.closeAll();
});

describe("show_work_report tool", () => {
  it("exposes exactly one model-facing Work Report tool", async () => {
    const { tools, tool } = await listTool();

    expect(tools).toHaveLength(1);
    expect(tool?.name).toBe("show_work_report");
    expect(SHOW_WORK_REPORT_TOOL_NAME).toBe("show_work_report");
  });

  it("uses the Work Report schema for input and output", async () => {
    const { tool } = await listTool();

    const required = tool?.inputSchema.required as string[] | undefined;
    expect(required).toEqual(
      expect.arrayContaining([
        "title",
        "summary",
        "completedWork",
        "decisions",
        "verification",
        "remainingWork",
        "references",
        "suggestedActions",
      ]),
    );
    expect(tool?.outputSchema?.required).toEqual(required);

    const properties = tool?.inputSchema.properties as Record<string, unknown>;
    const verification = properties.verification as { items: { properties: Record<string, any> } };
    expect(verification.items.properties.status.enum).toEqual([
      "completed",
      "not_completed",
      "unknown",
    ]);
  });

  it("returns a valid Work Report as structuredContent", async () => {
    const report = canonicalReport();

    const result = await callTool(report);

    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent).toEqual(report);
  });

  it("rejects a Work Report that fails schema validation", async () => {
    const invalidStatus = emptyReport() as unknown as Record<string, unknown>;
    invalidStatus.verification = [{ id: "verification-1", description: "確認", status: "passed" }];
    expect((await callTool(invalidStatus)).isError).toBe(true);

    const duplicatedId = emptyReport();
    duplicatedId.completedWork = [
      { id: "work-1", title: "作業A", description: "説明A" },
      { id: "work-1", title: "作業B", description: "説明B" },
    ];
    const duplicatedIdResult = await callTool(duplicatedId);
    expect(duplicatedIdResult.isError).toBe(true);
    expect(JSON.stringify(duplicatedIdResult.content)).toContain(
      "Work Reportの構造が正しくありません",
    );
    expect(duplicatedIdResult.structuredContent).toBeUndefined();

    const brokenRelation = emptyReport();
    brokenRelation.decisions = [
      { id: "decision-1", description: "判断", relatedWorkIds: ["work-404"] },
    ];
    expect((await callTool(brokenRelation)).isError).toBe(true);

    const invalidUrl = emptyReport();
    invalidUrl.references = [{ id: "reference-1", title: "参考", url: "参考にしたページ" }];
    expect((await callTool(invalidUrl)).isError).toBe(true);
  });

  it("does not add facts that the Work Report did not contain", async () => {
    const report = emptyReport();

    const result = await callTool(report);

    expect(result.structuredContent).toEqual(report);
    expect(result.structuredContent).not.toHaveProperty("evidence");
  });

  it("describes the normal trigger conditions A AND B AND C", async () => {
    const { tool } = await listTool();
    const description = tool?.description ?? "";

    expect(description).toContain("具体的な作業依頼");
    expect(description).toContain("複数の工程");
    expect(description).toContain("最終結果を返す");
    expect(description).toContain("直前の1つのユーザー依頼");
  });

  it("describes the explicit trigger", async () => {
    const { tool } = await listTool();
    const description = tool?.description ?? "";

    expect(description).toContain("明示的に要求");
    expect(description).toContain("今回何やった？");
  });

  it("describes when the tool must not be used", async () => {
    const { tool } = await listTool();
    const description = tool?.description ?? "";

    expect(description).toContain("単純な知識質問");
    expect(description).toContain("雑談");
    expect(description).toContain("作業途中");
  });

  it("links the tool to the Work Report UI resource", async () => {
    const { tool } = await listTool();

    expect(WORK_REPORT_UI_RESOURCE_URI.startsWith("ui://")).toBe(true);
    expect(tool?._meta).toMatchObject({ ui: { resourceUri: WORK_REPORT_UI_RESOURCE_URI } });
  });
});
