import { expect, test } from "@playwright/test";
import { SAMPLE_ITEM, seedItems } from "./local-data";

// docs/spec/バーコードのカメラ読み取り.md の「確かめ方」。
// ISDN の欄（AddByISDN）は、商品マスタの画面で確かめる
test.beforeEach(async ({ page }) => {
  await seedItems(page, [SAMPLE_ITEM]);
  await page.goto("/items");
});

test("商品マスタの ISDN の欄に、「カメラ」ボタンを表示する", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: "カメラ", exact: true }),
  ).toBeVisible();
});

test("商品マスタの ISDN の欄で、「カメラ」ボタンの文字は改行しない", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "カメラ", exact: true }),
  ).toHaveCSS("white-space", "nowrap");
});

test("商品マスタの ISDN の欄で、「カメラ」ボタンでダイアログが開き、「閉じる」で閉じる", async ({
  page,
}) => {
  await page.getByRole("button", { name: "カメラ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(dialog).toHaveCount(0);
});
