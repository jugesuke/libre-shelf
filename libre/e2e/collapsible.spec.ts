import { expect, test } from "@playwright/test";
import { seedSession, sessionFixture } from "./local-data";

test("商品一覧で、「新規商品を追加」を押すとフォームが開き、もう一度押すと閉じる", async ({
  page,
}) => {
  await page.goto("/items");

  const toggle = page.getByRole("button", { name: "新規商品を追加" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("商品名")).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("商品名")).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("商品名")).toHaveCount(0);
});

test("レジの商品・価格編集で、「新規商品を登録」を押すとフォームが開く", async ({
  page,
}) => {
  await seedSession(page, sessionFixture({ menu: [] }));
  await page.goto("/event/session");
  await page.getByRole("button", { name: "商品・価格編集" }).click();

  const toggle = page.getByRole("button", { name: "新規商品を登録" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "手入力で登録" })).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "手入力で登録" })).toBeVisible();
});
