import { describe, expect, it } from "vitest";
import type { MenuEntry } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { buildTransactionItems } from "./checkout-items";

const menu: MenuEntry[] = [
  { itemId: "item-1", price: 500, productName: "新刊", publisherName: "サークルA" },
  { itemId: "item-2", price: 300, productName: "旧刊", publisherName: "サークルA" },
];

describe("buildTransactionItems", () => {
  it("会計の明細に、販売時の価格と数量と、おしながきの商品名を入れる", () => {
    expect(
      buildTransactionItems(
        [
          { itemId: "item-2", price: 250, quantity: 3 },
          { itemId: "item-1", price: 500, quantity: 1 },
        ],
        menu,
      ),
    ).toEqual([
      { itemId: "item-2", price: 250, quantity: 3, productName: "旧刊" },
      { itemId: "item-1", price: 500, quantity: 1, productName: "新刊" },
    ]);
  });
});
