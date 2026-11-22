import { describe, expect, it } from "vitest";
import type { Item } from "@libre-shared/entity/items/item";
import type { MenuEntry } from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  menuEntryFromItem,
  menuProductName,
  resultProductName,
  menuPublisherName,
} from "./menu-entry";

const item: Item = {
  item_id: "item-1",
  product_name: "新刊",
  publisher_name: "サークルA",
  class: "doujinshi",
  type: "book",
  price: 500,
};

describe("menuEntryFromItem", () => {
  it("商品マスタの商品名とサークルを、おしながきの項目に写す", () => {
    expect(menuEntryFromItem(item)).toEqual({
      itemId: "item-1",
      price: 500,
      productName: "新刊",
      publisherName: "サークルA",
    });
  });

  it("商品マスタに価格がなければ 0 円にする", () => {
    expect(menuEntryFromItem({ ...item, price: undefined }).price).toBe(0);
  });
});

const menu: MenuEntry[] = [
  { itemId: "item-1", price: 500, productName: "新刊", publisherName: "サークルA" },
  { itemId: "item-2", price: 300, productName: "旧刊", publisherName: "サークルB" },
];

describe("menuProductName", () => {
  it("おしながきに写した商品名を返す", () => {
    expect(menuProductName(menu, "item-2")).toBe("旧刊");
  });

  it("おしながきになければ itemId を返す", () => {
    expect(menuProductName(menu, "item-9")).toBe("item-9");
  });
});

describe("menuPublisherName", () => {
  it("おしながきに写したサークルを返す", () => {
    expect(menuPublisherName(menu, "item-1")).toBe("サークルA");
  });

  it("おしながきになければ undefined を返す", () => {
    expect(menuPublisherName(menu, "item-9")).toBeUndefined();
  });
});

describe("resultProductName", () => {
  const menu: MenuEntry[] = [
    { itemId: "a", price: 500, productName: "おしながきの名前", publisherName: "P" },
  ];
  const transactions = [
    {
      items: [
        { itemId: "a", productName: "明細の名前A" },
        { itemId: "b", productName: "明細の名前B" },
      ],
    },
  ];

  it("おしながきにある商品は、おしながきの商品名を返す", () => {
    expect(resultProductName(menu, transactions, "a")).toBe("おしながきの名前");
  });

  it("おしながきにない商品は、会計の明細の商品名を返す", () => {
    expect(resultProductName(menu, transactions, "b")).toBe("明細の名前B");
  });

  it("どちらにもない商品は、商品 ID を返す", () => {
    expect(resultProductName(menu, transactions, "c")).toBe("c");
  });
});
