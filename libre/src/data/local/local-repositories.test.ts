import { describe, expect, it, vi } from "vitest";
import type { Item } from "@libre-shared/entity/items/item";
import type { IsdnFetchResult } from "./fetch-isdn";
import { createLocalRepositories } from "./local-repositories";
import type { KeyValueStorage } from "./item-store";

const KEY = "items";

const memoryStorage = (initial?: string): KeyValueStorage & { raw: () => string | null } => {
  const data = new Map<string, string>(initial === undefined ? [] : [[KEY, initial]]);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    raw: () => data.get(KEY) ?? null,
  };
};

const item = (item_id: string, extra: Partial<Item> = {}): Item => ({
  item_id,
  product_name: `商品${item_id}`,
  publisher_name: "サークル",
  class: "オリジナル",
  type: "同人誌",
  ...extra,
});

const ISDN = "2784702901978";
const neverFetch = vi.fn<(isdn: string) => Promise<IsdnFetchResult>>();

const repos = (storage: KeyValueStorage, fetchIsdn = neverFetch) =>
  createLocalRepositories({ storage, fetchIsdn }).items;

describe("items.list", () => {
  it("登録した順に、offset と limit で切り出して返す", async () => {
    const s = memoryStorage(JSON.stringify([item("2710000000001"), item("2710000000002"), item("2710000000003")]));
    const res = await repos(s).list({ limit: 2, offset: 1 });
    expect(res).toEqual({
      ok: true,
      value: [item("2710000000002"), item("2710000000003")],
    });
  });

  it("保存された値が読めないときは失敗を返し、値は書き換えない", async () => {
    const s = memoryStorage("{壊れた");
    const res = await repos(s).list({ limit: 100, offset: 0 });
    expect(res.ok).toBe(false);
    expect(s.raw()).toBe("{壊れた");
  });
});

