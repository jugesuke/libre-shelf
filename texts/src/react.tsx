import { createContext, useContext, useCallback, type ReactNode } from "react";
import type { Dictionary, Text } from "./text.ts";

type Translate<V> = <K extends keyof V>(
  key: K,
  ...values: {} extends V[K] ? [] : [V[K]]
) => string;

/**
 * 画面ごとの文言と、画面が渡す値の型を書いた宣言 `S` から、その宣言用の関数一式を作る。
 *
 * @example
 * type Schema = { list: { failed: { status: number }; title: {} } };
 * export const { defineTexts, TextsProvider, useTexts } = createTexts<Schema>();
 *
 * // 辞書（アプリごとに書く）
 * const dictionary = defineTexts({
 *   list: { title: text`一覧`, failed: text`失敗（HTTP ${value("status")}）` },
 * });
 *
 * // 画面
 * <TextsProvider value={dictionary}>…</TextsProvider>
 * const t = useTexts("list");
 * t("failed", { status: 500 });
 */
export const createTexts = <S extends { [screen: string]: { [key: string]: object } }>() => {
  const Context = createContext<Dictionary<S> | null>(null);

  /** 辞書を型の確認つきで書く。値をそのまま返す */
  const defineTexts = (dictionary: Dictionary<S>): Dictionary<S> => dictionary;

  /** 子孫の画面に辞書を渡す */
  const TextsProvider = ({ value, children }: { value: Dictionary<S>; children?: ReactNode }) => (
    <Context.Provider value={value}>{children}</Context.Provider>
  );

  /**
   * 画面の文言を取り出す関数を返す。`t("キー", { 値の名前: 値 })` のように呼ぶ。
   * 値を取らない文言は、値を渡さない。Provider の外で呼ぶと例外を投げる
   */
  const useTexts = <Sc extends keyof S>(screen: Sc): Translate<S[Sc]> => {
    const dictionary = useContext(Context);
    if (!dictionary) throw new Error("TextsProvider の中で使ってください");
    const screenTexts = dictionary[screen];
    return useCallback(
      ((key: keyof S[Sc], values?: Readonly<Record<string, unknown>>) =>
        (screenTexts[key] as Text<unknown>).render(values ?? {})) as Translate<S[Sc]>,
      [screenTexts],
    );
  };

  return { defineTexts, TextsProvider, useTexts };
};
