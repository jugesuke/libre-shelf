import type { CashCount, EventSessionV20261121 } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { DENOMINATION_KEYS, emptyCounts } from "./cash-form";
import {
  reviewChange,
  type ChangeReconciliation,
  type DenominationKey,
} from "./change-review";

/** 入力欄の行に出す、記録と差の表示文字列。値がないときは両方とも「—」 */
export type ReconciliationCells = {
  recorded: string;
  difference: string;
  /** 差が 0 でない。行の背景を色付けする */
  mismatch: boolean;
};

const NONE = "—";

/**
 * 差を符号付きの文字列にする。0 は「±0」にする。
 *
 * @param difference 数えた枚数 − 記録から求めた枚数
 */
const formatDifference = (difference: number): string => {
  if (difference === 0) return "±0";
  return difference > 0 ? `+${difference}` : `${difference}`;
};

/**
 * 金種 1 つ分の突き合わせを、行に出す文字列にする。
 *
 * @param r 突き合わせの結果。null なら「—」
 */
export const reconciliationCells = (
  r: ChangeReconciliation | null,
): ReconciliationCells =>
  r === null
    ? { recorded: NONE, difference: NONE, mismatch: false }
    : {
        recorded: `${r.recorded} 枚`,
        difference: formatDifference(r.difference),
        mismatch: r.difference !== 0,
      };

/**
 * 当日終了処理の入力欄に出す、金種ごとの突き合わせを求める。
 * 終了時のレジ金がまだなければ、入力していない欄を 0 枚として計算する。
 *
 * @param session 突き合わせるセッション
 * @param closingCash 入力中の終了時のレジ金。null なら 0 枚として扱う
 * @returns 金種ごとの突き合わせ。開始時のレジ金がなければ、すべて null
 */
export const reconciliationForClosing = (
  session: EventSessionV20261121,
  closingCash: CashCount | null,
): Record<DenominationKey, ChangeReconciliation | null> => {
  const review = reviewChange({
    ...session,
    closingCash: closingCash ?? { counts: emptyCounts(), other: 0 },
  });
  return Object.fromEntries(
    DENOMINATION_KEYS.map((key) => [key, review[key].reconciliation]),
  ) as Record<DenominationKey, ChangeReconciliation | null>;
};
