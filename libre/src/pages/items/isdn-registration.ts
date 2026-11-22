import { STORAGE_FULL_MESSAGE } from "./write-failure";

/** 応答が返らなかったこと（オフライン、通信が切れた）を表す値 */
export type IsdnFailureStatus = number | "offline";

/** ISDN の入力を確かめる。理由の文言を返し、問題がなければ undefined。桁数と先頭の 3 桁は確かめない */
export const validateIsdnInput = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed === "") return "ISDNを入力してください。";
  if (!/^\d+$/.test(trimmed)) return "ISDNは数字のみで入力してください。";
  return undefined;
};

/**
 * ISDN から登録できなかったときにアラートに出す文言を返す。仕様は docs/spec/商品マスタ.md の「ISDN から登録する」
 *
 * @param status 応答のステータスコード。応答が返らなかったときは `"offline"`
 * @param manualEntryLabel ISDN を持たない商品を登録する欄を開く操作の名前
 */
export const isdnFailureMessage = (status: IsdnFailureStatus, manualEntryLabel: string): string => {
  switch (status) {
    case 507:
      return STORAGE_FULL_MESSAGE;
    case 409:
      return "この商品はすでに登録されています。";
    case 404:
      return "ISDNが見つかりませんでした。番号を確認して、もう一度追加してください。";
    case 502:
      return "ISDNの情報を取得できませんでした。時間をおいて、もう一度追加してください。";
    case 400:
      return `ISDNの情報が足りません。「${manualEntryLabel}」から追加してください。`;
    case 422:
      return "ISDNではありません。入力し直してください。";
    case "offline":
      return "商品を追加できませんでした。通信状態を確認して、もう一度追加してください。";
    default:
      return "商品を追加できませんでした。時間をおいて、もう一度追加してください。";
  }
};
