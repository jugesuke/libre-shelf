import { expect, test } from "@playwright/test";
import { SAMPLE_ITEM, seedItems, seedSession, sessionFixture } from "./local-data";

// docs/spec/バーコードのカメラ読み取り.md の「確かめ方」。
// ItemInput を使う画面の代表として、即売会の前日準備で確かめる。
// tsconfig.node.json は DOM の型を持たないので、ページの中で動く式は文字列で渡す
const TRACK_STATES = "window.__cameraTracks.map((t) => t.readyState)";
const VIDEO_PLAYING = `(() => {
  const v = document.querySelector('[role="dialog"] video');
  return v !== null && !v.paused && v.videoWidth > 0;
})()`;
const FRAME_SIZE = `(() => {
  const f = document.querySelector('[data-testid="camera-frame"]');
  if (f === null) return null;
  const r = f.getBoundingClientRect();
  return { width: r.width, height: r.height };
})()`;

test.beforeEach(async ({ page }) => {
  // getUserMedia が返したトラックを控え、止まったかをあとで確かめられるようにする
  await page.addInitScript(`
    window.__cameraTracks = [];
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await getUserMedia(constraints);
      window.__cameraTracks.push(...stream.getTracks());
      return stream;
    };
  `);
  await seedItems(page, [SAMPLE_ITEM]);
  await seedSession(page, sessionFixture({ phase: "preparation", menu: [] }));
  await page.goto("/event/session");
});

test("前日準備で、「カメラ」ボタンは、バーコード / 直接入力のときだけ表示する", async ({
  page,
}) => {
  const camera = page.getByRole("button", { name: "カメラ", exact: true });

  await expect(camera).toBeVisible();

  await page.getByRole("button", { name: "一覧から選択" }).click();
  await expect(camera).toHaveCount(0);

  await page.getByRole("button", { name: "バーコード / 直接入力" }).click();
  await expect(camera).toBeVisible();
});

test("前日準備で、「カメラ」ボタンの文字は改行しない", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: "カメラ", exact: true }),
  ).toHaveCSS("white-space", "nowrap");
});

test("前日準備で、「カメラ」ボタンでダイアログが開き、「閉じる」で閉じる", async ({
  page,
}) => {
  await page.getByRole("button", { name: "カメラ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(dialog).toHaveCount(0);
});

test("前日準備で、「カメラ」ボタンでダイアログが開いて映像が再生され、「閉じる」でカメラが止まる", async ({
  page,
}) => {
  await page.getByRole("button", { name: "カメラ", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(VIDEO_PLAYING)).toBe(true);
  await expect.poll(() => page.evaluate(TRACK_STATES)).toEqual(["live"]);

  await dialog.getByRole("button", { name: "閉じる" }).click();

  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(TRACK_STATES)).toEqual(["ended"]);
});

test("前日準備で、映像の枠は 4:3 で、映像が届く前後で大きさが変わらない", async ({
  page,
}) => {
  await page.getByRole("button", { name: "カメラ", exact: true }).click();

  await expect(page.getByTestId("camera-frame")).toBeVisible();
  const before = await page.evaluate<{ width: number; height: number } | null>(
    FRAME_SIZE,
  );
  expect(before).not.toBeNull();
  expect(before!.width / before!.height).toBeCloseTo(4 / 3, 2);

  await expect.poll(() => page.evaluate(VIDEO_PLAYING)).toBe(true);
  expect(await page.evaluate(FRAME_SIZE)).toEqual(before);
});

test("前日準備で、枠の上下の真ん中に、赤い破線の横の線を表示する", async ({
  page,
}) => {
  await page.getByRole("button", { name: "カメラ", exact: true }).click();

  const line = page.getByTestId("camera-line");
  await expect(line).toBeVisible();
  await expect(line).toHaveCSS("border-top-style", "dashed");
  await expect(line).toHaveCSS("border-top-width", "2px");
  await expect(line).toHaveCSS("border-top-color", "rgb(255, 75, 0)");

  const frameBox = await page.getByTestId("camera-frame").boundingBox();
  const lineBox = await line.boundingBox();
  expect(frameBox).not.toBeNull();
  expect(lineBox).not.toBeNull();
  expect(lineBox!.width).toBeCloseTo(frameBox!.width, 0);
  expect(lineBox!.y + lineBox!.height / 2).toBeCloseTo(
    frameBox!.y + frameBox!.height / 2,
    0,
  );
});
