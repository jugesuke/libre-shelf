import { expect, test, type Page } from "@playwright/test";

const open = async (page: Page, id: string) => {
  await // story は開いた状態で始まるので、閉じた状態から開くボタンで開く
  await page.goto(`/iframe.html?id=ui-confirmdialog--${id}&viewMode=story&args=open:false`);
  await page.getByRole("button", { name: "確認を開く" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
};

const dialog = (page: Page) => page.getByRole("dialog");

test("開いたとき、最初のフォーカスが「やめる」にある", async ({ page }) => {
  await open(page, "default");
  await expect(
    dialog(page).getByRole("button", { name: "やめる" }),
  ).toBeFocused();
});

test("「やめる」で閉じ、onConfirm は呼ばれない", async ({ page }) => {
  await open(page, "default");
  await dialog(page).getByRole("button", { name: "やめる" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByText("確定の回数: 0")).toBeVisible();
});

test("確定のボタンで onConfirm が呼ばれる", async ({ page }) => {
  await open(page, "default");
  await dialog(page).getByRole("button", { name: "削除", exact: true }).click();
  await expect(page.getByText("確定の回数: 1")).toBeVisible();
});

test("対象の項目名と値が出る", async ({ page }) => {
  await open(page, "default");
  await expect(dialog(page).getByText("注文数量")).toBeVisible();
  await expect(dialog(page).getByText("みほん同人誌")).toBeVisible();
});

test("処理中は確定のボタンを押しても、onConfirm が 2 度呼ばれない", async ({
  page,
}) => {
  await open(page, "pending");
  const confirm = dialog(page).getByRole("button", {
    name: "削除",
    exact: true,
  });
  await confirm.click();
  await expect(confirm).toHaveAttribute("aria-busy", "true");
  await confirm.click({ force: true });
  await expect(page.getByText("確定の回数: 1")).toBeVisible();
});

test("失敗のメッセージが、下部のボタンの下に出て、モーダルが残る", async ({
  page,
}) => {
  await open(page, "with-error");
  const alert = dialog(page).getByRole("alert");
  await expect(alert).toHaveText(
    "削除に失敗しました。もう一度お試しください。",
  );
  const a = await alert.boundingBox();
  const b = await dialog(page)
    .getByRole("button", { name: "削除", exact: true })
    .boundingBox();
  expect(a!.y).toBeGreaterThanOrEqual(b!.y + b!.height + 4);
  await expect(dialog(page)).toBeVisible();
});

test("失敗のアラートの閉じるボタンと Esc キーで、アラートだけが閉じる", async ({
  page,
}) => {
  await open(page, "with-error");
  await dialog(page).getByRole("alert").getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(dialog(page)).toBeVisible();

  await open(page, "with-error");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(dialog(page)).toBeVisible();
});

test("失敗のメッセージが出ても、ボタンの位置がずれない", async ({ page }) => {
  await open(page, "default");
  const before = await dialog(page)
    .getByRole("button", { name: "削除", exact: true })
    .boundingBox();
  await page.goto(
    "/iframe.html?id=ui-confirmdialog--with-error&viewMode=story&args=open:false",
  );
  await page.getByRole("button", { name: "確認を開く" }).click();
  const after = await dialog(page)
    .getByRole("button", { name: "削除", exact: true })
    .boundingBox();
  expect(after!.y).toBe(before!.y);
});

test("requireTyping: 入力が一致するまで確定のボタンを押せず、一致すると押せる", async ({
  page,
}) => {
  await open(page, "require-typing");
  const confirm = dialog(page).getByRole("button", {
    name: "破棄する",
    exact: true,
  });
  const input = dialog(page).getByLabel("確認のため「破棄」と入力してください");
  await expect(confirm).toBeDisabled();
  await input.fill("破");
  await expect(confirm).toBeDisabled();
  await input.fill("破棄");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText("確定の回数: 1")).toBeVisible();
});

test("requireTyping: 閉じて開き直すと、入力が空に戻る", async ({ page }) => {
  await open(page, "require-typing");
  const input = dialog(page).getByLabel("確認のため「破棄」と入力してください");
  await input.fill("破棄");
  await dialog(page).getByRole("button", { name: "やめる" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole("button", { name: "確認を開く" }).click();
  await expect(
    dialog(page).getByLabel("確認のため「破棄」と入力してください"),
  ).toHaveValue("");
  await expect(
    dialog(page).getByRole("button", { name: "破棄する", exact: true }),
  ).toBeDisabled();
});
