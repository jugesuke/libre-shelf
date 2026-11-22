import { expect, test } from "@playwright/test";

// docs/spec/リンクを共有したときの表示.md の「確かめ方」
test("/ の index.html に og:title と twitter:card の meta があり、ogp.png は PNG で取得できる", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Libre Shelf");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  const response = await request.get("/ogp.png");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const signature = [...(await response.body()).subarray(0, 8)];
  expect(signature).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});
