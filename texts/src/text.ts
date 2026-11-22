declare const uses: unique symbol;

/**
 * 文言。`U` は、文言が画面から受け取って使う値の型。
 * `U` は関数の引数の位置に置いてある。こうすると、宣言した値の一部だけを使う文言は宣言に代入でき、
 * 宣言にない値や違う型の値を使う文言は代入できない。
 * `text`、`value`、`choose` で作る。
 */
export type Text<U> = {
  readonly [uses]?: (values: U) => void;
  readonly render: (values: Readonly<Record<string, unknown>>) => string;
};

/**
 * 画面ごと、文言のキーごとに、使える値の型を書いた宣言 `S` に対する、文言の辞書の型。
 * 宣言した値を文言で使わなくてもよい（アプリによって値を出さないことがある）。
 */
export type Dictionary<S> = {
  [Sc in keyof S]: { [K in keyof S[Sc]]: Text<S[Sc][K]> };
};

const make = <U>(render: Text<U>["render"]): Text<U> => ({ render });

type UsesOf<E extends readonly Text<never>[]> = E extends readonly []
  ? {}
  : E extends readonly Text<infer U>[]
    ? { [K in keyof U]: U[K] }
    : never;

/**
 * 文言を書くタグ付きテンプレート。`${…}` には `value` と `choose` で作ったものだけを埋め込める。
 *
 * @example
 * text`商品の取得に失敗しました（HTTP ${value("status")}）`
 */
export const text = <const E extends readonly Text<never>[]>(
  strings: TemplateStringsArray,
  ...embedded: E
): Text<UsesOf<E>> =>
  make((values) =>
    strings.reduce((out, s, i) => {
      const e = embedded[i];
      return out + s + (e ? e.render(values) : "");
    }, ""),
  );

/**
 * 画面が渡す値を埋め込む。書式の関数がなければ、文字列か数を、そのまま文字列にする。
 *
 * @example
 * value("count")
 * value("price", (yen: number) => `${yen.toLocaleString()}円`)
 */
export function value<N extends string>(name: N): Text<{ [K in N]: string | number }>;
export function value<N extends string, T>(
  name: N,
  format: (value: T) => string,
): Text<{ [K in N]: T }>;
export function value(
  name: string,
  format: (value: never) => string = String,
): Text<Record<string, unknown>> {
  return make((values) => (format as (value: unknown) => string)(values[name]));
}

type ChooseUses<N extends string, C extends Readonly<Record<string, Text<never>>>> = {
  [K in N]: string | number;
} & (C[keyof C] extends Text<infer U> ? U : never);

/**
 * 値の一致で、文言の場合を分ける。`default` は必須で、どれにも一致しないときに使う。
 * 値は文字列にして、場合のキーと比べる。
 *
 * @example
 * choose("status", {
 *   404: text`見つかりませんでした。`,
 *   default: text`失敗しました（HTTP ${value("status")}）`,
 * })
 */
export const choose = <
  N extends string,
  const C extends { readonly default: Text<never> } & Readonly<Record<string, Text<never>>>,
>(
  name: N,
  cases: C,
): Text<ChooseUses<N, C>> =>
  make((values) => {
    const key = String(values[name]);
    const chosen = Object.hasOwn(cases, key) ? cases[key] : cases.default;
    return (chosen ?? cases.default).render(values);
  });
