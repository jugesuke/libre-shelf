import { expect, test, type Page } from "@playwright/test";
import { boxesOf, expectBelow, expectBeside, expectFloatingBelow, expectNoEmptyBand, offsetBetween } from "./feedback-helpers";
import { failRequests } from "./confirm-helpers";
import { failLocalStorageWrites, SAMPLE_ITEM, seedItems } from "./local-data";
import { mockApi } from "./mock-api";

const ISDN_ID = "2784702901978";
const WRITE_FAILED = "商品を保存できませんでした。端末の空き容量を確認してください。";

/** ブラウザの alert() が出たら、その文言を溜める。confirm() は出ないはずだが、出たら承諾する */
function trackAlerts(page: Page): string[] {
  const alerts: string[] = [];
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "alert") alerts.push(dialog.message());
    await dialog.accept();
  });
  return alerts;
}

test.beforeEach(async ({ page }) => {
  await mockApi(page, {});
  await seedItems(page, [SAMPLE_ITEM]);
});

test("商品管理: ISDN が空のとき、入力欄の行の下のアラートに出し、入力欄の下には出さない", async ({ page }) => {
  const alerts = trackAlerts(page);
  await page.goto("/items");
  const form = page.locator("form").nth(0);
  const input = form.getByLabel("ISDN", { exact: true });
  await form.getByRole("button", { name: "追加" }).click();

  await expect(page.getByRole("alert")).toHaveText("ISDNを入力してください。");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  expect(alerts).toEqual([]);
});

test("商品管理: ISDN に数字以外があるとき、入力欄の行の下のアラートに出す", async ({ page }) => {
  await page.goto("/items");
  const form = page.locator("form").nth(0);
  const input = form.getByLabel("ISDN", { exact: true });
  await input.fill("abc");
  await form.getByRole("button", { name: "追加" }).click();

  await expect(page.getByRole("alert")).toHaveText("ISDNは数字のみで入力してください。");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
});

test("商品管理: ISDN の検証のエラーが出ても、下の要素を動かさず、ボタンは入力欄と上下をそろえる", async ({ page }) => {
  await page.goto("/items");
  const form = page.locator("form").nth(0);
  const input = form.getByLabel("ISDN", { exact: true });
  const button = form.getByRole("button", { name: "追加" });
  const below = page.getByText("新規商品を追加");
  const before = await boxesOf([input, button]);
  const belowOffset = await offsetBetween(input, below);
  expect(before[1]!.y).toBeCloseTo(before[0]!.y, 0);
  expect(before[1]!.height).toBeCloseTo(before[0]!.height, 0);

  await button.click();
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expectFloatingBelow(alert, button);
  expect(await boxesOf([input, button])).toEqual(before);
  expect(await offsetBetween(input, below)).toEqual(belowOffset);
});

test("商品管理: 狭い画面でも、ボタンは入力欄の横に並び上下がそろい、422 の文言は動かさずに出る", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`, 422);
  await page.goto("/items");
  const form = page.locator("form").nth(0);
  const input = form.getByLabel("ISDN", { exact: true });
  const button = form.getByRole("button", { name: "追加" });
  const below = page.getByText("新規商品を追加");
  const belowOffset = await offsetBetween(input, below);
  const [i, b] = await boxesOf([input, button]);
  expect(b!.x).toBeGreaterThanOrEqual(i!.x + i!.width);
  expect(b!.y).toBeCloseTo(i!.y, 0);
  expect(b!.height).toBeCloseTo(i!.height, 0);

  await input.fill(ISDN_ID);
  const alert = page.getByRole("alert");
  await expect(alert).toHaveText("ISDNではありません。入力し直してください。");
  await expectFloatingBelow(alert, button);
  expect(await offsetBetween(input, below)).toEqual(belowOffset);
});

test("商品管理: 狭い画面で ISDN の取得に失敗したとき、アラートをボタンの行のすぐ下に出す", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`);
  await page.goto("/items");
  const form = page.locator("form").nth(0);
  const button = form.getByRole("button", { name: "追加" });
  await form.getByLabel("ISDN", { exact: true }).fill(ISDN_ID);

  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expectFloatingBelow(alert, button);
});

test("商品管理: ISDN の取得に失敗したとき、入力欄の行の下に浮かせて出し、ほかの要素を動かさない", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`);
  await page.goto("/items");
  const form = page.locator("form").nth(0);
  const input = form.getByLabel("ISDN", { exact: true });
  const button = form.getByRole("button", { name: "追加" });
  const below = page.getByText("新規商品を追加");

  // 失敗がないときに、何もない帯がない
  const formBox = await form.boundingBox();
  const inputBox = await input.boundingBox();
  expect(inputBox!.y - formBox!.y).toBeLessThan(30);
  const before = await boxesOf([input, button, below]);

  await input.fill(ISDN_ID);

  const alert = page.getByRole("alert");
  await expect(alert).toHaveText("商品を追加できませんでした。時間をおいて、もう一度追加してください。");
  await expect(alert).not.toContainText("boom");
  expect(alerts).toEqual([]);
  await expectBelow(alert, button);
  await expectFloatingBelow(alert, button);
  expect(await boxesOf([input, button, below])).toEqual(before);
});

test("商品管理: ISDN が見つからないとき、入力欄の行の下に出し、ISDN を残す", async ({ page }) => {
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`, 404);
  await page.goto("/items");
  const input = page.locator("form").nth(0).getByLabel("ISDN", { exact: true });
  await input.fill(ISDN_ID);

  await expect(page.getByRole("alert")).toHaveText(
    "ISDNが見つかりませんでした。番号を確認して、もう一度追加してください。",
  );
  await expect(input).toHaveValue(ISDN_ID);
});

