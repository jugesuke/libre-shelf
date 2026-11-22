import { describe, it, expect } from "vitest";
import type {
  DenominationCounts,
  EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { buildChangeReview } from "./change-review-view";

/** 端末のタイムゾーンの時刻を指定する */
const at = (hour: number, minute: number): string =>
  formatSessionTime(new Date(2026, 10, 21, hour, minute));

const counts = (p: Partial<DenominationCounts> = {}): DenominationCounts => ({
  "100yen": 0,
  "500yen": 0,
  "1000yen": 0,
  "2000yen": 0,
  "5000yen": 0,
  "10000yen": 0,
  ...p,
});

const tx = (
  occurredAt: string,
  tendered: Partial<DenominationCounts>,
  changeAmount: number,
) => ({
  transactionId: `tx-${occurredAt}`,
  occurredAt,
  buyerType: "stranger" as const,
  items: [],
  tendered: counts(tendered),
  changeAmount,
  cancelled: false,
});

/** お釣りの振り返り.md の計算例 */
const session = (
  overrides: Partial<EventSessionV20261121> = {},
): EventSessionV20261121 =>
  ({
    openingCash: {
      counts: counts({ "100yen": 10, "500yen": 4, "1000yen": 5 }),
      other: 0,
    },
    closingCash: {
      counts: counts({ "100yen": 7, "10000yen": 1 }),
      other: 0,
    },
    cashAdjustments: [
      {
        occurredAt: at(10, 20),
        cashIn: counts({ "1000yen": 5 }),
        cashOut: counts({ "5000yen": 1 }),
        comment: "両替",
      },
    ],
    transactions: [
      tx(at(10, 0), { "1000yen": 1 }, 300),
      tx(at(10, 10), { "5000yen": 1 }, 4500),
      tx(at(10, 30), { "10000yen": 1 }, 8500),
    ],
    ...overrides,
  }) as unknown as EventSessionV20261121;

describe("buildChangeReview", () => {
  describe("結論", () => {
    it("下回った金種を「〜が HH:mm に足りなくなりました」にする", () => {
      expect(buildChangeReview(session()).conclusion).toEqual([
        "5,000円札が 10:30 に足りなくなりました",
      ]);
    });

    it("時刻の早い順、同じ時刻なら金種の小さい順に並べる", () => {
      const review = buildChangeReview(
        session({
          openingCash: { counts: counts(), other: 0 },
          cashAdjustments: [],
          transactions: [tx(at(10, 0), {}, 600), tx(at(9, 0), {}, 5000)],
        }),
      );
      expect(review.conclusion).toEqual([
        "5,000円札が 09:00 に足りなくなりました",
        "100円玉が 10:00 に足りなくなりました",
        "500円玉が 10:00 に足りなくなりました",
      ]);
    });

    it("下回った金種がなければ「お釣りは足りました」にする", () => {
      const review = buildChangeReview(
        session({ cashAdjustments: [], transactions: [] }),
      );
      expect(review.conclusion).toEqual(["お釣りは足りました"]);
    });

    it("開始時のレジ金がなければ足りたかは分からないと書く", () => {
      expect(
        buildChangeReview(session({ openingCash: null })).conclusion,
      ).toEqual(["開始時のレジ金がないため、足りたかは分かりません"]);
    });
  });

  describe("金種ごとのまとめ", () => {
    it("金種を小さい順に、用意した、受け取った、お釣りに出た、必要だった枚数にする", () => {
      const rows = buildChangeReview(session()).rows;
      expect(rows.map((r) => r.label)).toEqual([
        "100円玉",
        "500円玉",
        "1,000円札",
        "2,000円札",
        "5,000円札",
        "10,000円札",
      ]);
      expect(rows[0]).toEqual({
        label: "100円玉",
        opening: "10",
        tendered: "0",
        changeCount: "3",
        required: "3",
        mismatch: false,
      });
      expect(rows[2]).toEqual({
        label: "1,000円札",
        opening: "5",
        tendered: "1",
        changeCount: "11",
        required: "6",
        mismatch: true,
      });
    });

    it("差が 0 でない金種の行だけ色を付ける", () => {
      const rows = buildChangeReview(session()).rows;
      expect(rows.map((r) => r.mismatch)).toEqual([
        false,
        true,
        true,
        false,
        true,
        false,
      ]);
    });

    it("開始時のレジ金がなければ、用意した、お釣りに出たを「—」にし、受け取った、必要だったは表示する", () => {
      const row = buildChangeReview(session({ openingCash: null })).rows[2];
      expect(row).toEqual({
        label: "1,000円札",
        opening: "—",
        tendered: "1",
        changeCount: "—",
        required: "6",
        mismatch: false,
      });
    });

    it("終了時のレジ金がなければ、お釣りに出たを「—」にし、色を付けない", () => {
      const row = buildChangeReview(session({ closingCash: null })).rows[2];
      expect(row).toMatchObject({
        opening: "5",
        changeCount: "—",
        mismatch: false,
      });
    });
  });

  describe("記録と合わなかった金種", () => {
    it("差が 0 でない金種を、記録と数えた枚数で 1 行ずつ書く", () => {
      expect(buildChangeReview(session()).mismatches).toEqual([
        "500円玉: 記録 2 枚、数えた 0 枚",
        "1,000円札: 記録 4 枚、数えた 0 枚",
        "5,000円札: 記録 -1 枚、数えた 0 枚",
      ]);
    });

    it("差がなければ空にする", () => {
      expect(
        buildChangeReview(session({ closingCash: null })).mismatches,
      ).toEqual([]);
    });
  });
});
