import { describe, it, expect } from "vitest";
import type {
  CashCount,
  DenominationCounts,
  EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  reconciliationCells,
  reconciliationForClosing,
} from "./cash-reconciliation-view";

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

const session = (
  overrides: Partial<EventSessionV20261121> = {},
): EventSessionV20261121 => ({
  schemaVersion: "2026-11-15",
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
  closingCash: null,
  stockDifference: null,
  cashDifference: null,
  settled: false,
  ...overrides,
});

describe("reconciliationCells", () => {
  it("突き合わせがなければ、どの欄も「—」にし、合っていないとは扱わない", () => {
    expect(reconciliationCells(null)).toEqual({
      recorded: "—",
      difference: "—",
      mismatch: false,
    });
  });

  it("差が 0 なら「±0」と表示し、合っていないとは扱わない", () => {
    expect(
      reconciliationCells({ recorded: 7, counted: 7, difference: 0 }),
    ).toEqual({
      recorded: "7 枚",
      difference: "±0",
      mismatch: false,
    });
  });

  it("差が正なら符号を付け、差が負なら負の符号のまま表示し、合っていないとする", () => {
    expect(
      reconciliationCells({ recorded: -1, counted: 0, difference: 1 }),
    ).toEqual({
      recorded: "-1 枚",
      difference: "+1",
      mismatch: true,
    });
    expect(
      reconciliationCells({ recorded: 2, counted: 0, difference: -2 }),
    ).toEqual({
      recorded: "2 枚",
      difference: "-2",
      mismatch: true,
    });
  });
});

describe("reconciliationForClosing", () => {
  it("終了時のレジ金がまだなくても、記録の枚数を出し、入力していない欄は 0 枚として差を出す", () => {
    const result = reconciliationForClosing(
      session({ openingCash: cash({ "100yen": 7 }) }),
      null,
    );
    expect(result["100yen"]).toEqual({
      recorded: 7,
      counted: 0,
      difference: -7,
    });
  });

  it("終了時のレジ金があれば、その枚数と記録の枚数の差を出す", () => {
    const result = reconciliationForClosing(
      session({ openingCash: cash({ "100yen": 7 }) }),
      cash({ "100yen": 5 }),
    );
    expect(result["100yen"]).toEqual({
      recorded: 7,
      counted: 5,
      difference: -2,
    });
  });

  it("開始時のレジ金がなければ、すべての金種を null にする", () => {
    const result = reconciliationForClosing(
      session({ openingCash: null }),
      cash({ "100yen": 5 }),
    );
    expect(result["100yen"]).toBeNull();
    expect(result["10000yen"]).toBeNull();
  });
});
