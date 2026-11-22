import { describe, expect, it } from "vitest";
import type { Item } from "@libre-shared/entity/items/item";
import {
  addItem,
  buildExport,
  generateUniqueItemId,
  importItems,
  loadItems,
  removeItem,
  updateItem,
  type KeyValueStorage,
} from "./item-store";

const memoryStorage = (initial?: string): KeyValueStorage & { raw: () => string | null } => {
  const data = new Map<string, string>(initial === undefined ? [] : [["items", initial]]);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    raw: () => data.get("items") ?? null,
  };
};

const item = (item_id: string, extra: Partial<Item> = {}): Item => ({
  item_id,
  product_name: `商品${item_id}`,
  publisher_name: "サークル",
  class: "オリジナル",
  type: "漫画",
  ...extra,
});

const A = "2710000000006";
const B = "2784702901978";
const C = "2710000000013";

describe("loadItems", () => {
  it("値がないときは 0 件", () => {
    expect(loadItems(memoryStorage())).toEqual({ ok: true, items: [] });
  });
  it("保存された順に返す", () => {
    const items = [item(B), item(A)];
    expect(loadItems(memoryStorage(JSON.stringify(items)))).toEqual({ ok: true, items });
  });
  it("JSON として壊れていれば読めない", () => {
    expect(loadItems(memoryStorage("{"))).toEqual({ ok: false });
  });
  it("配列でなければ読めない", () => {
    expect(loadItems(memoryStorage("{}"))).toEqual({ ok: false });
  });
  it("商品の形が違えば読めない", () => {
    expect(loadItems(memoryStorage(JSON.stringify([{ item_id: A }])))).toEqual({ ok: false });
  });
});

describe("addItem", () => {
  it("末尾に足して保存する", () => {
    const s = memoryStorage(JSON.stringify([item(A)]));
    expect(addItem(s, item(B))).toEqual({ ok: true });
    expect(loadItems(s)).toEqual({ ok: true, items: [item(A), item(B)] });
  });
  it("同じ item_id があれば足さない", () => {
    const initial = JSON.stringify([item(A)]);
    const s = memoryStorage(initial);
    expect(addItem(s, item(A, { product_name: "別" }))).toEqual({ ok: false, reason: "duplicate" });
    expect(s.raw()).toBe(initial);
  });
  it("値が読めないあいだは書き換えない", () => {
    const s = memoryStorage("{");
    expect(addItem(s, item(A))).toEqual({ ok: false, reason: "unreadable" });
    expect(s.raw()).toBe("{");
  });
});

describe("保存に失敗したとき", () => {
  const failing = (initial: string): KeyValueStorage => ({
    getItem: () => initial,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  });
  const initial = JSON.stringify([item(A)]);
  const failed = { ok: false, reason: "write_failed" };
  it("addItem は例外を投げず失敗を返す", () => {
    expect(addItem(failing(initial), item(B))).toEqual(failed);
  });
  it("updateItem は例外を投げず失敗を返す", () => {
    expect(updateItem(failing(initial), item(A))).toEqual(failed);
  });
  it("removeItem は例外を投げず失敗を返す", () => {
    expect(removeItem(failing(initial), A)).toEqual(failed);
  });
  it("importItems は例外を投げず失敗を返す", () => {
    const text = JSON.stringify({ format: "libre-shelf-items", version: 1, items: [item(B)] });
    expect(importItems(failing(initial), text)).toEqual(failed);
  });
});

describe("loadItems の検証", () => {
  it("必須の項目が空白だけなら読めない", () => {
    expect(loadItems(memoryStorage(JSON.stringify([item(A, { publisher_name: "  " })])))).toEqual({ ok: false });
  });
});

describe("updateItem", () => {
  it("同じ item_id の商品を、位置を変えずに置き換える", () => {
    const s = memoryStorage(JSON.stringify([item(A), item(B)]));
    expect(updateItem(s, item(A, { price: 500 }))).toEqual({ ok: true });
    expect(loadItems(s)).toEqual({ ok: true, items: [item(A, { price: 500 }), item(B)] });
  });
  it("なければ変えない", () => {
    const initial = JSON.stringify([item(A)]);
    const s = memoryStorage(initial);
    expect(updateItem(s, item(B))).toEqual({ ok: false, reason: "not_found" });
    expect(s.raw()).toBe(initial);
  });
  it("値が読めないあいだは書き換えない", () => {
    const s = memoryStorage("[1]");
    expect(updateItem(s, item(A))).toEqual({ ok: false, reason: "unreadable" });
    expect(s.raw()).toBe("[1]");
  });
});

