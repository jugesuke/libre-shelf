import { z } from "zod";
import { EventSessionV20261121Schema, ItemQuantitySchema } from "./event-session";

/**
 * Libre Shelf のセッション。共通のセッションに、即売会の名前と、自サークルの頒布物の持ち込み予定数を足したもの。
 * 仕様は docs/spec/即売会/セッションのデータ.md
 */
export const LibreEventSessionSchema = EventSessionV20261121Schema.extend({
  eventName: z.string(), // 即売会の名前。前日準備で入力する
  plannedStock: z.array(ItemQuantitySchema), // 自サークルの頒布物の持ち込み予定数
});
export type LibreEventSession = z.infer<typeof LibreEventSessionSchema>;
