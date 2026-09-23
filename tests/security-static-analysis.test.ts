import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

type SecurityFinding = {
  file: string;
  line: number;
  column: number;
  rule: string;
};

type SecurityRule = {
  rule: string;
  pattern: RegExp;
};

const roots = ["apps", "packages", "api"] as const;
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);

const securityRules: readonly SecurityRule[] = [
  {
    rule: "dynamic-code: eval() is forbidden",
    pattern: /\beval\s*\(/gu,
  },
  {
    rule: "dynamic-code: new Function() is forbidden",
    pattern: /\bnew\s+Function\s*\(/gu,
  },
  {
    rule: "dynamic-code: Function() constructor call is forbidden",
    pattern: /(?<!new\s)\bFunction\s*\(/gu,
  },
  {
    rule: "dynamic-code: string timers are forbidden",
    pattern: /\bset(?:Timeout|Interval)\s*\(\s*["'`]/gu,
  },
  {
    rule: "dom-xss: assignment to innerHTML/outerHTML is forbidden",
    pattern: /\.(?:innerHTML|outerHTML)\s*=/gu,
  },
  {
    rule: "dom-xss: insertAdjacentHTML() is forbidden",
    pattern: /\.insertAdjacentHTML\s*\(/gu,
  },
  {
    rule: "dom-xss: document.write() is forbidden",
    pattern: /\bdocument\.write\s*\(/gu,
  },
  {
    rule: "dom-xss: dangerouslySetInnerHTML is forbidden",
    pattern: /\bdangerouslySetInnerHTML\b/gu,
  },
  {
    rule: "command-execution: child_process exec/execSync import is forbidden",
    pattern: /import\s*\{[^}]*\b(?:exec|execSync)\b[^}]*\}\s*from\s*["']node:child_process["']/gu,
  },
  {
    rule: "command-execution: shell: true is forbidden",
    pattern: /\bshell\s*:\s*true\b/gu,
  },
  {
    rule: "tls: rejectUnauthorized: false is forbidden",
    pattern: /\brejectUnauthorized\s*:\s*false\b/gu,
  },
  {
    rule: "tls: changing NODE_TLS_REJECT_UNAUTHORIZED is forbidden",
    pattern: /\bNODE_TLS_REJECT_UNAUTHORIZED\b\s*=/gu,
  },
];

const listSourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "tests" || entry.name === "node_modules" || entry.name === "dist") {
          return [];
        }
        return listSourceFiles(entryPath);
      }
      return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    }),
  );

  return nested.flat();
};

const locationAt = (source: string, index: number): { line: number; column: number } => {
  const beforeMatch = source.slice(0, index);
  const lines = beforeMatch.split("\n");

  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
};

const inspectSource = (file: string, source: string): SecurityFinding[] =>
  securityRules.flatMap(({ rule, pattern }) => {
    pattern.lastIndex = 0;
    const findings: SecurityFinding[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(source)) !== null) {
      findings.push({
        file: file.replaceAll(path.sep, "/"),
        ...locationAt(source, match.index),
        rule,
      });
    }

    return findings;
  });

const productionSources = async (): Promise<{ file: string; source: string }[]> => {
  const files = (await Promise.all(roots.map(listSourceFiles))).flat();

  return Promise.all(
    files.map(async (file) => ({
      file,
      source: await readFile(file, "utf8"),
    })),
  );
};

test("production TypeScript/JavaScript avoids high-risk static security sinks", async () => {
  const files = await productionSources();
  const findings = files.flatMap(({ file, source }) => inspectSource(file, source));

  assert.deepEqual(
    findings,
    [],
    `Static security findings:\n${findings
      .map((finding) => `- ${finding.file}:${finding.line}:${finding.column} ${finding.rule}`)
      .join("\n")}`,
  );
});

test("static security analyzer detects representative dangerous patterns", () => {
  const fixture = `
    eval("alert(1)");
    new Function("return 1");
    Function("return 2");
    setTimeout("alert(1)", 10);
    element.innerHTML = userInput;
    element.insertAdjacentHTML("beforeend", userInput);
    document.write(userInput);
    const node = <div dangerouslySetInnerHTML={{ __html: userInput }} />;
    import { execSync } from "node:child_process";
    spawn("cmd", [], { shell: true });
    fetch(url, { rejectUnauthorized: false });
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  `;

  const findings = inspectSource("apps/web/src/security-probe.tsx", fixture);
  const rules = new Set(findings.map((finding) => finding.rule));

  assert.ok(rules.has("dynamic-code: eval() is forbidden"));
  assert.ok(rules.has("dynamic-code: new Function() is forbidden"));
  assert.ok(rules.has("dynamic-code: Function() constructor call is forbidden"));
  assert.ok(rules.has("dynamic-code: string timers are forbidden"));
  assert.ok(rules.has("dom-xss: assignment to innerHTML/outerHTML is forbidden"));
  assert.ok(rules.has("dom-xss: insertAdjacentHTML() is forbidden"));
  assert.ok(rules.has("dom-xss: document.write() is forbidden"));
  assert.ok(rules.has("dom-xss: dangerouslySetInnerHTML is forbidden"));
  assert.ok(rules.has("command-execution: child_process exec/execSync import is forbidden"));
  assert.ok(rules.has("command-execution: shell: true is forbidden"));
  assert.ok(rules.has("tls: rejectUnauthorized: false is forbidden"));
  assert.ok(rules.has("tls: changing NODE_TLS_REJECT_UNAUTHORIZED is forbidden"));
});
