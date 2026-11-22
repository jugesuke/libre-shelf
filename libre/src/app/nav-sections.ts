import { PALETTE, type PaletteColor } from "@shelf/ui/palette";

/** 色の一覧の 1 色から、メニューの項目の色と、html に設定する色を作る */
const fromPalette = (c: PaletteColor) => ({
  color: c.color,
  hoverColor: c.hoverColor,
  theme: { primary: c.primary, primaryForeground: c.primaryForeground, ring: c.ring },
});

/** メニューに出す画面。並び順がメニューの並び順になる。画面の色は docs/spec/ナビゲーション.md の「色」 */
export const NAV_PAGES = [
  { key: "event" as const, name: "即売会", ...fromPalette(PALETTE.red) },
  { key: "items" as const, name: "商品管理", ...fromPalette(PALETTE.green) },
  { key: "data" as const, name: "データの管理", ...fromPalette(PALETTE.blue) },
];

export type NavTabType = (typeof NAV_PAGES)[number]["key"];

/** メニューのまとまり。項目が 1 つのまとまりは、見出しを出さない */
export const NAV_GROUPS: ReadonlyArray<{ label: string; items: ReadonlyArray<NavTabType> }> = [
  { label: "販売", items: ["event"] },
  { label: "商品", items: ["items"] },
  { label: "データ", items: ["data"] },
];
