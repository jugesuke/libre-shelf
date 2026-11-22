import {
  LibreEventSessionSchema,
  type LibreEventSession,
} from "@libre-shared/entity/event/v2026-11-21/libre-event-session";
import type { KeyValueStorage } from "./item-store";
import { SCHEMA_VERSION } from "@libre/common/event-session/storage";

const STORAGE_KEY = "event_session_history";
const SESSION_FILE_FORMAT = "libre-shelf-session";
const SESSION_FILE_VERSION = 1;

/** 履歴の 1 件。`session` は保存したときのセッションで、その中身は今のスキーマ。 */
export type EventSessionRecord = {
  id: string;
  savedAt: string;
  session: LibreEventSession;
};

export type LoadHistoryResult =
  | { ok: true; records: EventSessionRecord[] }
  | { ok: false; reason: "unreadable" };

export type FindRecordResult =
  | { ok: true; record: EventSessionRecord }
  | { ok: false; reason: "unreadable" | "not_found" };

export type AddRecordResult =
  | { ok: true }
  | { ok: false; reason: "unreadable" | "write_failed" };

export type ImportSessionFileResult =
  | { ok: true }
  | { ok: false; reason: "invalid_file" | "unreadable" | "write_failed" };

export type RemoveRecordResult = AddRecordResult;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * 一覧で使う項目が揃っているかを確かめる。`session` のほかの項目は確かめない（結果画面で確かめる）。
 * 戻り値の型は、確かめていない項目を含めて `EventSessionRecord` とみなす。
 */
const isReadableRecord = (v: unknown): v is EventSessionRecord =>
  isRecord(v) &&
  typeof v.id === "string" &&
  typeof v.savedAt === "string" &&
  isRecord(v.session) &&
  typeof v.session.eventName === "string" &&
  typeof v.session.eventDate === "string" &&
  typeof v.session.schemaVersion === "string";

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** 履歴の配列を読む。値がなければ空の配列、JSON として壊れているか配列でなければ `undefined`。 */
const readRawArray = (storage: KeyValueStorage): unknown[] | undefined => {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  const parsed = parseJson(raw);
  return Array.isArray(parsed) ? parsed : undefined;
};

const compareDesc = (a: string, b: string): number => {
  if (a === b) return 0;
  return a < b ? 1 : -1;
};

/** 時刻として新しい順。読めない時刻は、文字列の順で比べる。 */
const compareTimeDesc = (a: string, b: string): number => {
  const diff = Date.parse(b) - Date.parse(a);
  return Number.isNaN(diff) ? compareDesc(a, b) : Math.sign(diff);
};

/** 開催日（`YYYY-MM-DD`、文字列の順が日付の順）の新しい順、同じなら保存日時の新しい順。 */
const byNewest = (a: EventSessionRecord, b: EventSessionRecord): number =>
  compareDesc(a.session.eventDate, b.session.eventDate) || compareTimeDesc(a.savedAt, b.savedAt);

/** 履歴を一覧の並び順で読む。読めない要素は除く。値が読めなければ `unreadable`。 */
export const loadHistory = (storage: KeyValueStorage): LoadHistoryResult => {
  const raw = readRawArray(storage);
  if (raw === undefined) return { ok: false, reason: "unreadable" };
  return { ok: true, records: raw.filter(isReadableRecord).sort(byNewest) };
};

/** `id` の 1 件を探す。読めない要素は一覧に出さないため、探しても対象にしない。 */
export const findRecord = (storage: KeyValueStorage, id: string): FindRecordResult => {
  const loaded = loadHistory(storage);
  if (!loaded.ok) return { ok: false, reason: "unreadable" };
  const record = loaded.records.find((r) => r.id === id);
  return record === undefined ? { ok: false, reason: "not_found" } : { ok: true, record };
};

/**
 * 履歴の末尾に 1 件足す。読めない要素は残す。値が読めないときや書き込みに失敗したときは、
 * 履歴を変えずに失敗を返す（例外は投げない）。
 */
export const addRecord = (storage: KeyValueStorage, record: EventSessionRecord): AddRecordResult => {
  const raw = readRawArray(storage);
  if (raw === undefined) return { ok: false, reason: "unreadable" };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...raw, record]));
    return { ok: true };
  } catch {
    return { ok: false, reason: "write_failed" };
  }
};

