import { STORAGE_FULL_STATUS } from "@libre/data/repositories";

/** 端末の保存先に書けなかったときに、商品の画面に出す文言。仕様は docs/spec/商品マスタ.md */
export const STORAGE_FULL_MESSAGE =
  "商品を保存できませんでした。端末の空き容量を確認してください。";

/** リポジトリの失敗のステータスに合わせて、アラートの文言を選ぶ。書けなかったときは共通の文言にする */
export const failureMessage = (status: number, fallback: string): string =>
  status === STORAGE_FULL_STATUS ? STORAGE_FULL_MESSAGE : fallback;

/** 商品の編集と ISDN からの取得し直しの結果。失敗のとき `storageFull` は、端末に書けなかったことを表す */
export type ItemActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; storageFull: boolean };
