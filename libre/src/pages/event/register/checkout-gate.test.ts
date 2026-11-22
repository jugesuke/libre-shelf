import { describe, it, expect } from "vitest";
import { canCheckout } from "./checkout-gate";

describe("canCheckout", () => {
  it("カートに商品があり、預かった金額が合計と同じなら押せること", () => {
    expect(
      canCheckout({ cartLength: 1, total: 1000, tenderedAmount: 1000 }),
    ).toBe(true);
  });

  it("預かった金額が合計より少ないなら押せないこと", () => {
    expect(
      canCheckout({ cartLength: 1, total: 1000, tenderedAmount: 500 }),
    ).toBe(false);
  });

  it("カートが空なら、合計が 0 円でも押せないこと", () => {
    expect(canCheckout({ cartLength: 0, total: 0, tenderedAmount: 0 })).toBe(
      false,
    );
  });

  it("合計が 0 円のとき、預かった金額を入力していなくても押せること", () => {
    expect(canCheckout({ cartLength: 1, total: 0, tenderedAmount: 0 })).toBe(
      true,
    );
  });

  it("預かった金額を入力していなければ、合計が 1 円以上で押せないこと", () => {
    expect(canCheckout({ cartLength: 1, total: 1, tenderedAmount: 0 })).toBe(
      false,
    );
  });

  it("預かった金額が合計より多ければ押せること", () => {
    expect(
      canCheckout({ cartLength: 2, total: 1000, tenderedAmount: 1500 }),
    ).toBe(true);
  });
});
