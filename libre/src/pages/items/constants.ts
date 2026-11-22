import type { NewItem } from "@libre-shared/entity/items/item";
import type { KeyboardEvent } from "react";

export const ISDN_LENGTH = 13;
export const ITEMS_LIMIT = 100;

export const CLASS_OPTIONS = ["オリジナル", "パロディ"] as const;

export const TYPE_OPTIONS = [
  "同人誌",
  "同人グッズ",
  "同人音楽",
  "同人ソフト",
  "同人ハード",
  "フィギュア・ドール",
  "衣装・アクセサリ",
  "フライヤー（ペーパー）",
  "イベントカタログ",
] as const;

export const INITIAL_FORM_DATA: NewItem = {
  product_name: "",
  publisher_name: "",
  class: "",
  type: "",
  genre_code: "",
  price: undefined,
  sample_image_url: "",
};

export const parsePriceInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
};

export const blockMinusInput = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "-") {
    e.preventDefault();
  }
};

export type RequiredFieldErrors = Partial<
  Record<"product_name" | "publisher_name" | "class" | "type", string>
>;

/** 商品の必須の欄を調べ、空の欄ごとに入力欄の下へ出す理由を返す。すべて入っていれば空のオブジェクト */
export const validateRequired = (data: NewItem): RequiredFieldErrors => ({
  ...(data.product_name.trim() ? {} : { product_name: "商品名を入力してください。" }),
  ...(data.publisher_name.trim() ? {} : { publisher_name: "サークルを入力してください。" }),
  ...(data.class.trim() ? {} : { class: "分類を選択してください。" }),
  ...(data.type.trim() ? {} : { type: "種類を選択してください。" }),
});
