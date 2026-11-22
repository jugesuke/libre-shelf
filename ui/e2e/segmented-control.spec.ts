import { expect, test, type Page } from "@playwright/test";

const open = (page: Page, id: string) => page.goto(`/iframe.html?id=${id}&viewMode=story`);

// 即売会の画面の色（story の decorator が設定する --primary と --primary-foreground）
const PRIMARY = "rgb(233, 0, 74)";
const PRIMARY_FOREGROUND = "rgb(255, 255, 255)";

test("押した選択肢が選ばれた状態になる", async ({ page }) => {
  await open(page, "ui-segmentedcontrol--default");
  await page.getByRole("button", { name: "直接入力" }).click();
  await expect(page.getByRole("button", { name: "直接入力" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "バーコード" })).toHaveAttribute("aria-pressed", "false");
});

test("選んでいる側の面が --primary、文字が --primary-foreground の太字", async ({ page }) => {
  await open(page, "ui-segmentedcontrol--default");
  const selected = page.getByRole("button", { name: "バーコード" });
  await expect(selected).toHaveCSS("background-color", PRIMARY);
  await expect(selected).toHaveCSS("color", PRIMARY_FOREGROUND);
  await expect(selected).toHaveCSS("font-weight", "700");
});

test("選んでいない側は白い面", async ({ page }) => {
  await open(page, "ui-segmentedcontrol--default");
  await expect(page.getByRole("button", { name: "直接入力" })).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("黄の色の面と文字になる", async ({ page }) => {
  await open(page, "ui-segmentedcontrol--yellow");
  const selected = page.getByRole("button", { name: "バーコード" });
  await expect(selected).toHaveCSS("background-color", "rgb(253, 199, 0)");
  await expect(selected).toHaveCSS("color", "rgb(16, 24, 40)");
});

test("高さは 32px、文字は 14px", async ({ page }) => {
  await open(page, "ui-segmentedcontrol--default");
  const button = page.getByRole("button", { name: "バーコード" });
  expect((await button.boundingBox())?.height).toBe(32);
  await expect(button).toHaveCSS("font-size", "14px");
});

test("幅は中身の幅で、横幅いっぱいに伸びない", async ({ page }) => {
  await open(page, "ui-segmentedcontrol--default");
  const buttons = page.getByRole("button");
  const first = await buttons.nth(0).boundingBox();
  const last = await buttons.nth(1).boundingBox();
  const total = last!.x + last!.width - first!.x;
  const viewport = page.viewportSize()!.width;
  expect(total).toBeLessThan(viewport / 2);
});
