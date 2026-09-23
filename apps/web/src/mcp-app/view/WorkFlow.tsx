import type { WorkReport, WorkReportVerification } from "@work-report-mcp/contracts";
import { Fragment } from "react";

import {
  connectorStyle,
  flowButtonStyle,
  flowGroupStyle,
  flowLabelStyle,
  flowListStyle,
  flowStyle,
  flowTitleStyle,
  verificationDescriptionStyle,
  verificationHeaderStyle,
  verificationItemStyle,
  verificationResultStyle,
  verificationStateStyle,
} from "./styles.js";
import { verificationStatusLabels } from "./verification-status.js";
import { createFlowGroups } from "./work-report-selectors.js";

type VerificationItemProps = {
  item: WorkReportVerification;
  isSelected: boolean;
  onSelect: (trigger: HTMLButtonElement) => void;
};

const VerificationItem = ({ item, isSelected, onSelect }: VerificationItemProps) => (
  <li style={verificationItemStyle}>
    <button
      aria-label={`確認: ${item.description}`}
      aria-pressed={isSelected}
      onClick={(event) => onSelect(event.currentTarget)}
      style={flowButtonStyle}
      type="button"
    >
      <div style={verificationHeaderStyle}>
        <p style={verificationDescriptionStyle}>{item.description}</p>
        <span style={verificationStateStyle}>{verificationStatusLabels[item.status]}</span>
      </div>
      {item.result ? <p style={verificationResultStyle}>{item.result}</p> : null}
    </button>
  </li>
);

type WorkFlowProps = {
  report: WorkReport;
  selectedItemId?: string | undefined;
  onSelectItem: (itemId: string, trigger: HTMLButtonElement) => void;
};

/**
 * 判断 / 作業 / 確認を順番に並べ、選択できるようにする。
 * 空のcollectionからはgroupを作らない。
 */
export const WorkFlow = ({ report, selectedItemId, onSelectItem }: WorkFlowProps) => {
  const flowGroups = createFlowGroups(report);

  return (
    <section aria-label="作業フロー" style={flowStyle}>
      <h2 style={flowTitleStyle}>作業フロー</h2>
      {flowGroups.map((group, index) => (
        <Fragment key={group.key}>
          {index > 0 ? (
            <p aria-hidden="true" style={connectorStyle}>
              ↓
            </p>
          ) : null}
          <div aria-label={group.label} role="group" style={flowGroupStyle}>
            <p style={flowLabelStyle}>{group.label}</p>
            <ul style={flowListStyle}>
              {group.kind === "verification"
                ? group.items.map((item) => (
                    <VerificationItem
                      isSelected={selectedItemId === item.id}
                      item={item}
                      key={item.id}
                      onSelect={(trigger) => onSelectItem(item.id, trigger)}
                    />
                  ))
                : group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        aria-label={`${group.key === "work" ? "作業" : "判断"}: ${item.text}`}
                        aria-pressed={selectedItemId === item.id}
                        onClick={(event) => onSelectItem(item.id, event.currentTarget)}
                        style={flowButtonStyle}
                        type="button"
                      >
                        {item.text}
                      </button>
                    </li>
                  ))}
            </ul>
          </div>
        </Fragment>
      ))}
    </section>
  );
};
