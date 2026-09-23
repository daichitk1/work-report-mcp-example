import type {
  WorkReport,
  WorkReportDecision,
  WorkReportVerification,
} from "@work-report-mcp/contracts";

type TextFlowItem = {
  id: string;
  text: string;
};

type TextFlowGroup = {
  key: "decisions" | "work";
  kind: "text";
  label: string;
  items: TextFlowItem[];
};

type VerificationFlowGroup = {
  key: "verification";
  kind: "verification";
  label: string;
  items: WorkReportVerification[];
};

export type FlowGroup = TextFlowGroup | VerificationFlowGroup;

export type SelectedItem =
  | {
      kind: "work";
      item: WorkReport["completedWork"][number];
    }
  | {
      kind: "decision";
      item: WorkReportDecision;
    }
  | {
      kind: "verification";
      item: WorkReportVerification;
    };
