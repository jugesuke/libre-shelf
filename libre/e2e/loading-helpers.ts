import type { Page } from "@playwright/test";

/**
 * 指定したメソッドと `pathname` の API 呼び出しを、`release()` まで待たせる。`mockApi` のあとに呼ぶ。
 * 待たせるのは `hold()` を呼んでから `release()` を呼ぶまでの間だけで、最初は待たせない。
 */
export async function holdRequests(
  page: Page,
  method: string,
  pathname: string,
): Promise<{ hold: () => void; release: () => void }> {
  const state: { gate: Promise<void> | null; open: () => void } = {
    gate: null,
    open: () => {},
  };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    if (
      request.method() === method &&
      new URL(request.url()).pathname === pathname &&
      state.gate
    ) {
      await state.gate;
    }
    await route.fallback();
  });
  return {
    hold: () => {
      state.gate = new Promise<void>((resolve) => {
        state.open = resolve;
      });
    },
    release: () => {
      state.open();
      state.gate = null;
    },
  };
}
