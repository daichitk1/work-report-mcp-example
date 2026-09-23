import type { WorkReport } from "@work-report-mcp/contracts";

import {
  eyebrowStyle,
  headerStyle,
  navigationItemStyle,
  navigationListStyle,
  navigationStyle,
  statusItemStyle,
  statusLabelStyle,
  statusListStyle,
  statusSectionStyle,
  statusValueStyle,
  summaryStyle,
  titleStyle,
} from "./styles.js";

type StatusItemProps = {
  label: string;
  count: number;
};

const StatusItem = ({ label, count }: StatusItemProps) => (
  <div aria-label={`${label} ${count}件`} style={statusItemStyle}>
    <dt style={statusLabelStyle}>{label}</dt>
    <dd style={statusValueStyle}>{count}</dd>
  </div>
);

type ResultHeaderProps = {
  report: WorkReport;
};

/**
 * 今回の結果と、作業 / 確認済み / 未確認 / 不明の件数を先に示す。
 * 件数はReportをそのまま数えるだけで、新しい事実を作らない。
 */
export const ResultHeader = ({ report }: ResultHeaderProps) => {
  const completedVerificationCount = report.verification.filter(
    (item) => item.status === "completed",
  ).length;
  const notCompletedVerificationCount = report.verification.filter(
    (item) => item.status === "not_completed",
  ).length;
  const unknownVerificationCount = report.verification.filter(
    (item) => item.status === "unknown",
  ).length;

  return (
    <>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>今回の作業</p>
        <h1 style={titleStyle}>{report.title}</h1>
        <p style={summaryStyle}>{report.summary}</p>

        <section aria-label="作業状況" style={statusSectionStyle}>
          <dl style={statusListStyle}>
            <StatusItem label="作業" count={report.completedWork.length} />
            <StatusItem label="確認済み" count={completedVerificationCount} />
            <StatusItem label="未確認" count={notCompletedVerificationCount} />
            <StatusItem label="不明" count={unknownVerificationCount} />
          </dl>
        </section>
      </header>

      <nav aria-label="Work Report navigation" style={navigationStyle}>
        <ul style={navigationListStyle}>
          {["概要", "作業", "確認", "参考情報"].map((label) => (
            <li key={label} style={navigationItemStyle}>
              {label}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
