import type {
  ItemQuantity,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { isConsignedItem } from "@libre-shared/entity/event/v2026-11-21/event-session";

export type PreparationInput = {
  eventDate: string;
  menu: MenuEntry[];
  consignedStock: ItemQuantity[];
};

export type PreparationErrors = {
  eventDate?: string;
  menu?: string;
  /** 頒布価格が不正な商品の itemId */
  price: ReadonlySet<string>;
  /** 委託物で預かり部数が不正な商品の itemId */
  consignedQty: ReadonlySet<string>;
};

export const EVENT_DATE_ERROR = "開催日を入力してください。";
export const MENU_EMPTY_ERROR = "商品を1つ以上追加してください。";
export const PRICE_ERROR = "頒布価格を入力してください（0以上の整数）。";
export const CONSIGNED_QTY_ERROR =
  "預かり部数を入力してください（1以上の整数）。";

/**
 * 前日準備の入力を検証し、入力欄ごとの理由を返す。
 * 理由がない項目は undefined、商品ごとの項目は該当する itemId の Set を返す。
 * 「続きはあとで」と「レジへ進む」は同じ検証を使う。
 */
export function validatePreparation(
  input: PreparationInput,
): PreparationErrors {
  const price = new Set(
    input.menu
      .filter((entry) => !Number.isInteger(entry.price) || entry.price < 0)
      .map((entry) => entry.itemId),
  );
  const consignedQty = new Set(
    input.menu
      .filter(isConsignedItem)
      .filter((entry) => {
        const quantity = input.consignedStock.find(
          (s) => s.itemId === entry.itemId,
        )?.quantity;
        return (
          quantity === undefined || !Number.isInteger(quantity) || quantity < 1
        );
      })
      .map((entry) => entry.itemId),
  );
  return {
    eventDate: input.eventDate === "" ? EVENT_DATE_ERROR : undefined,
    menu: input.menu.length === 0 ? MENU_EMPTY_ERROR : undefined,
    price,
    consignedQty,
  };
}

/** 検証の結果に理由が 1 つでもあるか */
export function hasPreparationErrors(errors: PreparationErrors): boolean {
  return (
    errors.eventDate !== undefined ||
    errors.menu !== undefined ||
    errors.price.size > 0 ||
    errors.consignedQty.size > 0
  );
}

/** 商品の行を削除したとき、その行の理由（頒布価格と預かり部数）を外す。 */
export function removeItemErrors(
  errors: PreparationErrors,
  itemId: string,
): PreparationErrors {
  const withoutItem = (ids: ReadonlySet<string>) =>
    new Set([...ids].filter((id) => id !== itemId));
  return {
    ...errors,
    price: withoutItem(errors.price),
    consignedQty: withoutItem(errors.consignedQty),
  };
}
