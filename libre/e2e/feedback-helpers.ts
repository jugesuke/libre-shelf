import { expect, type Locator } from "@playwright/test";

/** 要素の位置と大きさ。失敗のアラートが出る前後で、ほかの要素が動かないことを比べるために使う */
export async function boxesOf(locators: Locator[]) {
  // Web フォントは display=swap で読み込むので、読み込みの前に測ると、あとで文字の幅が変わって位置がずれる
  await locators[0]?.page().evaluate("document.fonts.ready");
  return Promise.all(locators.map((l) => l.boundingBox()));
}

/** `alert` が `button` の左にそのまま置かれている（間は 12px、縦は `button` の範囲に収まる） */
export async function expectBeside(alert: Locator, button: Locator) {
  const a = await alert.boundingBox();
  const b = await button.boundingBox();
  expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x - 11);
  expect(a!.x + a!.width).toBeGreaterThanOrEqual(b!.x - 13);
  const center = a!.y + a!.height / 2;
  expect(center).toBeGreaterThanOrEqual(b!.y);
  expect(center).toBeLessThanOrEqual(b!.y + b!.height);
}

/** `alert` が `target` の下に出ている（重なっていない） */
export async function expectBelow(alert: Locator, target: Locator) {
  const a = await alert.boundingBox();
  const t = await target.boundingBox();
  expect(a!.y).toBeGreaterThanOrEqual(t!.y + t!.height);
}

/**
 * 浮かせた `alert` が、`target` の行のすぐ下に出ている。行の下端と三角の先の間が 4px で、
 * 三角は上に 6px はみ出すので、アラートの上端は `target` の下端から 10px 下になる
 */
export async function expectFloatingBelow(alert: Locator, target: Locator) {
  const a = await alert.boundingBox();
  const t = await target.boundingBox();
  expect(a!.y - (t!.y + t!.height)).toBeCloseTo(10, 0);
}

/** 失敗がないときに、フォームの下の右寄せのボタンの上に、何もない帯がない。`field` はボタンの直前の入力欄 */
export async function expectNoEmptyBand(field: Locator, button: Locator) {
  const f = await field.boundingBox();
  const b = await button.boundingBox();
  // ボタンの行は 56px で、ボタン（36px）は中央に置く。行の間の 12px を足しても 40px 未満
  expect(b!.y - (f!.y + f!.height)).toBeLessThan(40);
}

/** `b` が `a` からどれだけ離れているか。クリックでスクロールが動いても、要素どうしの位置が変わらないことを比べるために使う */
export async function offsetBetween(a: Locator, b: Locator) {
  const [boxA, boxB] = await boxesOf([a, b]);
  return { x: boxB!.x - boxA!.x, y: boxB!.y - boxA!.y };
}
