import { text } from "@shelf/texts";
import { defineTexts } from "./texts";

/** Libre Shelf の画面の文言。共通の画面の `TextsProvider` に渡す */
export const libreAppTexts = defineTexts({
  preparation: {
    quantityHeader: text`持ち込み予定数・預かり部数`,
    // `items/items-messages.ts` の `ITEM_PICKER_UNREADABLE_MESSAGE` と同じ文言。`text` は文字列定数を埋め込めないので、ここに書く
    itemsFetchFailed: text`登録した商品を読み込めないため、商品を追加できません。「商品管理」の画面で確かめてください。`,
  },
  opening: {
    stockIntro: text`実際に持ってきた冊数を入力してください。持込部数（自サークル物は持ち込み予定数、委託物は預かり部数）と照合します。持込部数はその場で修正できます。`,
    displaySampleNote: text`卓上に置く見本分。入力しない場合は0のままで構いません。`,
  },
  closing: {
    stockDiffNote: text`帰着後に原因を調査して修正してください。`,
  },
  done: {
    stockTab: text`在庫`,
    lockedNote: text`在庫を確定済みのため変更不可`,
  },
});
