import { expect, test, type Page } from "@playwright/test";

/** 表の見出しの行が描かれ、表の中の 1 行に文言が出ている */
async function expectEmptyTable(
  page: Page,
  headers: string[],
  message: string,
) {
  for (const name of headers) {
    await expect(
      page.getByRole("columnheader", { name, exact: true }),
    ).toBeVisible();
  }
  const cell = page.locator("[data-slot=table-empty]");
  await expect(cell).toHaveCount(1);
  await expect(cell).toHaveText(message);
  await expect(cell).toHaveAttribute("colspan", String(headers.length));
}

test("商品一覧: 商品がないとき、見出しの行と、どうすれば出るかを書いた 1 行を出す", async ({
  page,
}) => {
  await page.goto("/items");
  await expectEmptyTable(
    page,
    ["商品ID", "商品名", "サークル", "価格"],
    "商品がありません。「新規商品を追加」から追加できます。",
  );
});

test("即売会の一覧: 履歴がないとき、句点で終わる文を出す", async ({ page }) => {
  await page.goto("/event");
  await expectEmptyTable(
    page,
    ["即売会", "開催日"],
    "過去のイベント記録がありません。イベント終了の画面で「履歴に保存」を押すと、ここに表示されます。",
  );
});
