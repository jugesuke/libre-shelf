import { expect, test, type Page } from "@playwright/test";
import { boxesOf, expectBelow, expectBeside, expectFloatingBelow, offsetBetween } from "./feedback-helpers";
import { failRequests } from "./confirm-helpers";
import {
  failLocalStorageWrites,
  NO_COINS,
  SAMPLE_ITEM,
  seedItems,
  seedSession,
  sessionFixture,
} from "./local-data";
import { mockApi } from "./mock-api";
import type { LibreEventSession } from "@libre-shared/entity/event/v2026-11-21/libre-event-session";

const MOCK_ITEM = SAMPLE_ITEM;
const ISDN_ID = "2784702901978";
const ISDN_FAILED =
  "商品を追加できませんでした。通信状態を確認して、もう一度追加してください。";
const ISDN_FAILED_OTHER =
  "商品を追加できませんでした。時間をおいて、もう一度追加してください。";
const ITEM_WRITE_FAILED =
  "商品を保存できませんでした。端末の空き容量を確認してください。";
const HISTORY_FAILED =
  "履歴に保存できませんでした。端末の空き容量を確認して、もう一度保存してください。";

type Phase = "preparation" | "opening" | "register" | "closing" | "done";

/** 即売会のセッション。データの形は docs/spec/即売会/セッションのデータ.md */
const session = (phase: Phase, overrides: Partial<LibreEventSession> = {}) =>
  sessionFixture({ phase, ...overrides });

/** ブラウザの alert() が出たら、その文言を溜める。confirm() は出ないはずだが、出たら承諾する */
function trackAlerts(page: Page): string[] {
  const alerts: string[] = [];
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "alert") alerts.push(dialog.message());
    await dialog.accept();
  });
  return alerts;
}

/** セッションを localStorage に入れて、即売会の画面を開く。`value` が null ならセッションなし */
async function openEvent(page: Page, value: LibreEventSession | null) {
  if (value) await seedSession(page, value);
  await page.goto("/event/session");
}

test.beforeEach(async ({ page }) => {
  await mockApi(page, {});
  await seedItems(page, [SAMPLE_ITEM]);
});

test("前日準備: 入力が足りないとき、欄ごとに入力欄の下へ理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await openEvent(page, null);
  await page.getByRole("button", { name: "レジへ進む" }).click();

  await expect(page.getByText("イベントの名前を入力してください。")).toBeVisible();
  await expect(page.getByText("商品を1つ以上追加してください。")).toBeVisible();
  expect(alerts).toEqual([]);

  await page.getByLabel("イベント", { exact: true }).fill("テスト即売会");
  await expect(page.getByText("イベントの名前を入力してください。")).toHaveCount(0);
  await expect(page.getByText("商品を1つ以上追加してください。")).toBeVisible();
});

test("前日準備: 委託物の預かり部数が足りないとき、その行の欄の下へ理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await openEvent(page, null);
  await page.getByLabel("イベント", { exact: true }).fill("テスト即売会");
  await page.getByLabel("商品を追加").fill(MOCK_ITEM.item_id);
  await page.getByLabel("商品を追加").press("Enter");
  await page.getByLabel(`${MOCK_ITEM.product_name}の委託元`).fill("委託さん");
  await page.getByRole("button", { name: "続きはあとで" }).click();

  const qty = page.getByLabel(`${MOCK_ITEM.product_name}の預かり部数`);
  await expect(
    page.getByText("預かり部数を入力してください（1以上の整数）。"),
  ).toBeVisible();
  await expect(qty).toHaveAttribute("aria-invalid", "true");
  expect(alerts).toEqual([]);

  await qty.fill("3");
  await expect(
    page.getByText("預かり部数を入力してください（1以上の整数）。"),
  ).toHaveCount(0);
});

test("前日準備: 「続きはあとで」で保存したとき、画面が変わらないのでトーストを出す", async ({
  page,
}) => {
  await openEvent(page, null);
  await page.getByLabel("イベント", { exact: true }).fill("テスト即売会");
  await page.getByLabel("商品を追加").fill(MOCK_ITEM.item_id);
  await page.getByLabel("商品を追加").press("Enter");
  await page.getByLabel(`${MOCK_ITEM.product_name}の持ち込み予定数`).fill("5");
  await page.getByRole("button", { name: "続きはあとで" }).click();

  await expect(page.getByRole("status")).toContainText("保存しました。");
});