describe("removeItem", () => {
  it("消して保存する", () => {
    const s = memoryStorage(JSON.stringify([item(A), item(B)]));
    expect(removeItem(s, A)).toEqual({ ok: true });
    expect(loadItems(s)).toEqual({ ok: true, items: [item(B)] });
  });
  it("なければ変えない", () => {
    const initial = JSON.stringify([item(A)]);
    const s = memoryStorage(initial);
    expect(removeItem(s, B)).toEqual({ ok: false, reason: "not_found" });
    expect(s.raw()).toBe(initial);
  });
  it("値が読めないあいだは書き換えない", () => {
    const s = memoryStorage("{");
    expect(removeItem(s, A)).toEqual({ ok: false, reason: "unreadable" });
    expect(s.raw()).toBe("{");
  });
});

describe("generateUniqueItemId", () => {
  it("271 で始まる 13 桁のコードを返す", () => {
    expect(generateUniqueItemId([])).toMatch(/^271\d{10}$/);
  });
  it("既存と重なれば生成し直す", () => {
    const candidates = [A, A, C];
    const generate = () => candidates.shift() as string;
    expect(generateUniqueItemId([item(A)], generate)).toBe(C);
  });
});

describe("buildExport", () => {
  it("ファイル名に日付を入れ、format と version を付けた JSON を作る", () => {
    const items = [item(A, { price: 100, genre_code: null })];
    const out = buildExport(items, new Date(2026, 0, 5));
    expect(out.fileName).toBe("libre-shelf-items-2026-01-05.json");
    expect(JSON.parse(out.content)).toEqual({ format: "libre-shelf-items", version: 1, items });
  });
});

describe("importItems", () => {
  const file = (items: unknown[], over: Record<string, unknown> = {}) =>
    JSON.stringify({ format: "libre-shelf-items", version: 1, items, ...over });

  it("足して、件数を返す", () => {
    const s = memoryStorage(JSON.stringify([item(A)]));
    expect(importItems(s, file([item(B), item(C)]))).toEqual({ ok: true, count: 2 });
    expect(loadItems(s)).toEqual({ ok: true, items: [item(A), item(B), item(C)] });
  });
  it("同じ item_id はファイルの内容で上書きし、ない商品は残す", () => {
    const s = memoryStorage(JSON.stringify([item(A), item(B)]));
    importItems(s, file([item(A, { product_name: "新" })]));
    expect(loadItems(s)).toEqual({ ok: true, items: [item(A, { product_name: "新" }), item(B)] });
  });
  it("ファイルの中の重複は、あとのものを使う", () => {
    const s = memoryStorage();
    const r = importItems(s, file([item(A, { product_name: "前" }), item(A, { product_name: "後" })]));
    expect(r).toEqual({ ok: true, count: 1 });
    expect(loadItems(s)).toEqual({ ok: true, items: [item(A, { product_name: "後" })] });
  });
  it("分類と種類は選択肢にない値でも受け付ける", () => {
    const s = memoryStorage();
    expect(importItems(s, file([item(A, { class: "その他", type: "未知" })]))).toEqual({ ok: true, count: 1 });
  });
  it.each([
    ["JSON でない", "x"],
    ["format が違う", file([], { format: "x" })],
    ["version が違う", file([], { version: 2 })],
    ["items が配列でない", file([], { items: {} })],
    ["必須の項目が文字列でない", file([{ ...item(A), product_name: 1 }])],
    ["item_id が 13 桁の数字でない", file([item("123")])],
    ["必須の項目が空白だけの", file([item(A, { product_name: " 　" })])],
    ["price が負", file([item(A, { price: -1 })])],
    ["price が整数でない", file([item(A, { price: 1.5 })])],
    ["price が文字列", file([{ ...item(A), price: "1" }])],
  ])("%s ときは何も変えない", (_n, text) => {
    const initial = JSON.stringify([item(B)]);
    const s = memoryStorage(initial);
    expect(importItems(s, text)).toEqual({ ok: false, reason: "invalid" });
    expect(s.raw()).toBe(initial);
  });
  it("price が null や欠けていてもよい", () => {
    const s = memoryStorage();
    expect(importItems(s, file([item(A, { price: null }), item(B)]))).toEqual({ ok: true, count: 2 });
  });
  it("保存されている値が読めないあいだは書き換えない", () => {
    const s = memoryStorage("{");
    expect(importItems(s, file([item(A)]))).toEqual({ ok: false, reason: "unreadable" });
    expect(s.raw()).toBe("{");
  });
});
