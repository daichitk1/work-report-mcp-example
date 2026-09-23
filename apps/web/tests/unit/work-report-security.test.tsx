/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体・componentおよび静的検査
 * 対応する実装: apps/web/src/mcp-app/host/work-report-host.ts と view/WorkReportView.tsx等
 *
 * 文字列のテキスト表示、保存処理の不使用、Hostに集約した外部遷移、URLのscheme制限を確認する。
 * 受信文字列のHTML実行や、Hostを経由しない遷移を防ぐ。ソースのパターン検査も含む。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isSafeWorkReportReferenceUrl,
  openWorkReportLink,
} from "../../src/mcp-app/host/work-report-host";
import { WorkReportView } from "../../src/mcp-app/view/WorkReportView";

const sourceRoot = path.resolve(import.meta.dirname, "../../src/mcp-app");

const productionSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionSourceFiles(entryPath);
    if (!/\.tsx?$/u.test(entry.name)) return [];
    return [entryPath];
  });

const filesContaining = (pattern: RegExp): string[] =>
  productionSourceFiles(sourceRoot)
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(sourceRoot, file));

const reportWithMarkup = (): WorkReport => {
  const markup = '<img src=x onerror="alert(1)">';

  return {
    title: markup,
    summary: markup,
    completedWork: [
      {
        id: "work-1",
        title: markup,
        description: markup,
        technicalDetail: markup,
      },
    ],
    decisions: [],
    verification: [],
    remainingWork: [],
    references: [],
    suggestedActions: [],
  };
};

describe("Work Report UI security boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never uses raw HTML rendering APIs in the Work Report production tree", () => {
    expect(filesContaining(/dangerouslySetInnerHTML/u)).toEqual([]);
    expect(filesContaining(/\.innerHTML\s*=/u)).toEqual([]);
    expect(filesContaining(/\.outerHTML\s*=/u)).toEqual([]);
    expect(filesContaining(/insertAdjacentHTML/u)).toEqual([]);
  });

  it("never persists Work Report data in browser storage", () => {
    expect(filesContaining(/localStorage/u)).toEqual([]);
    expect(filesContaining(/sessionStorage/u)).toEqual([]);
    expect(filesContaining(/indexedDB/u)).toEqual([]);
    expect(filesContaining(/document\.cookie/u)).toEqual([]);
  });

  it("keeps external navigation behind the single Host openLink boundary", () => {
    expect(filesContaining(/window\.open\s*\(/u)).toEqual([]);
    expect(filesContaining(/location\.(?:href\s*=|assign\s*\(|replace\s*\()/u)).toEqual([]);
    expect(filesContaining(/\.openLink\s*\(/u)).toEqual(["host/work-report-host.ts"]);
  });

  it("renders Work Report strings as text instead of HTML", () => {
    vi.stubGlobal("matchMedia", undefined);

    render(<WorkReportView report={reportWithMarkup()} />);

    const markup = '<img src=x onerror="alert(1)">';
    fireEvent.click(screen.getByRole("button", { name: `作業: ${markup}` }));
    fireEvent.click(screen.getByRole("button", { name: "技術詳細を見る" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(markup);
    expect(screen.getByRole("group", { name: "技術詳細" })).toHaveTextContent(markup);
    expect(document.querySelectorAll("img")).toHaveLength(0);
    expect(document.querySelectorAll("script")).toHaveLength(0);
  });
});

describe("Reference URL UI boundary", () => {
  for (const unsafeUrl of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "not a url",
  ]) {
    it(`rejects ${unsafeUrl} before handing it to the Host`, async () => {
      const openLink = vi.fn(async (_params: { url: string }) => ({ isError: false }));

      expect(isSafeWorkReportReferenceUrl(unsafeUrl)).toBe(false);
      await expect(openWorkReportLink({ openLink }, unsafeUrl)).resolves.toBe("failed");
      expect(openLink).not.toHaveBeenCalled();
    });
  }

  for (const safeUrl of ["https://example.com/docs", "http://example.com/docs"]) {
    it(`passes ${safeUrl} to the Host unchanged`, async () => {
      const openLink = vi.fn(async (_params: { url: string }) => ({ isError: false }));

      expect(isSafeWorkReportReferenceUrl(safeUrl)).toBe(true);
      await expect(openWorkReportLink({ openLink }, safeUrl)).resolves.toBe("succeeded");
      expect(openLink).toHaveBeenCalledWith({ url: safeUrl });
    });
  }
});
