import { expect, test, type Page } from "@playwright/test";

const primary = (page: Page) =>
  page.evaluate<string>(
    `getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()`,
  );

test("ツールバーの既定では、html の --primary が赤になる", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-button--primary&viewMode=story");
  await expect.poll(() => primary(page)).toBe("#e9004a");
});

test("globals で別の色を選ぶと、html の --primary がその色になる", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-button--primary&viewMode=story&globals=color:green");
  await expect.poll(() => primary(page)).toBe("#008814");
});

test("Autodocs の説明ページが開ける", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-button--docs&viewMode=docs");
  await expect(page.locator(".sbdocs-content")).toBeVisible();
});

test("説明ページの文字が BIZ UDPGothic で描かれる", async ({ page }) => {
  await page.goto(`/iframe.html?id=${encodeURIComponent("基本デザイン-タイポグラフィ--docs")}&viewMode=docs`);
  await page.locator(".sbdocs-content").waitFor();
  await page.evaluate("document.fonts.ready");
  // Google Fonts に届かない環境では、代わりのフォントで描かれて false になる
  const loaded = await page.evaluate("document.fonts.check('16px \"BIZ UDPGothic\"', 'フォント') && Array.from(document.fonts).some((f) => f.family.includes('BIZ UDPGothic') && f.status === 'loaded')");
  expect(loaded).toBe(true);
});
