import type { ImportDataResult } from "@libre/data/local/backup-store";

export const EXPORT_FAILED = "保存されているデータを読み込めないため、書き出せませんでした。";

const IMPORT_FAILED =
  "ファイルを読み込めませんでした。Libre Shelfで書き出したファイルを選んでください。";
const WRITE_FAILED = "データを保存できませんでした。端末の空き容量を確認してください。";

/** 読み込みの結果を、トーストかアラートに出す文言にする。 */
export const importMessage = (result: ImportDataResult): string => {
  if (!result.ok) return result.reason === "invalid_file" ? IMPORT_FAILED : WRITE_FAILED;
  if (result.kind === "session") return `「${result.eventName}」の記録を読み込みました。`;
  const base = `商品${result.itemCount}件、記録${result.recordCount}件を読み込みました。`;
  switch (result.currentSession) {
    case "imported":
      return `${base}進行中の即売会も読み込みました。`;
    case "kept":
      return `${base}進行中の即売会は、すでにあるので読み込みませんでした。`;
    case "none":
      return base;
  }
};
