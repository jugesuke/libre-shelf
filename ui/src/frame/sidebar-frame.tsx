import clsx from "clsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

/** html に設定するプライマリカラー。持たない画面には、本文の幅と余白を `Frame` が付ける */
export type FrameTheme = {
  primary: string;
  primaryForeground: string;
  ring: string;
};

/** メニューの 1 項目。`key` はその画面のパス（`/${key}`）にもなる */
export type FramePage<K extends string = string> = {
  key: K;
  name: string;
  /** 選択中の項目の Tailwind のクラス。リテラル文字列で書く */
  color: string;
  /** ホバーしたときの Tailwind のクラス。リテラル文字列で書く */
  hoverColor: string;
  theme?: FrameTheme;
};

/** メニューのまとまり。項目が 2 つ以上なら見出しを出す */
export type FrameGroup<K extends string = string> = {
  label: string;
  items: ReadonlyArray<K>;
};

type NavItem = FramePage;
type TabType = string;
type NavGroup = FrameGroup;

const SidebarNavItem = ({
  item,
  isActive,
  spaced,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  spaced: boolean;
  onClick: () => void;
}) => (
  <button
    role="menuitem"
    aria-current={isActive ? "page" : undefined}
    onClick={onClick}
    className={clsx(
      "w-full rounded-md px-4 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white",
      spaced && "mt-2",
      isActive
        ? clsx("font-bold", item.color)
        : clsx("text-(--gray-300)", item.hoverColor),
    )}
  >
    {item.name}
  </button>
);

const SidebarNavGroup = ({
  group,
  isFirstGroup,
  currentTab,
  findPage,
  onNavigate,
}: {
  group: NavGroup;
  isFirstGroup: boolean;
  currentTab: TabType;
  findPage: (key: string) => NavItem;
  onNavigate: (key: string) => void;
}) => {
  const showHeader = group.items.length > 1;
  // 見出しの前は見出しの余白に任せ、見出しのない前のグループの項目とは 12px 空ける
  const spacedFromPrevious = !isFirstGroup && !showHeader;
  return (
    <div className={clsx(spacedFromPrevious && "mt-2")}>
      {showHeader && (
        <div className="px-4 pt-4 pb-1 text-xs font-normal text-(--gray-400)">
          {group.label}
        </div>
      )}
      {group.items.map((key, index) => {
        const page = findPage(key);
        return (
          <SidebarNavItem
            key={key}
            item={page}
            isActive={currentTab === key}
            spaced={index > 0}
            onClick={() => onNavigate(key)}
          />
        );
      })}
    </div>
  );
};

// Tailwind の md（768px）と同じ幅にそろえる
const isWideViewport = () => window.matchMedia("(min-width: 768px)").matches;

/**
 * 画面の枠。トップバー、メニュー、本文の上の色の帯を描き、選択中の画面のプライマリカラーを html に設定する。
 * メニューの中身と題名はアプリから受け取る。`currentTab` は `pages` のどれかの `key` にする
 */
function Frame(props: {
  children: React.ReactNode;
  currentTab: TabType;
  pages: ReadonlyArray<NavItem>;
  groups: ReadonlyArray<NavGroup>;
  /** トップバーに出す題名 */
  title: string;
}) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(isWideViewport);

  // 開いている間だけ受ける。幅が md 以上になったときは、開いたままにする
  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isWideViewport()) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  const findPage = (key: string): NavItem => {
    const page = props.pages.find((p) => p.key === key);
    if (!page) throw new Error(`メニューにない画面です: ${key}`);
    return page;
  };
  const currentPage = findPage(props.currentTab);
  const mobileStripeColor = currentPage.color.split(" ")[0];
  const { theme } = currentPage;

  // モーダルは body の直下に描かれるので、本文の要素ではなく html に設定する
  useEffect(() => {
    if (!theme) return;
    const style = document.documentElement.style;
    style.setProperty("--primary", theme.primary);
    style.setProperty("--primary-foreground", theme.primaryForeground);
    style.setProperty("--ring", theme.ring);
    return () => {
      style.removeProperty("--primary");
      style.removeProperty("--primary-foreground");
      style.removeProperty("--ring");
    };
  }, [theme]);

  const handleNavigate = (key: string) => {
    // `/` と `/items` は同じページなので、移っても Frame が作り直されず、初期値に戻らない
    if (!isWideViewport()) {
      setIsSidebarOpen(false);
    }
    navigate(`/${key}`);
  };

  const sidebarNav = (
    <nav className="px-2 py-1">
      {props.groups.map((group, index) => (
        <SidebarNavGroup
          key={group.label}
          group={group}
          isFirstGroup={index === 0}
          currentTab={props.currentTab}
          findPage={findPage}
          onNavigate={handleNavigate}
        />
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* トップバー（常に全幅表示） */}
      <div className="flex h-14 shrink-0 items-center bg-(--gray-900) px-3 text-white">
        <button
          aria-label={isSidebarOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen((v) => !v)}
          className="rounded-md p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <img src="/icon.svg" alt="" className="ml-3 h-9 w-9" />
        <span className="ml-2 text-lg font-bold">
          {props.title}
        </span>
      </div>

      {/* サイドバー＋コンテンツ */}
      <div className="relative flex flex-1 overflow-hidden">
        {isSidebarOpen && (
          <>
            {/* md 未満のドロワーの覆い。クリックで閉じるためだけのもので、読み上げには出さない */}
            <div
              aria-hidden="true"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 z-10 bg-(--overlay) md:hidden"
            />
            <aside className="absolute inset-y-0 left-0 z-20 w-56 shrink-0 overflow-y-auto bg-(--gray-900) text-white md:static md:z-auto">
              {sidebarNav}
            </aside>
          </>
        )}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* セクションカラーストライプ（コンテンツ上部のみ） */}
          <div className={clsx("h-1 w-full shrink-0", mobileStripeColor)} />
          <main className="flex-1 overflow-y-auto">
            {theme ? (
              props.children
            ) : (
              // プライマリカラーを持たない画面は Page を使わないので、本文の幅と余白をここで付ける
              <div className="mx-auto w-full max-w-300 p-3">{props.children}</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Frame;
