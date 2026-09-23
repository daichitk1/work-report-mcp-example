import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { SecurityEventLogger } from "../../src/logging/security-event.js";
import { registerShowWorkReportTool } from "../../src/work-report/register-tool.js";

/**
 * In-memory transportでMCP Client / Serverを繋ぐ。
 * Tool registrationはProduction codeのものをそのまま使い、Test用に再実装しない。
 */
export type ConnectedClients = {
  connect: (options?: { securityEventLogger?: SecurityEventLogger }) => Promise<Client>;
  closeAll: () => Promise<void>;
};

export const createMcpClientHarness = (name = "work-report-mcp-test"): ConnectedClients => {
  const openClients: Client[] = [];

  return {
    connect: async (options = {}) => {
      const server = new McpServer({ name, version: "0.0.0" });
      registerShowWorkReportTool(server, options);

      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: `${name}-client`, version: "0.0.0" });
      await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
      openClients.push(client);

      return client;
    },
    closeAll: async () => {
      await Promise.all(openClients.splice(0).map((client) => client.close()));
    },
  };
};
