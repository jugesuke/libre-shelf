import { expect, test, type Page } from "@playwright/test";

const open = async (page: Page, id: string, trigger: string) => {
  await // story は開いた状態で始まるので、閉じた状態から開くボタンで開く
  await page.goto(`/iframe.html?id=${id}&viewMode=story&args=open:false`);
  await page.getByRole("button", { name: trigger }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
};

const CONFIRM = ["ui-dialog--confirm", "削除を確認する"] as const;
const LONG_FORM = ["ui-dialog--long-form", "商品を登録する"] as const;
const SINGLE = ["ui-dialog--single-button", "お知らせを開く"] as const;

test("開くと role=dialog が出て、見出しは 18px の太字", async ({ page }) => {
  await open(page, ...CONFIRM);
  const heading = page.getByRole("dialog").getByRole("heading", { name: "商品を削除しますか" });
  await expect(heading).toHaveCSS("font-size", "18px");
  await expect(heading).toHaveCSS("font-weight", "700");
});

test("右上に aria-label=閉じる の 32px 四方のボタン", async ({ page }) => {
  await open(page, ...CONFIRM);
  const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "閉じる" });
  const dialogBox = await dialog.boundingBox();
  const box = await close.boundingBox();
  if (!dialogBox || !box) throw new Error("boundingBox が取れなかった");
  expect(box.width).toBe(32);
  expect(box.height).toBe(32);
  expect(box.x).toBeGreaterThan(dialogBox.x + dialogBox.width / 2);
  expect(box.x + box.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width);
  expect(box.y + box.height).toBeLessThan(dialogBox.y + dialogBox.height / 2);
  expect(box.y).toBeGreaterThanOrEqual(dialogBox.y);
});

test("Escape キーで閉じ、開いたボタンにフォーカスが戻る", async ({ page }) => {
  await open(page, ...CONFIRM);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: CONFIRM[1] })).toBeFocused();
});

test("覆いを押すと閉じ、開いたボタンにフォーカスが戻る", async ({ page }) => {
  await open(page, ...CONFIRM);
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: CONFIRM[1] })).toBeFocused();
});

test("閉じるボタンで閉じ、開いたボタンにフォーカスが戻る", async ({ page }) => {
  await open(page, ...CONFIRM);
  await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: CONFIRM[1] })).toBeFocused();
});

test("開いている間は Tab キーでフォーカスがモーダルの外に出ない", async ({ page }) => {
  await open(page, ...LONG_FORM);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await expect(page.locator("[role=dialog]:focus-within")).toHaveCount(1);
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("[role=dialog]:focus-within")).toHaveCount(1);
  }
});

test("sm は最大 448px", async ({ page }) => {
  await open(page, ...CONFIRM);
  const box = await page.getByRole("dialog").boundingBox();
  expect(box?.width).toBe(448);
});

test("md は最大 672px", async ({ page }) => {
  await open(page, ...LONG_FORM);
  const box = await page.getByRole("dialog").boundingBox();
  expect(box?.width).toBe(672);
});

test("画面の幅が足りないときは左右に 16px 空けて縮む", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 720 });
  await open(page, ...LONG_FORM);
  const box = await page.getByRole("dialog").boundingBox();
  expect(box?.x).toBe(16);
  expect(box?.width).toBe(368);
});

test("内側の余白は 24px", async ({ page }) => {
  await open(page, ...CONFIRM);
  const dialog = page.getByRole("dialog");
  for (const side of ["top", "right", "bottom", "left"]) {
    await expect(dialog).toHaveCSS(`padding-${side}`, "24px");
  }
});

