import type { MenuEntry } from "@libre-shared/entity/event/v2026-11-21/event-session";
import type { Item } from "@libre-shared/entity/items/item";

/**
 * 商品マスタの商品から、おしながきの項目を作る。
 * 商品名とサークルは、このときの値をセッションに写す。
 *
 * @param item 足す商品
 * @returns 頒布価格は商品マスタの価格（なければ 0）。委託元名はなし
 */
export const menuEntryFromItem = (item: Item): MenuEntry => ({
  itemId: item.item_id,
  price: item.price ?? 0,
  productName: item.product_name,
  publisherName: item.publisher_name,
});

/**
 * おしながきに写した商品名を返す。
 *
 * @param menu セッションのおしながき
 * @param itemId 商品の ID
 * @returns おしながきになければ itemId
 */
export const menuProductName = (menu: MenuEntry[], itemId: string): string =>
  menu.find((entry) => entry.itemId === itemId)?.productName ?? itemId;

/**
 * おしながきに写したサークル（発行者名）を返す。
 *
 * @param menu セッションのおしながき
 * @param itemId 商品の ID
 * @returns おしながきになければ undefined
 */
export const menuPublisherName = (
  menu: MenuEntry[],
  itemId: string,
): string | undefined =>
  menu.find((entry) => entry.itemId === itemId)?.publisherName;

/**
 * 結果画面とレジの集計で、商品ごとに出す名前を返す。
 *
 * @param menu セッションのおしながき
 * @param transactions セッションの会計。明細に写した商品名を使う
 * @param itemId 商品の ID
 * @returns おしながきの商品名。なければ会計の明細の商品名（同じ商品が複数あれば最初のもの）。どちらにもなければ itemId
 */
export const resultProductName = (
  menu: MenuEntry[],
  transactions: { items: { itemId: string; productName: string }[] }[],
  itemId: string,
): string =>
  menu.find((entry) => entry.itemId === itemId)?.productName ??
  transactions
    .flatMap((tx) => tx.items)
    .find((item) => item.itemId === itemId)?.productName ??
  itemId;
