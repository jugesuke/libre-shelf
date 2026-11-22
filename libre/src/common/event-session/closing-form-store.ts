import { create } from "zustand";
import type {
  CashCount,
  EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";

type ClosingFormState = {
  closingStockQty: Record<string, string>; // itemId -> quantity string
  closingCash: CashCount | null;
  initialized: boolean;
};

type ClosingFormActions = {
  initializeFromSession: (session: EventSessionV20261121) => void;
  setClosingStockQty: (itemId: string, value: string) => void;
  setClosingCash: (value: CashCount | null) => void;
  reset: () => void;
};

const initialState: ClosingFormState = {
  closingStockQty: {},
  closingCash: null,
  initialized: false,
};

export const useClosingFormStore = create<
  ClosingFormState & ClosingFormActions
>((set, get) => ({
  ...initialState,

  initializeFromSession: (session) => {
    if (get().initialized) return;
    const closingStockQty: Record<string, string> = {};
    if (session.closingStock) {
      for (const e of session.closingStock) {
        closingStockQty[e.itemId] = String(e.quantity);
      }
    }
    set({
      closingStockQty,
      closingCash: session.closingCash,
      initialized: true,
    });
  },

  setClosingStockQty: (itemId, value) =>
    set((state) => ({
      closingStockQty: { ...state.closingStockQty, [itemId]: value },
    })),

  setClosingCash: (value) => set({ closingCash: value }),

  reset: () => set(initialState),
}));
