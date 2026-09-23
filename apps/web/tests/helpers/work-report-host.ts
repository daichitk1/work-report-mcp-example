import type {
  WorkReportAppLike,
  WorkReportToolResult,
} from "../../src/mcp-app/host/work-report-host";

export type FakeWorkReportHostOptions = {
  connect?: () => Promise<void>;
  openLink?: () => Promise<{ isError?: boolean }>;
  sendMessage?: () => Promise<{ isError?: boolean }>;
};

export type FakeWorkReportHost = {
  app: WorkReportAppLike;
  events: string[];
  /** Hostへconnectを試みた回数。再接続の検証に使う。 */
  connectCount: () => number;
  emitToolResult: (params: WorkReportToolResult) => void;
};

/**
 * MCP Apps Hostの代役。`WorkReportAppLike` として型付けしているため、
 * Host contractが変わったときはこのFakeがcompile errorで検出する。
 */
export const createFakeWorkReportHost = (
  options: FakeWorkReportHostOptions = {},
): FakeWorkReportHost => {
  const handlers: ((params: WorkReportToolResult) => void)[] = [];
  const events: string[] = [];

  const connect = async () => {
    events.push("connect");
    await options.connect?.();
  };

  const app: WorkReportAppLike = {
    addEventListener: (event, handler) => {
      events.push(`listen:${event}`);
      handlers.push(handler);
    },
    connect,
    openLink: options.openLink ?? (async () => ({ isError: false })),
    sendMessage: options.sendMessage ?? (async () => ({ isError: false })),
  };

  return {
    app,
    events,
    connectCount: () => events.filter((event) => event === "connect").length,
    emitToolResult: (params) => {
      for (const handler of handlers) handler(params);
    },
  };
};
