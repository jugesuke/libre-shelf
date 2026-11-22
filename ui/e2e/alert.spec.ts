import { expect, test, type Page } from "@playwright/test";

const open = (page: Page) => page.goto("/iframe.html?id=ui-alert--all&viewMode=story");

const VARIANTS = [
  {
    name: "危険",
    text: "保存できませんでした",
    background: "rgb(254, 242, 242)",
    foreground: "rgb(193, 0, 7)",
    role: "alert",
  },
  {
    name: "成功",
    text: "保存しました",
    background: "rgb(240, 253, 244)",
    foreground: "rgb(0, 130, 54)",
    role: "status",
  },
  {
    name: "警告",
    text: "まだ反映していません",
    background: "rgb(255, 251, 235)",
    foreground: "rgb(187, 77, 0)",
    role: "alert",
  },
  {
    name: "情報",
    text: "商品を選んでください",
    background: "rgb(239, 246, 255)",
    foreground: "rgb(21, 93, 252)",
    role: "status",
  },
] as const;

const alertWith = (page: Page, text: string) =>
  page.locator("[data-slot=alert]").filter({ hasText: text });

for (const v of VARIANTS) {
  test(`${v.name}: 面は薄い面の色、文字はその意味の色`, async ({ page }) => {
    await open(page);
    const alert = alertWith(page, v.text);
    await expect(alert).toHaveCSS("background-color", v.background);
    await expect(alert).toHaveCSS("color", v.foreground);
  });
}

for (const v of VARIANTS) {
  test(`${v.name}: role=${v.role}`, async ({ page }) => {
    await open(page);
    await expect(alertWith(page, v.text)).toHaveAttribute("role", v.role);
  });
}

test("文字は 14px、内側の余白は上下 8px と左右 12px、角丸は 6px", async ({ page }) => {
  await open(page);
  for (const v of VARIANTS) {
    const alert = alertWith(page, v.text);
    await expect(alert).toHaveCSS("font-size", "14px");
    await expect(alert).toHaveCSS("padding-top", "8px");
    await expect(alert).toHaveCSS("padding-bottom", "8px");
    await expect(alert).toHaveCSS("padding-left", "12px");
    await expect(alert).toHaveCSS("padding-right", "12px");
    await expect(alert).toHaveCSS("border-top-left-radius", "6px");
  }
});

test("左の線や枠線はない（枠線の幅は 0）", async ({ page }) => {
  await open(page);
  for (const v of VARIANTS) {
    const alert = alertWith(page, v.text);
    await expect(alert).toHaveCSS("border-top-width", "0px");
    await expect(alert).toHaveCSS("border-right-width", "0px");
    await expect(alert).toHaveCSS("border-bottom-width", "0px");
    await expect(alert).toHaveCSS("border-left-width", "0px");
  }
});
