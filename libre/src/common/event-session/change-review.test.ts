import { describe, it, expect } from "vitest";
import type {
  CashAdjustment,
  CashCount,
  DenominationCounts,
  EventSessionV20261121,
  Transaction,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  breakChange,
  cashAdjustmentAmount,
  cashCountAmount,
  denominationCountsAmount,
  reviewChange,
} from "./change-review";
import { formatSessionTime } from "./session-time";

/** テストでは JST の時刻を指定する。例: at(10, 30) は 10:30 JST */
const at = (hour: number, minute: number): number =>
  Date.UTC(2026, 10, 15, hour - 9, minute);

/** セッションに書く時刻（JST の時差付き）にする */
const written = (ms: number): string => formatSessionTime(new Date(ms), 9 * 60);

const counts = (partial: Partial<DenominationCounts> = {}): DenominationCounts => ({
  "100yen": 0,
  "500yen": 0,
  "1000yen": 0,
  "2000yen": 0,
  "5000yen": 0,
  "10000yen": 0,
  ...partial,
});

const cash = (partial: Partial<DenominationCounts> = {}, other = 0): CashCount => ({
  counts: counts(partial),
  other,
});

const transaction = (
  occurredAt: number,
  tendered: Partial<DenominationCounts>,
  changeAmount: number,
  cancelled = false,
): Transaction => ({
  transactionId: `tx-${occurredAt}-${changeAmount}`,
  occurredAt: written(occurredAt),
  buyerType: "stranger",
  items: [],
  tendered: counts(tendered),
  changeAmount,
  cancelled,
});

const adjustment = (
  occurredAt: number,
  cashIn: Partial<DenominationCounts>,
  cashOut: Partial<DenominationCounts>,
): CashAdjustment => ({
  occurredAt: written(occurredAt),
  cashIn: counts(cashIn),
  cashOut: counts(cashOut),
  comment: "",
});

const session = (
  overrides: Partial<EventSessionV20261121> = {},
): EventSessionV20261121 => ({
  schemaVersion: "2026-11-21",
  eventDate: "2026-11-15",
  phase: "closing",
  menu: [],
  openingCash: cash(),
  cashAdjustments: [],
  openingStock: [],
  consignedStock: [],
  sampleSubmissions: [],
  displaySamples: [],
  transactions: [],
  visitorLogs: [],
  closingStock: null,
  closingCash: cash(),
  stockDifference: null,
  cashDifference: null,
  settled: false,
  ...overrides,
});

/** 計算例（お釣りの振り返り.md）のセッション */
const exampleSession = (): EventSessionV20261121 =>
  session({
    openingCash: cash({ "100yen": 10, "500yen": 4, "1000yen": 5 }),
    transactions: [
      transaction(at(10, 0), { "1000yen": 1 }, 300),
      transaction(at(10, 10), { "5000yen": 1 }, 4500),
      transaction(at(10, 30), { "10000yen": 1 }, 8500),
    ],
    cashAdjustments: [
      adjustment(at(10, 20), { "1000yen": 5 }, { "5000yen": 1 }),
    ],
    closingCash: cash({ "100yen": 7, "10000yen": 1 }),
  });

describe("denominationCountsAmount", () => {
  it("金種ごとの枚数の金額の合計を返すこと", () => {
    expect(
      denominationCountsAmount(
        counts({ "100yen": 3, "1000yen": 2, "10000yen": 1 }),
      ),
    ).toBe(12300);
  });
});

describe("cashCountAmount", () => {
  it("金種ごとの金額の合計に other を足した金額を返すこと", () => {
    expect(
      cashCountAmount(cash({ "100yen": 7, "10000yen": 1 }, 35)),
    ).toBe(10735);
  });
});

describe("cashAdjustmentAmount", () => {
  it("入れた金額から出した金額を引いた金額を返すこと", () => {
    expect(
      cashAdjustmentAmount(
        adjustment(at(10, 0), { "1000yen": 5, "100yen": 1 }, { "5000yen": 1 }),
      ),
    ).toBe(100);
    expect(cashAdjustmentAmount(adjustment(at(10, 0), { "1000yen": 5 }, {}))).toBe(
      5000,
    );
    expect(cashAdjustmentAmount(adjustment(at(10, 0), {}, { "500yen": 2 }))).toBe(
      -1000,
    );
  });
});

describe("breakChange", () => {
  it("お釣りを 5000、1000、500、100 円の順に最少枚数で割り当てること", () => {
    expect(breakChange(300)).toEqual(counts({ "100yen": 3 }));
    expect(breakChange(4500)).toEqual(counts({ "1000yen": 4, "500yen": 1 }));
    expect(breakChange(8500)).toEqual(
      counts({ "5000yen": 1, "1000yen": 3, "500yen": 1 }),
    );
  });

  it("2000 円札と 10000 円札は使わないこと", () => {
    expect(breakChange(2000)).toEqual(counts({ "1000yen": 2 }));
    expect(breakChange(10000)).toEqual(counts({ "5000yen": 2 }));
  });

  it("100 円に満たない端数は割り当てないこと", () => {
    expect(breakChange(1234)).toEqual(counts({ "1000yen": 1, "100yen": 2 }));
    expect(breakChange(50)).toEqual(counts());
  });
});

