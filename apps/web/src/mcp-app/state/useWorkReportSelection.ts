import { useRef, useState } from "react";

type WorkReportSelection = {
  selectedItemId: string | undefined;
  expandedDetails: ReadonlySet<string>;
  isDetailOpen: boolean;
  selectItem: (itemId: string, trigger: HTMLButtonElement) => void;
  closeDetail: () => void;
  toggleDetail: (key: string) => void;
};

/**
 * UI stateは選択・展開・表示状態だけに限定する。
 * Work Reportの内容はTool Resultが正であり、ここでは保持しない。
 *
 * Detailを閉じたときに選択元のボタンへfocusを戻すため、triggerを覚えておく。
 */
export const useWorkReportSelection = (): WorkReportSelection => {
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(() => new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const selectionTriggerRef = useRef<HTMLButtonElement | null>(null);

  return {
    selectedItemId,
    expandedDetails,
    isDetailOpen,

    selectItem: (itemId, trigger) => {
      selectionTriggerRef.current = trigger;
      setSelectedItemId(itemId);
      setIsDetailOpen(true);
    },

    closeDetail: () => {
      setIsDetailOpen(false);
      selectionTriggerRef.current?.focus();
    },

    toggleDetail: (key) => {
      setExpandedDetails((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
  };
};
