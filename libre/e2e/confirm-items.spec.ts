import { expect, test, type Page } from "@playwright/test";
import {
  failRequests,
  recordRequests,
  trackNativeDialogs,
} from "./confirm-helpers";
import {
  failLocalStorageWrites,
  readLocalStorage,
  SAMPLE_ITEM,
  seedItems,
} from "./local-data";
import { mockApi } from "./mock-api";

const ISDN_ITEM = {
  ...SAMPLE_ITEM,
  item_id: "2784702901978",
  product_name: "みほん同人誌",
};

const ISDN_PATH = `/api/v1/isdn/${ISDN_ITEM.item_id}`;

const storedIds = async (page: Page) =>
  ((await readLocalStorage(page, "items")) as { item_id: string }[]).map(
    (i) => i.item_id,
  );

test.beforeEach(async ({ page }) => {
  await mockApi(page, {
    [ISDN_PATH]: { ...ISDN_ITEM, product_name: "ISDN の商品名" },
  });
  await seedItems(page, [SAMPLE_ITEM, ISDN_ITEM]);
});

const openDeleteConfirm = async (page: Page) => {
  await page.goto("/items");
  await page.getByText("テスト本").first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "削除", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "商品の削除" });
  await expect(dialog).toBeVisible();
  return dialog;
};

const openDetail = async (page: Page) => {
  await page.goto("/items");
  await page.getByText("みほん同人誌").first().click();
  const detail = page.getByRole("dialog", { name: "商品詳細" });
  await expect(detail).toBeVisible();
  return detail;
};

test("商品管理: 削除を押すと確認のモーダルが出て、ID ではなく商品名などで対象を示す。confirm() は出ない", async ({
  page,
}) => {
  const native = trackNativeDialogs(page);
  const dialog = await openDeleteConfirm(page);

  await expect(dialog.getByText("テスト本")).toBeVisible();
  await expect(dialog.getByText("テストサークル")).toBeVisible();
  await expect(dialog.getByText(SAMPLE_ITEM.item_id)).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "やめる" })).toBeFocused();
  expect(native).toEqual([]);
  expect(await storedIds(page)).toEqual([SAMPLE_ITEM.item_id, ISDN_ITEM.item_id]);
});

test("商品管理: 「やめる」では商品を削除しない", async ({ page }) => {
  const dialog = await openDeleteConfirm(page);
  await dialog.getByRole("button", { name: "やめる" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await storedIds(page)).toEqual([SAMPLE_ITEM.item_id, ISDN_ITEM.item_id]);
});

test("商品管理: 確定で商品を削除し、モーダルを閉じる", async ({ page }) => {
  const dialog = await openDeleteConfirm(page);
  await dialog.getByRole("button", { name: "削除", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await storedIds(page)).toEqual([ISDN_ITEM.item_id]);
});

test("商品管理: 削除に失敗したとき、確認のモーダルの中のボタンの下にメッセージを出し、モーダルを閉じない", async ({
  page,
}) => {
  await failLocalStorageWrites(page, "items");
  const dialog = await openDeleteConfirm(page);
  const button = dialog.getByRole("button", { name: "削除", exact: true });
  await button.click();

  const alert = dialog.getByRole("alert");
  await expect(alert).toHaveText("商品を保存できませんでした。端末の空き容量を確認してください。");
  await expect(dialog).toBeVisible();
  const a = await alert.boundingBox();
  const b = await button.boundingBox();
  expect(a!.y).toBeGreaterThanOrEqual(b!.y + b!.height);
});

test("商品管理: 「ISDNから取得」を押すと、確認せずにすぐ ISDN の情報で上書きし、詳細に出す", async ({
  page,
}) => {
  const native = trackNativeDialogs(page);
  const syncs = await recordRequests(page, "GET", ISDN_PATH);
  const detail = await openDetail(page);
  await detail.getByRole("button", { name: "ISDNから取得" }).click();

  await expect(detail.getByText("ISDN の商品名")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  expect(native).toEqual([]);
  expect(syncs).toHaveLength(1);
});

test("商品管理: ISDN からの取得に失敗したとき、詳細のダイアログの下部のボタンの下にメッセージを出す", async ({
  page,
}) => {
  await failRequests(page, "GET", ISDN_PATH);
  const detail = await openDetail(page);
  const button = detail.getByRole("button", { name: "ISDNから取得" });
  await button.click();

  const alert = page.getByRole("alert").filter({ hasText: "商品の情報を取得できませんでした" });
  await expect(alert).toHaveText("商品の情報を取得できませんでした。通信状態を確認して、もう一度取得してください。");
  await expect(detail).toBeVisible();
  const a = await alert.boundingBox();
  const b = await button.boundingBox();
  expect(a!.y).toBeGreaterThanOrEqual(b!.y + b!.height);
});
