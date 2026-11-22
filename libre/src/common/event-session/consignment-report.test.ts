import { describe, it, expect } from "vitest";
import {
  formatConsignmentReport,
  type ConsignmentReportRow,
} from "./consignment-report";

describe("formatConsignmentReport", () => {
  it("複数商品の報告テキストを生成すること", () => {
    const rows: ConsignmentReportRow[] = [
      {
        itemName: "商品A",
        initial: 10,
        sold: 6,
        sample: 1,
        display: 1,
        closing: 2,
        revenue: 3000,
      },
      {
        itemName: "商品B",
        initial: 5,
        sold: 4,
        sample: 0,
        display: 0,
        closing: 1,
        revenue: 2400,
      },
    ];
    expect(formatConsignmentReport("2026-07-10", "○○サークル", rows)).toBe(
      [
        "## 委託販売報告（2026-07-10）: ○○サークル さま",
        "",
        "- 商品A: 入荷 10 / 販売 6 / 見本誌提出 1 / 展示見本 1 / 返却 2 / 売上 ¥3,000",
        "- 商品B: 入荷 5 / 販売 4 / 見本誌提出 0 / 展示見本 0 / 返却 1 / 売上 ¥2,400",
        "",
        "売上合計: ¥5,400",
      ].join("\n"),
    );
  });

  it("返却が未入力（closing が undefined）のとき「-」と出力すること", () => {
    const rows: ConsignmentReportRow[] = [
      {
        itemName: "商品A",
        initial: 10,
        sold: 6,
        sample: 0,
        display: 0,
        closing: undefined,
        revenue: 3000,
      },
    ];
    expect(formatConsignmentReport("2026-07-10", "○○サークル", rows)).toBe(
      [
        "## 委託販売報告（2026-07-10）: ○○サークル さま",
        "",
        "- 商品A: 入荷 10 / 販売 6 / 見本誌提出 0 / 展示見本 0 / 返却 - / 売上 ¥3,000",
        "",
        "売上合計: ¥3,000",
      ].join("\n"),
    );
  });

  it("返却が 0 のとき「-」ではなく 0 と出力すること", () => {
    const rows: ConsignmentReportRow[] = [
      {
        itemName: "商品A",
        initial: 3,
        sold: 3,
        sample: 0,
        display: 0,
        closing: 0,
        revenue: 1500,
      },
    ];
    const text = formatConsignmentReport("2026-07-10", "○○サークル", rows);
    expect(text).toContain("返却 0");
  });

  it("金額を3桁区切りで出力すること", () => {
    const rows: ConsignmentReportRow[] = [
      {
        itemName: "商品A",
        initial: 100,
        sold: 100,
        sample: 0,
        display: 0,
        closing: 0,
        revenue: 1234567,
      },
    ];
    const text = formatConsignmentReport("2026-07-10", "○○サークル", rows);
    expect(text).toContain("売上 ¥1,234,567");
    expect(text).toContain("売上合計: ¥1,234,567");
  });
});