test("モーダルの面は白", async ({ page }) => {
  await open(page, ...CONFIRM);
  await expect(page.getByRole("dialog")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("下のボタンは横幅いっぱいに等分される", async ({ page }) => {
  await open(page, ...CONFIRM);
  const footer = page.locator("[data-slot=dialog-footer]");
  const footerBox = await footer.boundingBox();
  const first = await footer.getByRole("button", { name: "キャンセル" }).boundingBox();
  const last = await footer.getByRole("button", { name: "削除する" }).boundingBox();
  if (!footerBox || !first || !last) throw new Error("boundingBox が取れなかった");
  expect(first.x).toBeCloseTo(footerBox.x, 0);
  expect(last.x + last.width).toBeCloseTo(footerBox.x + footerBox.width, 0);
  expect(first.width).toBeCloseTo(last.width, 0);
});

test("ボタンが 1 つのときはその 1 つが横幅いっぱい", async ({ page }) => {
  await open(page, ...SINGLE);
  const footer = page.locator("[data-slot=dialog-footer]");
  const footerBox = await footer.boundingBox();
  const button = await footer.getByRole("button").boundingBox();
  if (!footerBox || !button) throw new Error("boundingBox が取れなかった");
  expect(button.x).toBeCloseTo(footerBox.x, 0);
  expect(button.width).toBeCloseTo(footerBox.width, 0);
});

test("覆いは #101828 の 50% で、ぼかさない", async ({ page }) => {
  await open(page, ...CONFIRM);
  const overlay = page.locator("[data-slot=dialog-overlay]");
  await expect(overlay).toHaveCSS("background-color", "rgba(16, 24, 40, 0.5)");
  await expect(overlay).toHaveCSS("backdrop-filter", "none");
});

test("下のボタンの文字は折り返さず 1 行", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 720 });
  await open(page, ...CONFIRM);
  for (const name of ["キャンセル", "削除する"]) {
    await expect(page.locator("[data-slot=dialog-footer]").getByRole("button", { name })).toHaveCSS("white-space", "nowrap");
  }
});

test("画面の幅が sm 未満のとき、下のボタンは横幅いっぱいで縦に積まれ、主な操作が上", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 720 });
  await open(page, ...CONFIRM);
  const footer = page.locator("[data-slot=dialog-footer]");
  const footerBox = await footer.boundingBox();
  const cancel = await footer.getByRole("button", { name: "キャンセル" }).boundingBox();
  const primary = await footer.getByRole("button", { name: "削除する" }).boundingBox();
  if (!footerBox || !cancel || !primary) throw new Error("boundingBox が取れなかった");
  expect(primary.width).toBeCloseTo(footerBox.width, 0);
  expect(cancel.width).toBeCloseTo(footerBox.width, 0);
  expect(primary.y + primary.height).toBeLessThanOrEqual(cancel.y);
  expect(primary.height).toBeGreaterThanOrEqual(32);
  expect(cancel.height).toBeGreaterThanOrEqual(32);
});

test("画面の幅が sm 以上のとき、下のボタンは横に並び、主な操作が右", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 720 });
  await open(page, ...CONFIRM);
  const footer = page.locator("[data-slot=dialog-footer]");
  const cancel = await footer.getByRole("button", { name: "キャンセル" }).boundingBox();
  const primary = await footer.getByRole("button", { name: "削除する" }).boundingBox();
  if (!cancel || !primary) throw new Error("boundingBox が取れなかった");
  expect(primary.x).toBeGreaterThanOrEqual(cancel.x + cancel.width);
  expect(primary.y).toBeCloseTo(cancel.y, 0);
});

test("閉じるボタンの中は svg のアイコンで、文字の「×」は入っていない", async ({ page }) => {
  await open(page, ...CONFIRM);
  const close = page.getByRole("dialog").getByRole("button", { name: "閉じる" });
  await expect(close.locator("svg")).toHaveCount(1);
  await expect(close.locator("svg")).toHaveAttribute("aria-hidden", "true");
  await expect(close).not.toContainText("×");
});

const openWithFocus = async (page: Page, initialFocus: string) => {
  await page.goto(`/iframe.html?id=ui-dialog--initial-focus&viewMode=story&args=open:false;initialFocus:${initialFocus}`);
  await page.getByRole("button", { name: "フォーカスを試す" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
};

test("initialFocus=content は、中身の最初の入力欄にフォーカスが置かれる", async ({ page }) => {
  await openWithFocus(page, "content");
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "商品名" })).toBeFocused();
});

test("initialFocus=title は、見出しにフォーカスが置かれる", async ({ page }) => {
  await openWithFocus(page, "title");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "商品を登録" })).toBeFocused();
});

test("initialFocus に ref を渡すと、その要素にフォーカスが置かれる", async ({ page }) => {
  await openWithFocus(page, "cancel");
  await expect(page.getByRole("dialog").getByRole("button", { name: "キャンセル" })).toBeFocused();
});

const FAILURE = ["ui-dialog--with-failure", "ロケーションを追加する"] as const;
const SCROLLING = ["ui-dialog--scrolling-body", "商品を登録する"] as const;

// e2e の型には DOM の型がないので、スクロールの量を読むために必要な形だけを書く
type Scrollable = { scrollHeight: number; clientHeight: number; scrollTop: number };
const overflowOf = (locator: ReturnType<Page["locator"]>) =>
  locator.evaluate((el) => (el as unknown as Scrollable).scrollHeight - (el as unknown as Scrollable).clientHeight);

