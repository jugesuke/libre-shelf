import { create } from "zustand";
import type {
  CashCount,
  EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";

type OpeningFormState = {
  openingCash: CashCount | null;
  sampleQty: Record<string, string>; // itemId -> quantity string
  displayQty: Record<string, string>;
  openingStockQty: Record<string, string>;
  consignedStockQty: Record<string, string>; // 委託物の預かり部数（その場編集用）
  initialized: boolean;
};

type OpeningFormActions = {
  initializeFromSession: (session: EventSessionV20261121) => void;
  setOpeningCash: (value: CashCount | null) => void;
  setSampleQty: (itemId: string, value: string) => void;
  setDisplayQty: (itemId: string, value: string) => void;
  setOpeningStockQty: (itemId: string, value: string) => void;
  setConsignedStockQty: (itemId: string, value: string) => void;
  reset: () => void;
};

const initialState: OpeningFormState = {
  openingCash: null,
  sampleQty: {},
  displayQty: {},
  openingStockQty: {},
  consignedStockQty: {},
  initialized: false,
};

export const useOpeningFormStore = create<
  OpeningFormState & OpeningFormActions
>((set, get) => ({
  ...initialState,

  initializeFromSession: (session) => {
    if (get().initialized) return;
    const sampleQty: Record<string, string> = {};
    for (const e of session.sampleSubmissions) {
      sampleQty[e.itemId] = String(e.quantity);
    }
    const displayQty: Record<string, string> = {};
    for (const e of session.displaySamples) {
      displayQty[e.itemId] = String(e.quantity);
    }
    const openingStockQty: Record<string, string> = {};
    for (const e of session.openingStock) {
      openingStockQty[e.itemId] = String(e.quantity);
    }
    const consignedStockQty: Record<string, string> = {};
    for (const e of session.consignedStock) {
      consignedStockQty[e.itemId] = String(e.quantity);
    }
    set({
      openingCash: session.openingCash,
      sampleQty,
      displayQty,
      openingStockQty,
      consignedStockQty,
      initialized: true,
    });
  },

  setOpeningCash: (value) => set({ openingCash: value }),

  setSampleQty: (itemId, value) =>
    set((state) => ({ sampleQty: { ...state.sampleQty, [itemId]: value } })),

  setDisplayQty: (itemId, value) =>
    set((state) => ({ displayQty: { ...state.displayQty, [itemId]: value } })),

  setOpeningStockQty: (itemId, value) =>
    set((state) => ({
      openingStockQty: { ...state.openingStockQty, [itemId]: value },
    })),

  setConsignedStockQty: (itemId, value) =>
    set((state) => ({
      consignedStockQty: { ...state.consignedStockQty, [itemId]: value },
    })),

  reset: () => set(initialState),
}));
