import { formatDenomination, formatTime } from "@libre/common/format";
import type { EventSessionV20261121 } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { DENOMINATION_KEYS } from "@libre/common/event-session/cash-form";
import {
  DENOMINATION_VALUES,
  reviewChange,
  type DenominationKey,
} from "@libre/common/event-session/change-review";

/** 金種ごとのまとめの表の 1 行（金種 1 つ分）。値はすべて表示する文字列 */
export type ChangeSummaryRow = {
  label: string;
  opening: string;
  tendered: string;
  changeCount: string;
  required: string;
  /** 記録と数えた枚数の差が 0 でない。行の背景を色付けする */
  mismatch: boolean;
};

/** 結果画面のお釣りの振り返りの表示内容。値はすべて表示する文字列 */
export type ChangeReviewView = {
  conclusion: string[];
  rows: ChangeSummaryRow[];
  mismatches: string[];
};

const NONE = "—";

/**
 * 結果画面のお釣りの振り返りの表示内容を作る。
 * 値がないものは「—」にする。
 *
 * @param session 結果を表示するセッション
 * @returns 結論の行、金種ごとのまとめの行（金種の小さい順）、記録と合わなかった金種の行
 */
export const buildChangeReview = (
  session: EventSessionV20261121,
): ChangeReviewView => {
  const review = reviewChange(session);
  const label = (key: DenominationKey) =>
    formatDenomination(DENOMINATION_VALUES[key]);

  const shortages = DENOMINATION_KEYS.flatMap((key) => {
    const belowZeroAt = review[key].trend?.belowZeroAt ?? null;
    return belowZeroAt === null ? [] : [{ key, belowZeroAt }];
  }).sort(
    (a, b) =>
      a.belowZeroAt - b.belowZeroAt ||
      DENOMINATION_VALUES[a.key] - DENOMINATION_VALUES[b.key],
  );

  const conclusion =
    session.openingCash === null
      ? ["開始時のレジ金がないため、足りたかは分かりません"]
      : shortages.length === 0
        ? ["お釣りは足りました"]
        : shortages.map(
            ({ key, belowZeroAt }) =>
              `${label(key)}が ${formatTime(new Date(belowZeroAt).toISOString())} に足りなくなりました`,
          );

  const mismatchKeys = DENOMINATION_KEYS.filter((key) => {
    const { reconciliation } = review[key];
    return reconciliation !== null && reconciliation.difference !== 0;
  });

  return {
    conclusion,
    rows: DENOMINATION_KEYS.map((key) => ({
      label: label(key),
      opening: session.openingCash
        ? String(session.openingCash.counts[key])
        : NONE,
      tendered: String(review[key].tenderedCount),
      changeCount:
        review[key].changeCount === null ? NONE : String(review[key].changeCount),
      required: String(review[key].requiredAtOpening),
      mismatch: mismatchKeys.includes(key),
    })),
    mismatches: mismatchKeys.flatMap((key) => {
      const { reconciliation } = review[key];
      return reconciliation === null
        ? []
        : [
            `${label(key)}: 記録 ${reconciliation.recorded} 枚、数えた ${reconciliation.counted} 枚`,
          ];
    }),
  };
};
