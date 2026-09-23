import type { WorkReport } from "@work-report-mcp/contracts";

import {
  disclosureButtonStyle,
  flowTitleStyle,
  followUpItemStyle,
  followUpListStyle,
  followUpSectionStyle,
} from "./styles.js";

type SuggestedActionsSectionProps = {
  actions: WorkReport["suggestedActions"];
  onSendMessage?: (prompt: string) => void;
};

/** Actionは外部処理を直接実行せず、次のChatGPT依頼へつなぐ。 */
export const SuggestedActionsSection = ({
  actions,
  onSendMessage,
}: SuggestedActionsSectionProps) => {
  if (actions.length === 0) return null;

  return (
    <section aria-label="次にできること" style={followUpSectionStyle}>
      <h2 style={flowTitleStyle}>次にできること</h2>
      <ul style={followUpListStyle}>
        {actions.map((action) => (
          <li key={action.id} style={followUpItemStyle}>
            <button
              onClick={() => onSendMessage?.(action.prompt)}
              style={disclosureButtonStyle}
              type="button"
            >
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
