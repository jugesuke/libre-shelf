import { expect, test } from "@playwright/test";

// docs/spec/ランディングページ.md の「確かめ方」
test("/ を開くと見出しが出て、メニューを開くボタンは出ない", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "同人誌即売会のためのレジ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "メニューを開く" })).toHaveCount(0);
});

// docs/spec/ランディングページ.md の上端のバーと、docs/spec/index.md のページのタイトル
test("/ の上端のバーとページのタイトルに、アプリの名前「Libre Shelf」が出る", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Libre Shelf", { exact: true })).toBeVisible();
  await expect(page).toHaveTitle("Libre Shelf");
});

for (const { label, path } of [
  { label: "即売会を始める", path: "/event" },
  { label: "商品を登録する", path: "/items" },
] as const) {
  // 0 番目は見出しの右、1 番目はページの最後
  for (const [index, place] of ["見出しの右", "ページの最後"].entries()) {
    test(`${place}の「${label}」で ${path} へ移る`, async ({ page }) => {
      await page.goto("/");
      const buttons = page.getByRole("button", { name: label });
      await expect(buttons).toHaveCount(2);
      await buttons.nth(index).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  }
}

test("「使い方の流れ」のカードが番号の順に上から並ぶ", async ({ page }) => {
  await page.goto("/");
  const titles = page.locator("[data-slot=card-title]");
  await expect(titles).toHaveText([
    "1. 商品を登録する",
    "2. 前日",
    "3. 会場で",
    "4. 撤収の前に",
    "5. 帰ってから",
  ]);
  const tops = (await Promise.all((await titles.all()).map((t) => t.boundingBox()))).map((b) => b!.y);
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  expect(new Set(tops).size).toBe(tops.length);
});

const FEATURES_HEADING = "頒布しながら記録して、あとで振り返る";
const FEATURES = ["頒布しながら記録", "売れ方を振り返る", "お釣りを振り返る", "委託元への連絡"];

test("特長の見出し（中）と、4 つの項目の見出し（太字の本文）が出る", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 2, name: FEATURES_HEADING });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("font-size", "18px");
  await expect(heading).toHaveCSS("font-weight", "700");
  for (const heading of FEATURES) {
    const el = page.getByText(heading, { exact: true });
    await expect(el).toBeVisible();
    await expect(el).toHaveCSS("font-weight", "700");
    await expect(el).toHaveCSS("font-size", "14px");
  }
});

test("特長は 768px 以上で 2 列、未満で 1 列に、表の順で並ぶ", async ({ page }) => {
  const rects = () =>
    Promise.all(
      FEATURES.map(async (f) => {
        const box = (await page.getByText(f, { exact: true }).boundingBox())!;
        return { top: Math.round(box.y), left: Math.round(box.x) };
      }),
    );
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/");
  const [a, b, c, d] = await rects();
  expect(a.top).toBe(b.top);
  expect(b.left).toBeGreaterThan(a.left);
  expect(c.top).toBeGreaterThan(a.top);
  expect(c.top).toBe(d.top);
  expect(c.left).toBe(a.left);
  await page.setViewportSize({ width: 600, height: 800 });
  const narrow = await rects();
  expect(new Set(narrow.map((r) => r.left)).size).toBe(1);
  const tops = narrow.map((r) => r.top);
  expect(tops).toEqual([...tops].sort((x, y) => x - y));
  expect(new Set(tops).size).toBe(4);
});

test("「使い方の流れ」の説明の強調が太字で出て、** は表示しない", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).not.toContainText("**");
  const strong = page.locator("[data-slot=card-content] strong", { hasText: "ISDNを入れると" });
  await expect(strong).toBeVisible();
  await expect(strong).toHaveCSS("font-weight", "700");
  await expect(strong).toHaveCSS("font-size", "14px");
  await expect(page.locator("[data-slot=card-content] strong", { hasText: "お釣りも計算" })).toHaveCount(0);
  await expect(page.locator("[data-slot=card-content] strong", { hasText: "売上の集計や委託元への連絡" })).toBeVisible();
});
