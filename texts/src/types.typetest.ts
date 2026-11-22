// 型で止めることの確認。`pnpm typecheck` で流す。`@ts-expect-error` の行が型エラーにならなければ失敗する。
import { createTexts } from "./react.tsx";
import { choose, text, value } from "./text.ts";

type Schema = {
  a: {
    plain: {};
    count: { n: number };
    two: { n: number; label: string };
    status: { status: number };
  };
  b: { other: {} };
};
const { defineTexts, useTexts } = createTexts<Schema>();

const ok = {
  a: {
    plain: text`x`,
    count: text`${value("n")}`,
    two: text`${value("n", (n: number) => `${n}個`)}`,
    status: choose("status", { 404: text`なし`, default: text`HTTP ${value("status")}` }),
  },
  b: { other: text`y` },
} as const;
defineTexts(ok);

// 宣言した値を使わない文言は、型エラーにしない
defineTexts({ ...ok, a: { ...ok.a, count: text`固定`, two: text`${value("label")}` } });

// 辞書 ---------------------------------------------------------------------

// 文言の書き忘れ
// @ts-expect-error
defineTexts({ a: ok.a });
// @ts-expect-error
defineTexts({ a: { plain: ok.a.plain }, b: ok.b });

// 宣言にない文言
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, extra: text`x` } });

// 宣言にない値を使う
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, plain: text`${value("n")}` } });
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, count: text`${value("m")}` } });

// 値の型が宣言と違う（書式の関数の引数）
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, count: text`${value("n", (n: string) => n)}` } });
// 値の型が宣言と違う（value は文字列と数だけ）
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, count: text`${value("n", (n: boolean) => String(n))}` } });
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, status: choose("n", { default: text`x` }) } });

// 組み込みの関数を使わない値
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, plain: "x" } });
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, plain: () => "x" } });
// @ts-expect-error
defineTexts({ ...ok, a: { ...ok.a, count: (n: number) => `${n}` } });

// text に埋め込めるのは value と choose の結果だけ
// @ts-expect-error
text`${"x"}`;
// @ts-expect-error
text`${1}`;

// 文字列を返さない書式の関数
// @ts-expect-error
value("n", (n: number) => n);

// choose の default の書き忘れ
// @ts-expect-error
choose("status", { 404: text`なし` });

// 画面 ---------------------------------------------------------------------

const t = useTexts("a");
t("plain");
t("count", { n: 1 });
t("two", { n: 1, label: "x" });

// ほかの画面の文言を呼ぶ
// @ts-expect-error
t("other");
// 宣言にない画面の名前
// @ts-expect-error
useTexts("c");
// 値の渡し忘れ
// @ts-expect-error
t("count");
// @ts-expect-error
t("two", { n: 1 });
// 宣言にない値
// @ts-expect-error
t("count", { n: 1, extra: 1 });
// @ts-expect-error
t("plain", { n: 1 });
// 違う型の値
// @ts-expect-error
t("count", { n: "1" });
