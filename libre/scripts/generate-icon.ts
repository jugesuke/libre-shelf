import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildBookIconSvg } from "../shared/icon/book-icon.ts";
import { NAV_PAGES } from "../src/app/nav-sections.ts";

/**
 * サービスアイコン（積み上がった本）を生成し public/icon.svg へ書き出す。
 *
 * メニューの画面（NAV_PAGES）を元にし、ビルドと開発サーバーの起動の前に実行する。
 * 冊数と色は、メニューの画面の増減と色に追従する。生成物は git で追跡しない。
 */
const svg = buildBookIconSvg(
  NAV_PAGES.map((page) => ({ key: page.key, color: page.theme.primary })),
);

const outPath = fileURLToPath(new URL("../public/icon.svg", import.meta.url));
const contents = `<!-- 自動生成: scripts/generate-icon.ts。手で編集しない -->\n${svg}\n`;

writeFileSync(outPath, contents);
console.log(`generated ${outPath} (${NAV_PAGES.length} books)`);
