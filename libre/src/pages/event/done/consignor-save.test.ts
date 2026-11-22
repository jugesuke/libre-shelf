import { describe, it, expect } from "vitest";
import type {
  EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { buildConsignorsSaveResult } from "./consignor-save";

type SaveInput = Pick<EventSessionV20261121, "menu" | "consignedStock">;

describe("buildConsignorsSaveResult", () => {
  it("委託元名を消した商品の項目を consignedStock から除き、ほかの委託物の項目は残すこと", () => {
    const session: SaveInput = {
      menu: [
        { itemId: "item-a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "○○サークル" },
        { itemId: "item-b", price: 300, productName: "商品", publisherName: "サークル", consignorName: "△△サークル" },
      ],
      consignedStock: [
        { itemId: "item-a", quantity: 5 },
        { itemId: "item-b", quantity: 3 },
      ],
    };

    const result = buildConsignorsSaveResult(session, {
      "item-a": "",
      "item-b": "△△サークル",
    });

    expect(result.consignedStock).toEqual([{ itemId: "item-b", quantity: 3 }]);
    expect(result.menu).toEqual([
      { itemId: "item-a", price: 500, productName: "商品", publisherName: "サークル" },
      { itemId: "item-b", price: 300, productName: "商品", publisherName: "サークル", consignorName: "△△サークル" },
    ]);
  });

  it("委託元名を新しく付けた商品の項目を consignedStock に足さないこと", () => {
    const session: SaveInput = {
      menu: [{ itemId: "item-a", price: 500, productName: "商品", publisherName: "サークル" }],
      consignedStock: [],
    };

    const result = buildConsignorsSaveResult(session, {
      "item-a": "○○サークル",
    });

    expect(result.consignedStock).toEqual([]);
    expect(result.menu).toEqual([
      { itemId: "item-a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "○○サークル" },
    ]);
  });

  it("委託元名を変えただけの商品は、consignedStock の数量を保つこと", () => {
    const session: SaveInput = {
      menu: [{ itemId: "item-a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "旧名" }],
      consignedStock: [{ itemId: "item-a", quantity: 4 }],
    };

    const result = buildConsignorsSaveResult(session, {
      "item-a": "新名",
    });

    expect(result.consignedStock).toEqual([{ itemId: "item-a", quantity: 4 }]);
    expect(result.menu).toEqual([
      { itemId: "item-a", price: 500, productName: "商品", publisherName: "サークル", consignorName: "新名" },
    ]);
  });
});
