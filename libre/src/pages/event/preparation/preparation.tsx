import { X } from "lucide-react";
import type { Item } from "@libre-shared/entity/items/item";
import type {
  EventSessionV20261121,
  ItemQuantity,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { menuEntryFromItem } from "@libre/common/event-session/menu-entry";
import { isConsignedItem } from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  createNewEventSession,
  deleteEventSession,
} from "@libre/common/event-session/storage";
import { usePreparationFormStore } from "@libre/common/event-session/preparation-form-store";
import {
  CONSIGNED_QTY_ERROR,
  PRICE_ERROR,
  hasPreparationErrors,
  removeItemErrors,
  validatePreparation,
  type PreparationErrors,
} from "@libre/common/event-session/preparation-validation";
import { ItemInput } from "@libre/common/item/item-input";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Field } from "@shelf/ui/components/field";
import { Input } from "@shelf/ui/components/input";
import { Page } from "@shelf/ui/components/page";
import { useToast } from "@shelf/ui/components/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shelf/ui/components/table";
import { DiscardSessionDialog } from "@libre/common/event-session/DiscardSessionDialog";
import { useRepositories } from "@libre/data/repositories-context";
import { useEventAdapter } from "@libre/pages/event/event-adapter";
import { useAppShell } from "@libre/app/app-shell";
import { useTexts } from "@libre/app/texts";
import { useCallback, useEffect, useId, useState } from "react";

type Props = {
  session: EventSessionV20261121 | null;
  onSessionUpdate: (session: EventSessionV20261121) => void;
  onDiscard: () => void;
};

/**
 * おしながきの委託元名を保存前に正規化する。前後の空白を trim し、trim 後が空文字なら
 * consignorName を未設定（フィールド削除）に戻す。
 */
const normalizeMenu = (menu: MenuEntry[]): MenuEntry[] =>
  menu.map((entry) => {
    if (entry.consignorName === undefined) return entry;
    const trimmed = entry.consignorName.trim();
    if (trimmed === "") {
      const { consignorName: _consignorName, ...rest } = entry;
      return rest;
    }
    return { ...entry, consignorName: trimmed };
  });

/**
 * 正規化後の menu を基準に、委託物でなくなった商品の consignedStock エントリを除外する。
 */
const filterConsignedStock = (
  consignedStock: ItemQuantity[],
  normalizedMenu: MenuEntry[],
): ItemQuantity[] => {
  const consignedItemIds = new Set(
    normalizedMenu.filter(isConsignedItem).map((e) => e.itemId),
  );
  return consignedStock.filter((s) => consignedItemIds.has(s.itemId));
};

const NO_ERRORS: PreparationErrors = {
  price: new Set(),
  consignedQty: new Set(),
};

/** itemId を除いた Set を返す。 */
const withoutId = (ids: ReadonlySet<string>, itemId: string): ReadonlySet<string> =>
  new Set([...ids].filter((id) => id !== itemId));

