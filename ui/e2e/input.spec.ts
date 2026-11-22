import { expect, test, type Page } from "@playwright/test";

const open = (page: Page, id: string) => page.goto(`/iframe.html?id=${id}&viewMode=story`);

// 即売会の画面の色（story の decorator が設定する --ring）と、index.css の値
const RING = "rgb(233, 0, 74)";
const DESTRUCTIVE = "rgb(231, 0, 11)";
const MUTED = "rgb(243, 244, 246)";

test("Field の項目名の label が for と id で欄につながる", async ({ page }) => {
  await open(page, "ui-field--default");
  const input = page.getByLabel("注文数量");
  await expect(input).toHaveCount(1);
  const id = await input.getAttribute("id");
  expect(id).toBeTruthy();
  await expect(page.locator("label")).toHaveAttribute("for", id!);
});

test("required のとき「必須」の札が出る", async ({ page }) => {
  await open(page, "ui-field--required");
  await expect(page.getByText("必須", { exact: true })).toBeVisible();
});

test("required でないとき「必須」の札は出ない", async ({ page }) => {
  await open(page, "ui-field--default");
  await expect(page.getByText("必須", { exact: true })).toHaveCount(0);
});

test("必須の札は 12px、危険の薄い面に濃い文字、角が丸い", async ({ page }) => {
  await open(page, "ui-field--required");
  const badge = page.getByText("必須", { exact: true });
  await expect(badge).toHaveCSS("font-size", "12px");
  await expect(badge).toHaveCSS("background-color", "rgb(254, 242, 242)");
  await expect(badge).toHaveCSS("color", "rgb(193, 0, 7)");
  // rounded-full の半径は十分に大きい値（3.35544e+07px など）になる
  await expect(badge).toHaveCSS("border-top-left-radius", /^\d{3,}(\.\d+)?px$|e\+0[3-9]px$/);
});

test("項目名は 14px の太字", async ({ page }) => {
  await open(page, "ui-field--default");
  const label = page.locator("label");
  await expect(label).toHaveCSS("font-size", "14px");
  await expect(label).toHaveCSS("font-weight", "700");
});

test("error があるとき aria-invalid が付き、理由が aria-describedby でつながる", async ({ page }) => {
  await open(page, "ui-field--with-error");
  const input = page.getByLabel("注文数量");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  const describedby = await input.getAttribute("aria-describedby");
  expect(describedby).toBeTruthy();
  const reason = page.locator(`[id="${describedby}"]`);
  await expect(reason).toHaveText("1 以上の数を入力してください");
  await expect(reason).toHaveCSS("font-size", "12px");
  await expect(reason).toHaveCSS("color", "rgb(193, 0, 7)");
});

test("error があるとき枠が危険の色になる", async ({ page }) => {
  await open(page, "ui-field--with-error");
  await expect(page.getByLabel("注文数量")).toHaveCSS("border-top-color", DESTRUCTIVE);
});

test("error がないとき aria-invalid も aria-describedby も付かない", async ({ page }) => {
  await open(page, "ui-field--default");
  const input = page.getByLabel("注文数量");
  await expect(input).not.toHaveAttribute("aria-invalid", /.*/);
  await expect(input).not.toHaveAttribute("aria-describedby", /.*/);
});

test("Field は選択欄と複数行の欄にも label をつなぐ", async ({ page }) => {
  await open(page, "ui-field--with-select");
  await expect(page.getByLabel("ロケーション")).toHaveRole("combobox");
  await open(page, "ui-field--with-textarea");
  await expect(page.getByLabel("メモ")).toHaveRole("textbox");
});