const boxOf = async (locator: ReturnType<Page["locator"]>) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("boundingBox が取れなかった");
  return box;
};

test("failure を渡すと、下部のボタンの行の下に、行と同じ幅で出て、枠の外へはみ出す", async ({ page }) => {
  await open(page, ...FAILURE);
  const alert = page.getByRole("dialog").getByRole("alert");
  await expect(alert).toHaveText(/ロケーションを追加できませんでした/);
  const footer = await boxOf(page.locator("[data-slot=dialog-footer]"));
  const box = await boxOf(alert);
  const dialog = await boxOf(page.getByRole("dialog"));
  expect(box.x).toBeCloseTo(footer.x, 0);
  expect(box.width).toBeCloseTo(footer.width, 0);
  // 三角の上半分の 6px を足して、行の下端から 4px 下に出る
  expect(box.y).toBeCloseTo(footer.y + footer.height + 4 + 6, 0);
  expect(box.y + box.height).toBeGreaterThan(dialog.y + dialog.height);
  const hit = await page.evaluate<boolean>(
    `document.elementFromPoint(${box.x + 20}, ${box.y + box.height - 4})?.closest("[role=alert]") != null`,
  );
  expect(hit).toBe(true);
});

test("failure の三角は、下部の最後のボタンの中央を向く", async ({ page }) => {
  await open(page, ...FAILURE);
  const last = await boxOf(page.locator("[data-slot=dialog-footer]").getByRole("button", { name: "追加" }));
  const caret = await boxOf(page.getByRole("dialog").locator("[data-slot=floating-alert-caret]"));
  expect(caret.x + caret.width / 2).toBeCloseTo(last.x + last.width / 2, 0);
});

test("failure の閉じるボタンで、アラートだけが閉じる", async ({ page }) => {
  await open(page, ...FAILURE);
  await page.getByRole("dialog").getByRole("alert").getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("failure が出ている間の Esc キーは、アラートだけを閉じ、ダイアログは開いたまま", async ({ page }) => {
  await open(page, ...FAILURE);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("failure の閉じるボタンに Tab キーで届く", async ({ page }) => {
  await open(page, ...FAILURE);
  const close = page.getByRole("dialog").getByRole("alert").getByRole("button", { name: "閉じる" });
  for (let i = 0; i < 8; i++) {
    if (await close.evaluate("el => el === el.ownerDocument.activeElement")) break;
    await page.keyboard.press("Tab");
  }
  await expect(close).toBeFocused();
});

test("本文が長いときは、本文だけがスクロールし、見出しと下部のボタンは動かない", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await open(page, ...SCROLLING);
  const dialog = page.getByRole("dialog");
  const body = page.locator("[data-slot=dialog-body]");
  expect(await overflowOf(dialog)).toBe(0);
  expect(await overflowOf(body)).toBeGreaterThan(0);
  const heading = dialog.getByRole("heading");
  const footer = page.locator("[data-slot=dialog-footer]");
  const before = [await boxOf(heading), await boxOf(footer)];
  await body.evaluate((el) => { (el as unknown as Scrollable).scrollTop = 200; });
  expect(await body.evaluate((el) => (el as unknown as Scrollable).scrollTop)).toBeGreaterThan(0);
  expect([await boxOf(heading), await boxOf(footer)]).toEqual(before);
  const dialogBox = await boxOf(dialog);
  expect(dialogBox.y).toBeGreaterThanOrEqual(16);
  expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(500 - 16);
});

test("本文のスクロールする部分は内側に 4px の余白を取り、入力欄のフォーカスリングが切れない", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await open(page, ...SCROLLING);
  const body = page.locator("[data-slot=dialog-body]");
  for (const side of ["top", "right", "bottom", "left"]) {
    await expect(body).toHaveCSS(`padding-${side}`, "4px");
  }
  const input = page.getByRole("dialog").getByRole("textbox").first();
  await input.focus();
  const bodyBox = await boxOf(body);
  const inputBox = await boxOf(input);
  // フォーカスリングは外側に 2px 離して 2px なので、入力欄の縁から 4px 外まで描かれる
  expect(inputBox.x - 4).toBeGreaterThanOrEqual(bodyBox.x);
  expect(inputBox.x + inputBox.width + 4).toBeLessThanOrEqual(bodyBox.x + bodyBox.width);
});
