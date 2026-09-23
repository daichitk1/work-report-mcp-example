import type { WorkReport } from "@work-report-mcp/contracts";
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  disclosureButtonStyle,
  sheetBackdropStyle,
  sheetHeaderStyle,
  sheetStyle,
} from "./styles.js";
import type { SelectedItem } from "./types.js";
import { DetailPanelBody } from "./DetailPanel.js";

type WorkReportDetailSheetProps = {
  report: WorkReport;
  selected: SelectedItem | null;
  expandedDetails: ReadonlySet<string>;
  onToggleDetail: (key: string) => void;
  onClose: () => void;
  onSendMessage?: (prompt: string) => void;
};

const focusableSheetSelector =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * MobileではDesktop Detail Panelと同一内容をBottom Sheetで表示する。
 * 内容は`DetailPanelBody`を共有し、Sheetは開閉とfocusだけを担当する。
 */
export const WorkReportDetailSheet = ({
  report,
  selected,
  expandedDetails,
  onToggleDetail,
  onClose,
  onSendMessage,
}: WorkReportDetailSheetProps) => {
  const sheetRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!selected) return null;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      sheetRef.current?.querySelectorAll<HTMLElement>(focusableSheetSelector) ?? [],
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div style={sheetBackdropStyle}>
      <section
        aria-label="項目の詳細"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        ref={sheetRef}
        role="dialog"
        style={sheetStyle}
      >
        <div style={sheetHeaderStyle}>
          <button onClick={onClose} ref={closeRef} style={disclosureButtonStyle} type="button">
            詳細を閉じる
          </button>
        </div>
        <DetailPanelBody
          {...(onSendMessage ? { onSendMessage } : {})}
          expandedDetails={expandedDetails}
          onToggleDetail={onToggleDetail}
          report={report}
          selected={selected}
        />
      </section>
    </div>
  );
};
