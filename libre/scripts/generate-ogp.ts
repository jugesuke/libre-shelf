import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { buildBookIconSvg } from "../shared/icon/book-icon.ts";
import { NAV_PAGES } from "../src/app/nav-sections.ts";
import { proxyFromEnv } from "../e2e/proxy.ts";

/**
 * SNS でリンクを共有したときに出す画像（OGP 画像、1200×630 の PNG）を描き、public/ogp.png へ書き出す。
 *
 * ブラウザとフォントの取得が要るので、ビルドでは実行しない。メニューの画面の色や数、
 * アプリの紹介の文言を変えたときに、手で `node scripts/generate-ogp.ts` を実行し、生成物をコミットする。
 */
const WIDTH = 1200;
const HEIGHT = 630;

const icon = buildBookIconSvg(
  NAV_PAGES.map((page) => ({ key: page.key, color: page.theme.primary })),
);

// 帯はフレームの本文の上端の帯（docs/spec/デザイン/index.md の「フレーム」）に倣い、画面の色を並べる
const band = NAV_PAGES.map(
  (page) => `<div style="flex:1;background:${page.theme.primary}"></div>`,
).join("");

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=block" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
    font-family: "BIZ UDPGothic", sans-serif; color: #101828; background: #ffffff;
    display: flex; flex-direction: column;
  }
  .bar { height: 16px; display: flex; }
  .body { flex: 1; display: flex; align-items: center; gap: 56px; padding: 0 96px; }
  .icon svg { width: 288px; height: 288px; display: block; }
  .name { font-size: 96px; font-weight: 700; line-height: 1.1; }
  .lead { margin-top: 24px; font-size: 48px; font-weight: 700; line-height: 1.3; }
  .desc { margin-top: 24px; font-size: 28px; line-height: 1.5; color: #4a5565; }
</style>
</head>
<body>
  <div class="body">
    <div class="icon">${icon}</div>
    <div>
      <div class="name">Libre Shelf</div>
      <div class="lead">同人誌即売会のためのレジ</div>
      <div class="desc">頒布しながら記録して、あとで振り返る</div>
    </div>
  </div>
  <div class="bar">${band}</div>
</body>
</html>`;

const outPath = fileURLToPath(new URL("../public/ogp.png", import.meta.url));
const browser = await chromium.launch({ proxy: proxyFromEnv() });
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => document.fonts.check('700 16px "BIZ UDPGothic"'));
  if (!loaded) throw new Error("BIZ UDPGothic を読み込めませんでした");
  await page.screenshot({ path: outPath });
  console.log(`generated ${outPath}`);
} finally {
  await browser.close();
}
