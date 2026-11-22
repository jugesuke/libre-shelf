import { z } from "zod";

// フェーズ
export const EventSessionPhaseSchema = z.enum([
  "preparation", // 前日準備
  "opening", // 当日開始処理
  "register", // レジ
  "closing", // 当日終了処理
  "done", // イベント終了
]);
export type EventSessionPhase = z.infer<typeof EventSessionPhaseSchema>;

// 共通型
export const ItemQuantitySchema = z.object({
  itemId: z.string(),
  quantity: z.number(),
});
export type ItemQuantity = z.infer<typeof ItemQuantitySchema>;

// 時刻を伴う数量（見本誌提出・展示見本用）
// occurredAt は ISO 8601 形式。stock_movements の occurred_at にそのまま渡せる
export const ItemQuantityWithTimeSchema = z.object({
  itemId: z.string(),
  quantity: z.number(),
  occurredAt: z.string(),
});
export type ItemQuantityWithTime = z.infer<typeof ItemQuantityWithTimeSchema>;

export const ItemDifferenceSchema = z.object({
  itemId: z.string(),
  difference: z.number(),
});
export type ItemDifference = z.infer<typeof ItemDifferenceSchema>;

export const MenuEntrySchema = z.object({
  itemId: z.string(),
  price: z.number(), // このイベントでの頒布価格
  consignorName: z.string().optional(), // 委託元名。設定されていれば委託物、未設定なら自サークル頒布物
  productName: z.string(), // 商品名。おしながきに足したときに商品マスタから写す
  publisherName: z.string(), // サークル（発行者名）。同じく写す
});
export type MenuEntry = z.infer<typeof MenuEntrySchema>;

/**
 * おしながきの1エントリが委託物かどうかを判定する。
 * consignorName を trim した結果が空文字でない場合に委託物とみなす（空白のみの入力は自サークル頒布物として扱う）。
 */
export function isConsignedItem<E extends Pick<MenuEntry, "consignorName">>(
  entry: E,
): entry is E & { consignorName: string } {
  return entry.consignorName !== undefined && entry.consignorName.trim() !== "";
}

// 金種ごとの枚数。6 つのキーをすべて持ち、0 以上の整数を入れる
// 1、5、10、50 円は金種ごとには扱わない
export const DenominationCountsSchema = z.object({
  "100yen": z.number().int().min(0),
  "500yen": z.number().int().min(0),
  "1000yen": z.number().int().min(0),
  "2000yen": z.number().int().min(0),
  "5000yen": z.number().int().min(0),
  "10000yen": z.number().int().min(0),
});
export type DenominationCounts = z.infer<typeof DenominationCountsSchema>;

// 数えたレジ金
export const CashCountSchema = z.object({
  counts: DenominationCountsSchema,
  other: z.number().int().min(0), // 1、5、10、50 円の硬貨の合計の金額
});
export type CashCount = z.infer<typeof CashCountSchema>;

export const CashAdjustmentSchema = z.object({
  occurredAt: z.string(), // 時差付きの ISO 8601（秒まで）。書き方は docs/spec/即売会/セッションのデータ.md の「時刻の書き方」
  cashIn: DenominationCountsSchema, // レジに入れた枚数
  cashOut: DenominationCountsSchema, // レジから出した枚数
  comment: z.string(),
});
export type CashAdjustment = z.infer<typeof CashAdjustmentSchema>;

export const TransactionItemSchema = z.object({
  itemId: z.string(),
  price: z.number(), // 販売価格（この時点で固定）
  quantity: z.number(),
  productName: z.string(), // 販売したときの商品名。会計を確定したときにおしながきから写す
});
export type TransactionItem = z.infer<typeof TransactionItemSchema>;

export const TransactionSchema = z.object({
  transactionId: z.string(), // UUID
  occurredAt: z.string(), // 時差付きの ISO 8601（秒まで）。書き方は docs/spec/即売会/セッションのデータ.md の「時刻の書き方」
  buyerType: z.enum(["acquaintance", "stranger"]),
  items: z.array(TransactionItemSchema),
  tendered: DenominationCountsSchema, // 預かった硬貨と紙幣の枚数。レジの積み上げのボタンを押した回数
  changeAmount: z.number(), // お釣りの金額
  cancelled: z.boolean(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const VisitorLogSchema = z.object({
  occurredAt: z.string(), // 時差付きの ISO 8601（秒まで）。書き方は docs/spec/即売会/セッションのデータ.md の「時刻の書き方」
});
export type VisitorLog = z.infer<typeof VisitorLogSchema>;

export const EventSessionV20261121Schema = z.object({
  // メタ情報
  schemaVersion: z.string(), // YYYY-MM-DD 形式。スキーマバージョン管理用
  eventDate: z.string(), // YYYY-MM-DD（開始日）

  // 現在のフェーズ
  phase: EventSessionPhaseSchema,

  // おしながき（前日準備で登録・レジ中に編集可能）
  menu: z.array(MenuEntrySchema),

  // 開始時の状態（当日開始処理で入力）
  openingCash: CashCountSchema.nullable(), // 開始時レジ金
  cashAdjustments: z.array(CashAdjustmentSchema),

  // 持ち込み在庫（当日開始処理での実カウント。開催途中の追加受領分の手修正を含む累計）
  openingStock: z.array(ItemQuantitySchema),

  // 委託物の預かり部数（受け取り時にカウントした部数。前日準備・商品・価格編集で入力）
  consignedStock: z.array(ItemQuantitySchema),

  // 見本誌・展示見本（入力時刻を保存。stock_movements への登録は〆時に一括で行う）
  sampleSubmissions: z.array(ItemQuantityWithTimeSchema), // 準備会提出分 (deposit)
  displaySamples: z.array(ItemQuantityWithTimeSchema), // 卓上見本用 (gift)

  // 販売トランザクション
  transactions: z.array(TransactionSchema),

  // 来場者カウント
  visitorLogs: z.array(VisitorLogSchema),

  // 〆作業情報
  closingStock: z.array(ItemQuantitySchema).nullable(),
  closingCash: CashCountSchema.nullable(),

  // 差異
  stockDifference: z.array(ItemDifferenceSchema).nullable(),
  cashDifference: z.number().nullable(), // 合計の金額の差

  // 状態
  settled: z.boolean(), // サーバーアップロード完了したか
});
export type EventSessionV20261121 = z.infer<typeof EventSessionV20261121Schema>;
