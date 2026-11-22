import { expect, test, type Page } from "@playwright/test";

const open = (page: Page, id: string) => page.goto(`/iframe.html?id=${id}&viewMode=story`);

const BORDER = "rgb(209, 213, 220)";
const SURFACE_MUTED = "rgb(249, 250, 251)";

for (const id of ["ui-card--with-header", "ui-card--without-header"]) {
  test(`${id} は白い面に --border の 1px の枠、角丸は 6px`, async ({ page }) => {
    await open(page, id);
    const card = page.locator("[data-slot=card]");
    await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(card).toHaveCSS("border-top-width", "1px");
    await expect(card).toHaveCSS("border-top-color", BORDER);
    await expect(card).toHaveCSS("border-top-left-radius", "6px");
  });
}

test("見出しの帯は --surface-muted の面", async ({ page }) => {
  await open(page, "ui-card--with-header");
  await expect(page.locator("[data-slot=card-header]")).toHaveCSS("background-color", SURFACE_MUTED);
});

test("見出しの文字は 16px の太字", async ({ page }) => {
  await open(page, "ui-card--with-header");
  const title = page.locator("[data-slot=card-title]");
  await expect(title).toHaveText("在庫");
  await expect(title).toHaveCSS("font-size", "16px");
  await expect(title).toHaveCSS("font-weight", "700");
});

test("見出しの帯の内側の余白は上下 4px と左右 16px", async ({ page }) => {
  await open(page, "ui-card--with-header");
  const header = page.locator("[data-slot=card-header]");
  await expect(header).toHaveCSS("padding-top", "4px");
  await expect(header).toHaveCSS("padding-bottom", "4px");
  await expect(header).toHaveCSS("padding-left", "16px");
  await expect(header).toHaveCSS("padding-right", "16px");
});

test("折りたためないカードの帯は、36px のボタンを actions に置いても線を含めて 49px", async ({ page }) => {
  await open(page, "ui-card--with-header");
  const button = page.locator("[data-slot=card-header]").getByRole("button", { name: "編集" });
  expect((await button.boundingBox())?.height).toBe(36);
  expect((await page.locator("[data-slot=card-header]").boundingBox())?.height).toBe(49);
});

test("description があると、開閉のボタンの名前に title と補足の両方の文字が入る", async ({ page }) => {
  await open(page, "ui-card--collapsible-with-rich-title");
  await expect(page.getByRole("button", { name: /新規商品を追加.*補足の文/ })).toBeVisible();
});

test("description の文字は 12px の標準の太さで --muted-foreground", async ({ page }) => {
  await open(page, "ui-card--with-description");
  const description = page.locator("[data-slot=card-description]");
  await expect(description).toHaveText("補足の文");
  await expect(description).toHaveCSS("font-size", "12px");
  await expect(description).toHaveCSS("font-weight", "400");
  await expect(description).toHaveCSS("color", "rgb(74, 85, 101)");
});

test("description は見出しと同じ行にあり、見出しとの横の間は 12px", async ({ page }) => {
  await open(page, "ui-card--with-description");
  const titleBox = await page.locator("[data-slot=card-title]").boundingBox();
  const descriptionBox = await page.locator("[data-slot=card-description]").boundingBox();
  if (!titleBox || !descriptionBox) throw new Error("boundingBox が取れなかった");
  expect(descriptionBox.x - (titleBox.x + titleBox.width)).toBeCloseTo(12, 0);
  expect(descriptionBox.y).toBeLessThan(titleBox.y + titleBox.height);
});

test("title がないときは、description と actions を渡しても描かない", async ({ page }) => {
  await open(page, "ui-card--without-header-ignores-extras");
  await expect(page.getByText("中身", { exact: true })).toBeVisible();
  await expect(page.locator("[data-slot=card-description]")).toHaveCount(0);
  await expect(page.locator("[data-slot=card-actions]")).toHaveCount(0);
  await expect(page.getByText("補足の文")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "編集" })).toHaveCount(0);
});

test("見出しの帯の下に --border の 1px の線", async ({ page }) => {
  await open(page, "ui-card--with-header");
  const header = page.locator("[data-slot=card-header]");
  await expect(header).toHaveCSS("border-bottom-width", "1px");
  await expect(header).toHaveCSS("border-bottom-color", BORDER);
});

