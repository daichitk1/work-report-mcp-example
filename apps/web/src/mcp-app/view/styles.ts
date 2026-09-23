import type { CSSProperties } from "react";

export const bodyFontFamily =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Work Report本体とFallbackで共通の外枠。 */
export const workReportShellStyle: CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "960px",
  margin: "0 auto",
  padding: "clamp(16px, 4vw, 32px)",
  color: "#171717",
  fontFamily: bodyFontFamily,
  overflowWrap: "anywhere",
};

/**
 * この幅以下では2カラムを使わず、Detailを Bottom Sheet で表示する。
 * Desktop 2カラムはDetail Panelの最小280pxを2列確保できる幅から成立させる。
 */
export const WORK_REPORT_MOBILE_MEDIA_QUERY = "(max-width: 719px)";

/** 通知はWork Report本文より前に読ませる。 */
export const noticeSlotStyle: CSSProperties = {
  marginBottom: "20px",
};

export const headerStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

export const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.08em",
};

export const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(24px, 6vw, 40px)",
  lineHeight: 1.2,
};

export const summaryStyle: CSSProperties = {
  margin: 0,
  maxWidth: "72ch",
  fontSize: "15px",
  lineHeight: 1.7,
};

export const statusSectionStyle: CSSProperties = {
  marginTop: "8px",
};

export const statusListStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "8px",
  margin: 0,
};

export const statusItemStyle: CSSProperties = {
  boxSizing: "border-box",
  minWidth: 0,
  padding: "12px",
  border: "1px solid #d4d4d4",
  borderRadius: "12px",
  background: "#fafafa",
};

export const statusLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.5,
};

export const statusValueStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: 1,
};

export const navigationStyle: CSSProperties = {
  marginTop: "24px",
};

export const navigationListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

export const navigationItemStyle: CSSProperties = {
  padding: "7px 11px",
  border: "1px solid #e5e5e5",
  borderRadius: "999px",
  background: "#fafafa",
  fontSize: "13px",
  fontWeight: 600,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
};

export const workspaceStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "20px",
  alignItems: "start",
  marginTop: "24px",
};

export const mobileWorkspaceStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "20px",
  alignItems: "start",
  marginTop: "24px",
};

export const flowStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
};

export const flowTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  lineHeight: 1.4,
};

export const flowGroupStyle: CSSProperties = {
  padding: "16px",
  border: "1px solid #e5e5e5",
  borderRadius: "14px",
  background: "#ffffff",
};

export const flowLabelStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.5,
};

export const flowListStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

export const flowButtonStyle: CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  padding: "10px",
  border: "1px solid transparent",
  borderRadius: "10px",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};

export const verificationItemStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

export const verificationHeaderStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "8px",
};

export const verificationDescriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  lineHeight: 1.6,
};

export const verificationStateStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

export const verificationResultStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.6,
};

export const connectorStyle: CSSProperties = {
  margin: 0,
  textAlign: "center",
  fontSize: "16px",
  lineHeight: 1,
};

export const detailStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  minWidth: 0,
  padding: "18px",
  border: "1px solid #d4d4d4",
  borderRadius: "14px",
  background: "#fafafa",
};

export const detailTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  lineHeight: 1.4,
};

export const sheetBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  alignItems: "end",
  background: "rgba(23, 23, 23, 0.45)",
};

export const sheetStyle: CSSProperties = {
  boxSizing: "border-box",
  display: "grid",
  gap: "14px",
  width: "100%",
  maxHeight: "85vh",
  overflowY: "auto",
  padding: "12px clamp(16px, 4vw, 24px) clamp(20px, 5vw, 28px)",
  borderRadius: "16px 16px 0 0",
  background: "#ffffff",
  color: "#171717",
  fontFamily: bodyFontFamily,
  overflowWrap: "anywhere",
};

export const sheetHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

export const detailTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.7,
};

export const disclosureButtonStyle: CSSProperties = {
  justifySelf: "start",
  padding: "7px 10px",
  border: "1px solid #d4d4d4",
  borderRadius: "9px",
  background: "#ffffff",
  color: "inherit",
  font: "inherit",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

export const disclosureSectionStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  padding: "12px",
  borderLeft: "3px solid #d4d4d4",
};

export const disclosureLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.5,
};

export const technicalTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.7,
};

export const fileListStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  margin: 0,
  paddingLeft: "18px",
  fontSize: "12px",
  lineHeight: 1.6,
};

export const relationGroupStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

export const relationLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 700,
};

export const relationListStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  margin: 0,
  paddingLeft: "18px",
};

export const followUpSectionStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "20px",
  padding: "18px",
  border: "1px solid #e5e5e5",
  borderRadius: "14px",
  background: "#ffffff",
};

export const followUpListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

export const followUpItemStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

export const followUpDescriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.7,
};
