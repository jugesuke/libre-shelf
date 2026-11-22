import { expect, test } from "@playwright/test";
import {
  readLocalStorage,
  sessionFixture,
  seedItems,
  seedSession,
  SAMPLE_ITEM,
} from "./local-data";

const PHASES = [
  "preparation",
  "opening",
  "register",
  "closing",
  "done",
] as const;

for (const phase of PHASES) {
  test(`${phase}: セッションの破棄は強い確認で、「破棄」と入力するまで押せず、破棄するとセッションが消える`, async ({
    page,
  }) => {
    await seedItems(page, [SAMPLE_ITEM]);
    await seedSession(page, sessionFixture({ phase }));
    await page.goto("/event/session");

    await page.getByRole("button", { name: "セッションを破棄する" }).click();
    const dialog = page.getByRole("dialog", { name: "セッションの破棄" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        "このセッションを破棄しますか？　この操作は元に戻せません。",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText("この即売会の会計とレジ金の記録が、すべて失われます。"),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "やめる" })).toBeFocused();

    const confirm = dialog.getByRole("button", {
      name: "破棄する",
      exact: true,
    });
    await expect(confirm).toBeDisabled();
    await dialog
      .getByLabel("確認のため「破棄」と入力してください")
      .fill("破棄");
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(dialog).toHaveCount(0);
    expect(await readLocalStorage(page, "event_session")).toBeNull();
  });
}