test("actions は帯の右に出る", async ({ page }) => {
  await open(page, "ui-card--with-header");
  const header = page.locator("[data-slot=card-header]");
  const title = page.locator("[data-slot=card-title]");
  const button = header.getByRole("button", { name: "編集" });
  await expect(button).toBeVisible();
  const headerBox = await header.boundingBox();
  const titleBox = await title.boundingBox();
  const buttonBox = await button.boundingBox();
  if (!headerBox || !titleBox || !buttonBox) throw new Error("boundingBox が取れなかった");
  expect(buttonBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width);
  expect(buttonBox.x + buttonBox.width).toBeCloseTo(headerBox.x + headerBox.width - 16, 0);
});

test("見出しがないときは帯が出ない", async ({ page }) => {
  await open(page, "ui-card--without-header");
  await expect(page.locator("[data-slot=card-header]")).toHaveCount(0);
  await expect(page.getByText("中身", { exact: true })).toBeVisible();
});

for (const id of ["ui-card--with-header", "ui-card--without-header"]) {
  test(`${id} の中身の内側の余白は 16px`, async ({ page }) => {
    await open(page, id);
    const content = page.locator("[data-slot=card-content]");
    await expect(content).toHaveCSS("padding-top", "16px");
    await expect(content).toHaveCSS("padding-bottom", "16px");
    await expect(content).toHaveCSS("padding-left", "16px");
    await expect(content).toHaveCSS("padding-right", "16px");
  });
}

const NAME = "新規商品を追加";
const MUTED_FOREGROUND = "rgb(74, 85, 101)";

test("折りたためるカードは、閉じているとき開閉のボタンの名前が title で、中身を描かず、帯の下の線も出さない", async ({ page }) => {
  await open(page, "ui-card--collapsible");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).not.toHaveAttribute("aria-label");
  await expect(page.locator("[data-slot=card-content]")).toHaveCount(0);
  await expect(page.getByText("中身", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-slot=card-header]")).toHaveCSS("border-bottom-width", "0px");
});

test("折りたためるカードは、開閉のボタンを押すと開閉し、aria-expanded が変わる", async ({ page }) => {
  await open(page, "ui-card--collapsible");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("中身", { exact: true })).toBeVisible();
  await expect(page.locator("[data-slot=card-header]")).toHaveCSS("border-bottom-width", "1px");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("中身", { exact: true })).toHaveCount(0);
});

test("開閉の印は、閉じているとき右向き、開いているとき下向きの 20px の矢印で、ボタンの左端から 8px、見出しとの間は 8px", async ({ page }) => {
  await open(page, "ui-card--collapsible");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  const icon = toggle.locator("svg");
  await expect(icon).toHaveClass(/lucide-chevron-right/);
  await expect(icon).toHaveCSS("width", "20px");
  await expect(icon).toHaveCSS("height", "20px");
  await expect(icon).toHaveCSS("color", MUTED_FOREGROUND);
  await expect(toggle.getByText("+")).toHaveCount(0);
  const toggleBox = await toggle.boundingBox();
  const iconBox = await icon.boundingBox();
  const titleBox = await toggle.locator("[data-slot=card-title]").boundingBox();
  if (!toggleBox || !iconBox || !titleBox) throw new Error("boundingBox が取れなかった");
  expect(iconBox.x).toBeCloseTo(toggleBox.x + 8, 0);
  expect(titleBox.x).toBeCloseTo(iconBox.x + iconBox.width + 8, 0);
  await toggle.click();
  await expect(toggle.locator("svg")).toHaveClass(/lucide-chevron-down/);
});

test("折りたためるカードの帯は高さ 48px で、開閉のボタンは高さ 36px、帯の余白は上下 4px・左 8px・右 16px", async ({ page }) => {
  await open(page, "ui-card--collapsible");
  const header = page.locator("[data-slot=card-header]");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  await expect(header).toHaveCSS("padding-top", "4px");
  await expect(header).toHaveCSS("padding-bottom", "4px");
  await expect(header).toHaveCSS("padding-left", "8px");
  await expect(header).toHaveCSS("padding-right", "16px");
  await expect(toggle).toHaveCSS("padding-left", "8px");
  await expect(toggle).toHaveCSS("padding-right", "8px");
  const toggleBox = await toggle.boundingBox();
  if (!toggleBox) throw new Error("boundingBox が取れなかった");
  expect(toggleBox.height).toBe(36);
  // 閉じているときは線がないので 48px。開いているときは線の 1px が加わる
  expect((await header.boundingBox())?.height).toBe(48);
});

