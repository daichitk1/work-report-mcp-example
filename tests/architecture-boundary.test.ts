/**
 * このテストを読む前に（読む順番 13）
 * 種類: architecture-boundary（依存方向の静的検査）
 * 対応する実装: apps/api/src・apps/web/src・packages/contracts/src
 *
 * import先を調べ、Contract・Host・View・認可・入力検査などの責務の境界を守る。
 * 画面がSDKへ直接依存する等の結合を防ぐ。関数を動かすunit/integrationとは違う設計上の保証。
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

type SourceFile = {
  path: string;
  source: string;
};

type ArchitectureViolation = {
  file: string;
  dependency: string;
  rule: string;
};

const productionRoots = ["apps/api/src", "apps/web/src", "packages/contracts/src"] as const;

const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);

const listSourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listSourceFiles(entryPath);
      return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    }),
  );

  return nested.flat();
};

const loadProductionSources = async (): Promise<SourceFile[]> => {
  const files = (await Promise.all(productionRoots.map(listSourceFiles))).flat();

  return Promise.all(
    files.map(async (file) => ({
      path: file.replaceAll(path.sep, "/"),
      source: await readFile(file, "utf8"),
    })),
  );
};

const fromImportPattern = /\bfrom\s+["']([^"']+)["']/gu;
const sideEffectImportPattern = /(?:^|\n)\s*import\s*["']([^"']+)["']/gu;
const dynamicImportPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/gu;

const collectDependencies = (source: string): string[] => {
  const dependencies: string[] = [];

  for (const pattern of [fromImportPattern, sideEffectImportPattern, dynamicImportPattern]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const dependency = match[1];
      if (dependency) dependencies.push(dependency);
    }
  }

  return [...new Set(dependencies)];
};

const isPackage = (dependency: string, packageName: string): boolean =>
  dependency === packageName || dependency.startsWith(`${packageName}/`);

const normalizedResolvedImport = (file: string, dependency: string): string | undefined => {
  if (!dependency.startsWith(".")) return undefined;

  return path
    .relative(process.cwd(), path.resolve(path.dirname(file), dependency))
    .replaceAll(path.sep, "/");
};

const addViolation = (
  violations: ArchitectureViolation[],
  file: string,
  dependency: string,
  rule: string,
): void => {
  violations.push({ file, dependency, rule });
};

export const findArchitectureViolations = (files: SourceFile[]): ArchitectureViolation[] => {
  const violations: ArchitectureViolation[] = [];

  for (const file of files) {
    const dependencies = collectDependencies(file.source);

    for (const dependency of dependencies) {
      const resolved = normalizedResolvedImport(file.path, dependency);

      // Production code must never depend on Test-only code.
      if (resolved && /(?:^|\/)tests\/(?:.*\/)?(?:fixtures|helpers)(?:\/|$)/u.test(resolved)) {
        addViolation(
          violations,
          file.path,
          dependency,
          "production code must not import test fixtures/helpers",
        );
      }

      // Contracts are the shared product contract and must stay framework/runtime agnostic.
      if (file.path.startsWith("packages/contracts/src/")) {
        const forbidden =
          isPackage(dependency, "react") ||
          isPackage(dependency, "hono") ||
          dependency.startsWith("@modelcontextprotocol/") ||
          dependency === "node:http" ||
          dependency === "node:https" ||
          dependency === "node:net";

        if (forbidden) {
          addViolation(
            violations,
            file.path,
            dependency,
            "contracts must not depend on React, Hono, MCP SDK, or HTTP runtime modules",
          );
        }

        if (resolved?.startsWith("apps/web/")) {
          addViolation(
            violations,
            file.path,
            dependency,
            "contracts must not depend on the web app",
          );
        }
      }

      // View renders data but does not talk directly to the MCP Apps SDK.
      if (
        file.path.startsWith("apps/web/src/mcp-app/view/") &&
        dependency.startsWith("@modelcontextprotocol/")
      ) {
        addViolation(
          violations,
          file.path,
          dependency,
          "web view must not import MCP SDK / MCP Apps SDK",
        );
      }

      // Selectors/model are pure derivation logic and must stay React-free.
      const isWebModel =
        file.path.includes("/model/") || /(?:^|\/)work-report-selectors\.ts$/u.test(file.path);
      if (isWebModel && isPackage(dependency, "react")) {
        addViolation(
          violations,
          file.path,
          dependency,
          "web model/selectors must not depend on React",
        );
      }

      // Host owns the MCP Apps SDK boundary and must not know React presentation.
      if (file.path.startsWith("apps/web/src/mcp-app/host/")) {
        if (isPackage(dependency, "react")) {
          addViolation(violations, file.path, dependency, "web host must not depend on React");
        }

        if (resolved?.startsWith("apps/web/src/mcp-app/view/")) {
          addViolation(
            violations,
            file.path,
            dependency,
            "web host must not import React view components",
          );
        }
      }

      // Security policy stays framework-independent.
      if (
        file.path.startsWith("apps/api/src/work-report/input-validation/") &&
        isPackage(dependency, "hono")
      ) {
        addViolation(
          violations,
          file.path,
          dependency,
          "Work Report input validation must not depend on Hono",
        );
      }

      // Logging records events; it must not depend on the features that emit them.
      if (file.path.startsWith("apps/api/src/logging/")) {
        const featureDependency =
          resolved?.startsWith("apps/api/src/auth/") ||
          resolved?.startsWith("apps/api/src/mcp/") ||
          resolved?.startsWith("apps/api/src/work-report/");
        if (featureDependency || isPackage(dependency, "hono") || isPackage(dependency, "react")) {
          addViolation(
            violations,
            file.path,
            dependency,
            "logging must not depend on app features",
          );
        }
      }

      // Report validation is independent of both transport and event delivery.
      if (file.path.startsWith("apps/api/src/work-report/input-validation/")) {
        if (
          dependency.startsWith("@modelcontextprotocol/") ||
          isPackage(dependency, "react") ||
          resolved?.startsWith("apps/api/src/mcp/") ||
          resolved?.startsWith("apps/api/src/auth/") ||
          resolved?.startsWith("apps/api/src/logging/")
        ) {
          addViolation(
            violations,
            file.path,
            dependency,
            "input validation must not depend on transport, auth, logging, or UI",
          );
        }
      }

      // Authorization domain stays independent from the HTTP framework.
      const isAuthorizationDomain =
        /apps\/api\/src\/auth\/(?:config|authorization|token-verifier)\.ts$/u.test(file.path);
      if (isAuthorizationDomain && isPackage(dependency, "hono")) {
        addViolation(
          violations,
          file.path,
          dependency,
          "authorization domain must not depend on Hono",
        );
      }

      // Tool runtime handler validates product input; it is not an HTTP or UI layer.
      if (file.path === "apps/api/src/work-report/handle-tool-call.ts") {
        if (isPackage(dependency, "hono") || isPackage(dependency, "react")) {
          addViolation(
            violations,
            file.path,
            dependency,
            "show_work_report handler must not depend on HTTP/UI frameworks",
          );
        }
      }
    }
  }

  return violations;
};

test("current production tree respects the documented architecture boundary", async () => {
  const files = await loadProductionSources();
  const violations = findArchitectureViolations(files);

  assert.deepEqual(
    violations,
    [],
    `Architecture violations:\n${violations
      .map((violation) => `- ${violation.file} -> ${violation.dependency}: ${violation.rule}`)
      .join("\n")}`,
  );
});

test("architecture checker detects representative forbidden dependencies", () => {
  const fixtures: SourceFile[] = [
    {
      path: "apps/web/src/mcp-app/view/BadView.tsx",
      source: 'import { App } from "@modelcontextprotocol/ext-apps";',
    },
    {
      path: "apps/web/src/mcp-app/view/work-report-selectors.ts",
      source: 'import { useState } from "react";',
    },
    {
      path: "apps/web/src/mcp-app/host/bad-host.ts",
      source: 'import { WorkReportView } from "../view/WorkReportView.js";',
    },
    {
      path: "packages/contracts/src/bad-contract.ts",
      source: 'import { Hono } from "hono";\nimport React from "react";',
    },
    {
      path: "apps/api/src/work-report/input-validation/bad-policy.ts",
      source: 'import { Hono } from "hono";',
    },
    {
      path: "apps/api/src/auth/authorization.ts",
      source: 'import type { Context } from "hono";',
    },
    {
      path: "apps/api/src/work-report/handle-tool-call.ts",
      source: 'import React from "react";',
    },
    {
      path: "apps/web/src/mcp-app/state/bad-state.ts",
      source: 'import { fixture } from "../../../tests/fixtures/work-report.js";',
    },
  ];

  fixtures.push(
    {
      path: "apps/api/src/logging/bad-logger.ts",
      source: 'import { createMcpServer } from "../mcp/server.js";',
    },
    {
      path: "apps/api/src/work-report/input-validation/bad-validator.ts",
      source: 'import { emitSecurityEvent } from "../../logging/security-event.js";',
    },
  );

  const violations = findArchitectureViolations(fixtures);
  const rules = new Set(violations.map((violation) => violation.rule));

  assert.ok(rules.has("web view must not import MCP SDK / MCP Apps SDK"));
  assert.ok(rules.has("web model/selectors must not depend on React"));
  assert.ok(rules.has("web host must not import React view components"));
  assert.ok(
    rules.has("contracts must not depend on React, Hono, MCP SDK, or HTTP runtime modules"),
  );
  assert.ok(rules.has("Work Report input validation must not depend on Hono"));
  assert.ok(rules.has("authorization domain must not depend on Hono"));
  assert.ok(rules.has("show_work_report handler must not depend on HTTP/UI frameworks"));
  assert.ok(rules.has("production code must not import test fixtures/helpers"));
  assert.ok(rules.has("logging must not depend on app features"));
  assert.ok(rules.has("input validation must not depend on transport, auth, logging, or UI"));
});
