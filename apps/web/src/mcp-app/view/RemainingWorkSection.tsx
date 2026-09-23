import type { WorkReport } from "@work-report-mcp/contracts";

import {
  disclosureButtonStyle,
  flowTitleStyle,
  followUpDescriptionStyle,
  followUpItemStyle,
  followUpListStyle,
  followUpSectionStyle,
} from "./styles.js";

type RemainingWorkSectionProps = {
  items: WorkReport["remainingWork"];
  onSendMessage?: (prompt: string) => void;
};

/** 残っていることを表示する。空なら節ごと作らない。 */
export const RemainingWorkSection = ({ items, onSendMessage }: RemainingWorkSectionProps) => {
  if (items.length === 0) return null;

  return (
    <section aria-label="残っていること" style={followUpSectionStyle}>
      <h2 style={flowTitleStyle}>残っていること</h2>
      <ul style={followUpListStyle}>
        {items.map((item) => {
          const action = item.action;

          return (
            <li key={item.id} style={followUpItemStyle}>
              <p style={followUpDescriptionStyle}>{item.description}</p>
              {action ? (
                <button
                  onClick={() => onSendMessage?.(action.prompt)}
                  style={disclosureButtonStyle}
                  type="button"
                >
                  {action.label}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
