import { expect, test, type Locator, type Page } from "@playwright/test";

const open = (page: Page, id: string) =>
  page.goto(`/iframe.html?id=${id}&viewMode=story`);

const BORDER = "rgb(209, 213, 220)";
const BORDER_MUTED = "rgb(229, 231, 235)";
const SURFACE_MUTED = "rgb(249, 250, 251)";
const MUTED_FOREGROUND = "rgb(74, 85, 101)";

test("外枠は --border の 1px で、角丸は 6px", async ({ page }) => {
  await open(page, "ui-table--with-rows");
  const container = page.locator("[data-slot=table-container]");
  await expect(container).toHaveCSS("border-top-width", "1px");
  await expect(container).toHaveCSS("border-top-color", BORDER);
  await expect(container).toHaveCSS("border-top-left-radius", "6px");
});

test("見出しの行は --surface-muted の面に 14px の太字の --muted-foreground", async ({
  page,
}) => {
  await open(page, "ui-table--with-rows");
  const head = page.getByRole("columnheader", { name: "商品名" });
  await expect(page.locator("[data-slot=table-header] tr")).toHaveCSS(
    "background-color",
    SURFACE_MUTED,
  );
  await expect(head).toHaveCSS("font-size", "14px");
  await expect(head).toHaveCSS("font-weight", "700");
  await expect(head).toHaveCSS("color", MUTED_FOREGROUND);
});

test("行の区切りは --border-muted", async ({ page }) => {
  await open(page, "ui-table--with-rows");
  await expect(page.locator("[data-slot=table-body] tr").first()).toHaveCSS(
    "border-bottom-color",
    BORDER_MUTED,
  );
  await expect(page.locator("[data-slot=table-body] tr").first()).toHaveCSS(
    "border-bottom-width",
    "1px",
  );
  await expect(page.locator("[data-slot=table-header] tr")).toHaveCSS(
    "border-bottom-color",
    BORDER_MUTED,
  );
});

test("セルの内側の余白は上下 8px、左右 12px", async ({ page }) => {
  await open(page, "ui-table--with-rows");
  for (const cell of [
    page.getByRole("cell", { name: "新刊" }),
    page.getByRole("columnheader", { name: "商品名" }),
  ]) {
    await expect(cell).toHaveCSS("padding-top", "8px");
    await expect(cell).toHaveCSS("padding-bottom", "8px");
    await expect(cell).toHaveCSS("padding-left", "12px");
    await expect(cell).toHaveCSS("padding-right", "12px");
  }
});

test("数量と金額のセルは右寄せで tabular-nums、商品 ID は左寄せ", async ({
  page,
}) => {
  await open(page, "ui-table--with-rows");
  for (const name of ["120", "¥60,000"]) {
    const cell = page.getByRole("cell", { name, exact: true });
    await expect(cell).toHaveCSS("text-align", "right");
    await expect(cell).toHaveCSS("font-variant-numeric", /tabular-nums/);
  }
  await expect(page.getByRole("columnheader", { name: "数量" })).toHaveCSS(
    "text-align",
    "right",
  );
  const id = page.getByRole("cell", { name: "A-001" });
  await expect(id).toHaveCSS("text-align", /^(left|start)$/);
  await expect(id).not.toHaveCSS("font-variant-numeric", /tabular-nums/);
});

test("行がないときの 1 行は中央寄せで --muted-foreground", async ({ page }) => {
  await open(page, "ui-table--empty");
  const cell = page.getByRole("cell", { name: /商品がありません/ });
  await expect(cell).toHaveAttribute("colspan", "4");
  await expect(cell).toHaveCSS("text-align", "center");
  await expect(cell).toHaveCSS("color", MUTED_FOREGROUND);
});

test("interactive の行に重ねると --muted の面と pointer になり、そうでない行は変わらない", async ({
  page,
}) => {
  await open(page, "ui-table--with-rows");
  const rows = page.locator("[data-slot=table-body] tr");
  const interactive = rows.nth(0);
  const plain = rows.nth(1);
  await expect(interactive).toHaveCSS("cursor", "pointer");
  await expect(plain).not.toHaveCSS("cursor", "pointer");
  await interactive.hover();
  await expect(interactive).toHaveCSS("background-color", "rgb(243, 244, 246)");
  await plain.hover();
  await expect(plain).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("読み込み中の行の高さは、行がないときの 1 行と同じ", async ({ page }) => {
  await open(page, "ui-table--empty");
  const empty = (await page.locator("[data-slot=table-body] tr").boundingBox())
    ?.height;
  await open(page, "ui-table--loading");
  const loading = (
    await page.locator("[data-slot=table-body] tr").boundingBox()
  )?.height;
  expect(loading).toBeDefined();
  expect(loading).toBe(empty);
});

test("読み込み中のローダーは role=status で読め、20px の --muted-foreground", async ({
  page,
}) => {
  await open(page, "ui-table--loading");
  const status = page.getByRole("status");
  await expect(status).toHaveCount(1);
  const loader = status.getByLabel("読み込み中");
  await expect(loader).toHaveCSS("width", "20px");
  await expect(loader).toHaveCSS("color", MUTED_FOREGROUND);
});

const inertAncestors = (row: Locator) =>
  row.locator("xpath=ancestor-or-self::*[@inert]");

test("読み込み直しでは、中身の行が不透明度 0.4 で操作できない", async ({
  page,
}) => {
  await open(page, "ui-table--reloading");
  const rows = page.locator("[data-slot=table-body] tr");
  await expect(rows).toHaveCount(2);
  for (const row of await rows.all()) {
    await expect(row).toHaveCSS("opacity", "0.4");
    await expect(inertAncestors(row)).toHaveCount(1);
  }
});

test("読み込み直しでも、見出しの行は薄くならず操作を止めない", async ({
  page,
}) => {
  await open(page, "ui-table--reloading");
  const header = page.locator("[data-slot=table-header] tr");
  await expect(header).toHaveCSS("opacity", "1");
  await expect(inertAncestors(header)).toHaveCount(0);
});

test("読み込み直しのローダーは role=status で読め、中身の行の範囲の中にある", async ({
  page,
}) => {
  await open(page, "ui-table--reloading");
  const loader = page.getByRole("status").getByLabel("読み込み中");
  await expect(loader).toBeVisible();
  const ring: string = await page.evaluate(`(() => {
    const probe = document.createElement("div");
    probe.style.color = "var(--ring)";
    document.querySelector("[data-slot=table-container]").append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  })()`);
  await expect(loader).toHaveCSS("color", ring);
  const box = await loader.boundingBox();
  const body = await page.locator("[data-slot=table-body]").boundingBox();
  expect(box).not.toBeNull();
  expect(body).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(body!.y);
  expect(box!.y + box!.height).toBeLessThanOrEqual(body!.y + body!.height);
});

test("読み込み直しているとき、表の外側に aria-busy が付く", async ({
  page,
}) => {
  await open(page, "ui-table--reloading");
  await expect(page.locator("[data-slot=table-container]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await open(page, "ui-table--with-rows");
  await expect(page.locator("[data-slot=table-container]")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
});
