import { expect, test } from "@playwright/test";

// 操作パネルで props を変えると描いた部品が変わる、を URL の args で確かめる
const open = (page: import("@playwright/test").Page, id: string, args: string) =>
  page.goto(`/iframe.html?id=${id}&viewMode=story&args=${args}`);

test("Button: variant を args で渡すと、その種類の見た目になる", async ({ page }) => {
  await open(page, "ui-button--primary", "variant:destructive");
  const button = page.getByRole("button");
  await expect(button).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(button).toHaveCSS("border-top-style", "solid");
});

test("Tabs: value を args で渡すと、その選択肢が選ばれた状態になる", async ({ page }) => {
  await open(page, "ui-tabs--default", "value:new");
  await expect(page.getByRole("tab", { name: "新規入力" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "一覧から選択" })).toHaveAttribute("aria-selected", "false");
});

test("Dialog: open を args で渡すと、モーダルが開く", async ({ page }) => {
  await open(page, "ui-dialog--confirm", "open:true");
  await expect(page.getByRole("dialog")).toBeVisible();
});
