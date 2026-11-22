import { describe, expect, it } from "vitest";
import type {
  EventSessionV20261121,
  MenuEntry,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  buildPlannedStock,
  invalidPlannedItemIds,
  plannedStockAfterMenuEdit,
  readEventName,
  readPlannedStock,
  toLibreSession,
} from "./libre-session";

const entry = (itemId: string, consignorName?: string): MenuEntry => ({
  itemId,
  price: 500,
  productName: `商品${itemId}`,
  publisherName: "サークル",
  ...(consignorName === undefined ? {} : { consignorName }),
});

const baseSession = (): EventSessionV20261121 => ({
  schemaVersion: "2026-11-21",
  eventDate: "2026-12-30",
  phase: "register",
  menu: [],
  openingCash: null,
  cashAdjustments: [],
  openingStock: [],
  consignedStock: [],
  sampleSubmissions: [],
  displaySamples: [],
  transactions: [],
  visitorLogs: [],
  closingStock: null,
  closingCash: null,
  stockDifference: null,
  cashDifference: null,
  settled: false,
});

const withLibre = (
  session: EventSessionV20261121,
  extra: { eventName?: unknown; plannedStock?: unknown },
): EventSessionV20261121 => ({ ...session, ...extra });

describe("readEventName / readPlannedStock", () => {
  it("共通のセッションに足した即売会の名前と持ち込み予定数を読む", () => {
    const s = withLibre(baseSession(), {
      eventName: "コミケ",
      plannedStock: [{ itemId: "a", quantity: 3 }],
    });
    expect(readEventName(s)).toBe("コミケ");
    expect(readPlannedStock(s)).toEqual([{ itemId: "a", quantity: 3 }]);
  });

  it("足されていなければ、空の名前と空の配列にする", () => {
    expect(readEventName(baseSession())).toBe("");
    expect(readPlannedStock(baseSession())).toEqual([]);
  });
});

describe("toLibreSession", () => {
  it("即売会の名前と持ち込み予定数を持つセッションを、Libre のセッションとして返す", () => {
    const s = withLibre(baseSession(), { eventName: "コミケ", plannedStock: [] });
    expect(toLibreSession(s).eventName).toBe("コミケ");
  });

  it("即売会の名前がなければ例外を投げる", () => {
    expect(() => toLibreSession(withLibre(baseSession(), { plannedStock: [] }))).toThrow();
  });
});

describe("invalidPlannedItemIds", () => {
  const menu = [entry("a"), entry("b"), entry("c", "委託元")];

  it("自サークルの頒布物のうち、0 以上の整数でない持ち込み予定数の商品を返す", () => {
    const invalid = invalidPlannedItemIds(menu, { a: "0", b: "1.5", c: "" });
    expect([...invalid]).toEqual(["b"]);
  });

  it("入力していない商品も返す", () => {
    expect([...invalidPlannedItemIds(menu, { a: "3" })]).toEqual(["b"]);
  });

  it("負の数と空白だけの入力も返す", () => {
    expect([...invalidPlannedItemIds(menu, { a: "-1", b: "  " })].sort()).toEqual(["a", "b"]);
  });

  it("委託物は確かめない", () => {
    expect(invalidPlannedItemIds([entry("c", "委託元")], {}).size).toBe(0);
  });
});

describe("buildPlannedStock", () => {
  it("自サークルの頒布物の持ち込み予定数を、おしながきの順に数にして返す", () => {
    const menu = [entry("b"), entry("c", "委託元"), entry("a")];
    expect(buildPlannedStock(menu, { a: "2", b: "10", c: "5" })).toEqual([
      { itemId: "b", quantity: 10 },
      { itemId: "a", quantity: 2 },
    ]);
  });
});

describe("plannedStockAfterMenuEdit", () => {
  const before = (): EventSessionV20261121 =>
    withLibre(
      { ...baseSession(), menu: [entry("a"), entry("b", "委託元"), entry("c")] },
      {
        eventName: "x",
        plannedStock: [
          { itemId: "a", quantity: 4 },
          { itemId: "c", quantity: 7 },
        ],
      },
    );

  it("すでにある自サークルの頒布物の持ち込み予定数は変えない", () => {
    const after = { ...before(), menu: [entry("a"), entry("b", "委託元"), entry("c")] };
    expect(plannedStockAfterMenuEdit(before(), after)).toEqual([
      { itemId: "a", quantity: 4 },
      { itemId: "c", quantity: 7 },
    ]);
  });

  it("新しく足した自サークルの頒布物は、持ち込んだ在庫に入った数を持ち込み予定数にする", () => {
    const after = {
      ...before(),
      menu: [...before().menu, entry("d")],
      openingStock: [{ itemId: "d", quantity: 12 }],
    };
    expect(plannedStockAfterMenuEdit(before(), after)).toContainEqual({ itemId: "d", quantity: 12 });
  });

  it("委託元名を外した商品の持ち込み予定数は 0 にする", () => {
    const after = { ...before(), menu: [entry("a"), entry("b"), entry("c")] };
    expect(plannedStockAfterMenuEdit(before(), after)).toContainEqual({ itemId: "b", quantity: 0 });
  });

  it("委託元名を付けた商品と、おしながきから外した商品は、持ち込み予定数から消す", () => {
    const after = { ...before(), menu: [entry("a", "別の委託元")] };
    expect(plannedStockAfterMenuEdit(before(), after)).toEqual([]);
  });

  it("新しく足した委託物には、持ち込み予定数を持たせない", () => {
    const after = {
      ...before(),
      menu: [...before().menu, entry("e", "委託元")],
      openingStock: [{ itemId: "e", quantity: 3 }],
    };
    expect(plannedStockAfterMenuEdit(before(), after).some((p) => p.itemId === "e")).toBe(false);
  });
});
