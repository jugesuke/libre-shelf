import type { Item } from "@libre-shared/entity/items/item";
import { generateItemId } from "@libre-shared/entity/items/item_id";

const STORAGE_KEY = "items";
const EXPORT_FORMAT = "libre-shelf-items";
const EXPORT_VERSION = 1;

/** Web の `Storage` のうち、このモジュールが使う部分。画面からは `localStorage` を渡す。 */
export type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type LoadResult = { ok: true; items: Item[] } | { ok: false };

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "unreadable" | "duplicate" | "not_found" | "write_failed" };

export type ImportResult =
  | { ok: true; count: number }
  | { ok: false; reason: "unreadable" | "invalid" | "write_failed" };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isFilledString = (v: unknown): v is string =>
  typeof v === "string" && v.trim() !== "";

const isOptionalString = (v: unknown): boolean =>
  v === undefined || v === null || typeof v === "string";

export const isItem = (v: unknown): v is Item =>
  isRecord(v) &&
  typeof v.item_id === "string" &&
  /^\d{13}$/.test(v.item_id) &&
  isFilledString(v.product_name) &&
  isFilledString(v.publisher_name) &&
  isFilledString(v.class) &&
  isFilledString(v.type) &&
  isOptionalString(v.genre_code) &&
  isOptionalString(v.sample_image_url) &&
  (v.price === undefined ||
    v.price === null ||
    (typeof v.price === "number" && Number.isInteger(v.price) && v.price >= 0));

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** 商品マスタを読む。値がなければ 0 件、JSON や形が不正なら `{ ok: false }`。 */
export const loadItems = (storage: KeyValueStorage): LoadResult => {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { ok: true, items: [] };
  const parsed = parseJson(raw);
  return Array.isArray(parsed) && parsed.every(isItem)
    ? { ok: true, items: parsed }
    : { ok: false };
};

/** 容量超過などで `setItem` が投げる例外を、結果として返す。 */
export const saveItems = (storage: KeyValueStorage, items: Item[]): boolean => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
};

/** 読めたときだけ `change` の結果を保存する。読めないときは何も書かない。 */
const modify = (
  storage: KeyValueStorage,
  change: (items: Item[]) => Item[] | "duplicate" | "not_found",
): WriteResult => {
  const loaded = loadItems(storage);
  if (!loaded.ok) return { ok: false, reason: "unreadable" };
  const next = change(loaded.items);
  if (typeof next === "string") return { ok: false, reason: next };
  return saveItems(storage, next) ? { ok: true } : { ok: false, reason: "write_failed" };
};

/** 末尾に足す。同じ `item_id` があれば足さない。 */
export const addItem = (storage: KeyValueStorage, item: Item): WriteResult =>
  modify(storage, (items) =>
    items.some((i) => i.item_id === item.item_id) ? "duplicate" : [...items, item],
  );

/** 同じ `item_id` の商品を、位置を変えずに置き換える。 */
export const updateItem = (storage: KeyValueStorage, item: Item): WriteResult =>
  modify(storage, (items) =>
    items.some((i) => i.item_id === item.item_id)
      ? items.map((i) => (i.item_id === item.item_id ? item : i))
      : "not_found",
  );

/** `item_id` の商品を消す。 */
export const removeItem = (storage: KeyValueStorage, itemId: string): WriteResult =>
  modify(storage, (items) =>
    items.some((i) => i.item_id === itemId)
      ? items.filter((i) => i.item_id !== itemId)
      : "not_found",
  );

/** ISDN を持たない商品の `item_id` を、既存と重ならないように生成する。`generate` はテスト用。 */
export const generateUniqueItemId = (
  items: readonly Item[],
  generate: () => string = generateItemId,
): string => {
  const id = generate();
  return items.some((i) => i.item_id === id) ? generateUniqueItemId(items, generate) : id;
};

const pad = (n: number): string => String(n).padStart(2, "0");

/** 書き出す JSON の文字列とファイル名を作る。日付は端末のローカル時刻で数える。 */
export const buildExport = (
  items: readonly Item[],
  date: Date,
): { fileName: string; content: string } => ({
  fileName: `libre-shelf-items-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`,
  content: JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, items }),
});

const parseExport = (text: string): Item[] | undefined => {
  const data = parseJson(text);
  return isRecord(data) &&
    data.format === EXPORT_FORMAT &&
    data.version === EXPORT_VERSION &&
    Array.isArray(data.items) &&
    data.items.every(isItem)
    ? data.items
    : undefined;
};

/**
 * 端末の商品にファイルの商品を合わせる。同じ `item_id` は上書きし（位置は既存のまま）、
 * ファイル内の重複はあとのものを使う。`count` は重複を除いた件数。
 */
export const mergeItems = (
  existing: readonly Item[],
  incoming: readonly Item[],
): { merged: Item[]; count: number } => {
  const byId = new Map(incoming.map((i) => [i.item_id, i]));
  return {
    merged: [
      ...existing.map((i) => byId.get(i.item_id) ?? i),
      ...[...byId.values()].filter((i) => !existing.some((e) => e.item_id === i.item_id)),
    ],
    count: byId.size,
  };
};

/**
 * 書き出したファイルの内容を商品マスタに足す。同じ `item_id` は上書きし（位置は既存のまま）、
 * ファイル内の重複はあとのものを使う。`count` は重複を除いた件数。
 */
export const importItems = (storage: KeyValueStorage, text: string): ImportResult => {
  const loaded = loadItems(storage);
  if (!loaded.ok) return { ok: false, reason: "unreadable" };
  const incoming = parseExport(text);
  if (incoming === undefined) return { ok: false, reason: "invalid" };

  const { merged, count } = mergeItems(loaded.items, incoming);
  return saveItems(storage, merged)
    ? { ok: true, count }
    : { ok: false, reason: "write_failed" };
};
