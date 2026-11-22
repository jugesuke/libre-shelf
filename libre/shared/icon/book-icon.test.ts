import { describe, expect, it } from "vitest";
import { buildBookIconSvg, hash01, SIZE, stackLayout } from "./book-icon";

describe("hash01", () => {
  it("同じ入力からは常に同じ値を返す（決定的）", () => {
    expect(hash01("event")).toBe(hash01("event"));
    expect(hash01("stock-orders")).toBe(hash01("stock-orders"));
  });

  it("0 以上 1 未満に収まる", () => {
    for (const k of ["event", "items", "stock-orders", "regi", "x", ""]) {
      const v = hash01(k);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("入力が違えば（ほぼ）異なる値になる", () => {
    expect(hash01("event")).not.toBe(hash01("items"));
  });
});

describe("stackLayout", () => {
  it("冊数ぶんの行を返す", () => {
    expect(stackLayout(3)).toHaveLength(3);
    expect(stackLayout(7)).toHaveLength(7);
  });

  it("本どうしは隙間なく重なる（次の本の上端＝前の本の下端）", () => {
    const rows = stackLayout(5);
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i + 1].y).toBeCloseTo(rows[i].y + rows[i].thickness, 6);
    }
  });

  it("厚みは一定で正（冊数で等分）", () => {
    const rows = stackLayout(6);
    const t = rows[0].thickness;
    expect(t).toBeGreaterThan(0);
    for (const r of rows) expect(r.thickness).toBeCloseTo(t, 6);
  });

  it("冊数が変わっても外形（積み全体の上端・下端）は一定に保たれる", () => {
    const few = stackLayout(3);
    const many = stackLayout(9);
    const top = (rows: { y: number; thickness: number }[]) => rows[0].y;
    const bottom = (rows: { y: number; thickness: number }[]) =>
      rows[rows.length - 1].y + rows[rows.length - 1].thickness;
    expect(top(few)).toBeCloseTo(top(many), 6);
    expect(bottom(few)).toBeCloseTo(bottom(many), 6);
  });

  it("積み全体は viewBox 内に収まる", () => {
    const rows = stackLayout(8);
    expect(rows[0].y).toBeGreaterThanOrEqual(0);
    expect(rows[rows.length - 1].y + rows[rows.length - 1].thickness).toBeLessThanOrEqual(SIZE);
  });
});

describe("buildBookIconSvg", () => {
  const sections = [
    { key: "event", color: "oklch(64.5% 0.246 16.439)" },
    { key: "items", color: "oklch(72.3% 0.219 149.579)" },
    { key: "stock-orders", color: "oklch(62.7% 0.265 303.9)" },
  ];

  it("決定的（同じ入力からは同じ SVG）", () => {
    expect(buildBookIconSvg(sections)).toBe(buildBookIconSvg(sections));
  });

  it("冊数によらず固定の viewBox を持つ", () => {
    const one = buildBookIconSvg([sections[0]]);
    const three = buildBookIconSvg(sections);
    expect(one).toContain(`viewBox="0 0 ${SIZE} ${SIZE}"`);
    expect(three).toContain(`viewBox="0 0 ${SIZE} ${SIZE}"`);
  });

  it("セクション数ぶんの本を描く", () => {
    const svg = buildBookIconSvg(sections);
    const books = svg.match(/data-key=/g) ?? [];
    expect(books).toHaveLength(sections.length);
  });

  it("各セクションの色が使われる", () => {
    const svg = buildBookIconSvg(sections);
    for (const s of sections) expect(svg).toContain(s.color);
  });

  it("ある key の本の水平配置（x・幅）は、リストの内容によらず一定", () => {
    const alone = buildBookIconSvg([{ key: "event", color: "red" }]);
    const withOthers = buildBookIconSvg([
      { key: "items", color: "green" },
      { key: "event", color: "red" },
      { key: "regi", color: "blue" },
    ]);
    const geom = (svg: string) => {
      const m = svg.match(/data-key="event"[^>]*data-geom="([^"]+)"/);
      if (!m) throw new Error("event の本が見つからない");
      return m[1];
    };
    expect(geom(alone)).toBe(geom(withOthers));
  });
});
