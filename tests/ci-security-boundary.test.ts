import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const workflowsDirectory = ".github/workflows";

const workflowFiles = async (): Promise<string[]> =>
  (await readdir(workflowsDirectory))
    .filter((name) => /\.ya?ml$/u.test(name))
    .map((name) => path.join(workflowsDirectory, name));

const readWorkflow = (name: string): Promise<string> =>
  readFile(path.join(workflowsDirectory, name), "utf8");

const externalUses = (source: string): string[] =>
  source
    .split("\n")
    .map((line) => line.match(/^\s*-?\s*uses:\s*([^\s#]+)/u)?.[1])
    .filter((value): value is string => Boolean(value))
    .filter((value) => !value.startsWith("./"));

/**
 * * Validation CI must stay read-only unless a separate responsibility explicitly
 * needs write access.
 */
test("validation CI keeps least-privilege repository permissions", async () => {
  const source = await readWorkflow("ci.yml");

  assert.match(source, /^permissions:\n\s+contents:\s+read\s*$/mu);
  assert.doesNotMatch(source, /^\s+[\w-]+:\s+write\s*$/mu);
  assert.doesNotMatch(source, /^\s*pull_request_target\s*:/mu);
});

/**
 * third-party Actions are immutable at review time.
 * Tags such as @v4 are intentionally rejected; a full commit SHA is required.
 */
test("all external GitHub Actions stay pinned to full commit SHAs", async () => {
  const violations: string[] = [];

  for (const file of await workflowFiles()) {
    const source = await readFile(file, "utf8");

    for (const use of externalUses(source)) {
      const ref = use.split("@")[1];
      if (!ref || !/^[0-9a-f]{40}$/u.test(ref)) {
        violations.push(`${file}: ${use}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `External Actions must use full commit SHAs:\n${violations.join("\n")}`,
  );
});

/**
 * JavaScript / TypeScript static analysis remains defined.
 * The current private-repository execution policy is a separate operational
 * concern; this test prevents accidental removal or permission weakening.
 */
test("CodeQL JavaScript/TypeScript analysis remains configured safely", async () => {
  const source = await readWorkflow("codeql.yml");

  assert.match(source, /languages:\s*javascript-typescript/u);
  assert.match(source, /^\s+security-events:\s+write\s*$/mu);
  assert.match(source, /^\s+contents:\s+read\s*$/mu);
  assert.doesNotMatch(source, /^\s*pull_request_target\s*:/mu);

  const uses = externalUses(source);
  assert.ok(uses.some((value) => value.startsWith("github\/codeql-action\/init@")));
  assert.ok(uses.some((value) => value.startsWith("github\/codeql-action\/analyze@")));
});
