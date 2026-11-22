import { expect, test } from "@playwright/test";
import { seedHistory, sessionFixture } from "./local-data";

test.describe("結果の画面", () => {
  test.beforeEach(async ({ page }) => {
    await seedHistory(
      page,
      "record-1",
      sessionFixture({ phase: "done", menu: [], settled: true }),
    );
    await page.goto("/event/result/record-1");
  });

  test("商品別売上: 販売記録がないとき、見出しの行と、どうすれば出るかを書いた 1 行を出す", async ({
    page,
  }) => {
    for (const name of ["商品名", "単価", "販売数", "売上"]) {
      await expect(
        page.getByRole("columnheader", { name, exact: true }),
      ).toBeVisible();
    }
    const cell = page.getByRole("cell", {
      name: "販売記録がありませんでした。",
      exact: true,
    });
    await expect(cell).toHaveCount(1);
    await expect(cell).toHaveAttribute("colspan", "4");
  });

  test("グラフ: 会計がないとき、総売上を ¥0 にし、グラフの場所に文を出す", async ({
    page,
  }) => {
    const summary = page.locator("[data-slot=empty-summary]");
    await expect(summary.getByText("¥0")).toBeVisible();
    const messages = summary.locator("[data-slot=empty-chart]");
    await expect(messages).toHaveText([
      "会計記録がありませんでした。",
      "会計記録がありませんでした。",
    ]);
    expect((await messages.nth(0).boundingBox())!.height).toBe(76);
    expect((await messages.nth(1).boundingBox())!.height).toBe(200);
  });
});
