/**
 * このファイルを読む前に（読む順番 12）
 *
 * 役割: WorkReportを各表示componentへ配り、Desktop/Mobileのレイアウトを組み立てる。
 * 前: ../WorkReportApp.tsxが、検証済みreportと操作用callbackを渡す。
 * 次: 対応するtests/component・tests/integrationを読み、表示と状態の保証を確かめる。
 * 理解したいこと: reportがSource of Truth（表示内容の正本）であり、Viewは内容を
 * 推測・生成しない。持つのは選択・展開・表示方法の状態で、レポート自体を編集しない。
 *
 * ResultHeader: 結果の見出し・要約と、作業数・確認状態ごとの件数。
 * WorkFlow: 判断・作業・確認の一覧と項目選択。項目IDを親へ知らせる。
 * DetailPanel: Desktopの一覧横に出す詳細。判断理由や技術詳細を必要に応じて展開する。
 * WorkReportDetailSheet: Mobileの詳細表示。同じDetailPanelBodyを使い、開閉・focusを扱う。
 * RemainingWorkSection: 残作業と、そのデータに含まれる場合だけ次の依頼ボタンを表示する。
 * ReferencesSection: 受信した参考情報を表示し、そのURLを開く依頼をcallbackへ渡す。
 * SuggestedActionsSection: 受信した候補のpromptを、次のユーザー依頼としてcallbackへ渡す。
 */
import type { WorkReport } from "@work-report-mcp/contracts";
import type { ReactNode } from "react";

import { useIsMobileViewport } from "../state/useIsMobileViewport.js";
import { useWorkReportSelection } from "../state/useWorkReportSelection.js";
import { DetailPanel } from "./DetailPanel.js";
import { ReferencesSection } from "./ReferencesSection.js";
import { RemainingWorkSection } from "./RemainingWorkSection.js";
import { ResultHeader } from "./ResultHeader.js";
import { SuggestedActionsSection } from "./SuggestedActionsSection.js";
import { WorkFlow } from "./WorkFlow.js";
import { WorkReportDetailSheet } from "./WorkReportDetailSheet.js";
import {
  mobileWorkspaceStyle,
  noticeSlotStyle,
  workReportShellStyle,
  workspaceStyle,
} from "./styles.js";
import { resolveSelectedItem } from "./work-report-selectors.js";

type WorkReportViewProps = {
  report: WorkReport;
  /** Action失敗などの通知をWork Report本文の上へ置く。 */
  notice?: ReactNode;
  // 通信は親へ任せる。ViewがHostのSDKを知る必要はなく、表示を単独で確認できる。
  onOpenReference?: (url: string) => void;
  onSendMessage?: (prompt: string) => void;
};

/**
 * Tool ResultをSource of Truthとして表示する。
 * Viewは受け取った内容だけを表示し、情報を補完しない。
 *
 * このcomponentはlayoutと選択状態の受け渡しだけを担当し、
 * 各区画の描画は配下のcomponentへ委譲する。
 */
export const WorkReportView = ({
  report,
  notice,
  onOpenReference,
  onSendMessage,
}: WorkReportViewProps) => {
  // 選択IDと展開状態はUIの都合。本文の情報とは分けて管理する。
  const selection = useWorkReportSelection();
  // 画面幅を監視し、Desktopでは横の詳細Panel、Mobileでは選択時のBottom Sheetを使う。
  const isMobile = useIsMobileViewport();
  // ContractでIDが一意と検証されているため、選択IDから元の項目を特定できる。
  const selectedItem = resolveSelectedItem(report, selection.selectedItemId);

  return (
    <main className="work-report" style={workReportShellStyle}>
      {notice ? <div style={noticeSlotStyle}>{notice}</div> : null}

      <ResultHeader report={report} />

      <div style={isMobile ? mobileWorkspaceStyle : workspaceStyle}>
        <WorkFlow
          onSelectItem={selection.selectItem}
          report={report}
          selectedItemId={selection.selectedItemId}
        />

        {isMobile ? null : (
          <DetailPanel
            {...(onSendMessage ? { onSendMessage } : {})}
            expandedDetails={selection.expandedDetails}
            onToggleDetail={selection.toggleDetail}
            report={report}
            selected={selectedItem}
          />
        )}
      </div>

      {isMobile && selection.isDetailOpen && selection.selectedItemId ? (
        <WorkReportDetailSheet
          {...(onSendMessage ? { onSendMessage } : {})}
          expandedDetails={selection.expandedDetails}
          onClose={selection.closeDetail}
          onToggleDetail={selection.toggleDetail}
          report={report}
          selected={selectedItem}
        />
      ) : null}

      <RemainingWorkSection
        {...(onSendMessage ? { onSendMessage } : {})}
        items={report.remainingWork}
      />

      <ReferencesSection
        {...(onOpenReference ? { onOpenReference } : {})}
        references={report.references}
      />

      <SuggestedActionsSection
        {...(onSendMessage ? { onSendMessage } : {})}
        actions={report.suggestedActions}
      />
    </main>
  );
};
