/**
 * このテストを読む前に（読む順番 13）
 * 種類: 結合テスト
 * 対応する実装: apps/api/src/mcp/・app.ts・work-report/register-tool.ts・ui-resource.ts
 *
 * 実SDK Clientを使い、ToolとUI Resourceの関連付け・HTML配信・HTTP通信を確認する。
 * statelessな応答や入力にない事実を追加しない境界を確認し、部品の接続漏れを防ぐ。
 * HTTP試験では認可関数を差し替え、HTMLもテスト用。実Auth0やChatGPTとの接続は検証していない。
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { serve, type ServerType } from "@hono/node-server";
import type { WorkReport } from "@work-report-mcp/contracts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../../src/app.js";
import { createMcpServer } from "../../../src/mcp/server.js";
import {
  SHOW_WORK_REPORT_TOOL_NAME,
  WORK_REPORT_UI_RESOURCE_URI,
} from "../../../src/work-report/tool-definition.js";
import {
  WORK_REPORT_UI_RESOURCE_MIME_TYPE,
  resolveWorkReportUiHtmlPath,
} from "../../../src/work-report/ui-resource.js";

const BUNDLED_UI_HTML = '<!doctype html><html><body><div id="root"></div></body></html>';

const openClients: Client[] = [];

const report = (): WorkReport => ({
  title: "ログイン状態が切れる問題を修正",
  summary: "Cookie設定を変更し、関連する確認を行いました。",
  completedWork: [{ id: "work-1", title: "Cookie設定を変更", description: "属性を調整しました。" }],
  decisions: [],
  verification: [
    { id: "verification-1", description: "型の不整合がないか確認しました", status: "completed" },
  ],
  remainingWork: [],
  references: [],
  suggestedActions: [],
});

const connectInMemoryClient = async (): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "work-report-test-client", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), createMcpServer().connect(serverTransport)]);
  openClients.push(client);
  return client;
};

let httpServer: ServerType;
let baseUrl: string;

beforeAll(async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "work-report-ui-"));
  const htmlPath = path.join(directory, "index.html");
  await writeFile(htmlPath, BUNDLED_UI_HTML, "utf8");
  process.env.WORK_REPORT_UI_HTML_PATH = htmlPath;

  httpServer = await new Promise<ServerType>((resolve) => {
    const server = serve(
      { fetch: createApp({ mcpRequestAuthorizer: async () => undefined }).fetch, port: 0 },
      () => resolve(server),
    );
  });
  const address = httpServer.address();
  if (typeof address === "string" || address === null) throw new Error("port is required");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
});

afterAll(async () => {
  delete process.env.WORK_REPORT_UI_HTML_PATH;
  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => (error ? reject(error) : resolve()));
  });
});

const connectHttpClient = async (): Promise<Client> => {
  const client = new Client({ name: "work-report-http-client", version: "0.0.0" });
  // SDKのclient transportは optional propertyを `string | undefined` として宣言するため、
  // repositoryの `exactOptionalPropertyTypes` ではTransport interfaceへ直接代入できない。
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)) as Transport;
  await client.connect(transport);
  openClients.push(client);
  return client;
};

describe("Work Report MCP server", () => {
  it("publishes the UI resource that show_work_report points at", async () => {
    const client = await connectInMemoryClient();

    const { tools } = await client.listTools();
    const { resources } = await client.listResources();

    expect(tools[0]?._meta).toMatchObject({ ui: { resourceUri: WORK_REPORT_UI_RESOURCE_URI } });
    expect(resources.map((resource) => resource.uri)).toContain(WORK_REPORT_UI_RESOURCE_URI);
  });

  it("serves the bundled MCP Apps HTML from the UI resource", async () => {
    const client = await connectInMemoryClient();

    const { contents } = await client.readResource({ uri: WORK_REPORT_UI_RESOURCE_URI });

    expect(contents).toHaveLength(1);
    expect(contents[0]).toMatchObject({
      uri: WORK_REPORT_UI_RESOURCE_URI,
      mimeType: WORK_REPORT_UI_RESOURCE_MIME_TYPE,
      text: BUNDLED_UI_HTML,
    });
  });

  it("reads the bundled MCP Apps build output by default", () => {
    const override = process.env.WORK_REPORT_UI_HTML_PATH;
    delete process.env.WORK_REPORT_UI_HTML_PATH;

    try {
      expect(resolveWorkReportUiHtmlPath()).toMatch(/apps\/web\/dist\/index\.html$/u);
    } finally {
      process.env.WORK_REPORT_UI_HTML_PATH = override;
    }
  });
});

describe("/mcp endpoint", () => {
  it("accepts an MCP client connection", async () => {
    const client = await connectHttpClient();

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([SHOW_WORK_REPORT_TOOL_NAME]);
  });

  it("returns the Work Report as structuredContent without adding facts", async () => {
    const client = await connectHttpClient();
    const input = report();

    const result = await client.callTool({
      name: SHOW_WORK_REPORT_TOOL_NAME,
      arguments: input as unknown as Record<string, unknown>,
    });

    expect(result.isError ?? false).toBe(false);
    expect(result.structuredContent).toEqual(input);
  });

  it("does not open a session or keep the Work Report", async () => {
    const initialize = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "raw-client", version: "0.0.0" },
        },
      }),
    });

    expect(initialize.status).toBe(200);
    expect(initialize.headers.get("mcp-session-id")).toBeNull();
    await initialize.body?.cancel();

    const first = await connectHttpClient();
    await first.callTool({
      name: SHOW_WORK_REPORT_TOOL_NAME,
      arguments: report() as unknown as Record<string, unknown>,
    });

    const second = await connectHttpClient();
    const { resources } = await second.listResources();

    expect(resources.map((resource) => resource.uri)).toEqual([WORK_REPORT_UI_RESOURCE_URI]);
  });
});
