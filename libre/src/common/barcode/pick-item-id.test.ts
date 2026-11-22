import { describe, expect, it } from "vitest";
import { pickItemId } from "./pick-item-id";

// 278 で始まる、チェックディジットの正しい商品 ID
const ITEM_ID = "2784702901978";
const OTHER_ITEM_ID = "2710000000006";

// 線の位置は高さの半分（240）、横の中心は 320
const FRAME = { width: 640, height: 480 };

/** 線にかかり、横の中心が `centerX` にある boundingBox */
const onLine = (centerX: number) => ({
  x: centerX - 50,
  y: 200,
  width: 100,
  height: 80,
});

describe("pickItemId", () => {
  it("EAN-13 で商品 ID の形式に合い、線にかかる値を読んだら、その値を返す", () => {
    expect(
      pickItemId(
        [{ format: "ean_13", rawValue: ITEM_ID, boundingBox: onLine(320) }],
        FRAME,
      ),
    ).toBe(ITEM_ID);
  });

  it("EAN-13 以外の形式は、商品 ID の形式に合う値でも無視する", () => {
    expect(
      pickItemId(
        [{ format: "code_128", rawValue: ITEM_ID, boundingBox: onLine(320) }],
        FRAME,
      ),
    ).toBeNull();
  });

  it("商品 ID の形式に合わない値は無視し、後に読んだ形式に合う値を返す", () => {
    expect(
      pickItemId(
        [
          // チェックディジットが誤り
          {
            format: "ean_13",
            rawValue: "2784702901979",
            boundingBox: onLine(320),
          },
          // 271/278/279 以外で始まる（価格を表すバーコードなど）
          {
            format: "ean_13",
            rawValue: "4901234567894",
            boundingBox: onLine(320),
          },
          { format: "ean_13", rawValue: ITEM_ID, boundingBox: onLine(320) },
        ],
        FRAME,
      ),
    ).toBe(ITEM_ID);
  });

  it("形式に合う値がなければ null を返す", () => {
    expect(pickItemId([], FRAME)).toBeNull();
    expect(
      pickItemId(
        [
          {
            format: "ean_13",
            rawValue: "2784702901979",
            boundingBox: onLine(320),
          },
        ],
        FRAME,
      ),
    ).toBeNull();
  });

  describe("線にかかるか", () => {
    const pick = (box: { y: number; height: number }) =>
      pickItemId(
        [
          {
            format: "ean_13",
            rawValue: ITEM_ID,
            boundingBox: { x: 270, width: 100, ...box },
          },
        ],
        FRAME,
      );

    it("上端が線より下にあるバーコードは無視する", () => {
      expect(pick({ y: 241, height: 50 })).toBeNull();
    });

    it("下端が線より上にあるバーコードは無視する", () => {
      expect(pick({ y: 150, height: 89 })).toBeNull();
    });

    it("上端が線の位置のバーコードは読む", () => {
      expect(pick({ y: 240, height: 50 })).toBe(ITEM_ID);
    });

    it("下端が線の位置のバーコードは読む", () => {
      expect(pick({ y: 190, height: 50 })).toBe(ITEM_ID);
    });

    it("線の位置は、フレームの高さの半分で決める", () => {
      expect(
        pickItemId(
          [
            {
              format: "ean_13",
              rawValue: ITEM_ID,
              boundingBox: { x: 0, y: 240, width: 100, height: 50 },
            },
          ],
          { width: 640, height: 1000 },
        ),
      ).toBeNull();
    });

    it("線にかからない値は無視し、線にかかる後の値を返す", () => {
      expect(
        pickItemId(
          [
            {
              format: "ean_13",
              rawValue: ITEM_ID,
              boundingBox: { x: 270, y: 0, width: 100, height: 50 },
            },
            {
              format: "ean_13",
              rawValue: OTHER_ITEM_ID,
              boundingBox: onLine(0),
            },
          ],
          FRAME,
        ),
      ).toBe(OTHER_ITEM_ID);
    });
  });

  describe("2 つ以上あるとき", () => {
    it("boundingBox の横の中心が、フレームの横の中心に最も近いものを選ぶ", () => {
      expect(
        pickItemId(
          [
            { format: "ean_13", rawValue: ITEM_ID, boundingBox: onLine(100) },
            {
              format: "ean_13",
              rawValue: OTHER_ITEM_ID,
              boundingBox: onLine(300),
            },
          ],
          FRAME,
        ),
      ).toBe(OTHER_ITEM_ID);
    });

    it("中心より右にあるものも、距離で比べる", () => {
      expect(
        pickItemId(
          [
            { format: "ean_13", rawValue: ITEM_ID, boundingBox: onLine(500) },
            {
              format: "ean_13",
              rawValue: OTHER_ITEM_ID,
              boundingBox: onLine(350),
            },
          ],
          FRAME,
        ),
      ).toBe(OTHER_ITEM_ID);
    });

    it("距離が同じなら、読まれた順で先のものを選ぶ", () => {
      expect(
        pickItemId(
          [
            { format: "ean_13", rawValue: ITEM_ID, boundingBox: onLine(220) },
            {
              format: "ean_13",
              rawValue: OTHER_ITEM_ID,
              boundingBox: onLine(420),
            },
          ],
          FRAME,
        ),
      ).toBe(ITEM_ID);
    });
  });
});
