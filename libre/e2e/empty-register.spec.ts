import { expect, test, type Locator } from "@playwright/test";
import { seedItems, SAMPLE_ITEM, seedSession, sessionFixture } from "./local-data";

/** 見出しの行が描かれ、表の中の 1 行に文言が出ている */
async function expectEmptyTable(
  scope: Locator,
  headers: string[],
  message: string,
) {
  for (const name of headers) {
    await expect(
      scope.getByRole("columnheader", { name, exact: true }),
    ).toBeVisible();
  }
  const cell = scope.locator("[data-slot=table-empty]");
  await expect(cell).toHaveCount(1);
  await expect(cell).toHaveText(message);
}

test.beforeEach(async ({ page }) => {
  await seedItems(page, [SAMPLE_ITEM]);
  await seedSession(page, sessionFixture({ menu: [] }));
  await page.goto("/event/session");
});

test("レジのカート: 商品がないとき、見出しの行と、どうすれば出るかを書いた 1 行を出す", async ({
  page,
}) => {
  await expectEmptyTable(
    page.locator("body"),
    ["商品名", "単価", "数量", "小計"],
    "カートに商品がありません。バーコードを読み取るか、商品を選ぶと追加されます。",
  );
});

test("会計一覧: 会計がないとき、見出しの行と、どうすれば出るかを書いた 1 行を出す", async ({
  page,
}) => {
  await page.getByRole("button", { name: "会計一覧" }).click();
  await expectEmptyTable(
    page.getByRole("dialog", { name: "会計一覧" }),
    ["時刻・区分", "商品", "合計"],
    "会計がありません。「知り合い」か「知り合い以外」で会計すると表示されます。",
  );
});

test("おしながき: 商品がないとき、見出しの行と、どうすれば出るかを書いた 1 行を出す", async ({
  page,
}) => {
  await page.getByRole("button", { name: "商品・価格編集" }).click();
  await expectEmptyTable(
    page.getByRole("dialog", { name: "商品・価格編集" }),
    ["商品名", "価格", "委託元", "預かり部数"],
    "商品がありません。「既存商品を追加」か「新規商品を登録」から追加できます。",
  );
});

test("集計確認: 会計がないとき、総売上を ¥0 にし、グラフの場所に文を出す", async ({
  page,
}) => {
  await page.getByRole("button", { name: "集計確認" }).click();
  const summary = page
    .getByRole("dialog", { name: "集計" })
    .locator("[data-slot=empty-summary]");
  await expect(summary.getByText("¥0")).toBeVisible();
  const messages = summary.locator("[data-slot=empty-chart]");
  await expect(messages).toHaveText([
    "まだ会計記録がありません。レジで会計すると表示されます。",
    "まだ会計記録がありません。レジで会計すると表示されます。",
  ]);
  expect((await messages.nth(0).boundingBox())!.height).toBe(76);
  expect((await messages.nth(1).boundingBox())!.height).toBe(200);
});
