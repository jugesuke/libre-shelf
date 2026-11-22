import { describe, expect, it } from "vitest";
import { formatSessionTime, parseSessionTime } from "./session-time";

describe("formatSessionTime", () => {
  it("指定した時差を付けて、秒まで書く", () => {
    const date = new Date("2026-12-30T01:30:00Z");
    expect(formatSessionTime(date, 9 * 60)).toBe("2026-12-30T10:30:00+09:00");
  });

  it("秒の小数は切り捨てる", () => {
    const date = new Date("2026-12-30T01:30:00.999Z");
    expect(formatSessionTime(date, 9 * 60)).toBe("2026-12-30T10:30:00+09:00");
  });

  it("西側の時差は - を付け、日付をまたぐ", () => {
    const date = new Date("2026-12-30T01:30:00Z");
    expect(formatSessionTime(date, -(5 * 60 + 30))).toBe(
      "2026-12-29T20:00:00-05:30",
    );
  });

  it("時差を指定しないと、端末の時差を付ける", () => {
    const date = new Date("2026-12-30T01:30:00Z");
    expect(parseSessionTime(formatSessionTime(date))).toBe(date.getTime());
  });
});

describe("parseSessionTime", () => {
  it("時差付きの時刻をミリ秒にする", () => {
    expect(parseSessionTime("2026-12-30T10:30:00+09:00")).toBe(
      Date.UTC(2026, 11, 30, 1, 30, 0),
    );
  });

  it("Z で終わる時刻を受け付ける", () => {
    expect(parseSessionTime("2026-12-30T01:30:00Z")).toBe(
      Date.UTC(2026, 11, 30, 1, 30, 0),
    );
  });

  it("秒の小数がある時刻を受け付ける", () => {
    expect(parseSessionTime("2026-12-30T01:30:00.123Z")).toBe(
      Date.UTC(2026, 11, 30, 1, 30, 0, 123),
    );
  });
});
