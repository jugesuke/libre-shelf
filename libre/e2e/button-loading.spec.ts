import { expect, test } from "@playwright/test";
import { holdRequests } from "./loading-helpers";
import { SAMPLE_ITEM, seedItems, seedSession, sessionFixture } from "./local-data";
import { mockApi } from "./mock-api";

const NEW_ISDN = "9784000000000";

test("商品・価格編集: ISDN での追加中は、ボタンのラベルが変わらず aria-busy になる", async ({
  page,
}) => {
  await mockApi(page, {
    [`/api/v1/isdn/${NEW_ISDN}`]: {
      product_name: "新刊",
      publisher_name: "テストサークル",
      class: "オリジナル",
      type: "漫画",
    },
  });
  const get = await holdRequests(page, "GET", `/api/v1/isdn/${NEW_ISDN}`);
  await seedItems(page, [SAMPLE_ITEM]);
  await seedSession(page, sessionFixture());
  await page.goto("/event/session");
  await page.getByRole("button", { name: "商品・価格編集" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("新規商品を登録").click();
  // 既存商品の入力欄にも「追加」のボタンがあるので、ISDN のフォームの中に絞る
  const add = dialog.locator("form").getByRole("button", { name: "追加", exact: true });
  get.hold();
  // 13 桁を入れると、ボタンを押さなくても追加が始まる
  await dialog.getByLabel("ISDN", { exact: true }).fill(NEW_ISDN);

  await expect(add).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByText("追加中...")).toHaveCount(0);
  get.release();
});
