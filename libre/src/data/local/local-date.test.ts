import { describe, expect, it } from "vitest";
import { localDateString } from "./local-date";

describe("localDateString", () => {
  it("端末のタイムゾーンの日付を YYYY-MM-DD にする（UTC の日付ではない）", () => {
    expect(localDateString(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
    expect(localDateString(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("地方時の日付と UTC の日付がずれる時刻でも、地方時の日付を返す", () => {
    // テストは UTC の環境でも動くので、ずれる状況を Date の代わりの値で作る
    const date = {
      getFullYear: () => 2026,
      getMonth: () => 0,
      getDate: () => 5,
      toISOString: () => "2026-01-04T15:30:00.000Z",
    } as unknown as Date;
    expect(localDateString(date)).toBe("2026-01-05");
  });
});