export function PreparationPage({
  session,
  onSessionUpdate,
  onDiscard,
}: Props) {
  const repos = useRepositories();
  const { usePreparationEventInput } = useEventAdapter();
  const { itemsFetchThrown } = useAppShell();
  const t = useTexts("preparation");
  const eventInput = usePreparationEventInput(session?.settled ? null : session);
  const { showToast } = useToast();

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [errors, setErrors] = useState<PreparationErrors>(NO_ERRORS);

  const {
    eventDate,
    menu,
    consignedStock,
    initializeFromSession,
    setEventDate,
    setMenu,
    setConsignedStock,
  } = usePreparationFormStore();

  useEffect(() => {
    // settled（アップロード済み）のセッションは次回イベントの初期値に使わず、空フォームで開始する
    initializeFromSession(session?.settled ? null : session);
  }, [initializeFromSession, session]);

  // 追加済みアイテムIDのSet（ItemInputのexcludeIds用）
  const addedIds = new Set(menu.map((e) => e.itemId));

  // 破棄確認
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const itemInputId = useId();

  const fetchItems = useCallback(async () => {
    try {
      const res = await repos.items.list({ limit: 100, offset: 0 });
      if (res.ok) {
        const data = res.value;
        setAllItems(data);
      } else {
        setFetchError(t("itemsFetchFailed", { status: res.status }));
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
      setFetchError(itemsFetchThrown?.(String(error)) ?? null);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleItemSelect = (item: Item) => {
    setErrors((prev) => ({ ...prev, menu: undefined }));
    setMenu([...menu, menuEntryFromItem(item)]);
  };

  const handlePriceChange = (itemId: string, price: number) => {
    setErrors((prev) => ({ ...prev, price: withoutId(prev.price, itemId) }));
    setMenu(menu.map((e) => (e.itemId === itemId ? { ...e, price } : e)));
  };

  const clearConsignedQtyError = (itemId: string) =>
    setErrors((prev) => ({
      ...prev,
      consignedQty: withoutId(prev.consignedQty, itemId),
    }));

  const handleConsignorNameChange = (itemId: string, value: string) => {
    clearConsignedQtyError(itemId);
    const previous = menu.find((e) => e.itemId === itemId);
    if (previous !== undefined && isConsignedItem(previous) !== (value.trim() !== "")) {
      eventInput.onConsignorChange?.(itemId);
    }
    setMenu(
      menu.map((e) => {
        if (e.itemId !== itemId) return e;
        if (value !== "") return { ...e, consignorName: value };
        const { consignorName: _consignorName, ...rest } = e;
        return rest;
      }),
    );
    // 委託元名を消した（自サークルに戻した）場合は、預かり部数の入力も削除する
    if (value.trim() === "") {
      setConsignedStock(consignedStock.filter((s) => s.itemId !== itemId));
    }
  };

  const handleConsignedQtyChange = (itemId: string, value: string) => {
    clearConsignedQtyError(itemId);
    const quantity = Number(value);
    setConsignedStock([
      ...consignedStock.filter((s) => s.itemId !== itemId),
      { itemId, quantity: Number.isNaN(quantity) ? 0 : quantity },
    ]);
  };

  const handleRemove = (itemId: string) => {
    setErrors((prev) => removeItemErrors(prev, itemId));
    setMenu(menu.filter((e) => e.itemId !== itemId));
    setConsignedStock(consignedStock.filter((s) => s.itemId !== itemId));
  };

  /** 入力を検証して理由を表示する。理由がなければ true を返す。 */
  const validate = (): boolean => {
    const eventValid = eventInput.validate();
    const nextErrors = validatePreparation({
      eventDate,
      menu,
      consignedStock,
    });
    setErrors(nextErrors);
    return eventValid && !hasPreparationErrors(nextErrors);
  };

  const handleProceedToRegister = () => {
    if (!validate()) return;
    const normalizedMenu = normalizeMenu(menu);
    const filteredConsignedStock = filterConsignedStock(
      consignedStock,
      normalizedMenu,
    );
    if (session?.settled) {
      deleteEventSession();
    }
    const base = session?.settled
      ? createNewEventSession(eventDate, normalizedMenu)
      : (session ?? createNewEventSession(eventDate, normalizedMenu));
    const updated = eventInput.applyTo({
      ...base,
      eventDate,
      menu: normalizedMenu,
      consignedStock: filteredConsignedStock,
      phase: "opening",
    });
    onSessionUpdate(updated);
  };

  const handleSave = () => {
    if (!validate()) return;
    const normalizedMenu = normalizeMenu(menu);
    const filteredConsignedStock = filterConsignedStock(
      consignedStock,
      normalizedMenu,
    );
    if (session?.settled) {
      deleteEventSession();
    }
    const base = session?.settled
      ? createNewEventSession(eventDate, normalizedMenu)
      : (session ?? createNewEventSession(eventDate, normalizedMenu));
    const updated = eventInput.applyTo({
      ...base,
      eventDate,
      menu: normalizedMenu,
      consignedStock: filteredConsignedStock,
    });
    onSessionUpdate(updated);
    showToast("保存しました。");
  };

  return (
    <Page
      title="前日準備 — おしながき登録"
      width="wide"
      actions={
        session && (
          <Button variant="text" onClick={() => setShowDiscardConfirm(true)}>
            セッションを破棄する
          </Button>
        )
      }
    >
      <DiscardSessionDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        onDiscard={onDiscard}
      />

      <div className="flex flex-col gap-6">
        {eventInput.field}

        <Field label="開催日" required error={errors.eventDate}>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => {
              setErrors((prev) => ({ ...prev, eventDate: undefined }));
              setEventDate(e.target.value);
            }}
          />
        </Field>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">おしながき（頒布商品・価格）</h2>

          {fetchError && <Alert variant="destructive">{fetchError}</Alert>}

          {menu.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full">商品名</TableHead>
                  <TableHead numeric>頒布価格</TableHead>
                  <TableHead>委託元</TableHead>
                  <TableHead numeric>
                    {t("quantityHeader")}
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menu.map((entry) => {
                  const consigned = isConsignedItem(entry);
                  const consignedQty = consignedStock.find(
                    (s) => s.itemId === entry.itemId,
                  );
                  const name = entry.productName;
                  const priceInvalid = errors.price.has(entry.itemId);
                  const priceErrorId = `${itemInputId}-price-${entry.itemId}`;
                  const qtyInvalid = errors.consignedQty.has(entry.itemId);
                  const qtyErrorId = `${itemInputId}-qty-${entry.itemId}`;
                  return (
                    <TableRow key={entry.itemId}>
                      <TableCell>
                        <div className="font-bold">{name}</div>
                        <div className="text-muted-foreground text-xs">
                          {entry.publisherName}
                        </div>
                      </TableCell>
                      <TableCell numeric>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">¥</span>
                          <Input
                            type="number"
                            min={0}
                            aria-label={`${name}の頒布価格`}
                            aria-invalid={priceInvalid ? true : undefined}
                            aria-describedby={priceInvalid ? priceErrorId : undefined}
                            className="w-28 text-right"
                            value={entry.price}
                            onChange={(e) =>
                              handlePriceChange(
                                entry.itemId,
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                        {priceInvalid && (
                          <p
                            id={priceErrorId}
                            className="text-destructive-muted-foreground mt-1 text-xs"
                          >
                            {PRICE_ERROR}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          aria-label={`${name}の委託元`}
                          className="w-40"
                          value={entry.consignorName ?? ""}
                          placeholder="委託元名（任意）"
                          onChange={(e) =>
                            handleConsignorNameChange(
                              entry.itemId,
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell numeric>
                        {!consigned && eventInput.ownQuantityCell ? (
                          eventInput.ownQuantityCell(entry)
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              aria-label={`${name}の預かり部数`}
                              aria-invalid={qtyInvalid ? true : undefined}
                              aria-describedby={qtyInvalid ? qtyErrorId : undefined}
                              className="w-28 text-right"
                              value={
                                consigned ? (consignedQty?.quantity ?? "") : ""
                              }
                              placeholder={consigned ? "必須" : "—"}
                              disabled={!consigned}
                              onChange={(e) =>
                                handleConsignedQtyChange(
                                  entry.itemId,
                                  e.target.value,
                                )
                              }
                            />
                            <span className="text-muted-foreground">冊</span>
                          </div>
                        )}
                        {qtyInvalid && (
                          <p
                            id={qtyErrorId}
                            className="text-destructive-muted-foreground mt-1 text-xs"
                          >
                            {CONSIGNED_QTY_ERROR}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          onClick={() => handleRemove(entry.itemId)}
                          aria-label="削除"
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {menu.length === 0 && !fetchError && (
            <p className="text-muted-foreground text-sm">
              まだ商品が追加されていません。
            </p>
          )}

          {!fetchError && (
            <Field
              label="商品を追加"
              controlId={itemInputId}
              error={errors.menu}
            >
              <ItemInput
                id={itemInputId}
                alignCameraTop
                items={allItems}
                onSelect={handleItemSelect}
                excludeIds={addedIds}
              />
            </Field>
          )}
        </section>

        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={handleSave}>
            続きはあとで
          </Button>
          <Button variant="primary" onClick={handleProceedToRegister}>
            レジへ進む
          </Button>
        </div>
      </div>
    </Page>
  );
}
