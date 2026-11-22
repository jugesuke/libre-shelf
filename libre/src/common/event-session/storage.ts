import type {
  EventSessionV20261121,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";

export const STORAGE_KEY = "event_session";

export const SCHEMA_VERSION = "2026-11-21";

export const loadEventSession = (): EventSessionV20261121 | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EventSessionV20261121;
    // schemaVersion が現行と異なるデータは互換性を保証しないため読み捨てる（移行処理は作らない）
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveEventSession = (session: EventSessionV20261121): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const deleteEventSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const createNewEventSession = (
  eventDate: string,
  menu: MenuEntry[],
): EventSessionV20261121 => ({
  schemaVersion: SCHEMA_VERSION,
  eventDate,
  phase: "preparation",
  menu,
  openingCash: null,
  cashAdjustments: [],
  openingStock: [],
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
});
