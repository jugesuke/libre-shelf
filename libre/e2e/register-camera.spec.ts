import { expect, test } from "@playwright/test";
import { SAMPLE_ITEM, seedItems, seedSession, sessionFixture } from "./local-data";

test.beforeEach(async ({ page }) => {
  await seedItems(page, [SAMPLE_ITEM]);
  await seedSession(page, sessionFixture());
  await page.goto("/event/session");
});

test("レジで、「カメラ」ボタンは、バーコードと手打ちのときに表示し、一覧から選択のときは表示しない", async ({
  page,
}) => {
  const camera = page.getByRole("button", { name: "カメラ", exact: true });

  await expect(camera).toBeVisible();

  await page.getByRole("button", { name: "手打ち" }).click();
  await expect(camera).toBeVisible();

  await page.getByRole("button", { name: "一覧から選択" }).click();
  await expect(camera).toHaveCount(0);

  await page.getByRole("button", { name: "バーコード", exact: true }).click();
  await expect(camera).toBeVisible();
});

test("レジで、「カメラ」ボタンの文字は改行しない", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: "カメラ", exact: true }),
  ).toHaveCSS("white-space", "nowrap");
});

test("レジで、カメラのモーダルは上端に揃えて表示する", async ({ page }) => {
  await page.getByRole("button", { name: "カメラ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const box = await dialog.boundingBox();
  // 上端に揃えると上の余白は 16 px。中央に置くと、これより大きく空く
  expect(box?.y).toBeLessThanOrEqual(32);
});

test("レジで、カメラのモーダルを閉じたあと、入力欄にフォーカスが戻る", async ({
  page,
}) => {
  const input = page.getByPlaceholder("バーコードをスキャン");
  await page.getByRole("button", { name: "カメラ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(input).not.toBeFocused();

  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(input).toBeFocused();
});

test("レジの商品・価格編集で、カメラのモーダルが外側のモーダルに隠れず、閉じても外側は残る", async ({
  page,
}) => {
  await page.getByRole("button", { name: "商品・価格編集" }).click();
  const outer = page.getByRole("dialog", { name: "商品・価格編集" });
  await outer.getByRole("button", { name: "カメラ", exact: true }).click();

  // 外側の商品・価格編集のモーダルも dialog なので、カメラのモーダルを名前で選ぶ
  const dialog = page.getByRole("dialog", { name: "カメラでバーコードを読む" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  // click は、押す位置に別の要素が重なっていると待つ。隠れていれば失敗する
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(outer).toBeVisible();
});
