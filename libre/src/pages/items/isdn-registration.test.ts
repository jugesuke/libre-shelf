import { describe, expect, it } from "vitest";
import { isdnFailureMessage, validateIsdnInput } from "./isdn-registration";

describe("validateIsdnInput", () => {
  it("空なら入力を促す", () => {
    expect(validateIsdnInput("")).toBe("ISDNを入力してください。");
    expect(validateIsdnInput("   ")).toBe("ISDNを入力してください。");
  });
  it("数字以外を含むなら、数字だけにするよう促す", () => {
    expect(validateIsdnInput("abc")).toBe("ISDNは数字のみで入力してください。");
    expect(validateIsdnInput("278 123")).toBe("ISDNは数字のみで入力してください。");
  });
  it("桁数と先頭の 3 桁は確かめない", () => {
    expect(validateIsdnInput("1")).toBeUndefined();
    expect(validateIsdnInput("2784702901978")).toBeUndefined();
  });
});

describe("isdnFailureMessage", () => {
  it.each([
    [409, "この商品はすでに登録されています。"],
    [404, "ISDNが見つかりませんでした。番号を確認して、もう一度追加してください。"],
    [502, "ISDNの情報を取得できませんでした。時間をおいて、もう一度追加してください。"],
    [400, "ISDNの情報が足りません。「手入力欄」から追加してください。"],
    [422, "ISDNではありません。入力し直してください。"],
    [507, "商品を保存できませんでした。端末の空き容量を確認してください。"],
    [500, "商品を追加できませんでした。時間をおいて、もう一度追加してください。"],
    [503, "商品を追加できませんでした。時間をおいて、もう一度追加してください。"],
    ["offline", "商品を追加できませんでした。通信状態を確認して、もう一度追加してください。"],
  ] as const)("%s のとき", (status, message) => {
    expect(isdnFailureMessage(status, "手入力欄")).toBe(message);
  });
});