const CONSIGNED_MENU = [
  {
    itemId: MOCK_ITEM.item_id,
    productName: MOCK_ITEM.product_name,
    publisherName: MOCK_ITEM.publisher_name,
    price: 500,
    consignorName: "委託さん",
  },
];
const QTY_ERROR = "預かり部数を入力してください（1以上の整数）。";

test("当日開始: 入力が足りないとき、入力欄の下へ理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await openEvent(
    page,
    session("opening", { menu: CONSIGNED_MENU, consignedStock: [] }),
  );
  await page.getByRole("button", { name: "保存してレジへ進む" }).click();

  await expect(
    page.getByText("開始時レジ金を入力してください。"),
  ).toBeVisible();
  const qty = page.getByLabel(`${MOCK_ITEM.product_name}の持込部数`);
  await expect(page.getByText(QTY_ERROR)).toBeVisible();
  await expect(qty).toHaveAttribute("aria-invalid", "true");
  expect(alerts).toEqual([]);

  await page.getByLabel("500円玉の枚数").fill("1");
  await expect(page.getByText("開始時レジ金を入力してください。")).toHaveCount(
    0,
  );
  await qty.fill("3");
  await expect(page.getByText(QTY_ERROR)).toHaveCount(0);
});

test("当日終了: 入力が足りないとき、入力欄の下へ理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await openEvent(
    page,
    session("closing", {
      openingStock: [{ itemId: MOCK_ITEM.item_id, quantity: 20 }],
    }),
  );
  await page.getByRole("button", { name: "〆作業を完了する" }).click();

  const stock = page.getByLabel(`${MOCK_ITEM.product_name}の実在庫`);
  await expect(page.getByText("実在庫数を入力してください。")).toBeVisible();
  await expect(stock).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("終了時レジ金を入力してください。"),
  ).toBeVisible();
  expect(alerts).toEqual([]);

  await stock.fill("20");
  await expect(page.getByText("実在庫数を入力してください。")).toHaveCount(0);
  await page.getByLabel("500円玉の枚数").fill("1");
  await expect(page.getByText("終了時レジ金を入力してください。")).toHaveCount(
    0,
  );
});

test("当日終了: 失敗がないとき、ボタンの上に何もない帯がない", async ({
  page,
}) => {
  await openEvent(
    page,
    session("closing", {
      openingStock: [{ itemId: MOCK_ITEM.item_id, quantity: 20 }],
    }),
  );
  const button = page.getByRole("button", { name: "〆作業を完了する" });
  const section = page.getByRole("heading", { name: "終了時レジ金" }).locator("..");
  const s = await section.boundingBox();
  const b = await button.boundingBox();
  // 帯があると 90px を超える。ボタンの行は 56px で、ボタン（36px）は中央に置く
  expect(b!.y - (s!.y + s!.height)).toBeLessThan(56);
});

test("当日終了: 完了したとき、移った先の画面で分かるのでトーストを出さない", async ({
  page,
}) => {
  await openEvent(
    page,
    session("closing", {
      openingStock: [{ itemId: MOCK_ITEM.item_id, quantity: 20 }],
    }),
  );
  await page.getByLabel(`${MOCK_ITEM.product_name}の実在庫`).fill("19");
  await page.getByLabel("500円玉の枚数").fill("1");
  await page.getByRole("button", { name: "〆作業を完了する" }).click();

  await expect(page.getByRole("heading", { name: "在庫の確定" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /。$/ })).toHaveCount(
    0,
  );
});

test("当日終了: 実在庫が帳簿と一致したとき、在庫差異がないことを文で出す", async ({
  page,
}) => {
  await openEvent(
    page,
    session("closing", {
      openingStock: [{ itemId: MOCK_ITEM.item_id, quantity: 20 }],
    }),
  );
  await page.getByLabel(`${MOCK_ITEM.product_name}の実在庫`).fill("20");
  await page.getByLabel("500円玉の枚数").fill("1");

  await expect(
    page.getByText("在庫差異はありません。", { exact: true }),
  ).toBeVisible();
});

