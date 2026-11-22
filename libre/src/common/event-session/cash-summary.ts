import type {
  CashAdjustment,
  CashCount,
  Transaction,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { cashAdjustmentAmount, cashCountAmount } from "./change-review";

type SaleView = Pick<Transaction, "cancelled"> & {
  items: Pick<Transaction["items"][number], "price" | "quantity">[];
};

/**
 * 取り消していない会計の、販売時の価格 × 数量の合計を返す。
 *
 * @param transactions 会計
 * @returns 販売の合計の金額（円）
 */
export const salesTotal = (transactions: SaleView[]): number =>
  transactions
    .filter((t) => !t.cancelled)
    .reduce(
      (sum, t) => sum + t.items.reduce((s, i) => s + i.price * i.quantity, 0),
      0,
    );

/**
 * レジ金の出し入れの金額（入れた金額 − 出した金額）の合計を返す。
 *
 * @param adjustments レジ金の出し入れ
 * @returns 金額（円）
 */
export const cashAdjustmentsTotal = (adjustments: CashAdjustment[]): number =>
  adjustments.reduce((sum, a) => sum + cashAdjustmentAmount(a), 0);

/**
 * レジ金の差（`cashDifference`）を返す。
 * （終了時のレジ金 − 開始時のレジ金 − レジ金の出し入れの合計）− 販売の合計。
 *
 * @returns 開始時か終了時のレジ金がなければ null
 */
export const cashDifference = ({
  openingCash,
  closingCash,
  cashAdjustments,
  transactions,
}: {
  openingCash: CashCount | null;
  closingCash: CashCount | null;
  cashAdjustments: CashAdjustment[];
  transactions: SaleView[];
}): number | null =>
  openingCash === null || closingCash === null
    ? null
    : cashCountAmount(closingCash) -
      cashCountAmount(openingCash) -
      cashAdjustmentsTotal(cashAdjustments) -
      salesTotal(transactions);
