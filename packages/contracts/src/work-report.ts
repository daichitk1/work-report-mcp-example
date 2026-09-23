/**
 * このファイルを読む前に（読む順番 1）
 *
 * 役割: APIとReact UIが共有する「Work Reportのデータ契約」を定義する。
 * 前: README.mdで、ChatGPTが作業結果を整理してToolへ渡す全体像を確認する。
 * 次: apps/api/src/work-report/tool-definition.tsで、この契約の公開方法を読む。
 * 理解したいこと: 項目の意味、実行時の検証、IDによる作業と判断・確認の関係。
 *
 * Zodは、実行中の値をSchema（データの形と条件）に照らして検査するライブラリ。
 * TypeScriptの型は開発時の誤りを見つけるが、通信で届いたJSONを実行時には検査しない。
 * そのためAPIとUIは、このSchemaのsafeParseで外部の値を検証してから扱う。
 */
import { z } from "zod";

/**
 * Work Reportとして意味のある文字数・件数の上限。
 *
 * これはPayload Policyの64 KiB上限とは責務が異なる。
 * byte上限は転送とSecurityの境界で、こちらは「1依頼のWork Reportとして
 * 妥当な情報量か」というProduct contractである。どちらも他方を代替しない。
 *
 * 上限超過はrejectする。Serverがtruncateして通すことはしない。
 */
export const WORK_REPORT_LIMITS = {
  id: 128,
  title: 160,
  summary: 2_000,
  description: 2_000,
  reason: 2_000,
  technicalDetail: 4_000,
  result: 2_000,
  filePath: 400,
  actionLabel: 80,
  actionPrompt: 1_000,
  referenceUrl: 2_048,

  completedWork: 30,
  decisions: 30,
  verification: 30,
  remainingWork: 20,
  references: 20,
  suggestedActions: 10,
  files: 50,
  relatedWorkIds: 30,
} as const;

// z.string()は文字列を要求する。.min(1) / .max(max)は文字列長の下限・上限。
// 空文字や長すぎる説明を拒否し、値を切り詰めて意味を変えることはしない。
const boundedText = (max: number) => z.string().min(1).max(max);

const itemId = boundedText(WORK_REPORT_LIMITS.id);

// z.object()はフィールドごとのSchemaを組み合わせる。
// actionは「ボタンの表示名」と「Hostへ渡す次の依頼」。UI自身の実行命令ではない。
const workReportActionSchema = z.object({
  label: boundedText(WORK_REPORT_LIMITS.actionLabel),
  prompt: boundedText(WORK_REPORT_LIMITS.actionPrompt),
});

// z.array()は配列の各要素を検証する。配列に対する.max()は要素数の上限。
// decisions / verification → relatedWorkIds → completedWork.id の向きで関連付ける。
// 文字列として正しいだけでは参照先の存在は分からないため、末尾でも検査する。
const relatedWorkIdsSchema = z.array(itemId).max(WORK_REPORT_LIMITS.relatedWorkIds);

// completedWorkは実施した作業。「変更した」と「動作確認した」を分けて報告する。
const completedWorkItemSchema = z.object({
  id: itemId,
  title: boundedText(WORK_REPORT_LIMITS.title),
  description: boundedText(WORK_REPORT_LIMITS.description),
  // .optional()は省略・undefinedを許す。情報が無い場合に説明を自動生成しない。
  technicalDetail: boundedText(WORK_REPORT_LIMITS.technicalDetail).optional(),
  files: z.array(boundedText(WORK_REPORT_LIMITS.filePath)).max(WORK_REPORT_LIMITS.files).optional(),
});

// decisionsは作業中の判断と、その理由。relatedWorkIdsで判断が関係する作業を示す。
const decisionSchema = z.object({
  id: itemId,
  description: boundedText(WORK_REPORT_LIMITS.description),
  reason: boundedText(WORK_REPORT_LIMITS.reason).optional(),
  relatedWorkIds: relatedWorkIdsSchema.optional(),
});

// verificationは確認事項と実施状態。completedWorkの存在から確認済みとは推測しない。
const verificationSchema = z.object({
  id: itemId,
  description: boundedText(WORK_REPORT_LIMITS.description),
  // z.enum()は列挙した値だけを許す。「確認済み」「未確認」「不明」を区別する。
  // completedは確認を実施した意味で、検査の成功・失敗の内容はresultへ記録する。
  status: z.enum(["completed", "not_completed", "unknown"]),
  result: boundedText(WORK_REPORT_LIMITS.result).optional(),
  relatedWorkIds: relatedWorkIdsSchema.optional(),
  action: workReportActionSchema.optional(),
});

// remainingWorkは依頼に残っている作業。次に頼める操作がある場合だけactionを付ける。
const remainingWorkSchema = z.object({
  id: itemId,
  description: boundedText(WORK_REPORT_LIMITS.description),
  action: workReportActionSchema.optional(),
});

