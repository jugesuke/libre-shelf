import { expect, test } from "@playwright/test";

test("新規タブには記号と読み上げ用の説明とrelを付ける", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-textlink--new-tab&viewMode=story");
  const link = page.getByRole("link", {
    name: /作者のWebサイト\s*（新しいタブで開きます）/,
  });
  await expect(link).toHaveAttribute("href", "#destination");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /\bauthor\b/);
  await expect(link).toHaveAttribute("rel", /\bnoopener\b/);
  await expect(link).toHaveAttribute("rel", /\bnoreferrer\b/);
  await expect(link.locator("svg")).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/#destination$/);
  await popup.close();
});

test("同じタブのリンクは記号なしで、キーボードで移動できる", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=ui-textlink--navigation&viewMode=story");
  const link = page.getByRole("link", { name: "使い方を読む", exact: true });
  await expect(link.locator("svg")).toHaveCount(0);
  await expect(link).not.toHaveAttribute("target");
  await expect(link).toHaveCSS("color", "rgb(21, 93, 252)");
  await expect(link).toHaveCSS("text-decoration-line", "underline");
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#destination$/);
});

test("aria-labelで文言を指定した場合も新規タブの通知を含む", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=ui-textlink--with-accessible-name&viewMode=story",
  );
  await expect(page.getByRole("link")).toHaveAccessibleName(
    "作者のWebサイトを読む（新しいタブで開きます）",
  );
});

test("本文の文字を引き継ぎ、記号はリンク側に近く配置する", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-textlink--in-text&viewMode=story");
  const link = page.getByRole("link");
  await expect(link).toHaveCSS("font-size", "16px");
  await expect(link).toHaveCSS("line-height", "32px");
  const icon = link.locator("svg");
  await expect(icon).toHaveCSS("width", "12px");
  await expect(icon).toHaveCSS("height", "12px");
  const gaps = await link.evaluate((element) => {
    const ending = element.querySelector(".whitespace-nowrap");
    const glyph = element.querySelector("svg");
    if (!ending?.firstChild || !glyph || !element.nextSibling)
      throw new Error("リンクの末尾と本文が必要です");
    const labelRange = document.createRange();
    labelRange.selectNodeContents(ending.firstChild);
    const labelBox = labelRange.getBoundingClientRect();
    const iconBox = glyph.getBoundingClientRect();
    const bodyRange = document.createRange();
    bodyRange.setStart(element.nextSibling, 0);
    bodyRange.setEnd(element.nextSibling, 1);
    return {
      before: iconBox.left - labelBox.right,
      after: bodyRange.getBoundingClientRect().left - iconBox.right,
    };
  });
  expect(gaps).toEqual({ before: 2, after: 4 });
});

test("折り返しても記号が末尾の文字から離れない", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-textlink--wrapping&viewMode=story");
  const link = page.getByRole("link");
  for (const width of [104, 128, 160]) {
    const together = await link.evaluate((element, containerWidth) => {
      const parent = element.parentElement;
      const ending = element.querySelector(".whitespace-nowrap");
      const glyph = element.querySelector("svg");
      if (!parent || !ending?.firstChild || !glyph)
        throw new Error("折り返しの表示例が必要です");
      parent.style.width = `${containerWidth}px`;
      const labelRange = document.createRange();
      labelRange.selectNodeContents(ending.firstChild);
      const labelBox = labelRange.getBoundingClientRect();
      const iconBox = glyph.getBoundingClientRect();
      return iconBox.top >= labelBox.top && iconBox.bottom <= labelBox.bottom;
    }, width);
    expect(together).toBe(true);
  }
});

test("狭い画面の長いURLも横にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/iframe.html?id=ui-textlink--long-url&viewMode=story");
  const dimensions = await page.getByRole("link").evaluate((element) => {
    const container = element.parentElement;
    if (!container) throw new Error("URLの表示枠が必要です");
    return {
      width: container.clientWidth,
      contentWidth: container.scrollWidth,
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
    };
  });
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.pageWidth).toBe(dimensions.viewport);
});

test("単独表示の例は文字の大きさを保ち、押せる高さを32px以上にする", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=ui-textlink--standalone&viewMode=story");
  const link = page.getByRole("link");
  await expect(link).toHaveCSS("font-size", "14px");
  const box = await link.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(32);
});
