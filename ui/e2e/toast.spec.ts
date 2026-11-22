import { expect, test, type Page } from "@playwright/test";

const open = (page: Page) => page.goto("/iframe.html?id=ui-toast--default&viewMode=story");
const trigger = (page: Page) => page.getByRole("button", { name: "トーストを出す" });
const toasts = (page: Page) => page.getByRole("status").filter({ hasText: "発注を登録しました。" });

test("ボタンを押すとトーストが出る", async ({ page }) => {
  await open(page);
  await trigger(page).click();
  await expect(toasts(page)).toHaveCount(1);
});

test("出たトーストは role=status で、success のメッセージと同じ色", async ({ page }) => {
  await open(page);
  await trigger(page).click();
  const toast = toasts(page);
  await expect(toast).toHaveAttribute("role", "status");
  await expect(toast).toHaveCSS("background-color", "rgb(240, 253, 244)");
  await expect(toast).toHaveCSS("color", "rgb(0, 130, 54)");
});

test("閉じるボタンですぐ消える", async ({ page }) => {
  await open(page);
  await trigger(page).click();
  await expect(toasts(page)).toHaveCount(1);
  await toasts(page).getByRole("button", { name: "閉じる" }).click();
  await expect(toasts(page)).toHaveCount(0);
});

test("5 秒で消える", async ({ page }) => {
  await page.clock.install();
  await open(page);
  await trigger(page).click();
  await expect(toasts(page)).toHaveCount(1);
  await page.clock.runFor(4900);
  await expect(toasts(page)).toHaveCount(1);
  await page.clock.runFor(200);
  await expect(toasts(page)).toHaveCount(0);
});

test("消えるまでの 5 秒はトーストごとに数える", async ({ page }) => {
  await page.clock.install();
  await open(page);
  await trigger(page).click();
  await page.clock.runFor(3000);
  await trigger(page).click();
  await expect(toasts(page)).toHaveCount(2);
  await page.clock.runFor(2500);
  await expect(toasts(page)).toHaveCount(1);
  await page.clock.runFor(2500);
  await expect(toasts(page)).toHaveCount(0);
});

test("続けて出すと重ねて表示し、ポインターを重ねると広げて全部を見せる", async ({ page }) => {
  await open(page);
  await trigger(page).click();
  await trigger(page).click();
  await expect(toasts(page)).toHaveCount(2);
  const height = (await toasts(page).nth(0).boundingBox())!.height;
  const gap = async () => {
    const [a, b] = await Promise.all([toasts(page).nth(0).boundingBox(), toasts(page).nth(1).boundingBox()]);
    return Math.abs(a!.y - b!.y);
  };
  // 重なっている間は、ずれが 1 つ分の高さより小さい
  expect(await gap()).toBeLessThan(height);
  await toasts(page).nth(0).hover();
  await expect.poll(gap).toBeGreaterThanOrEqual(height);
});

test("ポインターを重ねている間は消えない", async ({ page }) => {
  await page.clock.install();
  await open(page);
  await trigger(page).click();
  await expect(toasts(page)).toHaveCount(1);
  await toasts(page).hover();
  await page.clock.runFor(8000);
  await expect(toasts(page)).toHaveCount(1);
  await page.mouse.move(0, 400);
  await page.clock.runFor(6000);
  await expect(toasts(page)).toHaveCount(0);
});

test("読み上げは aria-live の領域で行う", async ({ page }) => {
  await open(page);
  await trigger(page).click();
  await expect(page.locator('section[aria-live="polite"] [role="status"]', { hasText: "発注を登録しました。" })).toHaveCount(1);
});

test("出るときに動きが付く", async ({ page }) => {
  await open(page);
  await trigger(page).click();
  const toast = page.locator("[data-sonner-toast]");
  await expect(toast).toHaveCount(1);
  await expect(toast).toHaveCSS("transition-duration", /[1-9]/);
});

test("画面の上部の中央に、固定で出る", async ({ page }) => {
  await open(page);
  await trigger(page).click();
  const box = await toasts(page).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.y).toBeLessThan(100);
  expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(2);
});

test("フォーカスは移らない", async ({ page }) => {
  await open(page);
  await trigger(page).focus();
  await trigger(page).press("Enter");
  await expect(toasts(page)).toHaveCount(1);
  await expect(trigger(page)).toBeFocused();
});
