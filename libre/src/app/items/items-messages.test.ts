import { describe, expect, it } from "vitest";
import { importItemsFailureMessage, importItemsSuccessMessage } from "./items-messages";

describe("商品の読み込みの文言", () => {
  it("読み込めたら、件数を出す", () => {
    expect(importItemsSuccessMessage(3)).toBe("3 件の商品を読み込みました。");
  });
  it("ファイルの形が違うときは、書き出したファイルを選ぶよう促す", () => {
    expect(importItemsFailureMessage("invalid")).toBe(
      "ファイルを読み込めませんでした。「書き出す」で保存したファイルを選んでください。",
    );
  });
  it("書き込みに失敗したときは、端末の空き容量を確かめるよう促す", () => {
    expect(importItemsFailureMessage("write_failed")).toBe(
      "商品を保存できませんでした。端末の空き容量を確認してください。",
    );
  });
  it("商品マスタが読めないときは、読み込めなかったことを出す", () => {
    expect(importItemsFailureMessage("unreadable")).toBe(
      "保存されている商品のデータを読み込めませんでした。データを上書きしないように、追加、変更、読み込みを止めています。",
    );
  });
});