/**
 * `id` の 1 件を履歴から消す。読めない要素は残す。値が読めないときや書き込みに失敗したときは、
 * 履歴を変えずに失敗を返す（例外は投げない）。
 */
export const removeRecord = (storage: KeyValueStorage, id: string): RemoveRecordResult => {
  const raw = readRawArray(storage);
  if (raw === undefined) return { ok: false, reason: "unreadable" };
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(raw.filter((v) => !(isReadableRecord(v) && v.id === id))),
    );
    return { ok: true };
  } catch {
    return { ok: false, reason: "write_failed" };
  }
};

/** 今のスキーマ（`schemaVersion` も含む）に合うセッションだけを返す。合わなければ `undefined`。 */
export const parseSession = (value: unknown): LibreEventSession | undefined => {
  const parsed = LibreEventSessionSchema.safeParse(value);
  return parsed.success && parsed.data.schemaVersion === SCHEMA_VERSION ? parsed.data : undefined;
};

/** 履歴の 1 件として、今のスキーマに合うものだけを返す。合わなければ `undefined`。 */
export const parseRecord = (value: unknown): EventSessionRecord | undefined => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.savedAt !== "string") {
    return undefined;
  }
  const session = parseSession(value.session);
  return session === undefined ? undefined : { id: value.id, savedAt: value.savedAt, session };
};

/**
 * 履歴の末尾に、`id` が履歴にない記録だけを足す（`incoming` の中で `id` が重なるときは先のものだけ）。
 * 読めない要素は残す。値が読めないときや書き込みに失敗したときは、履歴を変えずに失敗を返す。
 * `added` は足した件数。
 */
export const addNewRecords = (
  storage: KeyValueStorage,
  incoming: readonly EventSessionRecord[],
): { ok: true; added: number } | { ok: false; reason: "unreadable" | "write_failed" } => {
  const raw = readRawArray(storage);
  if (raw === undefined) return { ok: false, reason: "unreadable" };
  const known = new Set(raw.filter(isReadableRecord).map((r) => r.id));
  const fresh = incoming.filter((r) => {
    if (known.has(r.id)) return false;
    known.add(r.id);
    return true;
  });
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...raw, ...fresh]));
    return { ok: true, added: fresh.length };
  } catch {
    return { ok: false, reason: "write_failed" };
  }
};

/**
 * 書き出したセッションのファイルの文字列を検証し、新しい `id` と `now` の `savedAt` を付けて履歴に足す。
 * ファイルが読めないときは `invalid_file`、履歴の値が読めないときは `unreadable`、書き込みに失敗したときは
 * `write_failed` を返し、どれも履歴を変えない（例外は投げない）。
 *
 * @param text ファイルの中身
 * @param now 読み込んだ時刻（`toOffsetIso` の形）
 * @param newId 新しい `id` を作る関数。テストで差し替える
 */
export const importSessionFile = (
  storage: KeyValueStorage,
  text: string,
  now: string,
  newId: () => string = () => crypto.randomUUID(),
): ImportSessionFileResult => {
  const file = parseJson(text);
  if (!isRecord(file) || file.format !== SESSION_FILE_FORMAT || file.version !== SESSION_FILE_VERSION) {
    return { ok: false, reason: "invalid_file" };
  }
  const session = parseSession(file.session);
  if (session === undefined) return { ok: false, reason: "invalid_file" };
  return addRecord(storage, { id: newId(), savedAt: now, session });
};

/**
 * セッションを書き出す JSON の文字列と、ファイル名（開催日を使う）を作る。
 *
 * @param exportedAt 書き出した時刻（`toOffsetIso` の形）
 */
export const buildSessionExport = (
  session: LibreEventSession,
  exportedAt: string,
): { fileName: string; content: string } => ({
  fileName: `libre-shelf-session-${session.eventDate}.json`,
  content: JSON.stringify({
    format: SESSION_FILE_FORMAT,
    version: SESSION_FILE_VERSION,
    exportedAt,
    session,
  }),
});
