import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const listMarkdown = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".")) return [];
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return listMarkdown(file);
      return entry.name.endsWith(".md") ? [file] : [];
    }),
  );
  return result.flat();
};

test("reader-facing Markdown links point to existing files", async () => {
  const files = ["README.md", "SECURITY.md", ...(await listMarkdown("docs"))];
  const broken: string[] = [];
  for (const file of files) {
    const source = (await readFile(file, "utf8")).replace(/```[\s\S]*?```/gu, "");
    for (const match of source.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)) {
      const url = match[1];
      if (!url || /^(?:[a-z]+:|\/\/|#)/iu.test(url)) continue;
      const target = decodeURIComponent(url.split(/[?#]/u)[0] ?? "");
      if (!target) continue;
      try {
        await access(path.resolve(path.dirname(file), target));
      } catch {
        broken.push(`${file}: ${target}`);
      }
    }
  }
  assert.deepEqual(broken, [], `Broken documentation links:\n${broken.join("\n")}`);
});