test("入力欄の高さは 36px、1px の --input の枠、14px の文字、左右 12px の余白", async ({ page }) => {
  await open(page, "ui-input--default");
  const input = page.getByRole("textbox");
  const box = await input.boundingBox();
  expect(box?.height).toBe(36);
  await expect(input).toHaveCSS("border-top-width", "1px");
  await expect(input).toHaveCSS("border-top-color", "rgb(106, 114, 130)");
  await expect(input).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(input).toHaveCSS("font-size", "14px");
  await expect(input).toHaveCSS("color", "rgb(16, 24, 40)");
  await expect(input).toHaveCSS("padding-left", "12px");
  await expect(input).toHaveCSS("padding-right", "12px");
});

test("選択欄の高さは 36px", async ({ page }) => {
  await open(page, "ui-select--default");
  const box = await page.getByRole("combobox").boundingBox();
  expect(box?.height).toBe(36);
});

test("複数行の欄の高さは 64px 以上で、上下 8px の余白", async ({ page }) => {
  await open(page, "ui-textarea--default");
  const textarea = page.getByRole("textbox");
  const box = await textarea.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(64);
  await expect(textarea).toHaveCSS("padding-top", "8px");
  await expect(textarea).toHaveCSS("padding-bottom", "8px");
});

for (const [id, role] of [
  ["ui-input--default", "textbox"],
  ["ui-select--default", "combobox"],
  ["ui-textarea--default", "textbox"],
] as const) {
  test(`${id} はフォーカスしたとき 2px の --ring の輪郭が出る`, async ({ page }) => {
    await open(page, id);
    const field = page.getByRole(role);
    await field.focus();
    await expect(field).toHaveCSS("outline-style", "solid");
    await expect(field).toHaveCSS("outline-width", "2px");
    await expect(field).toHaveCSS("outline-color", RING);
  });
}

for (const [id, role] of [
  ["ui-input--disabled", "textbox"],
  ["ui-select--disabled", "combobox"],
  ["ui-textarea--disabled", "textbox"],
] as const) {
  test(`${id} は面が --muted、文字が --placeholder`, async ({ page }) => {
    await open(page, id);
    const field = page.getByRole(role);
    await expect(field).toBeDisabled();
    await expect(field).toHaveCSS("background-color", MUTED);
    await expect(field).toHaveCSS("color", "rgb(106, 114, 130)");
  });
}

test("Field に controlId を指定すると、項目名がその id の欄につながり、中の要素に id は渡されない", async ({ page }) => {
  await open(page, "ui-field--with-control-id");
  const input = page.getByLabel("商品");
  await expect(input).toHaveCount(1);
  await expect(input).toHaveAttribute("id", "item-control");
  await expect(page.locator("label")).toHaveAttribute("for", "item-control");
  const group = page.getByTestId("combined");
  await expect(group).not.toHaveAttribute("id", /.*/);
  await expect(group).not.toHaveAttribute("aria-invalid", /.*/);
  await expect(group).not.toHaveAttribute("aria-describedby", /.*/);
});

test("Field に controlId と error を指定すると、理由の文字の id が describedById になる", async ({ page }) => {
  await open(page, "ui-field--with-control-id");
  const reason = page.getByText("商品が登録されていません");
  await expect(reason).toHaveAttribute("id", "item-control-error");
});

test("金額の欄は、ラベルが欄につながり、欄の左に「¥」がある", async ({ page }) => {
  await open(page, "ui-field--with-yen");
  const input = page.getByLabel("総額（税込）");
  await expect(input).toHaveValue("1000");
  const yenBox = (await page.getByText("¥", { exact: true }).boundingBox())!;
  const inputBox = (await input.boundingBox())!;
  expect(yenBox.x + yenBox.width).toBeLessThanOrEqual(inputBox.x);
});

test("冊数の欄は、ラベルが欄につながり、欄の右に「冊」がある", async ({ page }) => {
  await open(page, "ui-field--with-count");
  const input = page.getByLabel("注文数量");
  await expect(input).toHaveValue("100");
  const unitBox = (await page.getByText("冊", { exact: true }).boundingBox())!;
  const inputBox = (await input.boundingBox())!;
  expect(unitBox.x).toBeGreaterThanOrEqual(inputBox.x + inputBox.width);
});
