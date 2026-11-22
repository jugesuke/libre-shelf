import { formatYen } from "@libre/common/format";

/** 委託販売報告の1商品分の集計値（委託販売サマリーテーブルの1行と同じデータ） */
export type ConsignmentReportRow = {
  itemName: string;
  /** 入荷数（openingStock 由来） */
  initial: number;
  /** 販売数 */
  sold: number;
  /** 見本誌提出数 */
  sample: number;
  /** 展示見本数 */
  display: number;
  /** 返却数（closingStock 由来）。未入力（closingStock にエントリがない）場合は undefined */
  closing: number | undefined;
  /** 売上金額 */
  revenue: number;
};

/**
 * 委託元への報告用テキストを markdown リスト形式で生成する。
 * Discord は markdown テーブルを描画しないため、リスト形式にしている。
 *
 * @param eventDate イベント開催日（YYYY-MM-DD）
 * @param consignorName 委託元名
 * @param rows 商品ごとの集計値（委託販売サマリーテーブルと同じ値を渡す）
 * @returns コピー用の markdown テキスト
 */
export function formatConsignmentReport(
  eventDate: string,
  consignorName: string,
  rows: ConsignmentReportRow[],
): string {
  const lines = rows.map(
    (row) =>
      `- ${row.itemName}: 入荷 ${row.initial} / 販売 ${row.sold} / 見本誌提出 ${row.sample} / 展示見本 ${row.display} / 返却 ${row.closing ?? "-"} / 売上 ${formatYen(row.revenue)}`,
  );
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  return [
    `## 委託販売報告（${eventDate}）: ${consignorName} さま`,
    "",
    ...lines,
    "",
    `売上合計: ${formatYen(total)}`,
  ].join("\n");
}
