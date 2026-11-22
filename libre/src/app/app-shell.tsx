import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { Item } from "@libre-shared/entity/items/item";

/** 共通の画面が使う画面の枠。`currentTab` は、その画面がメニューのどの項目にあたるか */
export type AppFrameProps = { currentTab: "event" | "items"; children: ReactNode };

/** アプリごとに違う部分。アプリが `AppShellProvider` で渡す */
export type AppShell = {
  /** メニューと題名を持った画面の枠 */
  Frame: ComponentType<AppFrameProps>;
  /**
   * 商品管理の表の上に出す、アプリの操作（商品の書き出しと読み込みなど）。渡さなければ何も出さない。
   * `disabled` は商品マスタが読めないあいだ true。`onChanged` は商品を変えたあとに呼ぶと、一覧を読み直す
   */
  ItemsToolbar?: ComponentType<{ disabled: boolean; onChanged: () => void }>;
  /**
   * 商品マスタが読めなかったときの扱い。渡すと、商品の一覧を読めなかった失敗を、
   * 商品マスタが読めないものとして扱い、この文言を出して、商品の追加と編集をできなくする。
   * 渡さなければ、一覧を読めなかったときの扱いはしない
   */
  itemsUnreadable?: {
    /** 商品管理の画面のアラート */
    itemsPage: string;
    /** レジの商品・価格編集のダイアログの、本文の先頭のアラート */
    itemPicker: string;
  };
  /**
   * 前日準備で、商品の一覧の取得が例外で失敗したときの、おしながきの見出しの下のアラート。
   * `error` は例外を文字にしたもの。渡さなければ、アラートを出さない
   */
  itemsFetchThrown?: (error: string) => string;
  /**
   * レジの商品・価格編集のダイアログで、商品マスタに新しい商品を登録する欄。渡さなければ、共通の画面の欄を出す。
   * `mode` は切り替えの選択（`isdn` は ISDN から、`manual` は手入力）。登録できたら `onAdded` を呼ぶ
   */
  NewItemForms?: ComponentType<{ mode: "isdn" | "manual"; onAdded: (item: Item) => void }>;
};

const AppShellContext = createContext<AppShell | null>(null);

/** 共通の画面に、アプリごとに違う部分を渡す */
export const AppShellProvider = AppShellContext.Provider;

/** `AppShellProvider` で渡したものを返す。渡されていなければ例外を投げる */
export const useAppShell = (): AppShell => {
  const shell = useContext(AppShellContext);
  if (!shell) throw new Error("AppShellProvider の中で使ってください");
  return shell;
};

/** アプリが渡した画面の枠で本文を包む */
export function AppFrame(props: AppFrameProps) {
  const { Frame } = useAppShell();
  return <Frame currentTab={props.currentTab}>{props.children}</Frame>;
}