const DONE_SESSION = (overrides: Record<string, unknown> = {}) =>
  session("done", {
    openingStock: [{ itemId: MOCK_ITEM.item_id, quantity: 20 }],
    closingStock: [{ itemId: MOCK_ITEM.item_id, quantity: 19 }],
    sampleSubmissions: [
      {
        itemId: MOCK_ITEM.item_id,
        quantity: 1,
        occurredAt: "2026-11-17T10:00:00+09:00",
      },
    ],
    openingCash: { counts: { ...NO_COINS, "500yen": 1 }, other: 0 },
    closingCash: { counts: { ...NO_COINS, "500yen": 1 }, other: 0 },
    ...overrides,
  });

test("終了後: 在庫差異がないとき、確定できることを文で出す", async ({
  page,
}) => {
  await openEvent(page, DONE_SESSION());

  await expect(
    page.getByText("在庫差異はありません。在庫を確定できます。", {
      exact: true,
    }),
  ).toBeVisible();
});

test("終了後: 在庫の確定が済んだとき、完了を文で出す", async ({ page }) => {
  await openEvent(page, DONE_SESSION({ stockDifference: [] }));

  await expect(
    page.getByText("在庫を確定しました。", { exact: true }),
  ).toBeVisible();
});

test("終了後: 履歴への保存に失敗したとき、ボタンの左にそのまま出し、ほかの要素を動かさない", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await seedSession(page, DONE_SESSION({ stockDifference: [] }));
  await failLocalStorageWrites(page, "event_session_history");
  await page.goto("/event/session");
  const button = page.getByRole("button", { name: "履歴に保存" });
  const json = page.getByRole("button", { name: "ファイルに書き出す" });
  const tabs = page.getByRole("tab").first();
  const before = await offsetBetween(tabs, button);
  await button.click();

  const failure = page.getByRole("alert").filter({ hasText: HISTORY_FAILED });
  await expect(failure).toHaveText(HISTORY_FAILED);
  expect(alerts).toEqual([]);
  await expectBeside(failure, json);
  expect(await offsetBetween(tabs, button)).toEqual(before);
  await expect(page).toHaveURL(/\/event\/session$/);
});

test("終了後: 履歴に保存できたとき、移った先の一覧で分かるのでトーストを出さない", async ({
  page,
}) => {
  await openEvent(page, DONE_SESSION({ stockDifference: [] }));
  await page.getByRole("button", { name: "履歴に保存" }).click();

  await expect(page).toHaveURL(/\/event$/);
  await expect(page.getByRole("status").filter({ hasText: /。$/ })).toHaveCount(
    0,
  );
});

test("終了後: 在庫情報を保存したとき、画面が変わらないのでトーストを出す", async ({
  page,
}) => {
  await openEvent(page, DONE_SESSION());
  await page.getByLabel(`${MOCK_ITEM.product_name}の実在庫`).fill("18");
  await page.getByRole("button", { name: "在庫情報を保存" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "保存しました。" }),
  ).toBeVisible();
});

test("終了後: 委託販売サマリーのコピーに成功したとき、トーストを出す", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.resolve() },
      configurable: true,
    });
  });
  await openEvent(page, session("done", { menu: CONSIGNED_MENU }));
  await page.getByRole("tab", { name: "委託" }).click();
  await page.getByRole("button", { name: "コピー" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "コピーしました。" }),
  ).toBeVisible();
});

test("終了後: 委託販売サマリーのコピーに失敗したとき、ヘッダーの下に浮かせて出し、ほかの要素を動かさない", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    });
  });
  await openEvent(page, session("done", { menu: CONSIGNED_MENU }));
  await page.getByRole("tab", { name: "委託" }).click();
  const button = page.getByRole("button", { name: "コピー" });
  const table = page.getByRole("table").last();
  const header = page.locator("[data-slot=card-header]").filter({ has: button });
  const before = await boxesOf([button, table]);
  await button.click();

  const failure = page
    .getByRole("alert")
    .filter({ hasText: "コピーできませんでした。もう一度コピーしてください。" });
  await expect(failure).toBeVisible();
  await expectBelow(failure, header);
  expect(await boxesOf([button, table])).toEqual(before);
  const f = await failure.boundingBox();
  const h = await header.boundingBox();
  expect(f!.x).toBeCloseTo(h!.x, 0);
  expect(f!.width).toBeCloseTo(h!.width, 0);
  await expect(failure.getByRole("button", { name: "閉じる" })).toBeVisible();
});

