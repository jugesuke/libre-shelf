import type { Page } from "@playwright/test";

/**
 * 詳細のモーダルなど、データがないと開けない画面のために、API の応答を差し替える。
 * ローカルの D1 には触れない。`overrides` の キーは `pathname`、値は JSON の応答。
 * 載せていない `pathname` には、空の配列を返す。
 */
export async function mockApi(
  page: Page,
  overrides: Record<string, unknown>,
): Promise<void> {
  await page.route("**/api/v1/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const body = pathname in overrides ? overrides[pathname] : [];
    await route.fulfill({ json: body });
  });
}
