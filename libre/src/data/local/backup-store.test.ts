import { describe, expect, it } from "vitest";
import type { Item } from "@libre-shared/entity/items/item";
import type { LibreEventSession } from "@libre-shared/entity/event/v2026-11-21/libre-event-session";
import { buildBackup, importData, type BackupStorage } from "./backup-store";

const ITEMS = "items";
const HISTORY = "event_session_history";
const SESSION = "event_session";

/** 端末の localStorage を模す。`failOn` のキーへの書き込みは、容量超過のように投げる。 */
const memoryStorage = (
  initial: Record<string, unknown> = {},
  failOn: readonly string[] = [],
) => {
  const data = new Map<string, string>(
    Object.entries(initial).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]),
  );
  const storage: BackupStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (failOn.includes(key)) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key) => void data.delete(key),
  };
  return {
    storage,
    raw: (key: string) => data.get(key) ?? null,
    json: (key: string) => (data.has(key) ? JSON.parse(data.get(key)!) : null),
  };
};

const item = (id: string, name = "本", price: number | null = 500): Item => ({
  item_id: id,
  product_name: name,
  publisher_name: "サークル",
  class: "オリジナル",
  type: "漫画",
  price,
});

const session = (over: Partial<LibreEventSession> = {}): LibreEventSession => ({
  schemaVersion: "2026-11-21",
  eventName: "即売会",
  eventDate: "2026-11-17",
  phase: "register",
  menu: [],
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
  ...over,
});

const record = (id: string, over: Partial<LibreEventSession> = {}) => ({
  id,
  savedAt: "2026-11-18T00:00:00+09:00",
  session: session({ settled: true, ...over }),
});

const ID1 = "1111111111116";
const ID2 = "2222222222222";
const ID3 = "3333333333338";
const R1 = "11111111-1111-4111-8111-111111111111";
const R2 = "22222222-2222-4222-8222-222222222222";
const R3 = "33333333-3333-4333-8333-333333333333";
const NOW = "2027-01-05T12:00:00+09:00";

const backupText = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: "libre-shelf-backup",
    version: 1,
    exportedAt: "2026-12-30T18:00:00+09:00",
    items: [],
    history: [],
    currentSession: null,
    ...over,
  });

describe("buildBackup", () => {
  it("商品、履歴、進行中のセッションを、日付入りのファイル名で書き出す", () => {
    const m = memoryStorage({
      [ITEMS]: [item(ID1)],
      [HISTORY]: [record(R1)],
      [SESSION]: session(),
    });
    const result = buildBackup(m.storage, new Date(2026, 11, 30, 18, 0, 0));
    if (!result.ok) throw new Error("書き出せるはず");
    expect(result.fileName).toBe("libre-shelf-backup-2026-12-30.json");
    expect(JSON.parse(result.content)).toEqual({
      format: "libre-shelf-backup",
      version: 1,
      exportedAt: expect.stringMatching(/^2026-12-30T18:00:00[+-]\d{2}:\d{2}$/),
      items: [item(ID1)],
      history: [record(R1)],
      currentSession: session(),
    });
  });

  it("何も保存していなければ、空の配列と null を書き出す", () => {
    const result = buildBackup(memoryStorage().storage, new Date(2026, 11, 30));
    if (!result.ok) throw new Error("書き出せるはず");
    const body = JSON.parse(result.content);
    expect([body.items, body.history, body.currentSession]).toEqual([[], [], null]);
  });

  it("商品マスタの値が壊れていれば、書き出さない", () => {
    expect(buildBackup(memoryStorage({ [ITEMS]: "[" }).storage, new Date())).toEqual({ ok: false });
  });

  it("履歴の値が壊れていれば、書き出さない", () => {
    expect(buildBackup(memoryStorage({ [HISTORY]: "{" }).storage, new Date())).toEqual({
      ok: false,
    });
  });
});

