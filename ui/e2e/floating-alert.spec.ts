import { expect, test, type Page } from "@playwright/test";

const open = async (page: Page) => {
  await page.goto("/iframe.html?id=ui-floatingalert--default&viewMode=story");
  await expect(page.getByRole("alert")).toBeVisible();
};

const boxOf = async (locator: ReturnType<Page["locator"]>) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("boundingBox が取れなかった");
  return box;
};

test("行と同じ幅で、行の左右の端にそろい、行の下に出る", async ({ page }) => {
  await open(page);
  const card = await boxOf(page.getByTestId("card"));
  const row = await boxOf(page.getByRole("button", { name: "追加" }).locator(".."));
  const alert = await boxOf(page.getByRole("alert"));
  expect(alert.x).toBeCloseTo(row.x, 0);
  expect(alert.width).toBeCloseTo(row.width, 0);
  // 三角の上半分の 6px を足して、行の下端から 4px 下に出る
  expect(alert.y).toBeCloseTo(row.y + row.height + 4 + 6, 0);
  expect(alert.y).toBeGreaterThan(card.y + card.height - 20);
});

test("三角が target の左右の中央を向く", async ({ page }) => {
  await open(page);
  const target = await boxOf(page.getByRole("button", { name: "追加" }));
  const caret = await boxOf(page.locator("[data-slot=floating-alert-caret]"));
  expect(caret.x + caret.width / 2).toBeCloseTo(target.x + target.width / 2, 0);
});

test("destructive のアラートに影があり、body の直下に描かれる", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("alert")).not.toHaveCSS("box-shadow", "none");
  await expect(page.locator("body > div > [data-slot=floating-alert]")).toHaveCount(1);
});

test("閉じるボタンで onClose が呼ばれる", async ({ page }) => {
  await open(page);
  await page.getByRole("alert").getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Esc キーで onClose が呼ばれる", async ({ page }) => {
  await open(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("はみ出しを隠すカードの中に行があっても、アラートは切れない", async ({ page }) => {
  await open(page);
  const alert = await boxOf(page.getByRole("alert"));
  const card = await boxOf(page.getByTestId("card"));
  // アラートの下の端が、カードの下端より下にある
  expect(alert.y + alert.height).toBeGreaterThan(card.y + card.height);
  const hit = await page.evaluate<boolean>(
    `document.elementFromPoint(${alert.x + 20}, ${alert.y + alert.height - 4})?.closest("[role=alert]") != null`,
  );
  expect(hit).toBe(true);
});

test("画面の幅が変わると、行に合わせて置き直す", async ({ page }) => {
  await open(page);
  await page.setViewportSize({ width: 500, height: 720 });
  const row = await boxOf(page.getByRole("button", { name: "追加" }).locator(".."));
  const alert = await boxOf(page.getByRole("alert"));
  expect(alert.width).toBeCloseTo(row.width, 0);
  expect(alert.x).toBeCloseTo(row.x, 0);
});
