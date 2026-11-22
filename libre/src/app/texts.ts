import { createTexts } from "@shelf/texts";

/**
 * アプリごとに違う画面の文言の宣言。画面ごとの入れ子にして、文言のキーと、画面が渡す値の型を書く。
 * 辞書は Shelf が `src/common/app-texts.ts`、Libre Shelf が `libre/src/app/libre-app-texts.ts` に、
 * `defineTexts` で書く。文言の過不足は型エラーになる。
 *
 * キーを足すとき
 * 1. ここに、画面ごとの入れ子の中へキーを足し、どの画面のどこに出る文言かを jsdoc に書く。
 *    画面が値を渡す文言は、`{ count: number }` のように値の名前と型を書く。値を取らない文言は `{}`
 * 2. 型エラーになる 2 つの辞書に、それぞれの仕様どおりの文言を書く
 * 3. 画面では `const t = useTexts("closing")` で画面の文言を取り出し、`t("stockDiffNote")` と呼ぶ
 *
 * 辞書に入れるのは、両方のアプリの画面に出る文言で、アプリによって違うものだけ。
 * 両方で同じ文言は、辞書に入れず共通のコードに書く。
 * 片方のアプリにしかない動作の文言（そのアプリだけが出すアラートやボタンの名前など）は、辞書に入れず、
 * その動作を渡す差し込み（`AppShell`、`EventAdapter`）に、動作と一緒に入れる
 */
export type TextSchema = {
  /** 前日準備 */
  preparation: {
    /** おしながきの表で、数の入力欄の列の見出し */
    quantityHeader: {};
    /** 商品の一覧の取得に、エラーの応答が返ったときの、おしながきの見出しの下のアラート。`status` は HTTP ステータスコード */
    itemsFetchFailed: { status: number };
  };
  /** 当日開始処理 */
  opening: {
    /** 「持ち込み在庫確認」の表の上の説明 */
    stockIntro: {};
    /** 「展示見本数」の表の上の説明 */
    displaySampleNote: {};
  };
  /** 当日終了処理 */
  closing: {
    /** 「差異確認」の区画で、在庫に差があるときに、商品ごとの差の下に出す注記 */
    stockDiffNote: {};
  };
  /** イベント終了 */
  done: {
    /** 在庫のタブの名前 */
    stockTab: {};
    /** 在庫を確定（反映）したあと、在庫のタブの各表の見出しの右に出す文言 */
    lockedNote: {};
  };
};

export const { defineTexts, TextsProvider, useTexts } = createTexts<TextSchema>();
