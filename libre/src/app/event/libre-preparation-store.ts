import { create } from "zustand";
import type { EventSessionV20261121 } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { readEventName, readPlannedStock } from "./libre-session";

type LibrePreparationState = {
  eventName: string;
  /** 商品 ID から、持ち込み予定数の入力欄の文字列への対応 */
  plannedQty: Record<string, string>;
  eventNameError: string | undefined;
  /** 持ち込み予定数が不正な商品の ID */
  invalidPlannedIds: ReadonlySet<string>;
  initialized: boolean;
  /** 最初の 1 回だけ、フォームの初期値を入れる */
  initializeFromSession: (session: EventSessionV20261121 | null) => void;
  setEventName: (value: string) => void;
  setPlannedQty: (itemId: string, value: string) => void;
  /** 商品の持ち込み予定数の入力と理由を消す。委託物との行き来で数の欄を空にするときに使う */
  clearPlanned: (itemId: string) => void;
  setErrors: (eventNameError: string | undefined, invalidPlannedIds: ReadonlySet<string>) => void;
  reset: () => void;
};

const initialState = {
  eventName: "",
  plannedQty: {},
  eventNameError: undefined,
  invalidPlannedIds: new Set<string>(),
  initialized: false,
};

const without = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

/** 前日準備の、即売会の名前と持ち込み予定数の入力。画面を離れても残す */
export const useLibrePreparationStore = create<LibrePreparationState>((set, get) => ({
  ...initialState,

  initializeFromSession: (session) => {
    if (get().initialized) return;
    set({
      eventName: session === null ? "" : readEventName(session),
      plannedQty:
        session === null
          ? {}
          : Object.fromEntries(readPlannedStock(session).map((p) => [p.itemId, String(p.quantity)])),
      initialized: true,
    });
  },

  setEventName: (value) => set({ eventName: value, eventNameError: undefined }),

  setPlannedQty: (itemId, value) =>
    set((state) => ({
      plannedQty: { ...state.plannedQty, [itemId]: value },
      invalidPlannedIds: new Set([...state.invalidPlannedIds].filter((id) => id !== itemId)),
    })),

  clearPlanned: (itemId) =>
    set((state) => ({
      plannedQty: without(state.plannedQty, itemId),
      invalidPlannedIds: new Set([...state.invalidPlannedIds].filter((id) => id !== itemId)),
    })),

  setErrors: (eventNameError, invalidPlannedIds) => set({ eventNameError, invalidPlannedIds }),

  reset: () => set({ ...initialState, invalidPlannedIds: new Set<string>() }),
}));
