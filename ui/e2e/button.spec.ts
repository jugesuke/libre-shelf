import { expect, test, type Locator, type Page } from "@playwright/test";

const open = (page: Page, id: string) => page.goto(`/iframe.html?id=${id}&viewMode=story`);

// 仕様の色の式（color-mix など）を、ブラウザが計算した色にする。story の枠（#storybook-root の直下の div）に置いて計算し、枠が設定する CSS の変数（--primary など）を引き継がせる。
// e2e/ の型には DOM がないので、ブラウザ側で動く関数は文字列で渡す
const computedColor = async (page: Page, expr: string): Promise<string> => {
  await page.waitForSelector("#storybook-root > div > button");
  return page.evaluate<string>(`(() => {
    const probe = document.createElement("span");
    probe.style.color = ${JSON.stringify(expr)};
    document.querySelector("#storybook-root > div")?.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  })()`);
};

async function expectLook(button: Locator, look: Record<string, string>) {
  for (const [property, value] of Object.entries(look)) {
    await expect(button).toHaveCSS(property, value);
  }
}

// 使えない状態は、重ねても押しても見た目を変えない
async function expectDisabledLook(page: Page, button: Locator, look: Record<string, string>) {
  const still = { ...look, filter: "none" };
  await expect(button).toBeDisabled();
  await expectLook(button, still);
  await button.hover();
  await expectLook(button, still);
  await page.mouse.down();
  await expectLook(button, still);
  await page.mouse.up();
}

test("type の既定は button", async ({ page }) => {
  await open(page, "ui-button--secondary");
  await expect(page.getByRole("button")).toHaveAttribute("type", "button");
});

test("使えない状態のボタンを押しても onClick が呼ばれない", async ({ page }) => {
  await open(page, "ui-button--click-count");
  const enabled = page.getByRole("button", { name: "押せる" });
  const disabled = page.getByRole("button", { name: "押せない" });
  await expect(disabled).toBeDisabled();
  await disabled.click({ force: true });
  await expect(page.getByTestId("count")).toHaveText("0");
  await enabled.click();
  await expect(page.getByTestId("count")).toHaveText("1");
});

test("アイコンだけのボタンに aria-label が付き、32px 四方になる", async ({ page }) => {
  await open(page, "ui-button--icon-only");
  const button = page.getByRole("button", { name: "閉じる" });
  await expect(button).toHaveAttribute("aria-label", "閉じる");
  const box = await button.boundingBox();
  expect(box?.width).toBe(32);
  expect(box?.height).toBe(32);
});

test("アイコンだけのボタンの文字の大きさは 20px", async ({ page }) => {
  await open(page, "ui-button--icon-only");
  const button = page.getByRole("button", { name: "閉じる" });
  await expect(button).toHaveCSS("font-size", "20px");
});

test("primary の文字は 14px の太字", async ({ page }) => {
  await open(page, "ui-button--primary");
  const button = page.getByRole("button");
  await expect(button).toHaveCSS("font-size", "14px");
  await expect(button).toHaveCSS("font-weight", "700");
});

test("primary の左右の内側の余白は 12px", async ({ page }) => {
  await open(page, "ui-button--primary");
  const button = page.getByRole("button");
  await expect(button).toHaveCSS("padding-left", "12px");
  await expect(button).toHaveCSS("padding-right", "12px");
});

for (const id of ["primary", "secondary", "destructive", "text"]) {
  test(`${id} の高さは 36px`, async ({ page }) => {
    await open(page, `ui-button--${id}`);
    const box = await page.getByRole("button").boundingBox();
    expect(box?.height).toBe(36);
  });
}

test("variant を付けない size=icon のボタンにも枠線がなく、下線もない", async ({ page }) => {
  await open(page, "ui-button--icon-only-default-variant");
  const button = page.getByRole("button", { name: "閉じる" });
  await expect(button).toHaveCSS("border-top-width", "0px");
  await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(button).toHaveCSS("text-decoration-line", "none");
});

test("secondary は --secondary の面で枠線が見えず、重ねると brightness で暗くなり、押している間はさらに暗くなる", async ({ page }) => {
  await open(page, "ui-button--secondary");
  const button = page.getByRole("button");
  await expectLook(button, {
    "background-color": "rgb(229, 231, 235)",
    "border-top-color": "rgba(0, 0, 0, 0)",
    filter: "none",
  });
  await button.hover();
  await expectLook(button, { "background-color": "rgb(229, 231, 235)", filter: "brightness(0.92)" });
  await page.mouse.down();
  await expectLook(button, { "background-color": "rgb(229, 231, 235)", filter: "brightness(0.85)" });
  await page.mouse.up();
});