test("開いているときの帯は、高さ 48px に下の線の 1px を足した 49px", async ({ page }) => {
  await open(page, "ui-card--collapsible");
  await page.getByRole("button", { name: NAME, exact: true }).click();
  expect((await page.locator("[data-slot=card-header]").boundingBox())?.height).toBe(49);
});

test("折りたためるカードの actions は帯の右に出て、押しても開閉しない", async ({ page }) => {
  await open(page, "ui-card--collapsible-with-actions");
  const header = page.locator("[data-slot=card-header]");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  const action = page.getByRole("button", { name: "編集" });
  await expect(action).toBeVisible();
  // actions はボタンの中に入らない
  await expect(toggle.getByText("編集")).toHaveCount(0);
  const headerBox = await header.boundingBox();
  const toggleBox = await toggle.boundingBox();
  const actionBox = await action.boundingBox();
  if (!headerBox || !toggleBox || !actionBox) throw new Error("boundingBox が取れなかった");
  expect(actionBox.x).toBeGreaterThanOrEqual(toggleBox.x + toggleBox.width + 16 - 0.5);
  expect(actionBox.x + actionBox.width).toBeCloseTo(headerBox.x + headerBox.width - 16, 0);
  await action.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("折りたためるカードの開閉のボタンにポインターを重ねると --muted の面が敷かれる", async ({ page }) => {
  await open(page, "ui-card--collapsible");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  await toggle.hover();
  await expect(toggle).toHaveCSS("background-color", "rgb(243, 244, 246)");
});

test("折りたためるカードの開閉のボタンは、キーボードで選ぶと 2px の --ring の輪郭を 2px 離して出す", async ({ page }) => {
  await open(page, "ui-card--collapsible");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  await expect(toggle).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-width", "2px");
  await expect(toggle).toHaveCSS("outline-offset", "2px");
  await expect(toggle).not.toHaveCSS("outline-style", "none");
});

for (const id of ["ui-card--collapsible-with-actions", "ui-card--with-header"]) {
  test(`${id} は、幅 412px のとき actions が見出しの下の行に左寄せで、行の間は 8px`, async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 800 });
    await open(page, id);
    const card = page.locator("[data-slot=card]");
    const first = page.locator("[data-slot=card-header] > :first-child");
    const action = page.getByRole("button", { name: "編集" });
    const cardBox = await card.boundingBox();
    const firstBox = await first.boundingBox();
    const actionBox = await action.boundingBox();
    if (!cardBox || !firstBox || !actionBox) throw new Error("boundingBox が取れなかった");
    // 枠線 1px を含めて、カードの端から 16px
    expect(actionBox.x - cardBox.x).toBeCloseTo(17, 0);
    expect(actionBox.y).toBeGreaterThanOrEqual(firstBox.y + firstBox.height);
    expect(actionBox.y - (firstBox.y + firstBox.height)).toBeCloseTo(8, 0);
  });
}

test("折りたためるカードは、幅 412px で actions を次の行に回すと、開閉のボタンが帯の幅いっぱいになる", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 800 });
  await open(page, "ui-card--collapsible-with-actions");
  const header = page.locator("[data-slot=card-header]");
  const toggle = page.getByRole("button", { name: NAME, exact: true });
  const headerBox = await header.boundingBox();
  const toggleBox = await toggle.boundingBox();
  if (!headerBox || !toggleBox) throw new Error("boundingBox が取れなかった");
  expect(toggleBox.x + toggleBox.width).toBeCloseTo(headerBox.x + headerBox.width - 16, 0);
  expect(toggleBox.height).toBeGreaterThanOrEqual(36);
});

test("折りたためるカードは、幅 1280px で actions が開閉のボタンと同じ行にある", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, "ui-card--collapsible-with-actions");
  const toggleBox = await page.getByRole("button", { name: NAME, exact: true }).boundingBox();
  const actionBox = await page.getByRole("button", { name: "編集" }).boundingBox();
  if (!toggleBox || !actionBox) throw new Error("boundingBox が取れなかった");
  expect(actionBox.y).toBeLessThan(toggleBox.y + toggleBox.height);
});
