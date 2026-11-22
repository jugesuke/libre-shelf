import { expect, test, type Page } from "@playwright/test";

const open = (page: Page, id: string) => page.goto(`/iframe.html?id=${id}&viewMode=story`);

// 即売会の画面の色（story の decorator が設定する --ring）
const RING = "rgb(233, 0, 74)";

test("押した選択肢が選ばれた状態になる", async ({ page }) => {
  await open(page, "ui-tabs--default");
  await page.getByRole("tab", { name: "新規入力" }).click();
  await expect(page.getByRole("tab", { name: "新規入力" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "一覧から選択" })).toHaveAttribute("aria-selected", "false");
});

test("選んでいる側は 3px の --ring の下線と --foreground の太字", async ({ page }) => {
  await open(page, "ui-tabs--default");
  const selected = page.getByRole("tab", { name: "一覧から選択" });
  await expect(selected).toHaveCSS("border-bottom-width", "3px");
  await expect(selected).toHaveCSS("border-bottom-color", RING);
  await expect(selected).toHaveCSS("color", "rgb(16, 24, 40)");
  await expect(selected).toHaveCSS("font-weight", "700");
});

test("選んでいない側は --muted-foreground の標準の文字", async ({ page }) => {
  await open(page, "ui-tabs--default");
  const other = page.getByRole("tab", { name: "新規入力" });
  await expect(other).toHaveCSS("color", "rgb(74, 85, 101)");
  await expect(other).toHaveCSS("font-weight", "400");
});

test("高さは 36px、文字は 14px", async ({ page }) => {
  await open(page, "ui-tabs--default");
  const tab = page.getByRole("tab", { name: "一覧から選択" });
  expect((await tab.boundingBox())?.height).toBe(36);
  await expect(tab).toHaveCSS("font-size", "14px");
});

test("タブの並びの下に --border の線がある", async ({ page }) => {
  await open(page, "ui-tabs--default");
  const list = page.getByRole("tablist");
  await expect(list).toHaveCSS("border-bottom-color", "rgb(209, 213, 220)");
  await expect(list).toHaveCSS("border-bottom-width", "1px");
});
