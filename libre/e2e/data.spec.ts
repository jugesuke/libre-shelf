import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { expectBeside } from "./feedback-helpers";
import {
  failLocalStorageWrites,
  readLocalStorage,
  sessionFixture,
  SAMPLE_ITEM,
  seedLocalStorage,
} from "./local-data";

// docs/spec/データの管理.md

const IMPORT_FAILED =
  "ファイルを読み込めませんでした。Libre Shelfで書き出したファイルを選んでください。";
const WRITE_FAILED = "データを保存できませんでした。端末の空き容量を確認してください。";
const EXPORT_FAILED = "保存されているデータを読み込めないため、書き出せませんでした。";

const importFile = (page: Page, content: string) =>
  page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(content),
  });

const record = (id: string, eventName = "冬の即売会") => ({
  id,
  savedAt: "2026-11-18T00:00:00+09:00",
  session: sessionFixture({ eventName, settled: true }),
});

const backupFile = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: "libre-shelf-backup",
    version: 1,
    exportedAt: "2026-12-30T18:00:00+09:00",
    items: [],
    history: [],
    currentSession: null,
    ...over,
  });

const R1 = "11111111-1111-4111-8111-111111111111";
const R2 = "22222222-2222-4222-8222-222222222222";

test("メニューの「データの管理」から開くと、見出しと 2 つの区画が出る", async ({ page }) => {
  await page.goto("/event");
  await page.getByRole("menuitem", { name: "データの管理" }).click();

  await expect(page).toHaveURL(/\/data$/);
  await expect(page.getByRole("heading", { name: "データの管理" })).toBeVisible();
  await expect(page.getByText("まとめて書き出す", { exact: true })).toBeVisible();
  await expect(page.getByText("読み込む", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "データの管理" }),
  ).toHaveAttribute("aria-current", "page");
});

test("「すべて書き出す」で、商品、履歴、進行中のセッションを入れたファイルをダウンロードする", async ({
  page,
}) => {
  await seedLocalStorage(page, {
    items: [SAMPLE_ITEM],
    event_session_history: [record(R1)],
    event_session: sessionFixture(),
  });
  await page.goto("/data");

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "すべて書き出す" }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toMatch(/^libre-shelf-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const body = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(body).toMatchObject({
    format: "libre-shelf-backup",
    version: 1,
    items: [SAMPLE_ITEM],
    history: [record(R1)],
    currentSession: sessionFixture(),
  });
  expect(typeof body.exportedAt).toBe("string");
});

test("保存されている商品が壊れているとき、書き出さず、ボタンの左にアラートを出す", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("items", "["));
  await page.goto("/data");

  await page.getByRole("button", { name: "すべて書き出す" }).click();

  const alert = page.getByRole("alert").filter({ hasText: EXPORT_FAILED });
  await expect(alert).toHaveText(EXPORT_FAILED);
  await expectBeside(alert, page.getByRole("button", { name: "すべて書き出す" }));
});

test("まとめて書き出したファイルを読み込むと、端末に合わせて書き込み、件数をトーストで出す", async ({
  page,
}) => {
  await seedLocalStorage(page, { event_session_history: [record(R1)] });
  await page.goto("/data");

  await importFile(
    page,
    backupFile({
      items: [SAMPLE_ITEM],
      history: [record(R1), record(R2, "夏の即売会")],
      currentSession: sessionFixture(),
    }),
  );

  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "商品1件、記録1件を読み込みました。進行中の即売会も読み込みました。" }),
  ).toBeVisible();
  expect(await readLocalStorage(page, "items")).toEqual([SAMPLE_ITEM]);
  expect(await readLocalStorage(page, "event_session_history")).toEqual([
    record(R1),
    record(R2, "夏の即売会"),
  ]);
  expect(await readLocalStorage(page, "event_session")).toEqual(sessionFixture());
});

test("端末に進行中のセッションがあるとき、ファイルのものは入れず、そのことをトーストで出す", async ({
  page,
}) => {
  await seedLocalStorage(page, {
    event_session: sessionFixture({ eventName: "端末の即売会" }),
  });
  await page.goto("/data");

  await importFile(page, backupFile({ currentSession: sessionFixture({ eventName: "ファイルの" }) }));

  await expect(
    page.getByRole("status").filter({
      hasText: "商品0件、記録0件を読み込みました。進行中の即売会は、すでにあるので読み込みませんでした。",
    }),
  ).toBeVisible();
  expect(await readLocalStorage(page, "event_session")).toEqual(
    sessionFixture({ eventName: "端末の即売会" }),
  );
});

test("読み込めないファイルを選ぶと、何も変えず、ボタンの左にアラートを出す", async ({ page }) => {
  await seedLocalStorage(page, { items: [SAMPLE_ITEM] });
  await page.goto("/data");

  await importFile(page, backupFile({ format: "other" }));

  const alert = page.getByRole("alert").filter({ hasText: IMPORT_FAILED });
  await expect(alert).toHaveText(IMPORT_FAILED);
  await expectBeside(alert, page.getByRole("button", { name: "読み込む" }));
  expect(await readLocalStorage(page, "items")).toEqual([SAMPLE_ITEM]);

  // 次に読み込むと、アラートは消える
  await importFile(page, backupFile());
  await expect(alert).toHaveCount(0);
});

test("書き込みに失敗したとき、「データを保存できませんでした。」を出し、書き込む前の値に戻す", async ({
  page,
}) => {
  await seedLocalStorage(page, { items: [SAMPLE_ITEM] });
  await failLocalStorageWrites(page, "event_session");
  await page.goto("/data");

  await importFile(
    page,
    backupFile({
      items: [{ ...SAMPLE_ITEM, product_name: "上書き" }],
      currentSession: sessionFixture(),
    }),
  );

  await expect(page.getByRole("alert").filter({ hasText: WRITE_FAILED })).toHaveText(WRITE_FAILED);
  expect(await readLocalStorage(page, "items")).toEqual([SAMPLE_ITEM]);
});

test("1 件のセッションのファイルを読み込むと、履歴に足し、即売会の名前をトーストで出す", async ({
  page,
}) => {
  await page.goto("/data");

  await importFile(
    page,
    JSON.stringify({
      format: "libre-shelf-session",
      version: 1,
      exportedAt: "2026-12-30T18:00:00+09:00",
      session: sessionFixture({ eventName: "春の即売会", settled: true }),
    }),
  );

  await expect(
    page.getByRole("status").filter({ hasText: "「春の即売会」の記録を読み込みました。" }),
  ).toBeVisible();
  expect(await readLocalStorage(page, "event_session_history")).toMatchObject([
    { session: { eventName: "春の即売会" } },
  ]);
});
