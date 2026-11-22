import { describe, expect, it } from "vitest";
import { choose, text, value } from "./text.ts";

describe("text", () => {
  it("埋め込みのない文言を返す", () => {
    expect(text`預かり部数`.render({})).toBe("預かり部数");
  });

  it("value で渡された値を埋め込む", () => {
    expect(text`HTTP ${value("status")} です`.render({ status: 500 })).toBe("HTTP 500 です");
  });

  it("value の書式の関数で整形する", () => {
    const t = text`${value("price", (yen: number) => `${yen}円`)}`;
    expect(t.render({ price: 300 })).toBe("300円");
  });

  it("複数の値を埋め込む", () => {
    expect(text`${value("a")}と${value("b")}`.render({ a: "x", b: 2 })).toBe("xと2");
  });
});

describe("choose", () => {
  const t = choose("status", {
    404: text`見つかりません`,
    default: text`失敗（HTTP ${value("status")}）`,
  });

  it("値が一致した場合の文言を返す", () => {
    expect(t.render({ status: 404 })).toBe("見つかりません");
  });

  it("一致しないときは default を返し、default の中でも値を使える", () => {
    expect(t.render({ status: 500 })).toBe("失敗（HTTP 500）");
  });

  it("default という値でも、default の文言を返す", () => {
    expect(t.render({ status: "default" })).toBe("失敗（HTTP default）");
  });

  it("toString など Object のプロパティ名と同じ値は一致とみなさない", () => {
    expect(t.render({ status: "toString" })).toBe("失敗（HTTP toString）");
  });
});
