import type { DetectedBarcode } from "barcode-detector";
import { validateItemID } from "@libre-shared/entity/items/item_id";

export type ReadBarcode = Pick<DetectedBarcode, "format" | "rawValue"> & {
  boundingBox: Pick<DOMRectReadOnly, "x" | "y" | "width" | "height">;
};

/** 映像のフレームの画素の大きさ（`video.videoWidth` と `video.videoHeight`） */
export type FrameSize = { width: number; height: number };

/**
 * 1 フレームで読んだバーコードから、出力に渡す商品 ID を選ぶ。
 * EAN-13 で、商品 ID の形式に合い、フレームの上下の真ん中の線にかかる値だけを対象にする。
 * 対象が複数あれば、横の中心がフレームの横の中心に最も近いものを選び、距離が同じなら読まれた順で先のものを選ぶ。
 * 対象がなければ null を返す。
 */
export function pickItemId(
  barcodes: readonly ReadBarcode[],
  frame: FrameSize,
): string | null {
  const lineY = frame.height / 2;
  const distance = (b: ReadBarcode) =>
    Math.abs(b.boundingBox.x + b.boundingBox.width / 2 - frame.width / 2);

  const best = barcodes
    .filter(
      (b) =>
        b.format === "ean_13" &&
        validateItemID(b.rawValue) &&
        b.boundingBox.y <= lineY &&
        b.boundingBox.y + b.boundingBox.height >= lineY,
    )
    .reduce<ReadBarcode | null>(
      (acc, b) => (acc === null || distance(b) < distance(acc) ? b : acc),
      null,
    );
  return best?.rawValue ?? null;
}
