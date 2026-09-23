/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/api/src/work-report/input-validation/file-path-policy.ts
 *
 * リポジトリ相対pathを許可し、許可しないpathの例を拒否することを確認する。
 * レポートへローカル情報を持ち込む退行を防ぐ。実ファイルの存在を調査するテストではない。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { describe, expect, it } from "vitest";

import {
  inspectFilePathPolicy,
  isRepositoryRelativePath,
} from "../../../../src/work-report/input-validation/file-path-policy.js";

const report = (files: string[]): WorkReport => ({
  title: "変更",
  summary: "変更しました。",
  completedWork: [
    {
      id: "work-1",
      title: "変更",
      description: "変更しました。",
      files,
    },
  ],
  decisions: [],
  verification: [],
  remainingWork: [],
  references: [],
  suggestedActions: [],
});

describe("file path policy", () => {
  it.each(["src/auth/session.ts", "apps/api/src/app.ts", "docs/security/boundaries.md"])(
    "accepts repository-relative path: %s",
    (path) => {
      expect(isRepositoryRelativePath(path)).toBe(true);
      expect(inspectFilePathPolicy(report([path]))).toEqual([]);
    },
  );

  it.each([
    "/Users/example-user/private/auth.ts",
    "~/private/auth.ts",
    "../private/auth.ts",
    "src/../../private/auth.ts",
    "C:\\Users\\example-user\\private\\auth.ts",
    "https://example.com/source.ts",
    "src//auth.ts",
    "./src/auth.ts",
  ])("rejects unsafe path without returning the value: %s", (path) => {
    const issues = inspectFilePathPolicy(report([path]));

    expect(issues).toEqual([
      {
        path: "completedWork.0.files.0",
        category: "unsafe_file_path",
      },
    ]);
    expect(JSON.stringify(issues)).not.toContain(path);
  });
});
