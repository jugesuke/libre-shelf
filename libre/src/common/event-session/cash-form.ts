import { formatDenomination } from "@libre/common/format";
import type {
  CashAdjustment,
  CashCount,
  DenominationCounts,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  DENOMINATION_VALUES,
  cashCountAmount,
  type DenominationKey,
} from "./change-review";

/** 金種を小さい順に並べたもの。画面の並びは、これを必要に応じて並べ替えて作る */
export const DENOMINATION_KEYS: readonly DenominationKey[] = [
  "100yen",
  "500yen",
  "1000yen",
  "2000yen",
  "5000yen",
  "10000yen",
];

/** 金種ごとの入力欄の文字列 */
export type DenominationFields = Record<DenominationKey, string>;

/** レジ金の入力欄の文字列 */
export type CashCountFields = { counts: DenominationFields; other: string };

/** レジ金の出し入れの入力欄の文字列 */
export type CashAdjustmentFields = {
  cashIn: DenominationFields;
  cashOut: DenominationFields;
  comment: string;
};

/**
 * 6 つの金種すべてに同じ値を入れたオブジェクトを作る。
 *
 * @param value 各金種に入れる値
 * @returns 金種をキーにしたオブジェクト
 */
const fillDenominations = <T>(value: T): Record<DenominationKey, T> => ({
  "100yen": value,
  "500yen": value,
  "1000yen": value,
  "2000yen": value,
  "5000yen": value,
  "10000yen": value,
});

/** どの金種も 0 枚の枚数を返す。 */
export const emptyCounts = (): DenominationCounts => fillDenominations(0);

/** どの欄も空の、金種ごとの入力欄を返す。 */
export const emptyDenominationFields = (): DenominationFields =>
  fillDenominations("");

/** 何も入力していない、レジ金の出し入れの入力欄を返す。 */
export const emptyCashAdjustmentFields = (): CashAdjustmentFields => ({
  cashIn: emptyDenominationFields(),
  cashOut: emptyDenominationFields(),
  comment: "",
});

/**
 * 入力欄の文字列を、0 以上の整数の枚数か金額にする。入力していない欄と、整数でない入力は 0 とする。
 *
 * @param text 入力欄の文字列
 * @returns 0 以上の整数
 */
export const parseCount = (text: string): number => {
  const n = Number(text);
  return text.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : 0;
};

/**
 * 預かった枚数に、押した金種を 1 枚足す。
 *
 * @param tendered 今の預かった枚数
 * @param key 押した金種
 * @returns 1 枚増やした枚数。引数は書き換えない
 */
export const addTendered = (
  tendered: DenominationCounts,
  key: DenominationKey,
): DenominationCounts => ({ ...tendered, [key]: tendered[key] + 1 });

/**
 * 金種ごとの入力欄の文字列を枚数にする。
 *
 * @param fields 入力欄の文字列
 * @returns 金種ごとの枚数
 */
export const countsFromFields = (
  fields: DenominationFields,
): DenominationCounts =>
  Object.fromEntries(
    DENOMINATION_KEYS.map((key) => [key, parseCount(fields[key])]),
  ) as DenominationCounts;

/**
 * 金種ごとの枚数を入力欄の文字列にする。0 枚の欄は空にする。
 *
 * @param counts 金種ごとの枚数
 * @returns 入力欄の文字列
 */
export const fieldsFromCounts = (
  counts: DenominationCounts,
): DenominationFields =>
  Object.fromEntries(
    DENOMINATION_KEYS.map((key) => [
      key,
      counts[key] > 0 ? String(counts[key]) : "",
    ]),
  ) as DenominationFields;

/**
 * レジ金の入力欄の文字列を、保存する値にする。
 *
 * @param fields 入力欄の文字列
 * @returns 合計が 0 円なら null（入力していないものとして扱う）
 */
export const cashCountFromFields = (
  fields: CashCountFields,
): CashCount | null => {
  const cash: CashCount = {
    counts: countsFromFields(fields.counts),
    other: parseCount(fields.other),
  };
  return cashCountAmount(cash) > 0 ? cash : null;
};

/**
 * 保存したレジ金を入力欄の文字列にする。
 *
 * @param cash 保存したレジ金。null なら空の欄
 * @returns 入力欄の文字列
 */
export const fieldsFromCashCount = (cash: CashCount | null): CashCountFields =>
  cash === null
    ? { counts: emptyDenominationFields(), other: "" }
    : {
        counts: fieldsFromCounts(cash.counts),
        other: cash.other > 0 ? String(cash.other) : "",
      };

/**
 * レジ金の出し入れの入力欄の文字列を、保存する値にする。
 *
 * @param fields 入力欄の文字列
 * @param occurredAt 記録した時刻（セッションの時刻の書き方）
 * @returns どの欄も 0 枚なら null（メモだけでは記録しない）
 */
export const cashAdjustmentFromFields = (
  fields: CashAdjustmentFields,
  occurredAt: string,
): CashAdjustment | null => {
  const cashIn = countsFromFields(fields.cashIn);
  const cashOut = countsFromFields(fields.cashOut);
  const hasCount = DENOMINATION_KEYS.some(
    (key) => cashIn[key] > 0 || cashOut[key] > 0,
  );
  return hasCount
    ? { occurredAt, cashIn, cashOut, comment: fields.comment }
    : null;
};

/**
 * 記録したレジ金の出し入れを入力欄の文字列に戻す。
 *
 * @param adjustment 記録した出し入れ
 * @returns 入力欄の文字列
 */
export const fieldsFromCashAdjustment = (
  adjustment: CashAdjustment,
): CashAdjustmentFields => ({
  cashIn: fieldsFromCounts(adjustment.cashIn),
  cashOut: fieldsFromCounts(adjustment.cashOut),
  comment: adjustment.comment,
});

/**
 * 金種ごとの枚数を、一覧に表示する文字列にする。0 枚の金種は含めない。
 *
 * @param counts 金種ごとの枚数
 * @returns 例: "100円玉 × 3、1,000円札 × 2"。どの金種も 0 枚なら "なし"
 */
export const formatDenominationCounts = (counts: DenominationCounts): string => {
  const parts = DENOMINATION_KEYS.filter((key) => counts[key] > 0).map(
    (key) => `${formatDenomination(DENOMINATION_VALUES[key])} × ${counts[key]}`,
  );
  return parts.length > 0 ? parts.join("、") : "なし";
};
