import { create } from "zustand";
import type {
  EventSessionV20261121,
  ItemQuantity,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";

type PreparationFormState = {
  eventDate: string;
  menu: MenuEntry[];
  consignedStock: ItemQuantity[];
  initialized: boolean;
};

type PreparationFormActions = {
  initializeFromSession: (session: EventSessionV20261121 | null) => void;
  setEventDate: (value: string) => void;
  setMenu: (menu: MenuEntry[]) => void;
  setConsignedStock: (consignedStock: ItemQuantity[]) => void;
  reset: () => void;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const initialState: PreparationFormState = {
  eventDate: todayDate(),
  menu: [],
  consignedStock: [],
  initialized: false,
};

export const usePreparationFormStore = create<
  PreparationFormState & PreparationFormActions
>((set, get) => ({
  ...initialState,

  initializeFromSession: (session) => {
    if (get().initialized) return;
    set({
      eventDate: session?.eventDate ?? todayDate(),
      menu: session?.menu ?? [],
      consignedStock: session?.consignedStock ?? [],
      initialized: true,
    });
  },

  setEventDate: (value) => set({ eventDate: value }),
  setMenu: (menu) => set({ menu }),
  setConsignedStock: (consignedStock) => set({ consignedStock }),

  reset: () => set({ ...initialState, eventDate: todayDate() }),
}));
