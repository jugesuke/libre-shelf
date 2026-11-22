import { expect, test, type Page } from "@playwright/test";

const open = (page: Page, id: string) => page.goto(`/iframe.html?id=${id}&viewMode=story`);

const box = async (page: Page, slot: string) => {
  const b = await page.locator(`[data-slot=${slot}]`).boundingBox();
  if (!b) throw new Error(`${slot} の boundingBox が取れなかった`);
  return b;
};

for (const [id, max] of [
  ["ui-page--wide", 1200],
  ["ui-page--narrow", 672],
  ["ui-page--default", 1200],
] as const) {
  test(`${id} は最大 ${max}px で中央に寄る`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await open(page, id);
    const b = await box(page, "page");
    expect(b.width).toBe(max);
    expect(b.x).toBeCloseTo(1920 - (b.x + b.width), 0);
  });
}

for (const [width, padding] of [
  [767, "12px"],
  [768, "24px"],
] as const) {
  test(`ビューポートが ${width}px のとき内側の余白は ${padding}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "ui-page--wide");
    const el = page.locator("[data-slot=page]");
    for (const side of ["top", "right", "bottom", "left"]) {
      await expect(el).toHaveCSS(`padding-${side}`, padding);
    }
  });
}

test("見出しは 24px の太字", async ({ page }) => {
  await open(page, "ui-page--wide");
  const title = page.locator("[data-slot=page-title]");
  await expect(title).toHaveText("商品一覧");
  await expect(title).toHaveCSS("font-size", "24px");
  await expect(title).toHaveCSS("font-weight", "700");
});

test("md 以上では actions が見出しの行の右に出る", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "ui-page--wide");
  const title = await box(page, "page-title");
  const header = await box(page, "page-header");
  const actions = await box(page, "page-actions");
  expect(actions.x).toBeGreaterThanOrEqual(title.x + title.width);
  expect(actions.y).toBeLessThan(title.y + title.height);
  expect(actions.x + actions.width).toBeCloseTo(header.x + header.width, 0);
});

test("md 未満では actions が見出しの下に回る", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await open(page, "ui-page--wide");
  const title = await box(page, "page-title");
  const actions = await box(page, "page-actions");
  expect(actions.y).toBeGreaterThanOrEqual(title.y + title.height);
});

test("actions がないときは出さない", async ({ page }) => {
  await open(page, "ui-page--narrow");
  await expect(page.locator("[data-slot=page-actions]")).toHaveCount(0);
});
