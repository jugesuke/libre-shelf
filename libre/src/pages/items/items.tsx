import type { Item, NewItem } from "@libre-shared/entity/items/item";
import { Card } from "@shelf/ui/components/card";
import { ConfirmDialog } from "@shelf/ui/components/confirm-dialog";
import { formatYen } from "@libre/common/format";
import { Page } from "@shelf/ui/components/page";
import { AppFrame as Frame, useAppShell } from "@libre/app/app-shell";
import { Alert } from "@shelf/ui/components/alert";
import { useRepositories } from "@libre/data/repositories-context";
import { useCallback, useEffect, useState } from "react";
import { useLoading } from "@libre/common/use-loading";
import { AddByISDN } from "./add-by-isdn";
import { AddNewItem } from "./add-new-item";
import { ITEMS_LIMIT } from "./constants";
import { STORAGE_FULL_STATUS } from "@libre/data/repositories";
import { failureMessage, type ItemActionResult } from "./write-failure";
import { ItemsTable } from "./items-table";

function ItemsApp() {
  const repos = useRepositories();
  const { ItemsToolbar, itemsUnreadable } = useAppShell();
  const [unreadable, setUnreadable] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [isAddNewItemOpen, setIsAddNewItemOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteFailure, setDeleteFailure] = useState<string>();
  const { loading, reloading, track } = useLoading();
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});

  const fetchStockCounts = useCallback(async (itemIds: string[]) => {
    const itemStocks = repos.itemStocks;
    if (!itemStocks) return;
    try {
      const results = await Promise.all(
        itemIds.map((id) =>
          itemStocks
            .getItemQuantity(id)
            .then((res) => {
              if (res.ok) {
                return [id, res.value.quantity] as [string, number];
              }
              return null;
            })
            .catch(() => null),
        ),
      );
      const counts: Record<string, number> = {};
      for (const r of results) {
        if (r) counts[r[0]] = r[1];
      }
      setStockCounts(counts);
    } catch (error) {
      console.error("Failed to fetch stock counts:", error);
    }
  }, []);

  const fetchItems = useCallback(
    () =>
      track(async () => {
        try {
          const res = await repos.items.list({ limit: ITEMS_LIMIT, offset: 0 });

          if (res.ok) {
            const data = res.value;
            setUnreadable(false);
            setItems(data);
            fetchStockCounts(data.map((i) => i.item_id));
          } else if (itemsUnreadable) {
            setUnreadable(true);
            setItems([]);
          }
        } catch (error) {
          console.error("Failed to fetch items:", error);
        }
      }),
    [fetchStockCounts, track, itemsUnreadable],
  );

  /** 確認のモーダルを開く。削除は確定したときに行う */
  const handleDeleteItem = (itemId: string) => {
    const item = items.find((i) => i.item_id === itemId);
    if (!item) return;
    setDeleteFailure(undefined);
    setDeleteTarget(item);
  };

  const handleConfirmDelete = useCallback(
    async (itemId: string) => {
      setDeleteFailure(undefined);
      try {
        const res = await repos.items.remove(itemId);

        if (res.ok) {
          setDeleteTarget(null);
          await fetchItems();
        } else {
          setDeleteFailure(
            failureMessage(
              res.status,
              "商品を削除できませんでした。通信状態を確認して、もう一度削除してください。",
            ),
          );
        }
      } catch (error) {
        console.error("Failed to delete item:", error);
        setDeleteFailure(
          "商品を削除できませんでした。通信状態を確認して、もう一度削除してください。",
        );
      }
    },
    [fetchItems],
  );

  const handleEditItem = useCallback(
    async (itemId: string, data: NewItem): Promise<ItemActionResult<void>> => {
      try {
        const res = await repos.items.update(itemId, {
          ...data,
          price: data.price ?? null,
          genre_code: data.genre_code || null,
          sample_image_url: data.sample_image_url || null,
        });

        if (res.ok) {
          await fetchItems();
          return { ok: true, value: undefined };
        }
        return { ok: false, storageFull: res.status === STORAGE_FULL_STATUS };
      } catch (error) {
        console.error("Failed to edit item:", error);
        return { ok: false, storageFull: false };
      }
    },
    [fetchItems],
  );

  const handleSyncISDN = useCallback(
    async (isdn: string): Promise<ItemActionResult<Item>> => {
      try {
        const res = await repos.items.syncIsdn(isdn);

        if (res.ok) {
          const updatedItem = res.value;
          await fetchItems();
          return { ok: true, value: updatedItem as Item };
        }
        return { ok: false, storageFull: res.status === STORAGE_FULL_STATUS };
      } catch (error) {
        console.error("Failed to sync ISDN info:", error);
        return { ok: false, storageFull: false };
      }
    },
    [fetchItems],
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <Frame currentTab="items">
      <Page title="商品一覧" width="wide">
        <div className="flex flex-col gap-4">
          {unreadable && itemsUnreadable && (
            <Alert variant="destructive">{itemsUnreadable.itemsPage}</Alert>
          )}

          {!unreadable && (
            <>
              <Card title="ISDNから商品を追加">
                <AddByISDN onSubmit={fetchItems} />
              </Card>

              <Card
                title="新規商品を追加"
                collapsible
                open={isAddNewItemOpen}
                onOpenChange={setIsAddNewItemOpen}
              >
                <AddNewItem onSubmit={fetchItems} />
              </Card>
            </>
          )}

          {ItemsToolbar && <ItemsToolbar disabled={unreadable} onChanged={fetchItems} />}

          <ItemsTable
            items={items}
            loading={loading}
            reloading={reloading}
            stockCounts={repos.itemStocks ? stockCounts : undefined}
            onDelete={handleDeleteItem}
            onEdit={handleEditItem}
            onSyncISDN={handleSyncISDN}
          />
        </div>
      </Page>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="商品の削除"
        message="以下の商品を削除しますか？　この操作は元に戻せません。"
        target={
          deleteTarget
            ? [
                ["商品名", deleteTarget.product_name],
                ["サークル", deleteTarget.publisher_name],
                [
                  "価格",
                  deleteTarget.price ? formatYen(deleteTarget.price) : "-",
                ],
              ]
            : undefined
        }
        confirmLabel="削除"
        onConfirm={async () => {
          if (deleteTarget) await handleConfirmDelete(deleteTarget.item_id);
        }}
        error={deleteFailure}
        onErrorClose={() => setDeleteFailure(undefined)}
      />
    </Frame>
  );
}

export default ItemsApp;
