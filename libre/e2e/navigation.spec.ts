import { expect, test, type Page } from "@playwright/test";

// docs/spec/ナビゲーション.md の「確かめ方」
// e2e/ の型には DOM がないので、ブラウザ側で動く関数は文字列で渡す。
// 文字だけを持つ要素（メニューの項目、グループの見出し）を、文字で探す
type TextStyle = { fontSize: string; fontWeight: string };
const readTextStyle = (page: Page, text: string): Promise<TextStyle> =>
  page.evaluate<TextStyle>(`(() => {
    const el = [...document.querySelectorAll("*")].find(
      (e) => e.childElementCount === 0 && e.textContent === ${JSON.stringify(text)},
    );
    const s = getComputedStyle(el);
    return { fontSize: s.fontSize, fontWeight: s.fontWeight };
  })()`);

test.describe("幅 1280px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("上端のバーとページのタイトルに、アプリの名前「Libre Shelf」が出る", async ({ page }) => {
    await page.goto("/items");
    await expect(page.getByText("Libre Shelf", { exact: true })).toBeVisible();
    await expect(page).toHaveTitle("Libre Shelf");
  });

  test("画面を開くと、メニューの項目が表示されている", async ({ page }) => {
    await page.goto("/items");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toBeVisible();
  });

  // docs/spec/デザイン/index.md の「フレーム」の「文字」
  test("メニューの項目は 14px の標準、選択中の項目は 14px の太字である", async ({
    page,
  }) => {
    await page.goto("/items");
    const item = page.getByRole("menuitem", { name: "即売会" });
    await expect(item).toBeVisible();
    expect(await readTextStyle(page, "即売会")).toEqual({
      fontSize: "14px",
      fontWeight: "400",
    });

    expect(await readTextStyle(page, "商品管理")).toEqual({
      fontSize: "14px",
      fontWeight: "700",
    });
  });

  // docs/spec/デザイン/index.md の「フレーム」の「寸法」
  test("メニューの内側の余白は、上下 4px、左右 8px である", async ({ page }) => {
    await page.goto("/items");
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
    await expect(nav).toHaveCSS("padding-top", "4px");
    await expect(nav).toHaveCSS("padding-bottom", "4px");
    await expect(nav).toHaveCSS("padding-left", "8px");
    await expect(nav).toHaveCSS("padding-right", "8px");
  });

  // docs/spec/デザイン/index.md の「フレーム」の「寸法」
  test("メニューの項目は角丸 6px である", async ({ page }) => {
    await page.goto("/items");
    const item = page.getByRole("menuitem", { name: "商品管理" });
    await expect(item).toHaveAttribute("aria-current", "page");
    await expect(item).toHaveCSS("border-radius", "6px");
  });

  // docs/spec/デザイン/index.md の「フレーム」の「寸法」の「項目どうしの間は 8px」
  test("メニューの項目どうしの間は 8px である（グループをまたぐ所）", async ({
    page,
  }) => {
    await page.goto("/items");
    const boxOf = async (name: string) => {
      const box = await page
        .getByRole("menuitem", { name, exact: true })
        .boundingBox();
      if (!box) throw new Error(`「${name}」の位置が取れない`);
      return box;
    };
    const gapBetween = async (upper: string, lower: string) => {
      const a = await boxOf(upper);
      const b = await boxOf(lower);
      return b.y - (a.y + a.height);
    };

    expect(await gapBetween("即売会", "商品管理")).toBe(8);
    expect(await gapBetween("商品管理", "データの管理")).toBe(8);
  });

  // docs/spec/デザイン/index.md の「フレーム」の「色」。左の線はなくす
  test("メニューの項目に左の線がない", async ({ page }) => {
    await page.goto("/items");
    await expect(
      page.getByRole("menuitem", { name: "商品管理" }),
    ).toHaveAttribute("aria-current", "page");
    for (const name of ["商品管理", "即売会", "データの管理"]) {
      await expect(
        page.getByRole("menuitem", { name }),
      ).toHaveCSS("border-left-width", "0px");
    }
  });

  // docs/spec/デザイン/index.md の「フレーム」の「色」の「フォーカスリング」
  test("キーボードでメニューを開閉するボタンにフォーカスすると、白の 2px の outline が 2px 離れて出る", async ({
    page,
  }) => {
    await page.goto("/items");
    const toggle = page.getByRole("button", { name: "メニューを閉じる" });
    // 描画が終わる前に Tab キーを押すと、フォーカスがページの先頭に残る
    await expect(toggle).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveCSS("outline-style", "solid");
    await expect(toggle).toHaveCSS("outline-width", "2px");
    await expect(toggle).toHaveCSS("outline-offset", "2px");
    await expect(toggle).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  });

  // docs/spec/デザイン/index.md の「フレーム」の「色」の「フォーカスリング」
  test("キーボードでメニューの項目にフォーカスすると、白の 2px の outline が項目の縁に付いて出る", async ({
    page,
  }) => {
    await page.goto("/items");
    const toggle = page.getByRole("button", { name: "メニューを閉じる" });
    const item = page.getByRole("menuitem", { name: "即売会" });
    // 描画が終わる前に Tab キーを押すと、フォーカスがページの先頭に残る
    await expect(item).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(item).toBeFocused();
    await expect(item).toHaveCSS("outline-style", "solid");
    await expect(item).toHaveCSS("outline-width", "2px");
    await expect(item).toHaveCSS("outline-offset", "0px");
    await expect(item).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  });

  // docs/spec/ナビゲーション.md の「開閉の状態」の表
  test("メニューが開いているとき Escape キーを押しても、開いたままである", async ({
    page,
  }) => {
    await page.goto("/items");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("button", { name: "メニューを閉じる" }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toBeVisible();
  });

  // docs/spec/ナビゲーション.md の「開閉の状態」の表
  test("メニューが閉じているとき Escape キーを押しても、閉じたままである", async ({
    page,
  }) => {
    await page.goto("/items");
    await page.getByRole("button", { name: "メニューを閉じる" }).click();
    await expect(
      page.getByRole("button", { name: "メニューを開く" }),
    ).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("button", { name: "メニューを開く" }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toHaveCount(0);
  });
});

