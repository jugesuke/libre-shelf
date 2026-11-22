import type { Item, NewItem } from "@libre-shared/entity/items/item";
import type {
  EventSessionV20261121,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { menuEntryFromItem } from "@libre/common/event-session/menu-entry";
import { isConsignedItem } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { ItemInput } from "@libre/common/item/item-input";
import {
  CLASS_OPTIONS,
  INITIAL_FORM_DATA,
  ISDN_LENGTH,
  TYPE_OPTIONS,
  blockMinusInput,
  parsePriceInput,
} from "@libre/pages/items/constants";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Card } from "@shelf/ui/components/card";
import { Dialog } from "@shelf/ui/components/dialog";
import { Field } from "@shelf/ui/components/field";
import { Input } from "@shelf/ui/components/input";
import { SegmentedControl } from "@shelf/ui/components/segmented-control";
import { Select } from "@shelf/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@shelf/ui/components/table";
import { useRepositories } from "@libre/data/repositories-context";
import { useAppShell } from "@libre/app/app-shell";
import {
  CONSIGNED_QTY_ERROR,
  STOCK_QTY_ERROR,
  buildMenuEditResult,
  validateMenuEdit,
} from "./menu-edit";
import { useEffect, useState } from "react";
import { isdnFailureMessage, validateIsdnInput } from "@libre/pages/items/isdn-registration";

type NewItemMode = "isdn" | "manual";

const normalizeDigits = (value: string): string => {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
};

const validateIsdn = (value: string): boolean => {
  return /^\d+$/.test(value);
};

type ManualItemErrors = Partial<
  Record<"product_name" | "publisher_name" | "class" | "type", string>
>;

type Props = {
  session: EventSessionV20261121;
  onClose: () => void;
  onSave: (result: ReturnType<typeof buildMenuEditResult>) => void;
};

