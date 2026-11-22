import { z } from "zod";

// ヘルパー: XMLでは空文字や存在しない要素の扱いが難しいため、
// stringを基本にしつつ数値や日付に変換(coerce)します。
// const dateSchema = z.coerce.date();
const numberSchema = z.coerce.number();
// 必須の項目は、空白だけの値も失敗にする
const nonBlankStringSchema = z.string().refine((s) => s.trim() !== "");

// useroption 要素
// const UserOptionSchema = z.object({
//   property: z.string(),
//   value: z.string(),
// });

// external-link 要素
// const ExternalLinkSchema = z.object({
//   title: z.string().optional(),
//   uri: z.url(),
// });

// item 要素
const ItemSchema = z.object({
  // 属性はデフォルトで @_ がつく
  "@_key": z.string().optional(),

  // region: z.string(),
  class: nonBlankStringSchema,
  type: nonBlankStringSchema,
  // rating_gender: z.string(),
  // rating_age: z.string(),
  "product-name": nonBlankStringSchema,
  // "product-yomi": z.string().optional(),
  // "publisher-code": z.string(),
  "publisher-name": nonBlankStringSchema,
  // "publisher-yomi": z.string().optional(),
  // "issue-date": dateSchema,
  "genre-code": z.string().optional(),
  // "genre-name": z.string().optional(),
  // "genre-user": z.string().optional(),
  // "c-code": z.string().optional(),
  // author: z.string().optional(),
  // shape: z.string().optional(),
  // contents: z.string().optional(),
  price: numberSchema.optional(),
  // "price-unit": z.string().optional(),
  // barcode2: z.string().optional(),
  // "product-comment": z.string().optional(),
  // "product-style": z.string().optional(),
  // "product-size": z.string().optional(),
  // "product-capacity": numberSchema.optional(),
  // "product-capacity-unit": z.string().optional(),
  // URL の形でなければ（空も含む）失敗にせず、値を持たないものとして扱う
  "sample-image-uri": z.url().optional().catch(undefined),

  // 複数出現する可能性がある要素は z.array にする
  // fast-xml-parserの設定で常に配列化するようにする
  // useroption: z.array(UserOptionSchema).default([]),
  // "external-link": z.array(ExternalLinkSchema).default([]),
});

// ルート要素 isdn
export const IsdnRootSchema = z.object({
  isdn: z.object({
    item: ItemSchema,
  }),
});

export type IsdnData = z.infer<typeof IsdnRootSchema>;
