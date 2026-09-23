export type SecurityEvent =
  | { event: "oauth.missing_token"; result: "rejected"; route: "/mcp" }
  | { event: "oauth.invalid_token"; result: "rejected"; route: "/mcp" }
  | { event: "oauth.insufficient_scope"; result: "rejected"; route: "/mcp" }
  | { event: "oauth.configuration_unavailable"; result: "unavailable"; route: "/mcp" }
  | { event: "mcp.request_too_large"; result: "rejected"; route: "/mcp" }
  | { event: "work_report.payload_rejected"; result: "rejected"; route: "show_work_report" }
  | { event: "work_report.security_rejected"; result: "rejected"; route: "show_work_report" }
  | { event: "runtime.unhandled_error"; result: "error"; route: "api" };

export type SecurityEventLogger = (event: SecurityEvent) => void;

export const noopSecurityEventLogger: SecurityEventLogger = () => undefined;

export const consoleSecurityEventLogger: SecurityEventLogger = (event) => {
  console.warn("Security event", event);
};

export const emitSecurityEvent = (logger: SecurityEventLogger, event: SecurityEvent): void => {
  try {
    logger(event);
  } catch {
    // Security logging must never change an authentication, authorization,
    // validation, or runtime response.
  }
};
