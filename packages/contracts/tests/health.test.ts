import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "../src/health.js";

describe("healthResponseSchema", () => {
  it("accepts the public health contract", () => {
    expect(
      healthResponseSchema.parse({
        status: "ok",
        service: "work-report-mcp-api",
        timestamp: "2026-08-28T00:00:00.000Z",
      }),
    ).toEqual({
      status: "ok",
      service: "work-report-mcp-api",
      timestamp: "2026-08-28T00:00:00.000Z",
    });
  });

  it("rejects internal fields", () => {
    const parsed = healthResponseSchema.parse({
      status: "ok",
      service: "api",
      timestamp: "2026-08-28T00:00:00.000Z",
      databaseUrl: "secret",
    });

    expect(parsed).not.toHaveProperty("databaseUrl");
  });
});