describe("items.add", () => {
  it("271 で始まる item_id を付けて末尾に足し、足した商品を返す", async () => {
    const s = memoryStorage(JSON.stringify([item("2710000000001")]));
    const res = await repos(s).add({ product_name: "新刊", publisher_name: "円", class: "オリジナル", type: "同人誌" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.item_id).toMatch(/^271\d{10}$/);
    const saved: Item[] = JSON.parse(s.raw() ?? "[]");
    expect(saved.map((i) => i.item_id)).toEqual(["2710000000001", res.value.item_id]);
    expect(saved[1]).toEqual(res.value);
  });

  it("書き込みに失敗したら、失敗を返す", async () => {
    const s: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const res = await repos(s).add({ product_name: "新刊", publisher_name: "円", class: "オリジナル", type: "同人誌" });
    expect(res).toMatchObject({ ok: false, status: 507 });
  });
});

describe("items.get / update / remove", () => {
  it("get は商品を返し、なければ 404 を返す", async () => {
    const s = memoryStorage(JSON.stringify([item("2710000000001")]));
    expect(await repos(s).get("2710000000001")).toEqual({ ok: true, value: item("2710000000001") });
    expect(await repos(s).get("2710000000009")).toMatchObject({ ok: false, status: 404 });
  });

  it("update は位置を変えずに、item_id を保ったまま置き換える", async () => {
    const s = memoryStorage(JSON.stringify([item("2710000000001"), item("2710000000002")]));
    const res = await repos(s).update("2710000000001", {
      product_name: "直した", publisher_name: "円", class: "パロディ", type: "同人誌",
    });
    expect(res.ok).toBe(true);
    const saved: Item[] = JSON.parse(s.raw() ?? "[]");
    expect(saved.map((i) => [i.item_id, i.product_name])).toEqual([
      ["2710000000001", "直した"],
      ["2710000000002", "商品2710000000002"],
    ]);
  });

  it("update と remove は、商品がなければ 404 を返す", async () => {
    const s = memoryStorage(JSON.stringify([item("2710000000001")]));
    const input = { product_name: "x", publisher_name: "y", class: "オリジナル", type: "同人誌" };
    expect(await repos(s).update("2710000000009", input)).toMatchObject({ ok: false, status: 404 });
    expect(await repos(s).remove("2710000000009")).toMatchObject({ ok: false, status: 404 });
  });

  it("remove は商品を消す", async () => {
    const s = memoryStorage(JSON.stringify([item("2710000000001"), item("2710000000002")]));
    expect((await repos(s).remove("2710000000001")).ok).toBe(true);
    expect((JSON.parse(s.raw() ?? "[]") as Item[]).map((i) => i.item_id)).toEqual(["2710000000002"]);
  });
});

describe("items.addByIsdn", () => {
  it("取得した情報を、ISDN を item_id にして足す", async () => {
    const s = memoryStorage();
    const fetchIsdn = vi.fn(async (): Promise<IsdnFetchResult> => ({ ok: true, item: item(ISDN) }));
    const res = await repos(s, fetchIsdn).addByIsdn(ISDN);
    expect(res).toEqual({ ok: true, value: item(ISDN) });
    expect(JSON.parse(s.raw() ?? "[]")).toEqual([item(ISDN)]);
  });

  it("すでに同じ item_id の商品があれば、取得せずに 409 を返す", async () => {
    const s = memoryStorage(JSON.stringify([item(ISDN)]));
    const fetchIsdn = vi.fn(async (): Promise<IsdnFetchResult> => ({ ok: true, item: item(ISDN) }));
    const res = await repos(s, fetchIsdn).addByIsdn(ISDN);
    expect(res).toMatchObject({ ok: false, status: 409 });
    expect(fetchIsdn).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", 404],
    ["unavailable", 502],
    ["incomplete", 400],
    ["invalid_isdn", 422],
    ["other", 500],
  ] as const)("取得の失敗 %s は、ステータス %i で返し、足さない", async (reason, status) => {
    const s = memoryStorage();
    const fetchIsdn = vi.fn(async (): Promise<IsdnFetchResult> => ({ ok: false, reason }));
    const res = await repos(s, fetchIsdn).addByIsdn(ISDN);
    expect(res).toMatchObject({ ok: false, status });
    expect(s.raw()).toBeNull();
  });

  it("応答が返らなかったときは、例外を投げる", async () => {
    const fetchIsdn = vi.fn(async (): Promise<IsdnFetchResult> => ({ ok: false, reason: "offline" }));
    await expect(repos(memoryStorage(), fetchIsdn).addByIsdn(ISDN)).rejects.toThrow();
  });
});

describe("items.syncIsdn", () => {
  it("取得した情報で、位置を変えずに上書きする", async () => {
    const s = memoryStorage(JSON.stringify([item(ISDN, { product_name: "古い" }), item("2710000000001")]));
    const fetchIsdn = vi.fn(async (): Promise<IsdnFetchResult> => ({ ok: true, item: item(ISDN, { product_name: "新しい" }) }));
    const res = await repos(s, fetchIsdn).syncIsdn(ISDN);
    expect(res).toEqual({ ok: true, value: item(ISDN, { product_name: "新しい" }) });
    expect((JSON.parse(s.raw() ?? "[]") as Item[]).map((i) => i.product_name)).toEqual(["新しい", "商品2710000000001"]);
  });

  it("取得に失敗したら、上書きせずに失敗を返す", async () => {
    const s = memoryStorage(JSON.stringify([item(ISDN, { product_name: "古い" })]));
    const fetchIsdn = vi.fn(async (): Promise<IsdnFetchResult> => ({ ok: false, reason: "unavailable" }));
    const res = await repos(s, fetchIsdn).syncIsdn(ISDN);
    expect(res).toMatchObject({ ok: false, status: 502 });
    expect((JSON.parse(s.raw() ?? "[]") as Item[])[0]?.product_name).toBe("古い");
  });
});

describe("itemStocks", () => {
  it("在庫の数を持たないので、渡さない", () => {
    expect(createLocalRepositories({ storage: memoryStorage(), fetchIsdn: neverFetch }).itemStocks).toBeUndefined();
  });
});
