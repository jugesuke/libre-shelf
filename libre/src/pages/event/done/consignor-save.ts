import type {
  EventSessionV20261121,
  ItemQuantity,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { isConsignedItem } from "@libre-shared/entity/event/v2026-11-21/event-session";

/**
 * 「委託元を保存」で保存する menu と consignedStock を組み立てる。
 * consignors は商品の itemId → 入力欄の委託元名。trim 後が空になった商品は委託元名を外して自サークル頒布物にする。
 * consignedStock は、委託物のまま残った商品の項目だけを残す。新しく委託物になった商品には項目を足さない。
 */
export function buildConsignorsSaveResult(
  session: Pick<EventSessionV20261121, "menu" | "consignedStock">,
  consignors: Readonly<Record<string, string>>,
): Pick<EventSessionV20261121, "menu" | "consignedStock"> {
  const menu: MenuEntry[] = session.menu.map((entry) => {
    const trimmed = consignors[entry.itemId]?.trim();
    if (trimmed) return { ...entry, consignorName: trimmed };
    const { consignorName: _consignorName, ...rest } = entry;
    return rest;
  });
  const consignedItemIds = new Set(
    menu.filter(isConsignedItem).map((e) => e.itemId),
  );
  const consignedStock: ItemQuantity[] = session.consignedStock.filter((s) =>
    consignedItemIds.has(s.itemId),
  );
  return { menu, consignedStock };
}
