import { formatYen } from "@libre/common/format";
import { useState } from "react";
import type { Item, NewItem } from "@libre-shared/entity/items/item";
import { isISDN } from "@libre-shared/entity/items/item_id";
import { Button } from "@shelf/ui/components/button";
import { Field } from "@shelf/ui/components/field";
import { Input } from "@shelf/ui/components/input";
import { Select } from "@shelf/ui/components/select";
import { Dialog } from "@shelf/ui/components/dialog";
import {
  blockMinusInput,
  CLASS_OPTIONS,
  parsePriceInput,
  type RequiredFieldErrors,
  validateRequired,
  TYPE_OPTIONS,
} from "./constants";
import { STORAGE_FULL_MESSAGE, type ItemActionResult } from "./write-failure";

interface ItemDetailModalProps {
  item: Item;
  onClose: () => void;
  onDelete: (itemId: string) => void;
  onEdit: (itemId: string, data: NewItem) => Promise<ItemActionResult<void>>;
  onSyncISDN: (isdn: string) => Promise<ItemActionResult<Item>>;
}

type ModalMode = "detail" | "edit";
type PendingAction = "save" | "sync" | null;

export function ItemDetailModal({
  item,
  onClose,
  onDelete,
  onEdit,
  onSyncISDN,
}: ItemDetailModalProps) {
  const [mode, setMode] = useState<ModalMode>("detail");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [errors, setErrors] = useState<RequiredFieldErrors>({});
  const [failure, setFailure] = useState<string>();
  const [displayItem, setDisplayItem] = useState<Item>(item);
  const itemIsISDN = isISDN(item.item_id);
  const toFormData = (sourceItem: Item): NewItem => ({
    product_name: sourceItem.product_name,
    publisher_name: sourceItem.publisher_name,
    class: sourceItem.class,
    type: sourceItem.type,
    genre_code: sourceItem.genre_code,
    price: sourceItem.price,
    sample_image_url: sourceItem.sample_image_url,
  });
  const [formData, setFormData] = useState<NewItem>(toFormData(item));

  const updateFormField = <K extends keyof NewItem>(
    field: K,
    value: NewItem[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = async () => {
    const requiredErrors = validateRequired(formData);
    setErrors(requiredErrors);
    if (Object.keys(requiredErrors).length > 0) return;

    setFailure(undefined);
    setPendingAction("save");
    try {
      const result = await onEdit(item.item_id, formData);
      if (result.ok) {
        const updatedItem: Item = {
          ...displayItem,
          ...formData,
        };
        setDisplayItem(updatedItem);
        setFormData(toFormData(updatedItem));
        setMode("detail");
      } else {
        setFailure(
          result.storageFull
            ? STORAGE_FULL_MESSAGE
            : "商品を保存できませんでした。通信状態を確認して、もう一度保存してください。",
        );
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleCancelEdit = () => {
    setErrors({});
    setFailure(undefined);
    setFormData(toFormData(displayItem));
    setMode("detail");
  };

  const handleSyncISDN = async () => {
    setFailure(undefined);
    setPendingAction("sync");
    const result = await onSyncISDN(item.item_id);
    setPendingAction(null);
    if (result.ok) {
      setDisplayItem(result.value);
      setFormData(toFormData(result.value));
    } else {
      setFailure(
        result.storageFull
          ? STORAGE_FULL_MESSAGE
          : "商品の情報を取得できませんでした。通信状態を確認して、もう一度取得してください。",
      );
    }
  };

  const handleStartEdit = () => {
    setFormData(toFormData(displayItem));
    setErrors({});
    setFailure(undefined);
    setMode("edit");
  };

  const handleDelete = () => {
    onDelete(item.item_id);
    onClose();
  };

  const footer =
    mode === "edit" ? (
      <>
        <Button onClick={handleCancelEdit} disabled={pendingAction === "save"}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={pendingAction === "save"}
        >
          保存
        </Button>
      </>
    ) : (
      <>
        {itemIsISDN && (
          <Button
            className="whitespace-nowrap"
            onClick={handleSyncISDN}
            loading={pendingAction === "sync"}
          >
            ISDNから取得
          </Button>
        )}
        <Button variant="primary" onClick={handleStartEdit}>
          編集
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          削除
        </Button>
      </>
    );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={mode === "edit" ? "商品編集" : "商品詳細"}
      initialFocus={mode === "edit" ? "content" : "title"}
      size="md"
      footer={footer}
      failure={failure}
      onFailureClose={() => setFailure(undefined)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {displayItem.sample_image_url && (
          <div className="bg-muted flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-md p-2 sm:h-auto sm:w-40">
            <img
              src={displayItem.sample_image_url}
              alt={displayItem.product_name}
              className="h-full w-auto object-contain"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {mode === "edit" ? (
            <div className="flex flex-col gap-4">
              <Field label="商品名" required error={errors.product_name}>
                <Input
                  value={formData.product_name}
                  onChange={(e) =>
                    updateFormField("product_name", e.target.value)
                  }
                  placeholder="商品名を入力"
                />
              </Field>
              <Field label="サークル" required error={errors.publisher_name}>
                <Input
                  value={formData.publisher_name}
                  onChange={(e) =>
                    updateFormField("publisher_name", e.target.value)
                  }
                  placeholder="サークルを入力"
                />
              </Field>
              <Field label="分類" required error={errors.class}>
                <Select
                  value={formData.class}
                  onChange={(e) => updateFormField("class", e.target.value)}
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
              <Field label="種類" required error={errors.type}>
                <Select
                  value={formData.type}
                  onChange={(e) => updateFormField("type", e.target.value)}
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
              <Field label="ジャンルコード">
                <Input
                  value={formData.genre_code || ""}
                  onChange={(e) =>
                    updateFormField("genre_code", e.target.value)
                  }
                  placeholder="ジャンルコードを入力"
                />
              </Field>
              <Field label="価格" controlId="edit-item-price">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">¥</span>
                  <Input
                    id="edit-item-price"
                    type="number"
                    value={formData.price?.toString() || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const parsedPrice = parsePriceInput(value);
                      if (value.trim() === "" || parsedPrice !== undefined) {
                        updateFormField("price", parsedPrice);
                      }
                    }}
                    onKeyDown={blockMinusInput}
                    placeholder="価格を入力"
                  />
                </div>
              </Field>
              <Field label="サンプル画像URL">
                <Input
                  value={formData.sample_image_url || ""}
                  onChange={(e) =>
                    updateFormField("sample_image_url", e.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-sm font-bold">
                  商品名
                </p>
                <p className="text-base">{displayItem.product_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-bold">
                  商品ID
                </p>
                <p className="text-base">{displayItem.item_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-bold">
                  サークル
                </p>
                <p className="text-base">{displayItem.publisher_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-bold">分類</p>
                <p className="text-base">{displayItem.class}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-bold">種類</p>
                <p className="text-base">{displayItem.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-bold">
                  ジャンルコード
                </p>
                <p className="text-base">{displayItem.genre_code || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-bold">価格</p>
                <p className="text-base">
                  {displayItem.price ? formatYen(displayItem.price) : "-"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