test("レジ: 開始処理を保存したとき、画面が変わらないのでトーストを出す", async ({
  page,
}) => {
  await openEvent(
    page,
    session("register", {
      plannedStock: [{ itemId: MOCK_ITEM.item_id, quantity: 5 }],
      openingCash: { counts: { ...NO_COINS, "500yen": 1 }, other: 0 },
    }),
  );
  await page.getByRole("button", { name: "開始処理を編集" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "保存" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "開始処理を保存しました。" }),
  ).toBeVisible();
});

async function openMenuEdit(
  page: Page,
  overrides: Record<string, unknown> = {},
) {
  await openEvent(page, session("register", overrides));
  await page.getByRole("button", { name: "商品・価格編集" }).click();
  return page.getByRole("dialog");
}

test("商品・価格編集: 委託物の預かり部数が足りないとき、その行の欄の下へ理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  const dialog = await openMenuEdit(page, { menu: CONSIGNED_MENU });
  await dialog.getByRole("button", { name: "保存" }).click();

  const qty = dialog.getByLabel(`${MOCK_ITEM.product_name}の預かり部数`);
  await expect(dialog.getByText(QTY_ERROR)).toBeVisible();
  await expect(qty).toHaveAttribute("aria-invalid", "true");
  expect(alerts).toEqual([]);

  await qty.fill("3");
  await expect(dialog.getByText(QTY_ERROR)).toHaveCount(0);
});

test("商品・価格編集: ISDNが空、数字以外のとき、入力欄の行の下のアラートに出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  const dialog = await openMenuEdit(page);
  await dialog.getByText("新規商品を登録").click();
  const input = dialog.getByLabel("ISDN", { exact: true });
  const register = dialog.locator("form").getByRole("button", { name: "追加", exact: true });
  await register.click();
  await expect(page.getByRole("alert")).toHaveText("ISDNを入力してください。");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");

  await input.fill("abc");
  await register.click();
  await expect(page.getByRole("alert")).toHaveText("ISDNは数字のみで入力してください。");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  expect(alerts).toEqual([]);
});

test("商品・価格編集: 狭い画面でも、ボタンは入力欄の横に並び上下がそろい、ISDN の形でないと応答されたとき、下の要素を動かさずにアラートに出す", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`, 422);
  const dialog = await openMenuEdit(page);
  await dialog.getByText("新規商品を登録").click();
  const input = dialog.getByLabel("ISDN", { exact: true });
  const add = dialog.locator("form").getByRole("button", { name: "追加", exact: true });
  const save = dialog.getByRole("button", { name: "保存" });
  const before = await boxesOf([input, add, save]);
  const saveOffset = await offsetBetween(input, save);
  expect(before[1]!.x).toBeGreaterThanOrEqual(before[0]!.x + before[0]!.width);
  expect(before[1]!.y).toBeCloseTo(before[0]!.y, 0);
  expect(before[1]!.height).toBeCloseTo(before[0]!.height, 0);

  await input.fill(ISDN_ID);
  const alert = page.getByRole("alert");
  await expect(alert).toHaveText("ISDNではありません。入力し直してください。");
  await expectFloatingBelow(alert, add);
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  expect(await boxesOf([input, add, save])).toEqual(before);
  expect(await offsetBetween(input, save)).toEqual(saveOffset);
});

test("商品・価格編集: ISDNでの取得に失敗したとき、入力欄の行の下に浮かせて出し、ほかの要素を動かさず、ダイアログも閉じない", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`);
  const dialog = await openMenuEdit(page);
  await dialog.getByText("新規商品を登録").click();
  const input = dialog.getByLabel("ISDN", { exact: true });
  const add = dialog.locator("form").getByRole("button", { name: "追加", exact: true });
  const before = await boxesOf([input, add]);
  await input.fill(ISDN_ID);

  // 浮かせたアラートはダイアログの外に置かれる
  const failure = page.getByRole("alert");
  await expect(failure).toHaveText(ISDN_FAILED_OTHER);
  await expect(failure).not.toContainText("boom");
  expect(alerts).toEqual([]);
  await expectBelow(failure, add);
  await expectFloatingBelow(failure, add);
  expect(await boxesOf([input, add])).toEqual(before);
  await expect(dialog).toBeVisible();
});

