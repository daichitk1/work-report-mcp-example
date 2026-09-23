import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { WorkReportApp } from "./WorkReportApp";
import type { WorkReportAppLike } from "./host/work-report-host";

const root = document.getElementById("root");
if (!root) throw new Error("#root is required");

type E2EWindow = Window & {
  __WORK_REPORT_E2E_CREATE_APP__?: () => WorkReportAppLike;
};

/**
 * Browser regression testだけが使うHost seam。
 * `vite --mode e2e` 以外では読まないため、Productionでは通常のMCP Apps Hostへ接続する。
 */
const createApp =
  import.meta.env.MODE === "e2e" ? (window as E2EWindow).__WORK_REPORT_E2E_CREATE_APP__ : undefined;

createRoot(root).render(
  <StrictMode>
    <WorkReportApp {...(createApp ? { createApp } : {})} />
  </StrictMode>,
);
