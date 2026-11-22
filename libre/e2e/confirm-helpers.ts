import type { Page } from "@playwright/test";

/** ブラウザの alert() と confirm() が出たら、種類と文言を溜める。出たものは承諾する */
export function trackNativeDialogs(page: Page): string[] {
  const seen: string[] = [];
  page.on("dialog", async (dialog) => {
    seen.push(`${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });
  return seen;
}

/** 指定したメソッドと `pathname` の API 呼び出しを数える。`mockApi` のあとに呼ぶ */
export async function recordRequests(
  page: Page,
  method: string,
  pathname: string,
): Promise<string[]> {
  const seen: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    if (
      request.method() === method &&
      new URL(request.url()).pathname === pathname
    ) {
      seen.push(request.url());
    }
    await route.fallback();
  });
  return seen;
}

/** 指定したメソッドと `pathname` の API 呼び出しを、失敗の応答にする。`mockApi` のあとに呼ぶ */
export async function failRequests(
  page: Page,
  method: string,
  pathname: string,
  status = 500,
  json: unknown = { error: "boom" },
): Promise<void> {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    if (
      request.method() === method &&
      new URL(request.url()).pathname === pathname
    ) {
      await route.fulfill({ status, json });
      return;
    }
    await route.fallback();
  });
}
