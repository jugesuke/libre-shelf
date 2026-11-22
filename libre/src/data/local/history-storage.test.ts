import { describe, expect, it } from "vitest";
import type { LibreEventSession } from "@libre-shared/entity/event/v2026-11-21/libre-event-session";
import type { KeyValueStorage } from "./item-store";
import {
  addRecord,
  buildSessionExport,
  findRecord,
  importSessionFile,
  loadHistory,
  removeRecord,
  type EventSessionRecord,
} from "./history-storage";

const KEY = "event_session_history";

const memoryStorage = (initial?: string) => {
  const data = new Map<string, string>(initial === undefined ? [] : [[KEY, initial]]);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    raw: () => data.get(KEY) ?? null,
  };
};

/** `setItem` が容量超過で投げる端末を模す。 */
const fullStorage = (initial: string): KeyValueStorage => ({
  getItem: () => initial,
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
});

const session = (eventDate: string, eventName = "即売会"): LibreEventSession => ({
  schemaVersion: "2026-11-21",
  eventName,
  eventDate,
  phase: "done",
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
  settled: true,
});

/** 履歴の JSON に書かれた 1 件。`session` は一覧で確かめる項目だけを持つ。 */
const stored = (id: string, eventDate: string, savedAt: string, eventName = "即売会") => ({
  id,
  savedAt,
  session: { schemaVersion: "2026-11-21", eventName, eventDate },
});

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("loadHistory", () => {
  it("値がないときは 0 件", () => {
    expect(loadHistory(memoryStorage())).toEqual({ ok: true, records: [] });
  });

  it("JSON として壊れていれば読めない", () => {
    expect(loadHistory(memoryStorage("["))).toEqual({ ok: false, reason: "unreadable" });
  });

  it("配列でなければ読めない", () => {
    expect(loadHistory(memoryStorage("{}"))).toEqual({ ok: false, reason: "unreadable" });
  });

  it("保存日時は、文字列ではなく時刻として比べる（時差が違っても順が合う）", () => {
    const s = memoryStorage(
      JSON.stringify([
        stored(A, "2026-11-21", "2026-11-21T09:00:00+09:00"),
        stored(C, "2026-11-21", "2026-11-21T08:00:00Z"),
      ]),
    );
    const result = loadHistory(s);
    expect(result.ok && result.records.map((r) => r.id)).toEqual([C, A]);
  });

  it("開催日の新しい順に並べ、開催日が同じなら保存日時の新しい順にする", () => {
    const s = memoryStorage(
      JSON.stringify([
        stored(A, "2026-11-21", "2026-11-21T10:00:00.000Z"),
        stored(B, "2026-12-30", "2026-12-30T09:00:00.000Z"),
        stored(C, "2026-11-21", "2026-11-21T12:00:00.000Z"),
      ]),
    );
    expect(loadHistory(s)).toEqual({
      ok: true,
      records: [
        stored(B, "2026-12-30", "2026-12-30T09:00:00.000Z"),
        stored(C, "2026-11-21", "2026-11-21T12:00:00.000Z"),
        stored(A, "2026-11-21", "2026-11-21T10:00:00.000Z"),
      ],
    });
  });

  it("文字列でない項目を持つ要素だけを除くこと", () => {
    const valid = stored(A, "2026-11-21", "2026-11-21T10:00:00.000Z");
    const invalid = [
      { ...valid, id: 1 },
      { ...valid, savedAt: null },
      { ...valid, session: null },
      { ...valid, session: { ...valid.session, eventName: 3 } },
      { ...valid, session: { ...valid.session, eventDate: undefined } },
      { ...valid, session: { ...valid.session, schemaVersion: 2026 } },
    ];
    const s = memoryStorage(JSON.stringify([...invalid, valid]));
    expect(loadHistory(s)).toEqual({ ok: true, records: [valid] });
  });
});

describe("addRecord", () => {
  const record: EventSessionRecord = {
    id: B,
    savedAt: "2026-11-21T18:00:00.000Z",
    session: session("2026-11-21"),
  };

  it("履歴の末尾に足して保存する", () => {
    const existing = stored(A, "2026-11-19", "2026-11-19T18:00:00.000Z");
    const s = memoryStorage(JSON.stringify([existing]));
    expect(addRecord(s, record)).toEqual({ ok: true });
    expect(JSON.parse(s.raw() ?? "null")).toEqual([existing, record]);
  });

  it("読めない要素は残したまま足す", () => {
    const s = memoryStorage(JSON.stringify([{ id: 1 }]));
    expect(addRecord(s, record)).toEqual({ ok: true });
    expect(JSON.parse(s.raw() ?? "null")).toEqual([{ id: 1 }, record]);
  });

  it("値が読めないときは足さず、値も書き換えない", () => {
    const s = memoryStorage("[");
    expect(addRecord(s, record)).toEqual({ ok: false, reason: "unreadable" });
    expect(s.raw()).toBe("[");
  });

  it("書き込みに失敗したら、例外を投げず失敗を返す", () => {
    expect(addRecord(fullStorage("[]"), record)).toEqual({
      ok: false,
      reason: "write_failed",
    });
  });
});

