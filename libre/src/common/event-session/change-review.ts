import type {
  CashAdjustment,
  CashCount,
  DenominationCounts,
  EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { parseSessionTime } from "./session-time";

export type DenominationKey = keyof DenominationCounts;

/** 金種の金額（円） */
export const DENOMINATION_VALUES: Record<DenominationKey, number> = {
  "100yen": 100,
  "500yen": 500,
  "1000yen": 1000,
  "2000yen": 2000,
  "5000yen": 5000,
  "10000yen": 10000,
};

/** お釣りに使う金種。大きい順に並べる。2000 円札と 10000 円札は使わない */
const CHANGE_DENOMINATIONS: readonly DenominationKey[] = [
  "5000yen",
  "1000yen",
  "500yen",
  "100yen",
];

/**
 * 金種ごとの値から 6 つの金種の枚数を作る。
 *
 * @param f 金種を受け取り、その金種の値を返す関数
 * @returns 6 つの金種すべてを持つ枚数
 */
const mapCounts = (f: (key: DenominationKey) => number): DenominationCounts => ({
  "100yen": f("100yen"),
  "500yen": f("500yen"),
  "1000yen": f("1000yen"),
  "2000yen": f("2000yen"),
  "5000yen": f("5000yen"),
  "10000yen": f("10000yen"),
});

/**
 * 金種ごとの枚数の金額の合計を返す。
 *
 * @param counts 金種ごとの枚数
 * @returns 金額（円）
 */
export const denominationCountsAmount = (counts: DenominationCounts): number =>
  (Object.keys(DENOMINATION_VALUES) as DenominationKey[]).reduce(
    (sum, key) => sum + counts[key] * DENOMINATION_VALUES[key],
    0,
  );

/**
 * 数えたレジ金の合計の金額を返す。`other`（1、5、10、50 円の合計の金額）を含む。
 *
 * @param cash 数えたレジ金
 * @returns 金額（円）
 */
export const cashCountAmount = (cash: CashCount): number =>
  denominationCountsAmount(cash.counts) + cash.other;

/**
 * レジ金の出し入れの金額を返す。入れた金額が正、出した金額が負になる。
 *
 * @param adjustment レジ金の出し入れ
 * @returns 金額（円）
 */
export const cashAdjustmentAmount = (adjustment: CashAdjustment): number =>
  denominationCountsAmount(adjustment.cashIn) -
  denominationCountsAmount(adjustment.cashOut);

/**
 * お釣りの金額を、5000、1000、500、100 円の順に大きい金種からできるだけ多く割り当てた枚数を返す。
 * 100 円に満たない端数は割り当てない。
 *
 * @param amount お釣りの金額（円）
 * @returns 金種ごとの枚数
 */
export const breakChange = (amount: number): DenominationCounts =>
  CHANGE_DENOMINATIONS.reduce<{ rest: number; counts: DenominationCounts }>(
    (acc, key) => {
      const value = DENOMINATION_VALUES[key];
      return {
        rest: acc.rest % value,
        counts: { ...acc.counts, [key]: Math.floor(acc.rest / value) },
      };
    },
    { rest: amount, counts: mapCounts(() => 0) },
  ).counts;

/** 枚数が最も少なくなったとき。開始時なら occurredAt は null */
export type ChangeLowest = {
  count: number;
  occurredAt: number | null;
};

/** 枚数の移り変わり（2）。「なし」は belowZeroAt が null */
export type ChangeTrend = {
  lowest: ChangeLowest;
  belowZeroAt: number | null;
};

/** 終了時の枚数の突き合わせ（3） */
export type ChangeReconciliation = {
  recorded: number;
  counted: number;
  difference: number;
};

/** 金種ごとの振り返りの結果。値がないときは null（開始時のレジ金がなければ 2〜4、終了時のレジ金がなければ 3、4。1 と 5 は常に出る） */
export type DenominationReview = {
  requiredAtOpening: number;
  trend: ChangeTrend | null;
  reconciliation: ChangeReconciliation | null;
  changeCount: number | null;
  /** 受け取った枚数（5）。レジ金の有無によらず出せる */
  tenderedCount: number;
};

/**
 * お釣りの振り返りに使う、セッションの項目。
 * 結果画面の 2026-11-15 のセッションは時刻が timestamp（ms）なので、文字列と数値のどちらも受け取る。
 */
type ReviewSession = Pick<EventSessionV20261121, "openingCash" | "closingCash"> & {
  cashAdjustments: (Omit<CashAdjustment, "occurredAt"> & {
    occurredAt: string | number;
  })[];
  transactions: (Pick<
    EventSessionV20261121["transactions"][number],
    "cancelled" | "tendered" | "changeAmount"
  > & {
    occurredAt: string | number;
  })[];
};

const toMillis = (occurredAt: string | number): number =>
  typeof occurredAt === "number" ? occurredAt : parseSessionTime(occurredAt);

/** 会計とレジ金の出し入れを 1 件にまとめた、時刻付きの枚数の増減 */
type Movement = {
  kind: "transaction" | "adjustment";
  occurredAt: number;
  delta: DenominationCounts;
};

/** 同じ時刻のとき、レジ金の出し入れを会計より先にする */
const KIND_RANK: Record<Movement["kind"], number> = {
  adjustment: 0,
  transaction: 1,
};

/**
 * 取り消していない会計と、レジ金の出し入れを時刻順に並べる。
 * 同じ時刻の中では、セッションの配列の順を保つ（sort は安定）。
 *
 * @param session セッション
 * @returns 時刻順の増減の列
 */
const sortedMovements = (session: ReviewSession): Movement[] => {
  const adjustments: Movement[] = session.cashAdjustments.map((adjustment) => ({
    kind: "adjustment",
    occurredAt: toMillis(adjustment.occurredAt),
    delta: mapCounts(
      (key) => adjustment.cashIn[key] - adjustment.cashOut[key],
    ),
  }));
  const transactions: Movement[] = session.transactions
    .filter((transaction) => !transaction.cancelled)
    .map((transaction) => {
      const change = breakChange(transaction.changeAmount);
      return {
        kind: "transaction",
        occurredAt: toMillis(transaction.occurredAt),
        delta: mapCounts((key) => transaction.tendered[key] - change[key]),
      };
    });
  return [...adjustments, ...transactions].sort(
    (a, b) =>
      a.occurredAt - b.occurredAt || KIND_RANK[a.kind] - KIND_RANK[b.kind],
  );
};

/**
 * 1 つの金種について、開始時の枚数から増減を順にたどる。
 *
 * @param start 開始時の枚数
 * @param movements 時刻順の増減の列
 * @param key 金種
 * @returns たどり終えたときの枚数と、いちばん少なかったときと 0 枚を下回った最初の時刻
 */
const walkCount = (
  start: number,
  movements: Movement[],
  key: DenominationKey,
): { end: number; trend: ChangeTrend } =>
  movements.reduce<{ end: number; trend: ChangeTrend }>(
    (acc, movement) => {
      const count = acc.end + movement.delta[key];
      return {
        end: count,
        trend: {
          lowest:
            count < acc.trend.lowest.count
              ? { count, occurredAt: movement.occurredAt }
              : acc.trend.lowest,
          belowZeroAt:
            acc.trend.belowZeroAt === null && count < 0
              ? movement.occurredAt
              : acc.trend.belowZeroAt,
        },
      };
    },
    {
      end: start,
      trend: {
        lowest: { count: start, occurredAt: null },
        belowZeroAt: null,
      },
    },
  );

/**
 * 1 つの金種について、会計だけを順にたどって必要な開始時の枚数を求める。
 *
 * @param movements 時刻順の増減の列（レジ金の出し入れも含む）
 * @param key 金種
 * @returns 両替なしで足りるために開始時に要った枚数
 */
const requiredAtOpening = (
  movements: Movement[],
  key: DenominationKey,
): number => {
  const { lowest } = movements
    .filter((movement) => movement.kind === "transaction")
    .reduce<{ running: number; lowest: number }>(
      (acc, movement) => {
        const running = acc.running + movement.delta[key];
        return { running, lowest: Math.min(acc.lowest, running) };
      },
      { running: 0, lowest: 0 },
    );
  return Math.max(0, -lowest);
};

/**
 * セッションのお釣りの振り返りを金種ごとに計算する。
 * 文言や時刻の書式は返さず、画面が表示する。
 *
 * @param session 振り返るセッション。`openingCash` が null なら 2〜4、`closingCash` が null なら 3 と 4 を null にする
 * @returns 金種ごとの振り返りの結果
 */
export const reviewChange = (
  session: ReviewSession,
): Record<DenominationKey, DenominationReview> => {
  const movements = sortedMovements(session);
  const activeTransactions = session.transactions.filter(
    (transaction) => !transaction.cancelled,
  );

  const reviewDenomination = (key: DenominationKey): DenominationReview => {
    const opening = session.openingCash;
    const closing = session.closingCash;
    const walked =
      opening === null
        ? null
        : walkCount(opening.counts[key], movements, key);

    const tendered = activeTransactions.reduce(
      (sum, transaction) => sum + transaction.tendered[key],
      0,
    );
    const cashIn = session.cashAdjustments.reduce(
      (sum, adjustment) => sum + adjustment.cashIn[key],
      0,
    );
    const cashOut = session.cashAdjustments.reduce(
      (sum, adjustment) => sum + adjustment.cashOut[key],
      0,
    );

    return {
      tenderedCount: tendered,
      requiredAtOpening: requiredAtOpening(movements, key),
      trend: walked === null ? null : walked.trend,
      reconciliation:
        walked === null || closing === null
          ? null
          : {
              recorded: walked.end,
              counted: closing.counts[key],
              difference: closing.counts[key] - walked.end,
            },
      changeCount:
        opening === null || closing === null
          ? null
          : opening.counts[key] + tendered + cashIn - cashOut - closing.counts[key],
    };
  };

  return {
    "100yen": reviewDenomination("100yen"),
    "500yen": reviewDenomination("500yen"),
    "1000yen": reviewDenomination("1000yen"),
    "2000yen": reviewDenomination("2000yen"),
    "5000yen": reviewDenomination("5000yen"),
    "10000yen": reviewDenomination("10000yen"),
  };
};