// referencesは実際に参照した情報。URLの形式はここ、許可するURLの条件はAPI・Host層で検査する。
const referenceSchema = z.object({
  id: itemId,
  title: boundedText(WORK_REPORT_LIMITS.title),
  url: z.url().max(WORK_REPORT_LIMITS.referenceUrl),
  reason: boundedText(WORK_REPORT_LIMITS.reason).optional(),
});

// suggestedActionsは次に依頼できる操作の候補。未完了作業があること自体を意味しない。
const suggestedActionSchema = z.object({
  id: itemId,
  label: boundedText(WORK_REPORT_LIMITS.actionLabel),
  prompt: boundedText(WORK_REPORT_LIMITS.actionPrompt),
});

// 6つの配列はすべて必須だが空配列を許す。情報のない項目を捏造せず空で表せる。
const workReportShapeSchema = z.object({
  title: boundedText(WORK_REPORT_LIMITS.title),
  summary: boundedText(WORK_REPORT_LIMITS.summary),
  completedWork: z.array(completedWorkItemSchema).max(WORK_REPORT_LIMITS.completedWork),
  decisions: z.array(decisionSchema).max(WORK_REPORT_LIMITS.decisions),
  verification: z.array(verificationSchema).max(WORK_REPORT_LIMITS.verification),
  remainingWork: z.array(remainingWorkSchema).max(WORK_REPORT_LIMITS.remainingWork),
  references: z.array(referenceSchema).max(WORK_REPORT_LIMITS.references),
  suggestedActions: z.array(suggestedActionSchema).max(WORK_REPORT_LIMITS.suggestedActions),
});

// z.inferはSchemaからTypeScript型を取り出す。型と検証条件の二重管理を避ける。
// この型だけを付けても検証は走らない。実際の検証はparse / safeParseの呼び出し時に行う。
type WorkReportShape = z.infer<typeof workReportShapeSchema>;

/** Collections whose items can be selected by id in the UI. */
const itemCollections = [
  "completedWork",
  "decisions",
  "verification",
  "remainingWork",
  "references",
  "suggestedActions",
] as const;

/** Collections that may relate an item back to a completedWork item. */
const relatedWorkCollections = ["decisions", "verification"] as const;

/**
 * superRefineから呼び、6つの配列をまたいでIDの重複を検出する。
 * UIがIDで選択項目を探すため、重複すると別の項目を選んでしまう。
 * ctx.addIssueで問題の位置を登録し、呼び出し元へ検証失敗として返す。
 */
const addUniqueIdIssues = (report: WorkReportShape, ctx: z.RefinementCtx): void => {
  const seen = new Set<string>();

  for (const collection of itemCollections) {
    const items: { id: string }[] = report[collection];
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Work Report item id is not unique: ${item.id}`,
          path: [collection, index, "id"],
        });
        return;
      }
      seen.add(item.id);
    });
  }
};

/**
 * 判断・確認のrelatedWorkIdsが、同じレポートのcompletedWork.idを指すか検査する。
 * 別の判断IDや存在しないIDを許すと、詳細画面で作業との関係を正しく表示できない。
 */
const addRelatedWorkIssues = (report: WorkReportShape, ctx: z.RefinementCtx): void => {
  const completedWorkIds = new Set(report.completedWork.map((item) => item.id));

  for (const collection of relatedWorkCollections) {
    const items: { relatedWorkIds?: string[] | undefined }[] = report[collection];
    items.forEach((item, index) => {
      item.relatedWorkIds?.forEach((relatedWorkId, relatedIndex) => {
        if (completedWorkIds.has(relatedWorkId)) return;
        ctx.addIssue({
          code: "custom",
          message: `relatedWorkIds must reference a completedWork id: ${relatedWorkId}`,
          path: [collection, index, "relatedWorkIds", relatedIndex],
        });
      });
    });
  }
};

/**
 * superRefineは、個々のフィールドの形式だけでは表せない横断的な条件を追加する。
 * APIのhandleShowWorkReportとUIのuseWorkReportHostがこの完成したSchemaを使う。
 * Toolへ公開するshapeには、このIDの重複・参照検査そのものは含まれない。
 */
export const workReportSchema = workReportShapeSchema.superRefine((report, ctx) => {
  addUniqueIdIssues(report, ctx);
  addRelatedWorkIssues(report, ctx);
});

// 検証成功後の値を、Tool Result・React state・Viewの間で受け渡すための型。
export type WorkReport = z.infer<typeof workReportSchema>;
export type WorkReportDecision = z.infer<typeof decisionSchema>;
export type WorkReportVerification = z.infer<typeof verificationSchema>;
export type WorkReportVerificationStatus = WorkReportVerification["status"];
