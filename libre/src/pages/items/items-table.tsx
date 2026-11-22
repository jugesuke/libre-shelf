import { formatYen } from "@libre/common/format";
import { useState } from "react";
import type { Item, NewItem } from "@libre-shared/entity/items/item";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@shelf/ui/components/table";
import { ItemDetailModal } from "./item-detail-modal";
import type { ItemActionResult } from "./write-failure";

interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  reloading: boolean;
  /** 商品ごとの在庫の数。渡さなければ、在庫の列を出さない */
  stockCounts?: Record<string, number>;
  onDelete: (itemId: string) => void;
  onEdit: (itemId: string, data: NewItem) => Promise<ItemActionResult<void>>;
  onSyncISDN: (isdn: string) => Promise<ItemActionResult<Item>>;
}

export function ItemsTable({
  items,
  loading,
  reloading,
  stockCounts,
  onDelete,
  onEdit,
  onSyncISDN,
}: ItemsTableProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  return (
    <>
      <Table reloading={reloading}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-25">商品ID</TableHead>
            <TableHead>商品名</TableHead>
            <TableHead>サークル</TableHead>
            <TableHead numeric>価格</TableHead>
            {stockCounts && (
              <TableHead numeric className="w-20">
                在庫数
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoading colSpan={stockCounts ? 5 : 4} />
          ) : items.length === 0 ? (
            <TableEmpty colSpan={stockCounts ? 5 : 4}>
              商品がありません。「新規商品を追加」から追加できます。
            </TableEmpty>
          ) : (
            items.map((item) => (
              <TableRow
                key={item.item_id}
                onClick={() => setSelectedItem(item)}
                interactive
              >
                <TableCell className="font-medium">{item.item_id}</TableCell>
                <TableCell>{item.product_name}</TableCell>
                <TableCell>{item.publisher_name}</TableCell>
                <TableCell numeric>
                  {item.price ? `${formatYen(item.price)}` : "-"}
                </TableCell>
                {stockCounts && (
                  <TableCell numeric>
                    {item.item_id in stockCounts
                      ? stockCounts[item.item_id].toLocaleString()
                      : "-"}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={onDelete}
          onEdit={onEdit}
          onSyncISDN={onSyncISDN}
        />
      )}
    </>
  );
}
