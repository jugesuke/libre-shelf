import type { Item } from "@libre-shared/entity/items/item";
import type { LibreEventSession } from "@libre-shared/entity/event/v2026-11-21/libre-event-session";
import {
  addNewRecords,
  importSessionFile,
  loadHistory,
  parseRecord,
  parseSession,
  type EventSessionRecord,
} from "./history-storage";
import { STORAGE_KEY as SESSION_KEY } from "@libre/common/event-session/storage";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { isItem, loadItems, mergeItems, saveItems, type KeyValueStorage } from "./item-store";
import { localDateString } from "./local-date";

const toOffsetIso = formatSessionTime;

const BACKUP_FORMAT = "libre-shelf-backup";
const BACKUP_VERSION = 1;
const ITEMS_KEY = "items";
const HISTORY_KEY = "event_session_history";
const KEYS = [ITEMS_KEY, HISTORY_KEY, SESSION_KEY] as const;

/** 書き込みを戻すために、値を消せる `Storage`。画面からは `localStorage` を渡す。 */
export type BackupStorage = KeyValueStorage & { removeItem: (key: string) => void };

export type BuildBackupResult =
  | { ok: true; fileName: string; content: string }
  | { ok: false };

export type ImportDataResult =
  | {
      ok: true;
      kind: "backup";
      /** ファイルの商品の数（`item_id` の重なりを除く） */
      itemCount: number;
      /** 履歴に足した件数 */
      recordCount: number;
      currentSession: "imported" | "kept" | "none";
    }
  | { ok: true; kind: "session"; eventName: string }
  | { ok: false; reason: "invalid_file" | "unreadable" | "write_failed" };

type BackupContent = {
  items: Item[];
  history: EventSessionRecord[];
  currentSession: LibreEventSession | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/**
 * 商品、履歴、進行中のセッションをまとめた、書き出すファイルの文字列とファイル名を作る。
 * 商品や履歴の値が読めないときは `{ ok: false }`。
 *
 * @param now 書き出した時刻。ファイル名の日付と `exportedAt` に使う
 */
export const buildBackup = (storage: BackupStorage, now: Date): BuildBackupResult => {
  const items = loadItems(storage);
  const history = loadHistory(storage);
  if (!items.ok || !history.ok) return { ok: false };
  return {
    ok: true,
    fileName: `libre-shelf-backup-${localDateString(now)}.json`,
    content: JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: toOffsetIso(now),
      items: items.items,
      history: history.records,
      currentSession: loadCurrentSession(storage),
    }),
  };
};

/**
 * 進行中のセッションを読む。値がない、JSON として壊れている、今のスキーマでないときは null。
 * アプリを開いたときと同じく、そのときは進行中のセッションがないものとして扱う
 */
const loadCurrentSession = (storage: KeyValueStorage): LibreEventSession | null => {
  const raw = storage.getItem(SESSION_KEY);
  return raw === null ? null : (parseSession(parseJson(raw)) ?? null);
};

const parseBackup = (file: Record<string, unknown>): BackupContent | undefined => {
  const { items, history, currentSession } = file;
  if (!Array.isArray(items) || !items.every(isItem)) return undefined;
  if (!Array.isArray(history)) return undefined;
  const records = history.map(parseRecord);
  if (records.some((r) => r === undefined)) return undefined;
  const session = currentSession === null ? null : parseSession(currentSession);
  if (session === undefined) return undefined;
  return { items, history: records as EventSessionRecord[], currentSession: session };
};

/** 3 つのキーの、いまの値を控える。 */
const snapshot = (storage: BackupStorage): Array<[string, string | null]> =>
  KEYS.map((key) => [key, storage.getItem(key)]);

/** 控えた値に戻す。戻す書き込みの失敗は、ほかのキーを戻すのを止めない。 */
const restore = (storage: BackupStorage, saved: Array<[string, string | null]>): void => {
  for (const [key, value] of saved) {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      // 戻せなかったキーがあっても、残りは戻す
    }
  }
};

const importBackup = (storage: BackupStorage, content: BackupContent): ImportDataResult => {
  const items = loadItems(storage);
  if (!items.ok || !loadHistory(storage).ok) return { ok: false, reason: "unreadable" };

  const saved = snapshot(storage);
  const fail = (): ImportDataResult => {
    restore(storage, saved);
    return { ok: false, reason: "write_failed" };
  };

  const { merged, count } = mergeItems(items.items, content.items);
  if (!saveItems(storage, merged)) return fail();

  const added = addNewRecords(storage, content.history);
  if (!added.ok) return fail();

  // 締め済みのセッションは進行中ではないので、入れず、触れない
  const incomingSession = content.currentSession?.settled === false ? content.currentSession : null;
  const existing = loadCurrentSession(storage);
  const inProgress = existing !== null && !existing.settled;
  const shouldImport = incomingSession !== null && !inProgress;
  if (shouldImport) {
    try {
      storage.setItem(SESSION_KEY, JSON.stringify(content.currentSession));
    } catch {
      return fail();
    }
  }

  return {
    ok: true,
    kind: "backup",
    itemCount: count,
    recordCount: added.added,
    currentSession: shouldImport ? "imported" : incomingSession === null ? "none" : "kept",
  };
};

/**
 * ファイルの中身を、`format` に応じて、まとめて書き出したファイルか 1 件のセッションのファイルとして読み込む。
 * まとめて書き出したファイルの 3 つの書き込みのどれかが失敗したら、3 つとも書き込む前の値に戻す。
 * 失敗は例外ではなく結果で返す。
 *
 * @param now 読み込んだ時刻（`toOffsetIso` の形）。1 件のセッションの `savedAt` になる
 * @param newId 1 件のセッションに付ける `id` を作る関数。テストで差し替える
 */
export const importData = (
  storage: BackupStorage,
  text: string,
  now: string,
  newId?: () => string,
): ImportDataResult => {
  const file = parseJson(text);
  if (!isRecord(file) || file.version !== BACKUP_VERSION) {
    return { ok: false, reason: "invalid_file" };
  }
  if (file.format === BACKUP_FORMAT) {
    const content = parseBackup(file);
    return content === undefined
      ? { ok: false, reason: "invalid_file" }
      : importBackup(storage, content);
  }
  const result = importSessionFile(storage, text, now, newId);
  if (!result.ok) return result;
  // 検証を通ったので、session.eventName は文字列
  return { ok: true, kind: "session", eventName: (file.session as LibreEventSession).eventName };
};
