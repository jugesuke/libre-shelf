import { describe, it, expect } from "vitest";
import type {
  CashAdjustment,
  CashCount,
  DenominationCounts,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  cashAdjustmentsTotal,
  cashDifference,
  salesTotal,
} from "./cash-summary";

const counts = (partial: Partial<DenominationCounts> = {}): DenominationCounts => ({
  "100yen": 0,
  "500yen": 0,
  "1000yen": 0,
  "2000yen": 0,
  "5000yen": 0,
  "10000yen": 0,
  ...partial,
});

const cash = (partial: Partial<DenominationCounts>, other = 0): CashCount => ({
  counts: counts(partial),
  other,
});

const sale = (price: number, quantity: number, cancelled = false) => ({
  cancelled,
  items: [{ itemId: "a", price, quantity }],
});

const adjustment = (
  cashIn: Partial<DenominationCounts>,
  cashOut: Partial<DenominationCounts>,
): CashAdjustment => ({
  occurredAt: "2026-11-21T10:00:00+09:00",
  cashIn: counts(cashIn),
  cashOut: counts(cashOut),
  comment: "",
});

describe("salesTotal", () => {
  it("取り消していない会計の、販売時の価格 × 数量の合計を返す", () => {
    expect(
      salesTotal([sale(500, 2), sale(300, 1), sale(1000, 5, true)]),
    ).toBe(1300);
  });
});

describe("cashAdjustmentsTotal", () => {
  it("入れた金額の合計 − 出した金額の合計を、出し入れすべてについて足す", () => {
    expect(
      cashAdjustmentsTotal([
        adjustment({ "1000yen": 10 }, { "10000yen": 1 }),
        adjustment({ "5000yen": 1 }, {}),
        adjustment({}, { "500yen": 2 }),
      ]),
    ).toBe(0 + 5000 - 1000);
  });
});

describe("cashDifference", () => {
  const base = {
    openingCash: cash({ "1000yen": 5 }, 30),
    closingCash: cash({ "1000yen": 5, "500yen": 2 }, 30),
    cashAdjustments: [] as CashAdjustment[],
    transactions: [sale(500, 2)],
  };

  it("(終了時 − 開始時 − 出し入れの合計) − 販売の合計 を返す。一致なら 0", () => {
    expect(cashDifference(base)).toBe(0);
  });

  it("出し入れの合計を差し引く", () => {
    expect(
      cashDifference({
        ...base,
        closingCash: cash({ "1000yen": 5, "500yen": 2, "5000yen": 1 }, 30),
        cashAdjustments: [adjustment({ "5000yen": 1 }, {})],
      }),
    ).toBe(0);
  });

  it("その他の金額も合計に含める", () => {
    expect(
      cashDifference({ ...base, closingCash: cash({ "1000yen": 5, "500yen": 2 }, 20) }),
    ).toBe(-10);
  });

  it("開始時か終了時のレジ金がなければ null にする", () => {
    expect(cashDifference({ ...base, openingCash: null })).toBeNull();
    expect(cashDifference({ ...base, closingCash: null })).toBeNull();
  });
});
