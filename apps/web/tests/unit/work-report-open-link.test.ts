/**
 * このテストを読む前に（読む順番 13）
 * 種類: 単体テスト
 * 対応する実装: apps/web/src/mcp-app/host/work-report-host.ts のopenWorkReportLink
 *
 * 渡された参考URLが、そのままHostへのopenLink依頼になることを確認する。
 * 別URLを組み立てる退行を防ぐ。危険なschemeの拒否はwork-report-security.test.tsで確認する。
 */
import { describe, expect, it, vi } from "vitest";

import {
  openWorkReportLink,
  type WorkReportAppLike,
} from "../../src/mcp-app/host/work-report-host";

describe("openWorkReportLink", () => {
  it("passes the exact Reference URL to the host openLink request", async () => {
    const url = "https://apps.extensions.modelcontextprotocol.io/";
    const openLink = vi.fn(async () => ({ isError: false }));
    const host: Pick<WorkReportAppLike, "openLink"> = { openLink };

    await openWorkReportLink(host, url);

    expect(openLink).toHaveBeenCalledTimes(1);
    expect(openLink).toHaveBeenCalledWith({ url });
  });
});
