import { expect, test } from "@playwright/test";
import { formatSessionTime as toOffsetIso } from "../src/common/event-session/session-time";
import {
  NO_COINS,
  SAMPLE_ITEM,
  seedItems,
  seedSession,
  sessionFixture,
} from "./local-data";

test.beforeEach(async ({ page }) => {
  await seedItems(page, [SAMPLE_ITEM]);
  await seedSession(
    page,
    sessionFixture({
      transactions: [
        {
          transactionId: "t-1",
          occurredAt: toOffsetIso(new Date(2026, 10, 17, 11, 5)),
          buyerType: "stranger",
          items: [{ itemId: SAMPLE_ITEM.item_id, productName: SAMPLE_ITEM.product_name, price: 500, quantity: 2 }],
          tendered: { ...NO_COINS, "1000yen": 1 },
          changeAmount: 0,
          cancelled: false,
        },
      ],
    }),
  );
});

test("商品の詳細を開くと、見出しにフォーカスがある", async ({ page }) => {
  await page.goto("/items");
  await page.getByText("テスト本").first().click();
  const dialog = page.getByRole("dialog", { name: "商品詳細" });
  await expect(dialog.getByRole("heading", { name: "商品詳細" })).toBeFocused();
});

test("商品の詳細で編集を押すと、保存ボタンにフォーカスが移る", async ({
  page,
}) => {
  await page.goto("/items");
  await page.getByText("テスト本").first().click();
  const dialog = page.getByRole("dialog", { name: "商品詳細" });
  await dialog.getByRole("button", { name: "編集", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "商品編集" }).getByRole("button", {
      name: "保存",
      exact: true,
    }),
  ).toBeFocused();
});

test("レジの会計一覧を開くと、見出しにフォーカスがある", async ({ page }) => {
  await page.goto("/event/session");
  await page.getByRole("button", { name: /^会計一覧/ }).click();
  const dialog = page.getByRole("dialog", { name: "会計一覧" });
  await expect(dialog.getByRole("heading", { name: "会計一覧" })).toBeFocused();
});

test("レジの集計確認を開くと、見出しにフォーカスがある", async ({ page }) => {
  await page.goto("/event/session");
  await page.getByRole("button", { name: "集計確認" }).click();
  const dialog = page.getByRole("dialog", { name: "集計" });
  await expect(dialog.getByRole("heading", { name: "集計" })).toBeFocused();
});
