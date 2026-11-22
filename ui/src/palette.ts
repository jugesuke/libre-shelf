import clsx from "clsx";

/**
 * 画面のプライマリカラーに使える色の一覧。どの画面にどの色を使うかは、アプリが決める。
 *
 * - `primary` / `primaryForeground` / `ring`: `Frame` が html に設定する `--primary`、`--primary-foreground`、`--ring`
 * - `color` / `hoverColor`: メニューの選択中の項目と、ホバーしたときの Tailwind のクラス。
 *   Tailwind はソース中の完全なクラス名を走査するので、リテラル文字列で書く
 */
export const PALETTE = {
  red: {
    name: "赤",
    primary: "#e9004a",
    primaryForeground: "#ffffff",
    ring: "#e9004a",
    color: clsx("bg-[#e9004a]", "text-primary-foreground"),
    hoverColor: clsx("hover:bg-[#e9004a]/25", "hover:text-white"),
  },
  green: {
    name: "緑",
    primary: "#008814",
    primaryForeground: "#ffffff",
    ring: "#008814",
    color: clsx("bg-[#008814]", "text-primary-foreground"),
    hoverColor: clsx("hover:bg-[#008814]/25", "hover:text-white"),
  },
  purple: {
    name: "紫",
    primary: "#b519ff",
    primaryForeground: "#ffffff",
    ring: "#b519ff",
    color: clsx("bg-[#b519ff]", "text-primary-foreground"),
    hoverColor: clsx("hover:bg-[#b519ff]/25", "hover:text-white"),
  },
  // 黄は白い文字とのコントラストが足りないので、文字とフォーカスリングを黒にする
  yellow: {
    name: "黄",
    primary: "#fdc700",
    primaryForeground: "#101828",
    ring: "#101828",
    color: clsx("bg-[#fdc700]", "text-primary-foreground"),
    hoverColor: clsx("hover:bg-[#fdc700]/25", "hover:text-white"),
  },
  blue: {
    name: "青",
    primary: "#0073df",
    primaryForeground: "#ffffff",
    ring: "#0073df",
    color: clsx("bg-[#0073df]", "text-primary-foreground"),
    hoverColor: clsx("hover:bg-[#0073df]/25", "hover:text-white"),
  },
} as const;

export type PaletteKey = keyof typeof PALETTE;
export type PaletteColor = (typeof PALETTE)[PaletteKey];