test("商品管理: 取得した情報が足りないとき、新規商品の欄の名前で案内する", async ({ page }) => {
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`, 400);
  await page.goto("/items");
  await page.locator("form").nth(0).getByLabel("ISDN", { exact: true }).fill(ISDN_ID);

  await expect(page.getByRole("alert")).toHaveText(
    "ISDNの情報が足りません。「新規商品を追加」から追加してください。",
  );
});

test("商品管理: ISDN が正しくないと応答されたとき、入力欄の行の下のアラートに出す", async ({ page }) => {
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`, 422);
  await page.goto("/items");
  const input = page.locator("form").nth(0).getByLabel("ISDN", { exact: true });
  await input.fill(ISDN_ID);

  await expect(page.getByRole("alert")).toHaveText("ISDNではありません。入力し直してください。");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveValue(ISDN_ID);
});

test("商品管理: 新規商品の必須が空のとき、欄ごとに入力欄の下へ理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await page.goto("/items");
  await page.getByText("新規商品を追加").click();
  const form = page.locator("form").nth(1);
  await form.getByRole("button", { name: "追加" }).click();

  await expect(page.getByText("商品名を入力してください。")).toBeVisible();
  await expect(page.getByText("サークルを入力してください。")).toBeVisible();
  await expect(page.getByText("分類を選択してください。")).toBeVisible();
  await expect(page.getByText("種類を選択してください。")).toBeVisible();
  expect(alerts).toEqual([]);

  await form.getByLabel("商品名").fill("あ");
  await expect(page.getByText("商品名を入力してください。")).toHaveCount(0);
  await expect(page.getByText("サークルを入力してください。")).toBeVisible();
});

test("商品管理: 新規商品の保存に失敗したとき、ボタンの左にそのまま出し、ほかの要素を動かさない", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await failLocalStorageWrites(page, "items");
  await page.goto("/items");
  await page.getByText("新規商品を追加").click();
  const form = page.locator("form").nth(1);
  await form.getByLabel("商品名").fill("あ");
  await form.getByLabel("サークル").fill("い");
  await form.getByLabel("分類").selectOption({ index: 1 });
  await form.getByLabel("種類").selectOption({ index: 1 });
  const button = form.getByRole("button", { name: "追加" });
  const lastField = form.getByLabel("サンプル画像URL");

  // 失敗がないときに、何もない帯がない
  await expectNoEmptyBand(lastField, button);
  const before = await offsetBetween(lastField, button);

  await button.click();

  const alert = form.getByRole("alert");
  await expect(alert).toHaveText(WRITE_FAILED);
  expect(alerts).toEqual([]);
  await expectBeside(alert, button);
  expect(await offsetBetween(lastField, button)).toEqual(before);
});

test("商品管理: 詳細で必須を空にして保存したとき、入力欄の下に理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await page.goto("/items");
  await page.getByText("テスト本").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "編集", exact: true }).click();
  await dialog.getByLabel("商品名").fill("");
  await dialog.getByRole("button", { name: "保存" }).click();

  await expect(dialog.getByText("商品名を入力してください。")).toBeVisible();
  expect(alerts).toEqual([]);
});

test("商品管理: 詳細で保存に失敗したとき、モーダルの下部のボタンの下にメッセージを出し、ボタンを動かさない", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await failLocalStorageWrites(page, "items");
  await page.goto("/items");
  await page.getByText("テスト本").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "編集", exact: true }).click();
  const button = dialog.getByRole("button", { name: "保存" });
  const before = await boxesOf([button]);
  await button.click();

  const alert = dialog.getByRole("alert");
  await expect(alert).toHaveText(WRITE_FAILED);
  expect(alerts).toEqual([]);
  await expectBelow(alert, button);
  expect(await boxesOf([button])).toEqual(before);
});

const IMPORT_FAILED =
  "ファイルを読み込めませんでした。「書き出す」で保存したファイルを選んでください。";

const importFile = (page: Page, content: string) =>
  page.locator("input[type=file]").setInputFiles({
    name: "items.json",
    mimeType: "application/json",
    buffer: Buffer.from(content),
  });

test("商品管理: 読み込みに失敗したとき、ボタンの左にそのまま出し、ほかの要素を動かさない。もう一度読み込むと消す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await page.goto("/items");
  const button = page.getByRole("button", { name: "読み込む" });
  const exportButton = page.getByRole("button", { name: "書き出す" });
  const table = page.getByRole("table");
  const before = await boxesOf([button, exportButton, table]);

  await importFile(page, "{");

  const alert = page.getByRole("alert").filter({ hasText: IMPORT_FAILED });
  await expect(alert).toHaveText(IMPORT_FAILED);
  expect(alerts).toEqual([]);
  // 右寄せのボタンの並びのうち、いちばん左のボタンの左に出る
  await expectBeside(alert, exportButton);
  expect(await boxesOf([button, exportButton, table])).toEqual(before);

  await importFile(
    page,
    JSON.stringify({ format: "libre-shelf-items", version: 1, items: [] }),
  );
  await expect(alert).toHaveCount(0);
});

test("商品管理: 読み込みに成功したとき、一覧の変化では分からないのでトーストを出す", async ({
  page,
}) => {
  await page.goto("/items");
  await importFile(
    page,
    JSON.stringify({
      format: "libre-shelf-items",
      version: 1,
      items: [SAMPLE_ITEM],
    }),
  );

  await expect(
    page.getByRole("status").filter({ hasText: "1 件の商品を読み込みました。" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
