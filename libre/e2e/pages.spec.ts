import { expect, test } from "@playwright/test";

// メニューにある画面。src/common/frame/nav-sections.ts の NAV_PAGES と同じ並び
const pages = [
  { path: "/event", name: "即売会" },
  { path: "/items", name: "商品管理" },
  { path: "/data", name: "データの管理" },
] as const;

for (const { path, name } of pages) {
  test(`${name}（${path}）が描画され、ページで例外が起きない`, async ({
    page,
  }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));

    await page.goto(path);

    // React が描画に失敗すると #root が空のままになり、メニューも出ない
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

// docs/spec/ナビゲーション.md の「メニューの構成」
for (const path of ["/no-such-page"]) {
  test(`${path} では、即売会の一覧を表示する`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toHaveAttribute("aria-current", "page");
  });
}
