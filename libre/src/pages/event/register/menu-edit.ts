import type {
  EventSessionV20261121,
  ItemQuantity,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";

export const STOCK_QTY_ERROR = "持ち込み数を入力してください（0以上の整数）。";
export const CONSIGNED_QTY_ERROR =
  "預かり部数を入力してください（1以上の整数）。";

export type MenuEditInput = {
  menu: MenuEntry[];
  /** ダイアログを開いた時点でおしながきにあった商品の itemId */
  originalItemIds: ReadonlySet<string>;
  /** 新しく足した商品の持ち込み数（itemId → 入力文字列） */
  newStockQty: Readonly<Record<string, string>>;
  /** 委託物の預かり部数（itemId → 入力文字列） */
  consignedQty: Readonly<Record<string, string>>;
};

export type MenuEditErrors = {
  /** 持ち込み数が不正な商品の itemId */
  stockQty: ReadonlySet<string>;
  /** 預かり部数が不正な商品の itemId */
  consignedQty: ReadonlySet<string>;
};

const isConsigned = (entry: MenuEntry): boolean =>
  entry.consignorName !== undefined && entry.consignorName.trim() !== "";

/** 空欄は整数として扱わない（Number("") は 0 になるため） */
const parseInteger = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
};

/**
 * 「保存」を押したときの持ち込み数と預かり部数の入力欄を確かめ、合わない商品の itemId を返す。
 * 持ち込み数は新しく足した自サークルの頒布物（0 以上の整数）、預かり部数は委託物（1 以上の整数）。
 */
export function validateMenuEdit(input: MenuEditInput): MenuEditErrors {
  const stockQty = input.menu
    .filter((e) => !input.originalItemIds.has(e.itemId) && !isConsigned(e))
    .filter((e) => {
      const n = parseInteger(input.newStockQty[e.itemId]);
      return n === undefined || n < 0;
    })
    .map((e) => e.itemId);
  const consignedQty = input.menu
    .filter(isConsigned)
    .filter((e) => {
      const n = parseInteger(input.consignedQty[e.itemId]);
      return n === undefined || n < 1;
    })
    .map((e) => e.itemId);
  return { stockQty: new Set(stockQty), consignedQty: new Set(consignedQty) };
}

/** 委託元名を trim し、空になったら consignorName を外す */
const normalizeMenu = (menu: MenuEntry[]): MenuEntry[] =>
  menu.map((entry) => {
    if (entry.consignorName === undefined) return entry;
    const trimmed = entry.consignorName.trim();
    if (trimmed === "") {
      const { consignorName: _consignorName, ...rest } = entry;
      return rest;
    }
    return { ...entry, consignorName: trimmed };
  });

/**
 * 検証を通った入力から、保存するセッションの menu、openingStock、consignedStock を組み立てる。
 * 既にある商品の openingStock は変えない。新しく足した商品は、自サークルの頒布物なら持ち込み数、
 * 委託物なら預かり部数を openingStock に入れる。
 */
export function buildMenuEditResult(
  session: Pick<EventSessionV20261121, "openingStock">,
  input: MenuEditInput,
): Pick<EventSessionV20261121, "menu" | "openingStock" | "consignedStock"> {
  const menu = normalizeMenu(input.menu);
  const consignedStock: ItemQuantity[] = menu.filter(isConsigned).map((e) => ({
    itemId: e.itemId,
    quantity: Number(input.consignedQty[e.itemId]),
  }));
  const added: ItemQuantity[] = menu
    .filter((e) => !input.originalItemIds.has(e.itemId))
    .filter((e) => !session.openingStock.some((s) => s.itemId === e.itemId))
    .map((e) => ({
      itemId: e.itemId,
      quantity: isConsigned(e)
        ? Number(input.consignedQty[e.itemId])
        : Number(input.newStockQty[e.itemId]),
    }));
  return {
    menu,
    openingStock: [...session.openingStock, ...added],
    consignedStock,
  };
}
