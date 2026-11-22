import { describe, it, expect } from "vitest";
import {
  DENOMINATION_KEYS,
  addTendered,
  cashAdjustmentFromFields,
  cashCountFromFields,
  countsFromFields,
  emptyCounts,
  emptyDenominationFields,
  fieldsFromCashAdjustment,
  fieldsFromCashCount,
  fieldsFromCounts,
  formatDenominationCounts,
  type CashAdjustmentFields,
  type DenominationFields,
} from "./cash-form";

const fields = (partial: Partial<DenominationFields> = {}): DenominationFields => ({
  ...emptyDenominationFields(),
  ...partial,
});

describe("DENOMINATION_KEYS", () => {
  it("6 つの金種を小さい順に持つ", () => {
    expect(DENOMINATION_KEYS).toEqual([
      "100yen",
      "500yen",
      "1000yen",
      "2000yen",
      "5000yen",
      "10000yen",
    ]);
  });
});

describe("addTendered", () => {
  it("押した金種の枚数だけを 1 増やす", () => {
    const once = addTendered(emptyCounts(), "500yen");
    const twice = addTendered(once, "500yen");
    const withBill = addTendered(twice, "1000yen");
    expect(withBill).toEqual({ ...emptyCounts(), "500yen": 2, "1000yen": 1 });
  });

  it("元の値を書き換えない", () => {
    const base = emptyCounts();
    addTendered(base, "100yen");
    expect(base).toEqual(emptyCounts());
  });
});

describe("countsFromFields", () => {
  it("入力していない欄は 0 にする", () => {
    expect(countsFromFields(fields({ "100yen": "3", "5000yen": "1" }))).toEqual({
      ...emptyCounts(),
      "100yen": 3,
      "5000yen": 1,
    });
  });

  it("0 以上の整数でない入力は 0 にする", () => {
    expect(
      countsFromFields(
        fields({ "100yen": "-2", "500yen": "1.5", "1000yen": "abc", "2000yen": "4" }),
      ),
    ).toEqual({ ...emptyCounts(), "2000yen": 4 });
  });
});

describe("fieldsFromCounts", () => {
  it("0 枚の欄は空にし、それ以外は数を文字にする", () => {
    expect(fieldsFromCounts({ ...emptyCounts(), "500yen": 2 })).toEqual(
      fields({ "500yen": "2" }),
    );
  });
});

describe("cashCountFromFields", () => {
  it("金種ごとの枚数とその他の金額を CashCount にする", () => {
    expect(
      cashCountFromFields({
        counts: fields({ "100yen": "5", "1000yen": "2" }),
        other: "35",
      }),
    ).toEqual({ counts: { ...emptyCounts(), "100yen": 5, "1000yen": 2 }, other: 35 });
  });

  it("合計が 0 円なら null にする", () => {
    expect(
      cashCountFromFields({ counts: fields({ "100yen": "0" }), other: "" }),
    ).toBeNull();
  });

  it("その他だけでも合計が 1 円以上なら null にしない", () => {
    expect(cashCountFromFields({ counts: fields(), other: "10" })).toEqual({
      counts: emptyCounts(),
      other: 10,
    });
  });
});

describe("fieldsFromCashCount", () => {
  it("null なら空の欄を返す", () => {
    expect(fieldsFromCashCount(null)).toEqual({
      counts: emptyDenominationFields(),
      other: "",
    });
  });

  it("保存した値を金種ごとの欄とその他の欄に入れる", () => {
    expect(
      fieldsFromCashCount({ counts: { ...emptyCounts(), "10000yen": 1 }, other: 60 }),
    ).toEqual({ counts: fields({ "10000yen": "1" }), other: "60" });
  });
});

describe("cashAdjustmentFromFields", () => {
  const input = (partial: Partial<CashAdjustmentFields> = {}): CashAdjustmentFields => ({
    cashIn: fields(),
    cashOut: fields(),
    comment: "",
    ...partial,
  });

  it("入れた枚数、出した枚数、メモ、時刻を持つ出し入れを作る", () => {
    expect(
      cashAdjustmentFromFields(
        input({
          cashIn: fields({ "1000yen": "10" }),
          cashOut: fields({ "10000yen": "1" }),
          comment: "両替",
        }),
        "2026-11-21T10:00:00+09:00",
      ),
    ).toEqual({
      occurredAt: "2026-11-21T10:00:00+09:00",
      cashIn: { ...emptyCounts(), "1000yen": 10 },
      cashOut: { ...emptyCounts(), "10000yen": 1 },
      comment: "両替",
    });
  });

  it("どの欄も 0 枚なら null にする（メモだけでは記録しない）", () => {
    expect(cashAdjustmentFromFields(
        input({ comment: "メモだけ" }),
        "2026-11-21T10:00:00+09:00",
      )).toBeNull();
  });
});

describe("fieldsFromCashAdjustment", () => {
  it("記録した出し入れを入力欄の値に戻す", () => {
    expect(
      fieldsFromCashAdjustment({
        occurredAt: "2026-11-21T10:00:00+09:00",
        cashIn: { ...emptyCounts(), "500yen": 4 },
        cashOut: emptyCounts(),
        comment: "補充",
      }),
    ).toEqual({
      cashIn: fields({ "500yen": "4" }),
      cashOut: fields(),
      comment: "補充",
    });
  });
});

describe("formatDenominationCounts", () => {
  it("枚数がある金種を、小さい金種から「円玉・円札 × 枚」で並べる", () => {
    expect(
      formatDenominationCounts({ ...emptyCounts(), "1000yen": 2, "100yen": 3 }),
    ).toBe("100円玉 × 3、1,000円札 × 2");
  });

  it("どの金種も 0 枚なら「なし」にする", () => {
    expect(formatDenominationCounts(emptyCounts())).toBe("なし");
  });
});