describe("importData: まとめて書き出したファイル", () => {
  it("商品は、同じ item_id を上書きし、端末にない商品を末尾に足す", () => {
    const m = memoryStorage({ [ITEMS]: [item(ID1, "古い"), item(ID2)] });
    const result = importData(
      m.storage,
      backupText({ items: [item(ID1, "新しい"), item(ID3)] }),
      NOW,
    );
    expect(result).toMatchObject({ ok: true, kind: "backup", itemCount: 2 });
    expect(m.json(ITEMS)).toEqual([item(ID1, "新しい"), item(ID2), item(ID3)]);
  });

  it("履歴は、同じ id を足さず、端末にない記録を足す", () => {
    const m = memoryStorage({ [HISTORY]: [record(R1, { eventName: "端末の" })] });
    const result = importData(
      m.storage,
      backupText({ history: [record(R1, { eventName: "ファイルの" }), record(R2)] }),
      NOW,
    );
    expect(result).toMatchObject({ ok: true, kind: "backup", recordCount: 1 });
    expect(m.json(HISTORY)).toEqual([record(R1, { eventName: "端末の" }), record(R2)]);
  });

  it("端末に進行中のセッションがなければ、ファイルのものを入れる", () => {
    const m = memoryStorage();
    const result = importData(m.storage, backupText({ currentSession: session() }), NOW);
    expect(result).toMatchObject({ ok: true, currentSession: "imported" });
    expect(m.json(SESSION)).toEqual(session());
  });

  it("端末に進行中のセッションがあれば、入れずに、入れなかったことを返す", () => {
    const m = memoryStorage({ [SESSION]: session({ eventName: "端末の" }) });
    const result = importData(
      m.storage,
      backupText({ currentSession: session({ eventName: "ファイルの" }) }),
      NOW,
    );
    expect(result).toMatchObject({ ok: true, currentSession: "kept" });
    expect(m.json(SESSION)).toEqual(session({ eventName: "端末の" }));
  });

  it("端末のセッションが締め済み（settled = true）なら、進行中ではないので、ファイルのものを入れる", () => {
    const m = memoryStorage({ [SESSION]: session({ settled: true, eventName: "端末の" }) });
    const result = importData(
      m.storage,
      backupText({ currentSession: session({ eventName: "ファイルの" }) }),
      NOW,
    );
    expect(result).toMatchObject({ ok: true, currentSession: "imported" });
    expect(m.json(SESSION)).toEqual(session({ eventName: "ファイルの" }));
  });

  it.each([
    ["端末に進行中のセッションがない", {}],
    ["端末の進行中のセッションが締め済み", { [SESSION]: session({ settled: true }) }],
    ["端末に進行中のセッションがある", { [SESSION]: session({ eventName: "端末の" }) }],
  ])("ファイルのセッションが締め済み（settled = true）なら、%sときも入れず、none を返す", (_n, initial) => {
    const m = memoryStorage(initial);
    const before = m.raw(SESSION);
    const result = importData(
      m.storage,
      backupText({ currentSession: session({ settled: true, eventName: "ファイルの" }) }),
      NOW,
    );
    expect(result).toMatchObject({ ok: true, currentSession: "none" });
    expect(m.raw(SESSION)).toBe(before);
  });

  it("ファイルに進行中のセッションがなければ、端末のものを変えず、none を返す", () => {
    const m = memoryStorage({ [SESSION]: session() });
    const result = importData(m.storage, backupText(), NOW);
    expect(result).toMatchObject({ ok: true, currentSession: "none" });
    expect(m.json(SESSION)).toEqual(session());
  });

  it("商品の数は、ファイルの item_id の重なりを除いた数で、内容が同じ商品も数える", () => {
    const m = memoryStorage({ [ITEMS]: [item(ID1)] });
    const result = importData(
      m.storage,
      backupText({ items: [item(ID1), item(ID2), item(ID2, "あと")] }),
      NOW,
    );
    expect(result).toMatchObject({ itemCount: 2 });
  });
});

