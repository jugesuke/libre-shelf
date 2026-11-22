import type { ImportResult } from "@libre/data/local/item-store";

/** 商品マスタが読めないときに商品管理の画面に出す文言 */
export const ITEMS_UNREADABLE_MESSAGE =
  "保存されている商品のデータを読み込めませんでした。データを上書きしないように、追加、変更、読み込みを止めています。";

/** 前日準備と、レジの商品・価格編集で、商品マスタが読めないときに出す文言 */
export const ITEM_PICKER_UNREADABLE_MESSAGE =
  "登録した商品を読み込めないため、商品を追加できません。「商品管理」の画面で確かめてください。";

/** 商品を読み込めたときのトーストの文言。`count` はファイルにある商品の件数（`item_id` の重なりを除く） */
export const importItemsSuccessMessage = (count: number): string =>
  `${count} 件の商品を読み込みました。`;

/** 商品を読み込めなかったときのアラートの文言 */
export const importItemsFailureMessage = (
  reason: Extract<ImportResult, { ok: false }>["reason"],
): string => {
  switch (reason) {
    case "invalid":
      return "ファイルを読み込めませんでした。「書き出す」で保存したファイルを選んでください。";
    case "write_failed":
      return "商品を保存できませんでした。端末の空き容量を確認してください。";
    case "unreadable":
      return ITEMS_UNREADABLE_MESSAGE;
  }
};
