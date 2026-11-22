import type {
  MenuEntry,
  TransactionItem,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { menuProductName } from "@libre/common/event-session/menu-entry";

/**
 * カートの中身から、会計の明細を作る。商品名は、会計を確定したときのおしながきから写す。
 *
 * @param cart 会計する商品
 * @param menu 会計を確定したときのおしながき
 * @returns 会計の明細
 */
export const buildTransactionItems = (
  cart: Pick<TransactionItem, "itemId" | "price" | "quantity">[],
  menu: MenuEntry[],
): TransactionItem[] =>
  cart.map((c) => ({
    itemId: c.itemId,
    price: c.price,
    quantity: c.quantity,
    productName: menuProductName(menu, c.itemId),
  }));