// docs/spec/ナビゲーション.md の「確かめ方」と「表示」
test.describe("幅 412px", () => {
  test.use({ viewport: { width: 412, height: 800 } });

  test("画面を開くと、ハンバーガーボタンが「メニューを開く」で、閉じている", async ({
    page,
  }) => {
    await page.goto("/items");
    const toggle = page.getByRole("button", { name: "メニューを開く" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("画面を開くと、メニューの項目が表示されていない", async ({ page }) => {
    await page.goto("/items");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toHaveCount(0);
  });

  test("メニューを開いて項目を選ぶと、移った先の画面でメニューが閉じている", async ({
    page,
  }) => {
    await page.goto("/event");
    await page.getByRole("button", { name: "メニューを開く" }).click();
    await page.getByRole("menuitem", { name: "商品管理" }).click();
    await expect(page).toHaveURL("/items");
    const toggle = page.getByRole("button", { name: "メニューを開く" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toHaveCount(0);
  });

  // docs/spec/デザイン/index.md の「フレーム」の「開閉」。覆いの色は --overlay（rgb(16 24 40 / 0.5)）
  test("メニューを開くと、本文の上の覆いの背景色は --overlay である", async ({
    page,
  }) => {
    await page.goto("/items");
    await page.getByRole("button", { name: "メニューを開く" }).click();
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toBeVisible();

    // 覆いは読み上げに出さない想定なので、要素ではなく位置で調べる
    const background = await page.evaluate(`(() => {
      const el = document.elementFromPoint(380, 700);
      return el ? getComputedStyle(el).backgroundColor : null;
    })()`);
    expect(background).toBe("rgba(16, 24, 40, 0.5)");
  });

  test("メニューを開いて覆いを押すと、メニューが閉じる", async ({ page }) => {
    await page.goto("/items");
    await page.getByRole("button", { name: "メニューを開く" }).click();
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toBeVisible();

    // 覆いは読み上げに出さない想定なので、要素ではなく位置で押す。
    // 幅 412px では、メニューの列（w-56 = 224px）の右側が覆いに隠れている本文にあたる
    await page.mouse.click(380, 700);

    const toggle = page.getByRole("button", { name: "メニューを開く" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toHaveCount(0);
  });

  test("メニューを開いて Escape キーを押すと、メニューが閉じる", async ({
    page,
  }) => {
    await page.goto("/items");
    await page.getByRole("button", { name: "メニューを開く" }).click();
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");

    const toggle = page.getByRole("button", { name: "メニューを開く" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("menuitem", { name: "即売会" }),
    ).toHaveCount(0);
  });
});
