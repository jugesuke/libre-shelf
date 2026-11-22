import { describe, it, expect } from "vitest";
import type {
  EventSessionV20261121,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  CONSIGNED_QTY_ERROR,
  STOCK_QTY_ERROR,
  buildMenuEditResult,
  validateMenuEdit,
} from "./menu-edit";

type Session = Pick<
  EventSessionV20261121,
  "menu" | "openingStock" | "consignedStock"
>;

const session: Session = {
  menu: [
    { itemId: "own", price: 500, productName: "商品", publisherName: "サークル" },
    { itemId: "con", price: 300, productName: "商品", publisherName: "サークル", consignorName: "A" },
  ],
  openingStock: [
    { itemId: "own", quantity: 10 },
    { itemId: "con", quantity: 5 },
  ],
  consignedStock: [{ itemId: "con", quantity: 5 }],
};

const originalIds = new Set(session.menu.map((e) => e.itemId));

const input = (
  menu: MenuEntry[],
  newStockQty: Record<string, string> = {},
  consignedQty: Record<string, string> = {},
) => ({ menu, originalItemIds: originalIds, newStockQty, consignedQty });

describe("validateMenuEdit", () => {
  it("正しい入力には理由がないこと", () => {
    const errors = validateMenuEdit(input(session.menu, {}, { con: "5" }));
    expect(errors.stockQty.size).toBe(0);
    expect(errors.consignedQty.size).toBe(0);
  });

  it("新しく足した自サークルの頒布物の持ち込み数が空欄、負、小数なら理由を出すこと", () => {
    const menu = [
      { itemId: "n1", price: 1, productName: "商品", publisherName: "サークル" },
      { itemId: "n2", price: 1, productName: "商品", publisherName: "サークル" },
      { itemId: "n3", price: 1, productName: "商品", publisherName: "サークル" },
      { itemId: "n4", price: 1, productName: "商品", publisherName: "サークル" },
    ];
    const errors = validateMenuEdit(
      input(menu, { n1: "", n2: "-1", n3: "1.5", n4: "0" }),
    );
    expect([...errors.stockQty].sort()).toEqual(["n1", "n2", "n3"]);
  });

  it("既にある商品の持ち込み数は確かめないこと", () => {
    const errors = validateMenuEdit(input(session.menu, {}, { con: "5" }));
    expect(errors.stockQty.has("own")).toBe(false);
  });

  it("委託物の預かり部数が空欄、0、小数なら理由を出すこと", () => {
    const menu = [
      { itemId: "c1", price: 1, productName: "商品", publisherName: "サークル", consignorName: "A" },
      { itemId: "c2", price: 1, productName: "商品", publisherName: "サークル", consignorName: "A" },
      { itemId: "c3", price: 1, productName: "商品", publisherName: "サークル", consignorName: "A" },
      { itemId: "c4", price: 1, productName: "商品", publisherName: "サークル", consignorName: " A " },
    ];
    const errors = validateMenuEdit(
      input(menu, {}, { c1: "", c2: "0", c3: "1.5", c4: "1" }),
    );
    expect([...errors.consignedQty].sort()).toEqual(["c1", "c2", "c3"]);
  });

  it("新しく足した委託物には持ち込み数を求めないこと", () => {
    const menu = [{ itemId: "n", price: 1, productName: "商品", publisherName: "サークル", consignorName: "A" }];
    const errors = validateMenuEdit(input(menu, { n: "" }, { n: "2" }));
    expect(errors.stockQty.size).toBe(0);
  });

  it("文言が仕様のとおりであること", () => {
    expect(STOCK_QTY_ERROR).toBe(
      "持ち込み数を入力してください（0以上の整数）。",
    );
    expect(CONSIGNED_QTY_ERROR).toBe(
      "預かり部数を入力してください（1以上の整数）。",
    );
  });
});

describe("buildMenuEditResult", () => {
  it("空から空でない委託元名にしたら、預かり部数を consignedStock に入れ、openingStock は変えないこと", () => {
    const menu = [
      { itemId: "own", price: 500, productName: "商品", publisherName: "サークル", consignorName: " B " },
      session.menu[1],
    ];
    const result = buildMenuEditResult(
      session,
      input(menu, {}, { own: "3", con: "5" }),
    );
    expect(result.consignedStock).toEqual([
      { itemId: "own", quantity: 3 },
      { itemId: "con", quantity: 5 },
    ]);
    expect(result.openingStock).toEqual(session.openingStock);
    expect(result.menu[0].consignorName).toBe("B");
  });

  it("委託元名を空にしたら、その商品を consignedStock から除き、openingStock は変えないこと", () => {
    const menu = [
      session.menu[0],
      { itemId: "con", price: 300, productName: "商品", publisherName: "サークル", consignorName: "  " },
    ];
    const result = buildMenuEditResult(session, input(menu, {}, {}));
    expect(result.consignedStock).toEqual([]);
    expect(result.openingStock).toEqual(session.openingStock);
  });

  it("おしながきから外した商品を consignedStock から除くこと", () => {
    const result = buildMenuEditResult(
      session,
      input([session.menu[0]], {}, { con: "5" }),
    );
    expect(result.consignedStock).toEqual([]);
  });

  it("新しく足した自サークルの頒布物の持ち込み数を openingStock に足すこと", () => {
    const menu = [...session.menu, { itemId: "n", price: 1, productName: "商品", publisherName: "サークル" }];
    const result = buildMenuEditResult(
      session,
      input(menu, { n: "4" }, { con: "5" }),
    );
    expect(result.openingStock).toEqual([
      ...session.openingStock,
      { itemId: "n", quantity: 4 },
    ]);
  });

  it("新しく足した委託物の預かり部数を openingStock にも入れること", () => {
    const menu = [
      ...session.menu,
      { itemId: "n", price: 1, productName: "商品", publisherName: "サークル", consignorName: "A" },
    ];
    const result = buildMenuEditResult(
      session,
      input(menu, { n: "" }, { con: "5", n: "7" }),
    );
    expect(result.openingStock).toEqual([
      ...session.openingStock,
      { itemId: "n", quantity: 7 },
    ]);
    expect(result.consignedStock).toContainEqual({ itemId: "n", quantity: 7 });
  });

  it("既にある商品の持ち込み数は変えないこと", () => {
    const result = buildMenuEditResult(
      session,
      input(session.menu, { own: "99" }, { con: "8" }),
    );
    expect(result.openingStock).toEqual(session.openingStock);
    expect(result.consignedStock).toEqual([{ itemId: "con", quantity: 8 }]);
  });
});