export function MenuEditModal({ session, onClose, onSave }: Props) {
  const repos = useRepositories();
  const { itemsUnreadable, NewItemForms } = useAppShell();
  // 商品マスタが読めないときは、商品を足せない
  const [unreadableMessage, setUnreadableMessage] = useState<string>();

  const originalItemIds = new Set(session.menu.map((e) => e.itemId));

  const [localMenu, setLocalMenu] = useState<MenuEntry[]>(() =>
    session.menu.map((e) => ({ ...e })),
  );
  const [allItems, setAllItems] = useState<Item[]>([]);
  // 新規追加商品の持ち込み数（itemId → 入力文字列）
  const [newStockQty, setNewStockQty] = useState<Record<string, string>>({});
  // 委託物の預かり部数（itemId → 入力文字列）
  const [consignedQty, setConsignedQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      session.consignedStock.map((s) => [s.itemId, String(s.quantity)]),
    ),
  );

  // 新規商品登録（items テーブルへの新規登録）
  const [isNewItemFormOpen, setIsNewItemFormOpen] = useState(false);
  const [newItemMode, setNewItemMode] = useState<NewItemMode>("isdn");
  const [isdnValue, setIsdnValue] = useState("");
  const [newItemForm, setNewItemForm] = useState<NewItem>(INITIAL_FORM_DATA);
  const [isRegisteringItem, setIsRegisteringItem] = useState(false);
  const [manualErrors, setManualErrors] = useState<ManualItemErrors>({});
  const [registerFailure, setRegisterFailure] = useState<string>();
  // 預かり部数が不正な委託物の itemId
  const [invalidQtyIds, setInvalidQtyIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  // 持ち込み数が不正な商品の itemId
  const [invalidStockIds, setInvalidStockIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  useEffect(() => {
    const fetch = async () => {
      const res = await repos.items.list({ limit: 100, offset: 0 });
      if (res.ok) setAllItems(res.value);
      else if (itemsUnreadable) setUnreadableMessage(itemsUnreadable.itemPicker);
    };
    fetch();
  }, []);

  const handlePriceChange = (itemId: string, value: string) => {
    setLocalMenu((prev) =>
      prev.map((e) =>
        e.itemId === itemId ? { ...e, price: Number(value) || 0 } : e,
      ),
    );
  };

  const handleConsignorNameChange = (itemId: string, value: string) => {
    setLocalMenu((prev) =>
      prev.map((e) => {
        if (e.itemId !== itemId) return e;
        if (value !== "") return { ...e, consignorName: value };
        const { consignorName: _consignorName, ...rest } = e;
        return rest;
      }),
    );
    setInvalidQtyIds(
      (prev) => new Set([...prev].filter((id) => id !== itemId)),
    );
    // 委託元名を消した（自サークルに戻した）場合は、預かり部数の入力も削除する
    if (value.trim() === "") {
      setConsignedQty((prev) => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleConsignedQtyChange = (itemId: string, value: string) => {
    setInvalidQtyIds(
      (prev) => new Set([...prev].filter((id) => id !== itemId)),
    );
    setConsignedQty((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleRemove = (itemId: string) => {
    setLocalMenu((prev) => prev.filter((e) => e.itemId !== itemId));
    setNewStockQty((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
    setConsignedQty((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleItemSelect = (item: Item) => {
    setLocalMenu((prev) => [...prev, menuEntryFromItem(item)]);
    setNewStockQty((prev) => ({ ...prev, [item.item_id]: "" }));
  };

  /** 新規登録した商品をおしながきに追加し、商品一覧にも反映する */
  const handleRegisteredItem = (item: Item) => {
    setAllItems((prev) => [...prev, item]);
    handleItemSelect(item);
  };

  const handleRegisterByIsdn = async (rawIsdn: string) => {
    const trimmed = rawIsdn.trim();
    const invalid = validateIsdnInput(trimmed);
    if (invalid !== undefined) {
      setRegisterFailure(invalid);
      return;
    }

    setRegisterFailure(undefined);
    setIsRegisteringItem(true);
    try {
      const res = await repos.items.addByIsdn(trimmed);

      if (!res.ok) {
        console.error("Failed to register item:", res.status, res.detail);
        setRegisterFailure(isdnFailureMessage(res.status, "手入力で登録"));
        return;
      }

      const item = res.value;
      setIsdnValue("");
      handleRegisteredItem(item);
    } catch (error) {
      console.error("Failed to add item by ISDN:", error);
      setRegisterFailure(isdnFailureMessage("offline", "手入力で登録"));
    } finally {
      setIsRegisteringItem(false);
    }
  };

  const handleIsdnChange = (value: string) => {
    const normalized = normalizeDigits(value);
    setIsdnValue(normalized);
    setRegisterFailure(undefined);
    if (
      normalized.length === ISDN_LENGTH &&
      validateIsdn(normalized) &&
      !isRegisteringItem
    ) {
      void handleRegisterByIsdn(normalized);
    }
  };

  const handleRegisterManualItem = async () => {
    const errors: ManualItemErrors = {
      product_name: newItemForm.product_name.trim()
        ? undefined
        : "商品名を入力してください。",
      publisher_name: newItemForm.publisher_name.trim()
        ? undefined
        : "サークルを入力してください。",
      class: newItemForm.class.trim() ? undefined : "分類を選択してください。",
      type: newItemForm.type.trim() ? undefined : "種類を選択してください。",
    };
    setManualErrors(errors);
    if (Object.values(errors).some((e) => e !== undefined)) return;

    setRegisterFailure(undefined);
    setIsRegisteringItem(true);
    try {
      const res = await repos.items.add({
        ...newItemForm,
        price: newItemForm.price,
        genre_code: newItemForm.genre_code || undefined,
        sample_image_url: newItemForm.sample_image_url || undefined,
      });

      if (!res.ok) {
        console.error("Failed to register item:", res.detail);
        setRegisterFailure(
          "商品を登録できませんでした。通信状態を確認して、もう一度登録してください。",
        );
        return;
      }

      const item = res.value;
      setNewItemForm(INITIAL_FORM_DATA);
      handleRegisteredItem(item);
    } catch (error) {
      console.error("Failed to add new item:", error);
      setRegisterFailure(
        "商品を登録できませんでした。通信状態を確認して、もう一度登録してください。",
      );
    } finally {
      setIsRegisteringItem(false);
    }
  };

  const updateNewItemField = <K extends keyof NewItem>(
    field: K,
    value: NewItem[K],
  ) => {
    setNewItemForm((prev) => ({ ...prev, [field]: value }));
    setManualErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = () => {
    const menuInput = {
      menu: localMenu,
      originalItemIds,
      newStockQty,
      consignedQty,
    };
    const errors = validateMenuEdit(menuInput);
    setInvalidQtyIds(errors.consignedQty);
    setInvalidStockIds(errors.stockQty);
    if (errors.consignedQty.size > 0 || errors.stockQty.size > 0) return;
    onSave(buildMenuEditResult(session, menuInput));
  };

  const excludeIds = new Set(localMenu.map((e) => e.itemId));
  const hasNewItems = localMenu.some((e) => !originalItemIds.has(e.itemId));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="商品・価格編集"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {unreadableMessage && <Alert variant="destructive">{unreadableMessage}</Alert>}

        {/* おしながき一覧 */}
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-bold">おしながき</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead numeric>価格</TableHead>
                <TableHead>委託元</TableHead>
                <TableHead numeric>預かり部数</TableHead>
                {hasNewItems && <TableHead numeric>持ち込み数</TableHead>}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {localMenu.length === 0 ? (
                <TableEmpty colSpan={hasNewItems ? 6 : 5} controlRows>
                  商品がありません。「既存商品を追加」か「新規商品を登録」から追加できます。
                </TableEmpty>
              ) : (
                localMenu.map((entry) => {
                  const isNew = !originalItemIds.has(entry.itemId);
                  const consigned = isConsignedItem(entry);
                  const name = entry.productName;
                  const qtyInvalid = invalidQtyIds.has(entry.itemId);
                  const qtyErrorId = `menu-edit-qty-error-${entry.itemId}`;
                  const stockInvalid = invalidStockIds.has(entry.itemId);
                  const stockErrorId = `menu-edit-stock-error-${entry.itemId}`;
                  return (
                    <TableRow key={entry.itemId}>
                      <TableCell>
                        <div className="font-bold">{name}</div>
                        {entry.publisherName && (
                          <div className="text-muted-foreground text-xs">
                            {entry.publisherName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell numeric>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">¥</span>
                          <Input
                            type="number"
                            min={0}
                            aria-label={`${name}の価格`}
                            className="w-24 text-right"
                            value={entry.price}
                            onChange={(e) =>
                              handlePriceChange(entry.itemId, e.target.value)
                            }
                          />
                        </div>
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
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            aria-label={`${name}の預かり部数`}
                            className="w-24 text-right"
                            value={
                              consigned
                                ? (consignedQty[entry.itemId] ?? "")
                                : ""
                            }
                            placeholder={consigned ? "必須" : "—"}
                            disabled={!consigned}
                            aria-invalid={qtyInvalid ? true : undefined}
                            aria-describedby={
                              qtyInvalid ? qtyErrorId : undefined
                            }
                            onChange={(e) =>
                              handleConsignedQtyChange(
                                entry.itemId,
                                e.target.value,
                              )
                            }
                          />
                          <span className="text-muted-foreground">冊</span>
                        </div>
                        {qtyInvalid && (
                          <p
                            id={qtyErrorId}
                            className="text-destructive-muted-foreground mt-1 text-xs"
                          >
                            {CONSIGNED_QTY_ERROR}
                          </p>
                        )}
                      </TableCell>
                      {hasNewItems && (
                        <TableCell numeric>
                          {isNew && !consigned ? (
                            <>
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  aria-label={`${name}の持ち込み数`}
                                  className="w-24 text-right"
                                  value={newStockQty[entry.itemId] ?? ""}
                                  placeholder="0"
                                  aria-invalid={stockInvalid ? true : undefined}
                                  aria-describedby={
                                    stockInvalid ? stockErrorId : undefined
                                  }
                                  onChange={(e) => {
                                    setInvalidStockIds(
                                      (prev) =>
                                        new Set(
                                          [...prev].filter(
                                            (id) => id !== entry.itemId,
                                          ),
                                        ),
                                    );
                                    setNewStockQty((prev) => ({
                                      ...prev,
                                      [entry.itemId]: e.target.value,
                                    }));
                                  }}
                                />
                                <span className="text-muted-foreground">
                                  冊
                                </span>
                              </div>
                              {stockInvalid && (
                                <p
                                  id={stockErrorId}
                                  className="text-destructive-muted-foreground mt-1 text-xs"
                                >
                                  {STOCK_QTY_ERROR}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="destructive"
                          aria-label={`${name}を削除`}
                          onClick={() => handleRemove(entry.itemId)}
                        >
                          削除
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </section>

        {/* 既存商品を追加 */}
        {!unreadableMessage && (
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-bold">既存商品を追加</h3>
          <ItemInput
            alignCameraTop
            items={allItems}
            onSelect={handleItemSelect}
            excludeIds={excludeIds}
          />
        </section>
        )}

        {/* 新規商品を登録 */}
        {!unreadableMessage && (
        <section className="flex flex-col gap-2">
          <Card
            collapsible
            title="新規商品を登録"
            open={isNewItemFormOpen}
            onOpenChange={setIsNewItemFormOpen}
          >
            <div className="flex flex-col gap-3">
              <SegmentedControl
                options={[
                  { value: "isdn", label: "ISDNでスキャン" },
                  { value: "manual", label: "手入力で登録" },
                ]}
                value={newItemMode}
                onChange={(mode) => {
                  setNewItemMode(mode);
                  setRegisterFailure(undefined);
                }}
                className="self-start"
              />

              {NewItemForms ? (
                <NewItemForms mode={newItemMode} onAdded={handleRegisteredItem} />
              ) : (
              <>
              {newItemMode === "isdn" ? (
                <div className="flex flex-col gap-3">
                  <Field label="ISDN">
                    <Input
                      type="text"
                      value={isdnValue}
                      onChange={(e) => handleIsdnChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (isRegisteringItem) return;
                          void handleRegisterByIsdn(isdnValue);
                        }
                      }}
                      placeholder="ISDNコードを入力"
                      disabled={isRegisteringItem}
                    />
                  </Field>
                  <div className="flex min-h-14 items-center justify-end gap-3">
                    {registerFailure && (
                      <Alert variant="destructive" className="flex-1">
                        {registerFailure}
                      </Alert>
                    )}
                    <Button
                      onClick={() => {
                        if (isRegisteringItem) return;
                        void handleRegisterByIsdn(isdnValue);
                      }}
                      loading={isRegisteringItem}
                    >
                      登録
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Field
                    label="商品名"
                    required
                    error={manualErrors.product_name}
                  >
                    <Input
                      type="text"
                      value={newItemForm.product_name}
                      onChange={(e) =>
                        updateNewItemField("product_name", e.target.value)
                      }
                      placeholder="商品名を入力"
                    />
                  </Field>
                  <Field
                    label="サークル"
                    required
                    error={manualErrors.publisher_name}
                  >
                    <Input
                      type="text"
                      value={newItemForm.publisher_name}
                      onChange={(e) =>
                        updateNewItemField("publisher_name", e.target.value)
                      }
                      placeholder="サークルを入力"
                    />
                  </Field>
                  <Field label="分類" required error={manualErrors.class}>
                    <Select
                      value={newItemForm.class}
                      onChange={(e) =>
                        updateNewItemField("class", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        分類を選択
                      </option>
                      {CLASS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="種類" required error={manualErrors.type}>
                    <Select
                      value={newItemForm.type}
                      onChange={(e) =>
                        updateNewItemField("type", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        種類を選択
                      </option>
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="価格" controlId="new-item-price">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">¥</span>
                      <Input
                        id="new-item-price"
                        type="number"
                        value={newItemForm.price?.toString() || ""}
                        onChange={(e) => {
                          const parsedPrice = parsePriceInput(e.target.value);
                          if (
                            e.target.value.trim() === "" ||
                            parsedPrice !== undefined
                          ) {
                            updateNewItemField("price", parsedPrice);
                          }
                        }}
                        onKeyDown={blockMinusInput}
                        placeholder="価格を入力"
                      />
                    </div>
                  </Field>
                  <div className="flex min-h-14 items-center justify-end gap-3">
                    {registerFailure && (
                      <Alert variant="destructive" className="flex-1">
                        {registerFailure}
                      </Alert>
                    )}
                    <Button
                      onClick={handleRegisterManualItem}
                      loading={isRegisteringItem}
                    >
                      登録
                    </Button>
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          </Card>
        </section>
        )}
      </div>
    </Dialog>
  );
}