test("商品・価格編集: 通信できずに取得できなかったとき、次にすることを文で出す", async ({
  page,
}) => {
  await page.route(`**/api/v1/isdn/${ISDN_ID}`, (route) => route.abort());
  const dialog = await openMenuEdit(page);
  await dialog.getByText("新規商品を登録").click();
  await dialog.getByLabel("ISDN", { exact: true }).fill(ISDN_ID);

  await expect(page.getByRole("alert")).toHaveText(ISDN_FAILED);
});

test("商品・価格編集: 取得した情報が足りないとき、手入力の欄の名前で案内する", async ({
  page,
}) => {
  await failRequests(page, "GET", `/api/v1/isdn/${ISDN_ID}`, 400);
  const dialog = await openMenuEdit(page);
  await dialog.getByText("新規商品を登録").click();
  const input = dialog.getByLabel("ISDN", { exact: true });
  await input.fill(ISDN_ID);

  await expect(page.getByRole("alert")).toHaveText(
    "ISDNの情報が足りません。「手入力で登録」から追加してください。",
  );
  await expect(input).toHaveValue(ISDN_ID);
});

test("商品・価格編集: 手入力で必須が足りないとき、欄ごとに入力欄の下へ理由を出す", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  const dialog = await openMenuEdit(page);
  await dialog.getByText("新規商品を登録").click();
  await dialog.getByRole("button", { name: "手入力で登録" }).click();
  await dialog.locator("form").getByRole("button", { name: "追加", exact: true }).click();

  await expect(dialog.getByText("商品名を入力してください。")).toBeVisible();
  await expect(dialog.getByText("サークルを入力してください。")).toBeVisible();
  await expect(dialog.getByText("分類を選択してください。")).toBeVisible();
  await expect(dialog.getByText("種類を選択してください。")).toBeVisible();
  expect(alerts).toEqual([]);

  await dialog.getByLabel("商品名").fill("あ");
  await expect(dialog.getByText("商品名を入力してください。")).toHaveCount(0);
  await expect(dialog.getByText("サークルを入力してください。")).toBeVisible();
});

test("商品・価格編集: 手入力での登録に失敗したとき、ボタンの左にそのまま出し、ほかの要素を動かさない", async ({
  page,
}) => {
  const alerts = trackAlerts(page);
  await failLocalStorageWrites(page, "items");
  const dialog = await openMenuEdit(page);
  await dialog.getByText("新規商品を登録").click();
  await dialog.getByRole("button", { name: "手入力で登録" }).click();
  await dialog.getByLabel("商品名").fill("あ");
  await dialog.getByLabel("サークル").fill("い");
  await dialog.getByLabel("分類").selectOption({ index: 1 });
  await dialog.getByLabel("種類").selectOption({ index: 1 });
  const register = dialog.locator("form").getByRole("button", { name: "追加", exact: true });
  const price = dialog.getByLabel("価格", { exact: true });
  const before = await offsetBetween(price, register);
  await register.click();

  const failure = dialog.getByRole("alert");
  await expect(failure).toHaveText(ITEM_WRITE_FAILED);
  expect(alerts).toEqual([]);
  await expectBeside(failure, register);
  expect(await offsetBetween(price, register)).toEqual(before);
});

test("レジ: バーコードの欄で処理に失敗したとき、入力欄の行の下に浮かせて出し、ほかの要素を動かさない", async ({
  page,
}) => {
  await openEvent(page, session("register"));
  const input = page.getByLabel("商品ID");
  const cart = page.getByRole("table");
  const before = await boxesOf([input, cart]);
  await input.fill("9780000000000");
  await input.press("Enter");

  const failure = page.getByRole("alert");
  await expect(failure).toBeVisible();
  await expectBelow(failure, input);
  expect(await boxesOf([input, cart])).toEqual(before);
  await failure.getByRole("button", { name: "閉じる" }).click();
  await expect(failure).toHaveCount(0);
});
