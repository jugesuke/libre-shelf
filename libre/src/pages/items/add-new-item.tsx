import type { Item, NewItem } from "@libre-shared/entity/items/item";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Field } from "@shelf/ui/components/field";
import { Input } from "@shelf/ui/components/input";
import { Select } from "@shelf/ui/components/select";
import { useRepositories } from "@libre/data/repositories-context";
import { useCallback, useState } from "react";
import {
  blockMinusInput,
  INITIAL_FORM_DATA,
  CLASS_OPTIONS,
  parsePriceInput,
  type RequiredFieldErrors,
  validateRequired,
  TYPE_OPTIONS,
} from "./constants";
import { failureMessage } from "./write-failure";

interface AddNewItemProps {
  /** 商品を足せたあとに呼ぶ。足した商品を渡す */
  onSubmit: (item: Item) => void | Promise<void>;
  /** 「追加」のボタンの種類。主要な操作が別にあるダイアログでは secondary にする */
  addButtonVariant?: "primary" | "secondary";
}

export function AddNewItem({ onSubmit, addButtonVariant = "primary" }: AddNewItemProps) {
  const repos = useRepositories();
  const [formData, setFormData] = useState<NewItem>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<RequiredFieldErrors>({});
  const [failure, setFailure] = useState<string>();

  const updateFormField = <K extends keyof NewItem>(
    field: K,
    value: NewItem[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submitForm = useCallback(async () => {
    const requiredErrors = validateRequired(formData);
    setErrors(requiredErrors);
    if (Object.keys(requiredErrors).length > 0) return;

    setFailure(undefined);
    setIsSubmitting(true);

    try {
      const res = await repos.items.add({
        ...formData,
        price: formData.price,
        genre_code: formData.genre_code || undefined,
        sample_image_url: formData.sample_image_url || undefined,
      });

      if (!res.ok) {
        console.error("Failed to add item:", res.detail);
        setFailure(
          failureMessage(
            res.status,
            "商品を追加できませんでした。通信状態を確認して、もう一度追加してください。",
          ),
        );
        return;
      }

      setFormData(INITIAL_FORM_DATA);
      await onSubmit(res.value);
    } catch (error) {
      console.error("Failed to add item:", error);
      setFailure(
        "商品を追加できませんでした。通信状態を確認して、もう一度追加してください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit]);

  const handleSubmit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    submitForm();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="商品名" required error={errors.product_name}>
        <Input
          value={formData.product_name}
          onChange={(e) => updateFormField("product_name", e.target.value)}
          placeholder="商品名を入力"
        />
      </Field>
      <Field label="サークル" required error={errors.publisher_name}>
        <Input
          value={formData.publisher_name}
          onChange={(e) => updateFormField("publisher_name", e.target.value)}
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
          onChange={(e) => updateFormField("genre_code", e.target.value)}
          placeholder="ジャンルコードを入力"
        />
      </Field>
      <Field label="価格" controlId="add-item-price">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">¥</span>
          <Input
            id="add-item-price"
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
          onChange={(e) => updateFormField("sample_image_url", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </Field>

      <div className="flex min-h-14 items-center justify-end gap-3">
        {failure && (
          <Alert variant="destructive" className="flex-1">
            {failure}
          </Alert>
        )}
        <Button
          variant={addButtonVariant}
          onClick={handleSubmit}
          loading={isSubmitting}
        >
          追加
        </Button>
      </div>
    </form>
  );
}
