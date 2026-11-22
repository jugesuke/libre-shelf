import { create } from "zustand";
import {
  isConsignedItem,
  type CashCount,
  type EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";

type DoneFormState = {
  openingCash: CashCount | null;
  closingCash: CashCount | null;
  openingStockQty: Record<string, string>;
  sampleQty: Record<string, string>;
  displayQty: Record<string, string>;
  closingStockQty: Record<string, string>;
  consignors: Record<string, string>;
  initialized: boolean;
};

type DoneFormActions = {
  initializeFromSession: (session: EventSessionV20261121) => void;
  setOpeningCash: (value: CashCount | null) => void;
  setClosingCash: (value: CashCount | null) => void;
  setOpeningStockQty: (itemId: string, value: string) => void;
  setSampleQty: (itemId: string, value: string) => void;
  setDisplayQty: (itemId: string, value: string) => void;
  setClosingStockQty: (itemId: string, value: string) => void;
  setConsignor: (itemId: string, value: string) => void;
  reset: () => void;
};

const initialState: DoneFormState = {
  openingCash: null,
  closingCash: null,
  openingStockQty: {},
  sampleQty: {},
  displayQty: {},
  closingStockQty: {},
  consignors: {},
  initialized: false,
};

export const useDoneFormStore = create<DoneFormState & DoneFormActions>(
  (set, get) => ({
    ...initialState,

    initializeFromSession: (session) => {
      if (get().initialized) return;
      set({
        openingCash: session.openingCash,
        closingCash: session.closingCash,
        openingStockQty: Object.fromEntries(
          session.openingStock.map((e) => [e.itemId, String(e.quantity)]),
        ),
        sampleQty: Object.fromEntries(
          session.sampleSubmissions.map((e) => [e.itemId, String(e.quantity)]),
        ),
        displayQty: Object.fromEntries(
          session.displaySamples.map((e) => [e.itemId, String(e.quantity)]),
        ),
        closingStockQty: Object.fromEntries(
          (session.closingStock ?? []).map((e) => [
            e.itemId,
            String(e.quantity),
          ]),
        ),
        consignors: Object.fromEntries(
          session.menu.flatMap((e): [string, string][] =>
            isConsignedItem(e) ? [[e.itemId, e.consignorName]] : [],
          ),
        ),
        initialized: true,
      });
    },

    setOpeningCash: (value) => set({ openingCash: value }),
    setClosingCash: (value) => set({ closingCash: value }),
    setOpeningStockQty: (itemId, value) =>
      set((s) => ({
        openingStockQty: { ...s.openingStockQty, [itemId]: value },
      })),
    setSampleQty: (itemId, value) =>
      set((s) => ({ sampleQty: { ...s.sampleQty, [itemId]: value } })),
    setDisplayQty: (itemId, value) =>
      set((s) => ({ displayQty: { ...s.displayQty, [itemId]: value } })),
    setClosingStockQty: (itemId, value) =>
      set((s) => ({
        closingStockQty: { ...s.closingStockQty, [itemId]: value },
      })),
    setConsignor: (itemId, value) =>
      set((s) => ({ consignors: { ...s.consignors, [itemId]: value } })),

    reset: () => set(initialState),
  }),
);
