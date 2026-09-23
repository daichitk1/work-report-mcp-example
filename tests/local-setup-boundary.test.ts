import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("API dev and start commands explicitly load the repository-root env file", async () => {
  const manifest = JSON.parse(await readFile("apps/api/package.json", "utf8")) as {
    scripts: Record<string, string>;
  };

  for (const command of ["dev", "start"]) {
    assert.ok(manifest.scripts[command]?.includes("--env-file-if-exists=../../.env"));
    assert.ok(manifest.scripts[command]?.endsWith("src/dev-server.ts"));
  }
});

test("OAuth example uses an owned-resource placeholder rather than an author's deployment", async () => {
  const source = await readFile(".env.example", "utf8");
  const values = Object.fromEntries(
    source
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );

  assert.equal(values.WORK_REPORT_AUTH_AUDIENCE, "https://mcp.example/mcp");
  assert.equal(values.WORK_REPORT_MCP_RESOURCE_URL, values.WORK_REPORT_AUTH_AUDIENCE);
  assert.equal(values.WORK_REPORT_AUTH_ISSUER, "https://your-tenant.auth0.com/");
  assert.doesNotMatch(source, /work-report-mcp\.vercel\.app/u);
});
