import type { ItemDifference } from "@libre-shared/entity/event/v2026-11-21/event-session";

type GateState = {
  stockDifference: ItemDifference[] | null;
  hasUnsavedInput: boolean;
};

/** 在庫の確定が済んでいるか。`stockDifference` が空の配列のときだけ済んでいる。`null` は済んでいないものとして扱う。 */
export const isStockConfirmed = (stockDifference: ItemDifference[] | null): boolean =>
  stockDifference !== null && stockDifference.length === 0;

/**
 * 「履歴に保存」ボタンを押せるかを返す。在庫の確定が済んでいて、保存していない入力がないときだけ true。
 * 履歴に足すのは localStorage に保存したセッションで、画面の入力欄の値は足さないため。
 */
export const canSaveToHistory = ({ stockDifference, hasUnsavedInput }: GateState): boolean =>
  isStockConfirmed(stockDifference) && !hasUnsavedInput;

/** 「ファイルに書き出す」ボタンを押せるかを返す。在庫の確定が済んでいなくても押せるが、保存していない入力があるあいだは押せない。 */
export const canExportJson = ({ hasUnsavedInput }: { hasUnsavedInput: boolean }): boolean =>
  !hasUnsavedInput;

/**
 * ボタンの横に出す文言を返す。確定が済んでいなければ確定の文言、済んでいて保存していない入力があれば
 * 未保存の文言、どちらでもなければ null。
 */
export const historyMessage = ({ stockDifference, hasUnsavedInput }: GateState): string | null => {
  if (!isStockConfirmed(stockDifference)) return "在庫を確定してから保存してください";
  return hasUnsavedInput ? "保存していない入力があります" : null;
};

/**
 * 「履歴に保存」ボタンの種類を返す。確定が済むまでは「在庫を確定する」が primary なので、
 * primary が 2 つ並ばないように secondary にする。
 */
export const saveButtonVariant = (
  stockDifference: ItemDifference[] | null,
): "primary" | "secondary" => (isStockConfirmed(stockDifference) ? "primary" : "secondary");
