import { isISDN, validateItemID } from "@libre-shared/entity/items/item_id";
import { z } from "@hono/zod-openapi";

export const itemIDPayload = z.stringFormat("item_id", validateItemID).openapi({
  description: "商品のID",
  example: "2784702901978",
});

export const isdnItemIDPayload = z
  .stringFormat("isdn_item_id", isISDN)
  .openapi({
    description: "ISDN形式の商品のID",
    example: "2784702901978",
  });

export const newItemPayload = z.object({
  product_name: z.string().openapi({ example: "みほん同人誌" }),
  publisher_name: z.string().openapi({ example: "見本サークル" }),
  class: z.string().openapi({ example: "オリジナル" }),
  type: z.string().openapi({ example: "同人誌" }),
  genre_code: z.string().optional().nullable().openapi({ example: "106" }),
  price: z.number().optional().nullable().openapi({ example: 100 }),
  sample_image_url: z
    .string()
    .optional()
    .nullable()
    .openapi({ example: "https://isdn.jp/images/thumbs/2784702901978.png" }),
});

export const itemPayload = newItemPayload.and(
  z.object({
    item_id: itemIDPayload,
  }),
);
