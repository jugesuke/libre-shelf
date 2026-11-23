import type { Decorator, Preview } from "@storybook/react-vite";
import { createElement, type ComponentProps } from "react";
import { PALETTE, type PaletteKey } from "../src/palette";
import { cn } from "../src/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../src/components/table";
import { ToastProvider } from "../src/components/toast";
import "../src/styles.css";

/** 説明ページの表。Storybook の説明ページの CSS が効かないよう、sb-unstyled で包む */
const DocsTable = (props: ComponentProps<typeof Table>) =>
  createElement("div", { className: "sb-unstyled my-4 font-sans" }, createElement(Table, props));

/** 説明ページの表のセル。文章が長いので、表のコンポーネントの既定の折り返さない指定を外す */
const DocsTableCell = ({ className, ...props }: ComponentProps<typeof TableCell>) =>
  createElement(TableCell, { ...props, className: cn("whitespace-normal", className) });

/**
 * 説明ページの文章の要素を、基本デザインのタイポグラフィと余白で描く。
 * sb-unstyled を付けると、Storybook の説明ページの CSS がその要素に効かなくなる
 */
const docsElement =
  <T extends keyof React.JSX.IntrinsicElements>(tag: T, base: string) =>
  ({ className, ...props }: ComponentProps<T>) =>
    createElement(tag, { ...props, className: cn("sb-unstyled font-sans text-foreground", base, className) });

const docsComponents = {
  h1: docsElement("h1", "mb-4 text-2xl font-bold"),
  h2: docsElement("h2", "mt-8 mb-3 text-lg font-bold"),
  h3: docsElement("h3", "mt-6 mb-2 text-base font-bold"),
  p: docsElement("p", "my-3 text-sm"),
  ul: docsElement("ul", "my-3 list-disc pl-6 text-sm"),
  ol: docsElement("ol", "my-3 list-decimal pl-6 text-sm"),
  li: docsElement("li", "my-1"),
  code: docsElement("code", "rounded-sm bg-muted px-1 font-mono text-sm"),
  table: DocsTable,
  thead: TableHeader,
  tbody: TableBody,
  tr: TableRow,
  th: TableHead,
  td: DocsTableCell,
};

const isPaletteKey = (key: unknown): key is PaletteKey => typeof key === "string" && key in PALETTE;

/** ツールバーで選んだプライマリカラーを html の CSS の変数に設定する（`Frame` と同じやり方） */
const withPrimaryColor: Decorator = (Story, context) => {
  const key = context.globals.color;
  if (isPaletteKey(key)) {
    const c = PALETTE[key];
    const style = document.documentElement.style;
    style.setProperty("--primary", c.primary);
    style.setProperty("--primary-foreground", c.primaryForeground);
    style.setProperty("--ring", c.ring);
  }
  return Story();
};

/** トーストを使う story のために、全体を `ToastProvider` で包む */
const withToast: Decorator = (Story) => createElement(ToastProvider, null, createElement(Story));

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [withPrimaryColor, withToast],
  parameters: {
    // 開いたときに説明ページを出し、説明ページに story のコードを出す
    viewMode: "docs",
    docs: {
      codePanel: true,
      // 説明ページの Markdown の見出し、文章、表も、デザインシステムのタイポグラフィとコンポーネントで表示する
      components: docsComponents,
    },
    // UI は、画面の枠、まとまり、操作、入力、表示、フィードバック、重ねて出すものの順に並べる
    options: { storySort: { order: ["はじめに", "コンセプト", "原則", "基本デザイン", ["色", "タイポグラフィ", "リンク", "余白", "角丸", "影", "アニメーション", "ターゲットサイズ", "レイアウト", "文言と書式"], "UI", ["Frame", "Page", "Card", "Button", "TextLink", "Field", "Input", "Select", "Textarea", "SegmentedControl", "Tabs", "Table", "Badge", "Alert", "Toast", "Dialog", "ConfirmDialog"], "デザインパターン", ["フィードバック", "確認", "読み込み中と処理中", "何もないとき"], "開発", ["コンポーネントの作り方", "スタイルの指定", "色の変数"], "参考文献"] } },
  },
  initialGlobals: { color: "red" },
  globalTypes: {
    color: {
      description: "どのプライマリカラーで表示するか",
      toolbar: {
        title: "色",
        icon: "paintbrush",
        items: (Object.keys(PALETTE) as PaletteKey[]).map((key) => ({ value: key, title: PALETTE[key].name })),
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