describe("findRecord", () => {
  it("id が一致する 1 件を返す", () => {
    const b = stored(B, "2026-11-21", "2026-11-21T18:00:00.000Z");
    const s = memoryStorage(JSON.stringify([stored(A, "2026-11-19", "2026-11-19T18:00:00.000Z"), b]));
    expect(findRecord(s, B)).toEqual({ ok: true, record: b });
  });

  it("該当がなければ not_found を返す", () => {
    const s = memoryStorage(JSON.stringify([stored(A, "2026-11-19", "2026-11-19T18:00:00.000Z")]));
    expect(findRecord(s, C)).toEqual({ ok: false, reason: "not_found" });
  });

  it("読めない要素は一覧に出さないので、探しても見つからないこと", () => {
    const s = memoryStorage(JSON.stringify([{ id: C, savedAt: 1, session: {} }]));
    expect(findRecord(s, C)).toEqual({ ok: false, reason: "not_found" });
  });

  it("値が読めないときは unreadable を返す", () => {
    expect(findRecord(memoryStorage("{"), A)).toEqual({ ok: false, reason: "unreadable" });
  });
});

describe("buildSessionExport", () => {
  it("ファイル名は libre-shelf-session-{開催日}.json にする", () => {
    expect(buildSessionExport(session("2026-12-30"), "2026-12-30T18:00:00+09:00").fileName).toBe(
      "libre-shelf-session-2026-12-30.json",
    );
  });

  it("中身は、種類、形のバージョン、書き出した時刻を外側に持ち、session を中に入れる", () => {
    const s = session("2026-12-30");
    expect(JSON.parse(buildSessionExport(s, "2026-12-30T18:00:00+09:00").content)).toEqual({
      format: "libre-shelf-session",
      version: 1,
      exportedAt: "2026-12-30T18:00:00+09:00",
      session: s,
    });
  });
});

describe("importSessionFile", () => {
  const NOW = "2027-01-05T12:00:00+09:00";
  const fileText = (override: Record<string, unknown> = {}) =>
    JSON.stringify({
      format: "libre-shelf-session",
      version: 1,
      exportedAt: "2026-12-30T18:00:00+09:00",
      session: session("2026-12-30"),
      ...override,
    });

  it("新しい id と読み込んだ時刻の savedAt を付けて履歴に足す", () => {
    const s = memoryStorage();
    expect(importSessionFile(s, fileText(), NOW, () => A)).toEqual({ ok: true });
    expect(JSON.parse(s.raw()!)).toEqual([
      { id: A, savedAt: NOW, session: session("2026-12-30") },
    ]);
  });

  it("同じファイルを 2 回読み込むと 2 件になる", () => {
    const s = memoryStorage();
    importSessionFile(s, fileText(), NOW, () => A);
    importSessionFile(s, fileText(), NOW, () => B);
    expect(JSON.parse(s.raw()!)).toHaveLength(2);
  });

  it.each([
    ["JSON でない", "not json"],
    ["format が違う", fileText({ format: "other" })],
    ["version が 1 でない", fileText({ version: 2 })],
    ["session の schemaVersion が今のスキーマでない", fileText({ session: { ...session("2026-12-30"), schemaVersion: "2026-01-01" } })],
    ["session がスキーマの検証に通らない", fileText({ session: { ...session("2026-12-30"), menu: "x" } })],
    ["JSON がオブジェクトでない", "[]"],
  ])("%s ときは、履歴を変えずに invalid_file を返す", (_name, text) => {
    const s = memoryStorage(JSON.stringify([stored(A, "2026-11-21", "2026-11-21T10:00:00.000Z")]));
    const before = s.raw();
    expect(importSessionFile(s, text, NOW, () => B)).toEqual({ ok: false, reason: "invalid_file" });
    expect(s.raw()).toBe(before);
  });

  it("履歴の値が読めないときは、書き換えずに unreadable を返す", () => {
    const s = memoryStorage("{broken");
    expect(importSessionFile(s, fileText(), NOW, () => A)).toEqual({ ok: false, reason: "unreadable" });
    expect(s.raw()).toBe("{broken");
  });

  it("書き込みに失敗したら write_failed を返す", () => {
    expect(importSessionFile(fullStorage("[]"), fileText(), NOW, () => A)).toEqual({
      ok: false,
      reason: "write_failed",
    });
  });
});

describe("removeRecord", () => {
  it("id の 1 件だけを消し、ほかの要素は残す", () => {
    const s = memoryStorage(
      JSON.stringify([
        stored(A, "2026-11-21", "2026-11-21T10:00:00.000Z"),
        stored(B, "2026-12-30", "2026-12-30T09:00:00.000Z"),
      ]),
    );
    expect(removeRecord(s, A)).toEqual({ ok: true });
    expect(JSON.parse(s.raw()!)).toEqual([stored(B, "2026-12-30", "2026-12-30T09:00:00.000Z")]);
  });

  it("読めない要素は消さずに残す", () => {
    const broken = { id: 1 };
    const s = memoryStorage(
      JSON.stringify([broken, stored(A, "2026-11-21", "2026-11-21T10:00:00.000Z")]),
    );
    expect(removeRecord(s, A)).toEqual({ ok: true });
    expect(JSON.parse(s.raw()!)).toEqual([broken]);
  });

  it("値が読めないときは、書き換えずに失敗を返す", () => {
    const s = memoryStorage("[");
    expect(removeRecord(s, A)).toEqual({ ok: false, reason: "unreadable" });
    expect(s.raw()).toBe("[");
  });

  it("書き込みに失敗したときは、例外を投げずに失敗を返す", () => {
    expect(
      removeRecord(fullStorage(JSON.stringify([stored(A, "2026-11-21", "2026-11-21T10:00:00.000Z")])), A),
    ).toEqual({ ok: false, reason: "write_failed" });
  });
});