describe("importData: 読み込めないファイル", () => {
  const untouched = () =>
    memoryStorage({ [ITEMS]: [item(ID1)], [HISTORY]: [record(R1)], [SESSION]: session() });

  const cases: Array<[string, string]> = [
    ["JSON でない", "{"],
    ["format が違う", backupText({ format: "other" })],
    ["version が 1 でない", backupText({ version: 2 })],
    ["商品の形が合わない", backupText({ items: [{ item_id: "x" }] })],
    ["記録の形が合わない", backupText({ history: [{ id: R2 }] })],
    [
      "記録の中のセッションが今の形に合わない",
      backupText({ history: [{ id: R2, savedAt: NOW, session: { eventName: "x" } }] }),
    ],
    ["進行中のセッションが今の形に合わない", backupText({ currentSession: { eventName: "x" } })],
  ];

  it.each(cases)("%s ときは、何も変えずに invalid_file を返す", (_name, text) => {
    const m = untouched();
    const before = [ITEMS, HISTORY, SESSION].map((k) => m.raw(k));
    expect(importData(m.storage, text, NOW)).toEqual({ ok: false, reason: "invalid_file" });
    expect([ITEMS, HISTORY, SESSION].map((k) => m.raw(k))).toEqual(before);
  });

  it("端末の商品マスタが読めないときは、何も変えずに unreadable を返す", () => {
    const m = memoryStorage({ [ITEMS]: "[", [HISTORY]: [record(R1)] });
    expect(importData(m.storage, backupText({ history: [record(R2)] }), NOW)).toEqual({
      ok: false,
      reason: "unreadable",
    });
    expect(m.raw(ITEMS)).toBe("[");
    expect(m.json(HISTORY)).toEqual([record(R1)]);
  });

  it("端末の履歴が読めないときは、何も変えずに unreadable を返す", () => {
    const m = memoryStorage({ [HISTORY]: "{" });
    expect(importData(m.storage, backupText({ items: [item(ID1)] }), NOW)).toEqual({
      ok: false,
      reason: "unreadable",
    });
    expect(m.raw(ITEMS)).toBeNull();
  });
});

describe("importData: 書き込みに失敗したとき", () => {
  const incoming = backupText({
    items: [item(ID1, "新しい")],
    history: [record(R2)],
    currentSession: session({ eventName: "ファイルの" }),
  });

  it.each([ITEMS, HISTORY, SESSION])(
    "%s の書き込みで失敗したら、3 つとも書き込む前の値に戻す",
    (failing) => {
      const m = memoryStorage(
        { [ITEMS]: [item(ID1, "古い")], [HISTORY]: [record(R1)] },
        [failing],
      );
      const before = [ITEMS, HISTORY, SESSION].map((k) => m.raw(k));
      expect(importData(m.storage, incoming, NOW)).toEqual({
        ok: false,
        reason: "write_failed",
      });
      expect([ITEMS, HISTORY, SESSION].map((k) => m.raw(k))).toEqual(before);
    },
  );
});

describe("importData: 1 件のセッションのファイル", () => {
  const sessionFile = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      format: "libre-shelf-session",
      version: 1,
      exportedAt: "2026-12-30T18:00:00+09:00",
      session: session({ eventName: "冬の即売会", settled: true }),
      ...over,
    });

  it("履歴に足し、即売会の名前を返す", () => {
    const m = memoryStorage({ [HISTORY]: [record(R1)] });
    expect(importData(m.storage, sessionFile(), NOW, () => R3)).toEqual({
      ok: true,
      kind: "session",
      eventName: "冬の即売会",
    });
    expect(m.json(HISTORY)).toEqual([
      record(R1),
      { id: R3, savedAt: NOW, session: session({ eventName: "冬の即売会", settled: true }) },
    ]);
  });

  it("商品と進行中のセッションは変えない", () => {
    const m = memoryStorage({ [ITEMS]: [item(ID1)], [SESSION]: session() });
    importData(m.storage, sessionFile(), NOW, () => R3);
    expect(m.json(ITEMS)).toEqual([item(ID1)]);
    expect(m.json(SESSION)).toEqual(session());
  });

  it("version が違うときは、何も変えずに invalid_file を返す", () => {
    const m = memoryStorage();
    expect(importData(m.storage, sessionFile({ version: 2 }), NOW)).toEqual({
      ok: false,
      reason: "invalid_file",
    });
    expect(m.raw(HISTORY)).toBeNull();
  });

  it("書き込みに失敗したら write_failed を返す", () => {
    const m = memoryStorage({}, [HISTORY]);
    expect(importData(m.storage, sessionFile(), NOW)).toEqual({
      ok: false,
      reason: "write_failed",
    });
  });
});
