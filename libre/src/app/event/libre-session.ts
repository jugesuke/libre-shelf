import {
  isConsignedItem,
  ItemQuantitySchema,
  type EventSessionV20261121,
  type ItemQuantity,
  type MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  LibreEventSessionSchema,
  type LibreEventSession,
} from "@libre-shared/entity/event/v2026-11-21/libre-event-session";

/** 前日準備と、レジの商品・価格編集の、持ち込み予定数の入力欄の理由 */
export const PLANNED_QTY_ERROR = "持ち込み予定数を入力してください（0以上の整数）。";

/**
 * 共通の画面は共通のセッションの型で扱う。Libre が足した項目は実行時にはセッションに残っているので、
 * Libre の部分はここで読む
 */
export const readEventName = (session: EventSessionV20261121): string =>
  "eventName" in session && typeof session.eventName === "string" ? session.eventName : "";

/** 共通のセッションから、持ち込み予定数を読む。読めなければ空の配列 */
export const readPlannedStock = (session: EventSessionV20261121): ItemQuantity[] => {
  const parsed = "plannedStock" in session ? ItemQuantitySchema.array().safeParse(session.plannedStock) : null;
  return parsed?.success ? parsed.data : [];
};

/** 共通のセッションを Libre のセッションとして読む。即売会の名前か持ち込み予定数が足りなければ例外を投げる */
export const toLibreSession = (session: EventSessionV20261121): LibreEventSession =>
  LibreEventSessionSchema.parse(session);

const isOwn = (entry: MenuEntry): boolean => !isConsignedItem(entry);

const parseQuantity = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

/** 自サークルの頒布物のうち、持ち込み予定数が 0 以上の整数でない商品の ID を返す。委託物は確かめない */
export const invalidPlannedItemIds = (
  menu: readonly MenuEntry[],
  quantities: Readonly<Record<string, string>>,
): ReadonlySet<string> =>
  new Set(
    menu.filter(isOwn).filter((e) => parseQuantity(quantities[e.itemId]) === undefined).map((e) => e.itemId),
  );

/** 自サークルの頒布物の持ち込み予定数を、おしながきの順に数にして返す。検証を通った入力に使う */
export const buildPlannedStock = (
  menu: readonly MenuEntry[],
  quantities: Readonly<Record<string, string>>,
): ItemQuantity[] =>
  menu.filter(isOwn).map((e) => ({ itemId: e.itemId, quantity: Number(quantities[e.itemId]) }));

/**
 * レジの商品・価格編集のあとの持ち込み予定数を返す。`after` は編集の結果を反映したセッション。
 * 持ち込み予定数を持つのは自サークルの頒布物だけ。新しく足した商品は、持ち込んだ在庫に入った数を使い、
 * 委託元名を外した商品は 0 にする
 */
export const plannedStockAfterMenuEdit = (
  before: EventSessionV20261121,
  after: EventSessionV20261121,
): ItemQuantity[] => {
  const planned = new Map(readPlannedStock(before).map((p) => [p.itemId, p.quantity]));
  const beforeEntries = new Map(before.menu.map((e) => [e.itemId, e]));
  const quantityOf = (entry: MenuEntry): number => {
    const previous = beforeEntries.get(entry.itemId);
    if (previous === undefined) {
      return after.openingStock.find((s) => s.itemId === entry.itemId)?.quantity ?? 0;
    }
    return isOwn(previous) ? (planned.get(entry.itemId) ?? 0) : 0;
  };
  return after.menu.filter(isOwn).map((e) => ({ itemId: e.itemId, quantity: quantityOf(e) }));
};
