import type { Item } from "@libre-shared/entity/items/item";
import { AddByISDN } from "@libre/pages/items/add-by-isdn";
import { AddNewItem } from "@libre/pages/items/add-new-item";

/**
 * レジの商品・価格編集のダイアログで、商品マスタに新しい商品を登録する欄。商品管理の画面と同じ欄を使う。
 * このダイアログの主要な操作は下部の「保存」なので、「追加」のボタンは secondary にする
 */
export function LibreNewItemForms({
  mode,
  onAdded,
}: {
  mode: "isdn" | "manual";
  onAdded: (item: Item) => void;
}) {
  return mode === "isdn" ? (
    <AddByISDN onSubmit={onAdded} addButtonVariant="secondary" manualEntryLabel="手入力で登録" />
  ) : (
    <AddNewItem onSubmit={onAdded} addButtonVariant="secondary" />
  );
}
