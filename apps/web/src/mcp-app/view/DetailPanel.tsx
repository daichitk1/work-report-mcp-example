import type { WorkReport } from "@work-report-mcp/contracts";

import {
  detailStyle,
  detailTextStyle,
  detailTitleStyle,
  disclosureButtonStyle,
  disclosureLabelStyle,
  disclosureSectionStyle,
  fileListStyle,
  flowTitleStyle,
  relationGroupStyle,
  relationLabelStyle,
  relationListStyle,
  technicalTextStyle,
} from "./styles.js";
import type { SelectedItem } from "./types.js";
import { relatedWorkItems } from "./work-report-selectors.js";
import { verificationStatusLabels } from "./verification-status.js";

type RelationGroupProps = {
  label: string;
  items: string[];
};

const RelationGroup = ({ label, items }: RelationGroupProps) => {
  if (items.length === 0) return null;

  return (
    <div aria-label={label} role="group" style={relationGroupStyle}>
      <p style={relationLabelStyle}>{label}</p>
      <ul style={relationListStyle}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

type DetailPanelProps = {
  report: WorkReport;
  selected: SelectedItem | null;
  expandedDetails: ReadonlySet<string>;
  onToggleDetail: (key: string) => void;
  onSendMessage?: (prompt: string) => void;
};

const detailKey = (kind: "technical" | "files" | "reason", id: string) => `${kind}:${id}`;

/** Detailの中身だけを描画する。Desktop PanelとMobile Bottom Sheetで共有する。 */
export const DetailPanelBody = ({
  report,
  selected,
  expandedDetails,
  onToggleDetail,
  onSendMessage,
}: DetailPanelProps) => {
  if (!selected) {
    return (
      <>
        <h2 style={flowTitleStyle}>項目の詳細</h2>
        <p style={detailTextStyle}>作業フローから項目を選択すると詳細を確認できます。</p>
      </>
    );
  }

  if (selected.kind === "work") {
    const relatedDecisions = report.decisions
      .filter((item) => item.relatedWorkIds?.includes(selected.item.id))
      .map((item) => item.description);
    const relatedVerification = report.verification
      .filter((item) => item.relatedWorkIds?.includes(selected.item.id))
      .map((item) => item.description);

    const technicalKey = detailKey("technical", selected.item.id);
    const filesKey = detailKey("files", selected.item.id);
    const technicalExpanded = expandedDetails.has(technicalKey);
    const filesExpanded = expandedDetails.has(filesKey);
    const hasFiles = Boolean(selected.item.files?.length);
    const canShowFilesControl = hasFiles && (!selected.item.technicalDetail || technicalExpanded);

    return (
      <>
        <h3 style={detailTitleStyle}>{selected.item.title}</h3>
        <p style={detailTextStyle}>{selected.item.description}</p>

        {selected.item.technicalDetail ? (
          <>
            <button
              aria-expanded={technicalExpanded}
              onClick={() => onToggleDetail(technicalKey)}
              style={disclosureButtonStyle}
              type="button"
            >
              {technicalExpanded ? "技術詳細を閉じる" : "技術詳細を見る"}
            </button>
            {technicalExpanded ? (
              <div aria-label="技術詳細" role="group" style={disclosureSectionStyle}>
                <p style={disclosureLabelStyle}>技術詳細</p>
                <p style={technicalTextStyle}>{selected.item.technicalDetail}</p>
              </div>
            ) : null}
          </>
        ) : null}

        {canShowFilesControl ? (
          <>
            <button
              aria-expanded={filesExpanded}
              onClick={() => onToggleDetail(filesKey)}
              style={disclosureButtonStyle}
              type="button"
            >
              {filesExpanded ? "変更ファイルを閉じる" : "変更ファイルを見る"}
            </button>
            {filesExpanded ? (
              <div aria-label="変更ファイル" role="group" style={disclosureSectionStyle}>
                <p style={disclosureLabelStyle}>変更ファイル</p>
                <ul style={fileListStyle}>
                  {selected.item.files?.map((file) => (
                    <li key={file}>
                      <code>{file}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        <RelationGroup label="関連する判断" items={relatedDecisions} />
        <RelationGroup label="関連する確認" items={relatedVerification} />
      </>
    );
  }

  if (selected.kind === "decision") {
    const work = relatedWorkItems(report, selected.item.relatedWorkIds).map((item) => item.title);

    const reasonKey = detailKey("reason", selected.item.id);
    const reasonExpanded = expandedDetails.has(reasonKey);

    return (
      <>
        <h3 style={detailTitleStyle}>AIによる判断</h3>
        <p style={detailTextStyle}>{selected.item.description}</p>
        {selected.item.reason ? (
          <>
            <button
              aria-expanded={reasonExpanded}
              onClick={() => onToggleDetail(reasonKey)}
              style={disclosureButtonStyle}
              type="button"
            >
              {reasonExpanded ? "判断理由を閉じる" : "判断理由を見る"}
            </button>
            {reasonExpanded ? (
              <div aria-label="判断理由" role="group" style={disclosureSectionStyle}>
                <p style={disclosureLabelStyle}>AIによる判断理由</p>
                <p style={technicalTextStyle}>{selected.item.reason}</p>
              </div>
            ) : null}
          </>
        ) : null}
        <RelationGroup label="関連する作業" items={work} />
      </>
    );
  }

  const work = relatedWorkItems(report, selected.item.relatedWorkIds).map((item) => item.title);
  const action = selected.item.status === "not_completed" ? selected.item.action : undefined;

  return (
    <>
      <h3 style={detailTitleStyle}>{selected.item.description}</h3>
      <p style={detailTextStyle}>{verificationStatusLabels[selected.item.status]}</p>
      {selected.item.result ? <p style={detailTextStyle}>{selected.item.result}</p> : null}
      {action ? (
        <button
          onClick={() => onSendMessage?.(action.prompt)}
          style={disclosureButtonStyle}
          type="button"
        >
          {action.label}
        </button>
      ) : null}
      <RelationGroup label="関連する作業" items={work} />
    </>
  );
};

/** Desktop 2カラムのDetail Panel。 */
export const DetailPanel = (props: DetailPanelProps) => (
  <section aria-label="項目の詳細" style={detailStyle}>
    <DetailPanelBody {...props} />
  </section>
);