describe("reviewChange", () => {
  it("計算例の表の値を金種ごとに返すこと", () => {
    const result = reviewChange(exampleSession());

    expect(result["100yen"]).toEqual({
      requiredAtOpening: 3,
      trend: { lowest: { count: 7, occurredAt: at(10, 0) }, belowZeroAt: null },
      reconciliation: { recorded: 7, counted: 7, difference: 0 },
      changeCount: 3,
      tenderedCount: 0,
    });
    expect(result["500yen"]).toEqual({
      requiredAtOpening: 2,
      trend: { lowest: { count: 2, occurredAt: at(10, 30) }, belowZeroAt: null },
      reconciliation: { recorded: 2, counted: 0, difference: -2 },
      changeCount: 4,
      tenderedCount: 0,
    });
    expect(result["1000yen"]).toEqual({
      requiredAtOpening: 6,
      trend: { lowest: { count: 2, occurredAt: at(10, 10) }, belowZeroAt: null },
      reconciliation: { recorded: 4, counted: 0, difference: -4 },
      changeCount: 11,
      tenderedCount: 1,
    });
    expect(result["2000yen"]).toEqual({
      requiredAtOpening: 0,
      trend: { lowest: { count: 0, occurredAt: null }, belowZeroAt: null },
      reconciliation: { recorded: 0, counted: 0, difference: 0 },
      changeCount: 0,
      tenderedCount: 0,
    });
    expect(result["5000yen"]).toEqual({
      requiredAtOpening: 0,
      trend: { lowest: { count: -1, occurredAt: at(10, 30) }, belowZeroAt: at(10, 30) },
      reconciliation: { recorded: -1, counted: 0, difference: 1 },
      changeCount: 0,
      tenderedCount: 1,
    });
    expect(result["10000yen"]).toEqual({
      requiredAtOpening: 0,
      trend: { lowest: { count: 0, occurredAt: null }, belowZeroAt: null },
      reconciliation: { recorded: 1, counted: 1, difference: 0 },
      changeCount: 0,
      tenderedCount: 1,
    });
  });

  it("時刻は文字列ではなく時刻として比べること（時差が違う時刻や秒の小数が混ざっても）", () => {
    const result = reviewChange(
      session({
        openingCash: cash(),
        cashAdjustments: [
          {
            occurredAt: "2026-11-15T01:30:00.250Z",
            cashIn: counts({ "1000yen": 1 }),
            cashOut: counts(),
            comment: "",
          },
        ],
        transactions: [
          {
            transactionId: "tx-z",
            occurredAt: "2026-11-15T10:00:00+09:00",
            buyerType: "stranger",
            items: [],
            tendered: counts(),
            changeAmount: 1000,
            cancelled: false,
          },
        ],
        closingCash: null,
      }),
    );

    expect(result["1000yen"].trend?.belowZeroAt).toBe(
      Date.UTC(2026, 10, 15, 1, 0, 0),
    );
  });

  it("取り消した会計を除くこと", () => {
    const result = reviewChange(
      session({
        openingCash: cash(),
        closingCash: cash(),
        transactions: [transaction(at(10, 0), {}, 4500, true)],
      }),
    );

    expect(result["1000yen"].requiredAtOpening).toBe(0);
    expect(result["1000yen"].reconciliation).toEqual({
      recorded: 0,
      counted: 0,
      difference: 0,
    });
  });

  it("同じ時刻ではレジ金の出し入れを会計より先に数えること", () => {
    const result = reviewChange(
      session({
        openingCash: cash(),
        cashAdjustments: [adjustment(at(10, 0), { "100yen": 1 }, {})],
        transactions: [transaction(at(10, 0), {}, 100)],
        closingCash: cash(),
      }),
    );

    expect(result["100yen"].trend).toEqual({
      lowest: { count: 0, occurredAt: null },
      belowZeroAt: null,
    });
    expect(result["100yen"].requiredAtOpening).toBe(1);
  });

  it("いちばん少なくなった枚数が同じなら最初の時刻を返すこと", () => {
    const result = reviewChange(
      session({
        openingCash: cash({ "100yen": 1 }),
        cashAdjustments: [
          adjustment(at(10, 0), {}, { "100yen": 1 }),
          adjustment(at(10, 10), { "100yen": 1 }, {}),
          adjustment(at(10, 20), {}, { "100yen": 1 }),
        ],
        closingCash: cash(),
      }),
    );

    expect(result["100yen"].trend).toEqual({
      lowest: { count: 0, occurredAt: at(10, 0) },
      belowZeroAt: null,
    });
  });

  it("開始時のレジ金がないとき、1 と 5 は返し、2、3、4 は値を返さないこと", () => {
    const result = reviewChange(
      session({
        openingCash: null,
        transactions: [transaction(at(10, 0), { "1000yen": 2 }, 4500)],
        closingCash: null,
      }),
    );

    expect(result["1000yen"]).toEqual({
      requiredAtOpening: 2,
      trend: null,
      reconciliation: null,
      changeCount: null,
      tenderedCount: 2,
    });
  });

  it("終了時のレジ金がないとき、3 と 4 は値を返さないこと", () => {
    const result = reviewChange(
      session({
        openingCash: cash({ "100yen": 10, "500yen": 4, "1000yen": 5 }),
        transactions: [transaction(at(10, 0), { "1000yen": 1 }, 300)],
        closingCash: null,
      }),
    );

    expect(result["100yen"]).toEqual({
      requiredAtOpening: 3,
      trend: { lowest: { count: 7, occurredAt: at(10, 0) }, belowZeroAt: null },
      reconciliation: null,
      changeCount: null,
      tenderedCount: 0,
    });
  });
});
