import type { WorkReport } from "@work-report-mcp/contracts";

import type { FlowGroup, SelectedItem } from "./types.js";

export const createFlowGroups = (report: WorkReport): FlowGroup[] => {
  const groups: FlowGroup[] = [];

  if (report.decisions.length > 0) {
    groups.push({
      key: "decisions",
      kind: "text",
      label: "AIによる判断",
      items: report.decisions.map((item) => ({ id: item.id, text: item.description })),
    });
  }

  if (report.completedWork.length > 0) {
    groups.push({
      key: "work",
      kind: "text",
      label: "やったこと",
      items: report.completedWork.map((item) => ({ id: item.id, text: item.title })),
    });
  }

  if (report.verification.length > 0) {
    groups.push({
      key: "verification",
      kind: "verification",
      label: "確認したこと",
      items: report.verification,
    });
  }

  return groups;
};

export const resolveSelectedItem = (
  report: WorkReport,
  selectedItemId?: string,
): SelectedItem | null => {
  if (!selectedItemId) return null;

  const work = report.completedWork.find((item) => item.id === selectedItemId);
  if (work) return { kind: "work", item: work };

  const decision = report.decisions.find((item) => item.id === selectedItemId);
  if (decision) return { kind: "decision", item: decision };

  const verification = report.verification.find((item) => item.id === selectedItemId);
  if (verification) return { kind: "verification", item: verification };

  return null;
};

export const relatedWorkItems = (report: WorkReport, relatedWorkIds?: string[]) => {
  if (!relatedWorkIds?.length) return [];
  const ids = new Set(relatedWorkIds);
  return report.completedWork.filter((item) => ids.has(item.id));
};
