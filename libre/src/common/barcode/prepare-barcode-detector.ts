import {
  BarcodeDetector as PonyfillBarcodeDetector,
  prepareZXingModule,
} from "barcode-detector/ponyfill";
import zxingReaderWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

const overrides = {
  // 既定は jsDelivr の CDN から取得する。会場はオフラインなので、ビルドに含めた `.wasm` を使う。
  locateFile: (path: string, prefix: string) =>
    path.endsWith(".wasm") ? zxingReaderWasmUrl : prefix + path,
};

/**
 * ブラウザ標準の `BarcodeDetector` を返す。持たないブラウザでは、`barcode-detector` の実装を返す。
 * `barcode-detector/polyfill` を import すると、import しただけで `globalThis` に実装が入り、
 * 標準を持つかどうかを判別できなくなる。そのため、副作用のない `ponyfill` を使う。
 */
export function getBarcodeDetector(): typeof PonyfillBarcodeDetector {
  return (
    (globalThis.BarcodeDetector as typeof PonyfillBarcodeDetector | undefined) ??
    PonyfillBarcodeDetector
  );
}

/**
 * アプリの起動時に 1 回呼ぶ。`.wasm` の場所をビルドに含めたものに向け、
 * ブラウザが `BarcodeDetector` を持たないときは、オフラインになる前に読み込んでおく。
 */
export function setupBarcodeDetector(): void {
  // `fireImmediately` なしでは読み込まず、`.wasm` の場所だけを設定する
  prepareZXingModule({ overrides });
  if (globalThis.BarcodeDetector) return;
  prepareZXingModule({ overrides, fireImmediately: true });
}