test("primary の使えない状態は、面を --primary の 15% に白を混ぜた色にし、--primary の点線の枠を付け、文字は変えない", async ({ page }) => {
  await open(page, "ui-button--disabled");
  const button = page.getByRole("button");
  await expectDisabledLook(page, button, {
    "background-color": await computedColor(page, "color-mix(in srgb, var(--primary) 15%, white)"),
    "border-top-style": "dashed",
    "border-top-width": "1px",
    "border-top-color": await computedColor(page, "var(--primary)"),
    color: await computedColor(page, "var(--primary-foreground)"),
  });
});

test("secondary の使えない状態は、面を --surface-muted にし、--muted-foreground の点線の枠を付け、文字を --disabled-foreground にする", async ({ page }) => {
  await open(page, "ui-button--disabled-secondary");
  const button = page.getByRole("button");
  await expectDisabledLook(page, button, {
    "background-color": await computedColor(page, "var(--surface-muted)"),
    "border-top-style": "dashed",
    "border-top-width": "1px",
    "border-top-color": await computedColor(page, "var(--muted-foreground)"),
    color: await computedColor(page, "var(--disabled-foreground)"),
  });
});

test("destructive の使えない状態は、白い面に --destructive の点線の枠を付け、文字を --destructive の 40% に白を混ぜた色にする", async ({ page }) => {
  await open(page, "ui-button--disabled-destructive");
  const button = page.getByRole("button");
  await expectDisabledLook(page, button, {
    "background-color": "rgb(255, 255, 255)",
    "border-top-style": "dashed",
    "border-top-width": "1px",
    "border-top-color": await computedColor(page, "var(--destructive)"),
    color: await computedColor(page, "color-mix(in srgb, var(--destructive) 40%, white)"),
  });
});

test("text の使えない状態は、面も枠もなく、文字を --disabled-foreground にし、下線を残す", async ({ page }) => {
  await open(page, "ui-button--disabled-text");
  const button = page.getByRole("button");
  await expectDisabledLook(page, button, {
    "background-color": "rgba(0, 0, 0, 0)",
    "border-top-width": "0px",
    color: await computedColor(page, "var(--disabled-foreground)"),
    "text-decoration-line": "underline",
  });
});

test("処理中のボタンは、幅が変わらず、aria-busy が付き、押しても onClick が呼ばれない", async ({ page }) => {
  await open(page, "ui-button--primary");
  const normalWidth = (await page.getByRole("button").boundingBox())?.width;

  await open(page, "ui-button--loading");
  const loading = page.getByRole("button", { name: "登録" });
  await expect(loading).toHaveAttribute("aria-busy", "true");
  expect((await loading.boundingBox())?.width).toBe(normalWidth);

  await open(page, "ui-button--click-count");
  await page.getByRole("button", { name: "処理中" }).click({ force: true });
  await expect(page.getByTestId("count")).toHaveText("0");
});

for (const key of ["Enter", "Space"]) {
  test(`処理中の送信ボタンを ${key} で押しても、フォームが送信されない`, async ({ page }) => {
    await open(page, "ui-button--loading-submit");
    const button = page.getByRole("button", { name: "登録" });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press(key);
    await expect(page.getByTestId("count")).toHaveText("0");
  });
}

test("secondary の処理中は、面を --muted にし、--muted-foreground の破線の枠を付け、ローダーの色を --muted-foreground にする", async ({ page }) => {
  await open(page, "ui-button--loading-secondary");
  await expectLook(page.getByRole("button"), {
    "background-color": await computedColor(page, "var(--muted)"),
    "border-top-style": "dashed",
    "border-top-width": "1px",
    "border-top-color": await computedColor(page, "var(--muted-foreground)"),
    color: await computedColor(page, "var(--muted-foreground)"),
  });
});

test("destructive の処理中は、白い面に --destructive の破線の枠を付け、ローダーの色を --destructive にする", async ({ page }) => {
  await open(page, "ui-button--loading-destructive");
  await expectLook(page.getByRole("button"), {
    "background-color": "rgb(255, 255, 255)",
    "border-top-style": "dashed",
    "border-top-width": "1px",
    "border-top-color": await computedColor(page, "var(--destructive)"),
    color: await computedColor(page, "var(--destructive)"),
  });
});
