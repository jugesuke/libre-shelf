import { SCHEMA_VERSION } from "@libre/common/event-session/storage";
import {
  findRecord,
  type EventSessionRecord,
} from "@libre/data/local/history-storage";
import type { KeyValueStorage } from "@libre/data/local/item-store";

export type ResultLookup =
  | { kind: "found"; record: EventSessionRecord }
  | { kind: "unsupported"; record: EventSessionRecord; schemaVersion: string }
  | { kind: "not_found" };

/**
 * 結果画面に出す履歴の 1 件を探す。履歴の値が読めないときは、履歴にないものとして扱う。
 * スキーマが今のものと違う要素は、本体を出せないので `unsupported` にする。
 */
export const lookupResult = (
  storage: KeyValueStorage,
  id: string,
): ResultLookup => {
  const found = findRecord(storage, id);
  if (!found.ok) return { kind: "not_found" };
  const { schemaVersion } = found.record.session;
  return schemaVersion === SCHEMA_VERSION
    ? { kind: "found", record: found.record }
    : { kind: "unsupported", record: found.record, schemaVersion };
};
