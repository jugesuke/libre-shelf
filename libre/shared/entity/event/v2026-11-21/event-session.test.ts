import { describe, it, expect } from "vitest";
import { EventSessionV20261121Schema } from "./event-session";

const zeroCounts = {
  "100yen": 0,
  "500yen": 0,
  "1000yen": 0,
  "2000yen": 0,
  "5000yen": 0,
  "10000yen": 0,
};

const session = {
  schemaVersion: "2026-11-21",
  eventDate: "2026-11-21",
  phase: "register",
  menu: [
    {
      itemId: "item-1",
      price: 500,
      productName: "新刊",
      publisherName: "サークルA",
    },
  ],
  openingCash: null,
  cashAdjustments: [
    {
      occurredAt: "2026-11-21T10:00:00+09:00",
      cashIn: { ...zeroCounts, "1000yen": 1 },
      cashOut: zeroCounts,
      comment: "",
    },
  ],
  openingStock: [],
  consignedStock: [],
  sampleSubmissions: [
    { itemId: "item-1", quantity: 1, occurredAt: "2026-11-21T09:00:00+09:00" },
  ],
  displaySamples: [],
  transactions: [
    {
      transactionId: "5f0c2a7e-8f1b-4c55-9d0e-2b7f3a1c9e10",
      occurredAt: "2026-11-21T10:30:00+09:00",
      buyerType: "stranger",
      items: [
        { itemId: "item-1", price: 500, quantity: 2, productName: "新刊" },
      ],
      tendered: { ...zeroCounts, "1000yen": 1 },
      changeAmount: 0,
      cancelled: false,
    },
  ],
  visitorLogs: [{ occurredAt: "2026-11-21T10:15:00+09:00" }],
  closingStock: null,
  closingCash: null,
  stockDifference: null,
  cashDifference: null,
  settled: false,
};

describe("EventSessionV20261121Schema", () => {
  it("仕様どおりの値のセッションを受け付けること", () => {
    expect(EventSessionV20261121Schema.safeParse(session).success).toBe(true);
  });

  it("おしながきに productName がないセッションを拒むこと", () => {
    const broken = {
      ...session,
      menu: [{ itemId: "item-1", price: 500, publisherName: "サークルA" }],
    };
    expect(EventSessionV20261121Schema.safeParse(broken).success).toBe(false);
  });

  it("おしながきに publisherName がないセッションを拒むこと", () => {
    const broken = {
      ...session,
      menu: [{ itemId: "item-1", price: 500, productName: "新刊" }],
    };
    expect(EventSessionV20261121Schema.safeParse(broken).success).toBe(false);
  });

  it("会計の明細に productName がないセッションを拒むこと", () => {
    const broken = {
      ...session,
      transactions: [
        {
          ...session.transactions[0],
          items: [{ itemId: "item-1", price: 500, quantity: 2 }],
        },
      ],
    };
    expect(EventSessionV20261121Schema.safeParse(broken).success).toBe(false);
  });

  it("会計の時刻が timestamp（数値）のセッションを拒むこと", () => {
    const broken = {
      ...session,
      transactions: [
        { ...session.transactions[0], occurredAt: 1768000100000 },
      ],
    };
    expect(EventSessionV20261121Schema.safeParse(broken).success).toBe(false);
  });
});
