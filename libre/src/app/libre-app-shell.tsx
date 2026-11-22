import type { AppShell } from "./app-shell";
import { LibreFrame } from "./libre-frame";
import { LibreNewItemForms } from "./event/libre-new-item-forms";
import { ItemsToolbar } from "./items/items-toolbar";
import { ITEMS_UNREADABLE_MESSAGE, ITEM_PICKER_UNREADABLE_MESSAGE } from "./items/items-messages";

/** Libre Shelf が共通の画面に渡すもの。旧スキーマのセッションは持たない */
export const libreAppShell: AppShell = {
  Frame: LibreFrame,
  ItemsToolbar,
  NewItemForms: LibreNewItemForms,
  itemsUnreadable: {
    itemsPage: ITEMS_UNREADABLE_MESSAGE,
    itemPicker: ITEM_PICKER_UNREADABLE_MESSAGE,
  },
};
