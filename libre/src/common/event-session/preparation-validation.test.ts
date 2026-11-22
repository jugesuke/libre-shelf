import { describe, it, expect } from "vitest";
import type { MenuEntry } from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  hasPreparationErrors,
  removeItemErrors,
  validatePreparation,
  type PreparationInput,
} from "./preparation-validation";

const validInput: PreparationInput = {
  eventDate: "2026-11-21",
  menu: [{ itemId: "a", price: 500, productName: "商品", publisherName: "サークル" }],
  consignedStock: [],
};

const withMenu = (menu: MenuEntry[]): PreparationInput => ({
  ...validInput,
  menu,
});

describe("validatePreparation", () => {
  it("すべて正しい入力には理由がないこと", () => {
    const errors = validatePreparation(validInput);
    expect(hasPreparationErrors(errors)).toBe(false);
  });

  it("開催日を入力していないとき、開催日の理由を出すこと", () => {
    const errors = validatePreparation({ ...validInput, eventDate: "" });
    expect(errors.eventDate).toBe("開催日を入力してください。");
  });

  it("商品が 1 つもないとき、商品の理由を出すこと", () => {
    const errors = validatePreparation(withMenu([]));
    expect(errors.menu).toBe("商品を1つ以上追加してください。");
  });

  it("頒布価格が 0 のときは理由を出さないこと", () => {
    const errors = validatePreparation(withMenu([{ itemId: "a", price: 0, productName: "商品", publisherName: "サークル" }]));
    expect(errors.price.has("a")).toBe(false);
  });

  it("頒布価格が負の数のとき、その商品の価格の理由を出すこと", () => {
    const errors = validatePreparation(withMenu([{ itemId: "a", price: -1, productName: "商品", publisherName: "サークル" }]));
    expect(errors.price.has("a")).toBe(true);
  });

  it("頒布価格が小数のとき、その商品の価格の理由を出すこと", () => {
    const errors = validatePreparation(withMenu([{ itemId: "a", price: 1.5, productName: "商品", publisherName: "サークル" }]));
    expect(errors.price.has("a")).toBe(true);
  });

  it("頒布価格が NaN のとき、その商品の価格の理由を出すこと", () => {
    const errors = validatePreparation(
      withMenu([{ itemId: "a", price: Number.NaN, productName: "商品", publisherName: "サークル" }]),
    );
    expect(errors.price.has("a")).toBe(true);
  });

  it("委託元名を入力した商品に預かり部数がないとき、その商品の預かり部数の理由を出すこと", () => {
    const errors = validatePreparation({
      ...validInput,
      menu: [{ itemId: "a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "田中" }],
      consignedStock: [],
    });
    expect(errors.consignedQty.has("a")).toBe(true);
  });

  it("委託元名を入力した商品の預かり部数が 0 のとき、その理由を出すこと", () => {
    const errors = validatePreparation({
      ...validInput,
      menu: [{ itemId: "a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "田中" }],
      consignedStock: [{ itemId: "a", quantity: 0 }],
    });
    expect(errors.consignedQty.has("a")).toBe(true);
  });

  it("委託元名を入力した商品の預かり部数が小数のとき、その理由を出すこと", () => {
    const errors = validatePreparation({
      ...validInput,
      menu: [{ itemId: "a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "田中" }],
      consignedStock: [{ itemId: "a", quantity: 1.5 }],
    });
    expect(errors.consignedQty.has("a")).toBe(true);
  });

  it("委託元名を入力した商品の預かり部数が 1 以上の整数なら理由を出さないこと", () => {
    const errors = validatePreparation({
      ...validInput,
      menu: [{ itemId: "a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "田中" }],
      consignedStock: [{ itemId: "a", quantity: 3 }],
    });
    expect(errors.consignedQty.has("a")).toBe(false);
  });

  it("委託元名が空白だけの商品は自サークルの頒布物なので、預かり部数の理由を出さないこと", () => {
    const errors = validatePreparation({
      ...validInput,
      menu: [{ itemId: "a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "  " }],
      consignedStock: [],
    });
    expect(errors.consignedQty.has("a")).toBe(false);
  });
});

describe("removeItemErrors", () => {
  it("削除した商品の頒布価格と預かり部数の理由を外し、ほかの商品の理由は残すこと", () => {
    const errors = removeItemErrors(
      {
        price: new Set(["a", "b"]),
        consignedQty: new Set(["a", "b"]),
      },
      "a",
    );
    expect([...errors.price]).toEqual(["b"]);
    expect([...errors.consignedQty]).toEqual(["b"]);
  });
});
