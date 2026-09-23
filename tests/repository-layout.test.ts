/**
 * このテストを読む前に（読む順番 13）
 * 種類: repository-layout（配置と案内の整合性検査）
 * 対応する実装: apps/api/src と docs/code-guide.md・README.md
 *
 * 実ファイルとCode GuideのAPIツリー、案内リンクの一致を確認する。
 * コードの移動・追加後に、読者向けの案内だけ古いままになる不具合を防ぐ。
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const sourceRoot = "apps/api/src";

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(directory, entry.name);
      assert.ok(!entry.isSymbolicLink(), `Source tree must not contain symlinks: ${file}`);
      return entry.isDirectory() ? listFiles(file) : [file.replaceAll(path.sep, "/")];
    }),
  );
  return results.flat();
};

test("code guide API tree matches every source file", async () => {
  const guide = await readFile("docs/code-guide.md", "utf8");
  const block = guide.match(
    /<!-- api-source-tree:start -->([\s\S]*?)<!-- api-source-tree:end -->/u,
  )?.[1];
  assert.ok(block, "Code guide must include the API source tree markers");
  assert.ok(block.includes(`${sourceRoot}/`));

  const directories: string[] = [];
  const documented: string[] = [];
  for (const line of block.split("\n")) {
    const match = line.match(/^((?:│   |    )*)(?:├── |└── )(\S+)/u);
    if (!match) continue;
    const prefix = match[1] ?? "";
    const name = match[2];
    assert.ok(name);
    const depth = prefix.length / 4;
    assert.ok(depth <= directories.length, `Invalid tree indentation: ${line}`);
    directories.length = depth;
    if (name.endsWith("/")) {
      directories.push(name.slice(0, -1));
    } else {
      documented.push([sourceRoot, ...directories, name].join("/"));
    }
  }

  assert.ok(documented.length > 0, "API tree must list files, not only folders");
  assert.equal(new Set(documented).size, documented.length, "API tree contains duplicate files");
  assert.deepEqual(documented.sort(), (await listFiles(sourceRoot)).sort());
});

test("README exposes the code guide", async () => {
  assert.match(await readFile("README.md", "utf8"), /\]\(docs\/code-guide\.md\)/u);
});
