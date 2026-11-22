import { expect, test, type Page } from "@playwright/test";

const open = (page: Page) =>
  page.goto("/iframe.html?id=ui-badge--all&viewMode=story");

const VARIANTS = [
  {
    name: "成功",
    text: "入荷",
    background: "rgb(240, 253, 244)",
    foreground: "rgb(0, 130, 54)",
  },
  {
    name: "警告",
    text: "イベント",
    background: "rgb(255, 251, 235)",
    foreground: "rgb(187, 77, 0)",
  },
  {
    name: "情報",
    text: "移動",
    background: "rgb(239, 246, 255)",
    foreground: "rgb(21, 93, 252)",
  },
  {
    name: "灰色",
    text: "倉庫",
    background: "rgb(243, 244, 246)",
    foreground: "rgb(74, 85, 101)",
  },
] as const;

const badgeWith = (page: Page, text: string) =>
  page.locator("[data-slot=badge]").filter({ hasText: text });

for (const v of VARIANTS) {
  test(`${v.name}: 面は薄い面の色、文字はその意味の色`, async ({ page }) => {
    await open(page);
    const badge = badgeWith(page, v.text);
    await expect(badge).toHaveCSS("background-color", v.background);
    await expect(badge).toHaveCSS("color", v.foreground);
  });
}

test("variant を省いたときは灰色", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-badge--default&viewMode=story");
  const badge = badgeWith(page, "倉庫");
  await expect(badge).toHaveCSS("background-color", "rgb(243, 244, 246)");
  await expect(badge).toHaveCSS("color", "rgb(74, 85, 101)");
});

// 高さ 20px の半分は 10px。Chrome は rounded-full（9999px）の角丸を 3.35544e+07px のように指数表記で返すので、その形も通す
const HALF_OF_HEIGHT_OR_MORE = /^(\d{2,}(\.\d+)?|\d+(\.\d+)?e\+\d+)px$/;

test("丸い札: 角丸が高さの半分以上", async ({ page }) => {
  await open(page);
  for (const v of VARIANTS) {
    await expect(badgeWith(page, v.text)).toHaveCSS(
      "border-top-left-radius",
      HALF_OF_HEIGHT_OR_MORE,
    );
  }
});

test("文字は 12px、高さは 20px、左右の内側の余白は 8px", async ({ page }) => {
  await open(page);
  for (const v of VARIANTS) {
    const badge = badgeWith(page, v.text);
    await expect(badge).toHaveCSS("font-size", "12px");
    await expect(badge).toHaveCSS("padding-left", "8px");
    await expect(badge).toHaveCSS("padding-right", "8px");
    const box = await badge.boundingBox();
    expect(box?.height).toBe(20);
  }
});
