import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_ITEM, seedItems } from "./local-data";

// docs/spec/ナビゲーション.md の「色」
const pages = [
  { path: "/event", primary: "#e9004a", foreground: "#ffffff", ring: "#e9004a" },
  { path: "/items", primary: "#008814", foreground: "#ffffff", ring: "#008814" },
  { path: "/data", primary: "#0073df", foreground: "#ffffff", ring: "#0073df" },
] as const;

// e2e/ の型には DOM がないので、ブラウザ側で動く関数は文字列で渡す
const readVars = (page: Page): Promise<Record<string, string>> =>
  page.evaluate(`(() => {
    const s = getComputedStyle(document.documentElement);
    const root = getComputedStyle(document.documentElement);
    const get = (c, n) => c.getPropertyValue(n).trim();
    return {
      primary: get(s, "--primary"),
      foreground: get(s, "--primary-foreground"),
      ring: get(s, "--ring"),
      rootPrimary: get(root, "--primary"),
      rootForeground: get(root, "--primary-foreground"),
      rootRing: get(root, "--ring"),
    };
  })()`);

for (const { path, primary, foreground, ring } of pages) {
  test(`${path} でhtml の --primary、--primary-foreground、--ring が画面の色になる`, async ({ page }) => {
    await page.goto(path);
    const v = await readVars(page);
    expect(v.primary.toLowerCase()).toBe(primary);
    expect(v.foreground.toLowerCase()).toBe(foreground);
    expect(v.ring.toLowerCase()).toBe(ring);
  });
}

// toHaveCSS は rgb() の文字列で比べるので、16 進の色を変換する
const hexToRgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

for (const { path, primary, foreground } of pages) {
  test(`${path} でメニューで選んでいる項目は、背景と文字が画面の色になる`, async ({ page }) => {
    await page.goto(path);
    const current = page.locator('[role="menuitem"][aria-current="page"]');
    await expect(current).toHaveCSS("background-color", hexToRgb(primary));
    await expect(current).toHaveCSS("color", hexToRgb(foreground));
  });
}

test("商品管理の詳細のモーダルの primary のボタンは、画面の色の面になる", async ({ page }) => {
  await seedItems(page, [SAMPLE_ITEM]);
  await page.goto("/items");
  await page.getByText(SAMPLE_ITEM.product_name).first().click();
  const button = page.getByRole("dialog").getByRole("button", { name: "編集" });
  await expect(button).toHaveCSS("background-color", "rgb(0, 136, 20)");
});
