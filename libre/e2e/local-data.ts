import type { Page } from "@playwright/test";
import type { Item } from "@libre-shared/entity/items/item";
import type { LibreEventSession } from "@libre-shared/entity/event/v2026-11-21/libre-event-session";

/** 商品マスタに入れる商品の例。ISDN の商品（先頭が 278 か 279）ではない */
export const SAMPLE_ITEM: Item = {
  item_id: "4912345678904",
  product_name: "テスト本",
  publisher_name: "テストサークル",
  class: "オリジナル",
  type: "漫画",
  price: 500,
};

export const NO_COINS = {
  "100yen": 0,
  "500yen": 0,
  "1000yen": 0,
  "2000yen": 0,
  "5000yen": 0,
  "10000yen": 0,
};

/** 進行中のセッションの例。データの形は docs/spec/即売会/セッションのデータ.md */
export function sessionFixture(
  overrides: Partial<LibreEventSession> = {},
): LibreEventSession {
  return {
    schemaVersion: "2026-11-21",
    eventName: "テスト即売会",
    eventDate: "2026-11-17",
    phase: "register",
    menu: [
      {
        itemId: SAMPLE_ITEM.item_id,
        productName: SAMPLE_ITEM.product_name,
        publisherName: SAMPLE_ITEM.publisher_name,
        price: 500,
      },
    ],
    openingCash: null,
    cashAdjustments: [],
    openingStock: [],
    plannedStock: [],
    consignedStock: [],
    sampleSubmissions: [],
    displaySamples: [],
    transactions: [],
    visitorLogs: [],
    closingStock: null,
    closingCash: null,
    stockDifference: null,
    cashDifference: null,
    settled: false,
    ...overrides,
  };
}

/**
 * localStorage に値を入れる。画面を開く前に `page.goto` の前で呼ぶ。
 * 画面を開き直すたびに入れ直すので、画面で消した値は開き直すと戻る。
 */
export async function seedLocalStorage(
  page: Page,
  entries: Record<string, unknown>,
): Promise<void> {
  await page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
}

/** 商品マスタ（キー `items`）に商品を入れる */
export const seedItems = (page: Page, items: Item[]) =>
  seedLocalStorage(page, { items });

/** 進行中のセッション（キー `event_session`）を入れる */
export const seedSession = (page: Page, session: LibreEventSession) =>
  seedLocalStorage(page, { event_session: session });

/** セッションの履歴（キー `event_session_history`）に、1 件を入れる。形は docs/spec/即売会/セッションの保存.md */
export const seedHistory = (
  page: Page,
  id: string,
  session: LibreEventSession,
) =>
  seedLocalStorage(page, {
    event_session_history: [
      { id, savedAt: "2026-11-18T00:00:00.000Z", session },
    ],
  });

/**
 * 指定したキーへの localStorage の書き込みを、容量超過のように失敗させる。
 * `seedLocalStorage` のあとに呼ぶ。そうしないと、入れる値まで失敗する。
 */
export async function failLocalStorageWrites(
  page: Page,
  key: string,
): Promise<void> {
  await page.addInitScript((target) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === target) throw new DOMException("full", "QuotaExceededError");
      original.call(this, k, v);
    };
  }, key);
}

/** localStorage の値を JSON として読む。なければ `null` */
export const readLocalStorage = (page: Page, key: string): Promise<unknown> =>
  page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw === null ? null : JSON.parse(raw);
  }, key);
