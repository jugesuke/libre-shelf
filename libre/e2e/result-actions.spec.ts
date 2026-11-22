import { expect, test } from "@playwright/test";
import { failLocalStorageWrites, readLocalStorage, seedHistory, sessionFixture } from "./local-data";

// 結果画面の見出しの右に並べるボタンの間は、ほかの画面でボタンを横に並べるときと同じく 12px 空ける
test("結果画面: 「一覧に戻る」と「ファイルに書き出す」の間を 12px 空ける", async ({
  page,
}) => {
  await seedHistory(
    page,
    "record-1",
    sessionFixture({ phase: "done", settled: true }),
  );
  await page.goto("/event/result/record-1");

  const back = await page.getByRole("button", { name: "一覧に戻る" }).boundingBox();
  const exportButton = await page
    .getByRole("button", { name: "ファイルに書き出す" })
    .boundingBox();
  expect(exportButton!.x - (back!.x + back!.width)).toBeCloseTo(12, 0);
});

test("結果画面: 見出しの右に「一覧に戻る」「ファイルに書き出す」「削除」をこの順に置き、間を 12px 空ける", async ({
  page,
}) => {
  await seedHistory(page, "record-1", sessionFixture({ phase: "done", settled: true }));
  await page.goto("/event/result/record-1");

  const exportButton = await page.getByRole("button", { name: "ファイルに書き出す" }).boundingBox();
  const del = await page.getByRole("button", { name: "削除", exact: true }).boundingBox();
  expect(del!.x - (exportButton!.x + exportButton!.width)).toBeCloseTo(12, 0);
});

test("結果画面: 「削除」は強い確認で、「削除」と入力するまで押せず、削除すると履歴から消えて一覧へ移る", async ({
  page,
}) => {
  await seedHistory(
    page,
    "record-1",
    sessionFixture({ phase: "done", settled: true, eventName: "消す即売会", eventDate: "2026-11-17" }),
  );
  await page.goto("/event/result/record-1");

  await page.getByRole("button", { name: "削除", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "記録の削除" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("以下の記録を削除しますか？　この操作は元に戻せません。"),
  ).toBeVisible();
  await expect(dialog.getByText("消す即売会")).toBeVisible();
  await expect(dialog.getByText("2026/11/17")).toBeVisible();
  await expect(
    dialog.getByText(
      "この即売会の会計とレジ金の記録が、すべて失われます。残したいときは、先に「ファイルに書き出す」で保存してください。",
    ),
  ).toBeVisible();

  const confirm = dialog.getByRole("button", { name: "削除", exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("確認のため「削除」と入力してください").fill("削除");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page).toHaveURL(/\/event$/);
  expect(await readLocalStorage(page, "event_session_history")).toEqual([]);
});

test("結果画面: 削除に失敗したら、ダイアログを開いたまま失敗を表示し、履歴は変わらない", async ({
  page,
}) => {
  await seedHistory(page, "record-1", sessionFixture({ phase: "done", settled: true }));
  await failLocalStorageWrites(page, "event_session_history");
  await page.goto("/event/result/record-1");

  await page.getByRole("button", { name: "削除", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "記録の削除" });
  await dialog.getByLabel("確認のため「削除」と入力してください").fill("削除");
  await dialog.getByRole("button", { name: "削除", exact: true }).click();

  await expect(
    page.getByText("記録を削除できませんでした。端末の空き容量を確認して、もう一度削除してください。"),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/event\/result\/record-1$/);
  expect(await readLocalStorage(page, "event_session_history")).toHaveLength(1);
});

test("結果画面: 履歴にない id では「ファイルに書き出す」も「削除」も置かない", async ({ page }) => {
  await page.goto("/event/result/none");
  await expect(page.getByRole("button", { name: "一覧に戻る" })).toBeVisible();
  await expect(page.getByRole("button", { name: "削除", exact: true })).toHaveCount(0);
});
