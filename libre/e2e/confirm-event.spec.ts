import { expect, test, type Page } from "@playwright/test";
import { formatSessionTime as toOffsetIso } from "../src/common/event-session/session-time";
import { trackNativeDialogs } from "./confirm-helpers";
import {
  SAMPLE_ITEM,
  NO_COINS,
  seedItems,
  seedSession,
  sessionFixture,
} from "./local-data";

const OCCURRED_AT = toOffsetIso(new Date(2026, 10, 17, 11, 5));

const TRANSACTION = {
  transactionId: "t-1",
  occurredAt: OCCURRED_AT,
  buyerType: "stranger" as const,
  items: [{ itemId: SAMPLE_ITEM.item_id, productName: SAMPLE_ITEM.product_name, price: 500, quantity: 2 }],
  tendered: { ...NO_COINS, "1000yen": 1 },
  changeAmount: 0,
  cancelled: false,
};

test.beforeEach(async ({ page }) => {
  await seedItems(page, [SAMPLE_ITEM]);
  await seedSession(page, sessionFixture({ transactions: [TRANSACTION] }));
});

const openConfirm = async (page: Page) => {
  await page.goto("/event/session");
  await page.getByRole("button", { name: /^会計一覧/ }).click();
  const list = page.getByRole("dialog", { name: "会計一覧" });
  await list.getByRole("button", { name: "取り消す" }).click();
  const dialog = page.getByRole("dialog", { name: "会計の取り消し" });
  await expect(dialog).toBeVisible();
  return { list, dialog };
};

test("レジ: 会計の取り消しを押すと、会計一覧の上に確認のモーダルが出て、時刻と区分と合計で対象を示す。confirm() は出ない", async ({
  page,
}) => {
  const native = trackNativeDialogs(page);
  const { dialog } = await openConfirm(page);

  await expect(dialog.getByText("11:05")).toBeVisible();
  await expect(dialog.getByText("知り合い以外")).toBeVisible();
  await expect(dialog.getByText("¥1,000")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "やめる" })).toBeFocused();
  await expect(dialog.getByRole("button", { name: "取り消す" })).toBeVisible();
  expect(native).toEqual([]);
});

test("レジ: 「やめる」では会計を取り消さず、会計一覧が残る", async ({
  page,
}) => {
  const { list, dialog } = await openConfirm(page);
  await dialog.getByRole("button", { name: "やめる" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(list.getByRole("button", { name: "取り消す" })).toBeVisible();
  await expect(list.getByText("取り消し済み")).toHaveCount(0);
});

test("レジ: 確定で会計を取り消し、確認のモーダルだけを閉じる", async ({
  page,
}) => {
  const { list, dialog } = await openConfirm(page);
  await dialog.getByRole("button", { name: "取り消す" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(list.getByText("取り消し済み")).toBeVisible();
});
