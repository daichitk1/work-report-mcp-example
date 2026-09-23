import type { WorkReport } from "@work-report-mcp/contracts";

import {
  disclosureButtonStyle,
  flowLabelStyle,
  flowTitleStyle,
  followUpDescriptionStyle,
  followUpItemStyle,
  followUpListStyle,
  followUpSectionStyle,
} from "./styles.js";

type ReferencesSectionProps = {
  references: WorkReport["references"];
  onOpenReference?: (url: string) => void;
};

/** Tool Resultに存在するReferenceだけを表示し、URLを作らない。 */
export const ReferencesSection = ({ references, onOpenReference }: ReferencesSectionProps) => {
  if (references.length === 0) return null;

  return (
    <section aria-label="参考情報" style={followUpSectionStyle}>
      <h2 style={flowTitleStyle}>参考情報</h2>
      <ul style={followUpListStyle}>
        {references.map((reference) => (
          <li key={reference.id} style={followUpItemStyle}>
            <p style={flowLabelStyle}>{reference.title}</p>
            {reference.reason ? <p style={followUpDescriptionStyle}>{reference.reason}</p> : null}
            <button
              aria-label={`${reference.title}を開く`}
              onClick={() => onOpenReference?.(reference.url)}
              style={disclosureButtonStyle}
              type="button"
            >
              開く
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
