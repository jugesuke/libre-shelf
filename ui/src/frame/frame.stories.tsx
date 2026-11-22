import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { PALETTE, type PaletteColor } from "../palette";
import Frame, { type FrameGroup, type FramePage } from "./sidebar-frame";

const page = (key: string, name: string, c: PaletteColor): FramePage => ({
  key,
  name,
  color: c.color,
  hoverColor: c.hoverColor,
  theme: { primary: c.primary, primaryForeground: c.primaryForeground, ring: c.ring },
});

/** 例のメニュー。どの画面にどの色を使うかは、アプリが決める */
const pages: FramePage[] = [
  page("event", "即売会", PALETTE.red),
  page("items", "商品管理", PALETTE.green),
  page("history", "履歴", PALETTE.purple),
  page("data", "データの管理", PALETTE.yellow),
  page("settings", "設定", PALETTE.blue),
];
const groups: FrameGroup[] = [
  { label: "販売", items: ["event"] },
  { label: "商品", items: ["items"] },
  { label: "記録", items: ["history", "data", "settings"] },
];

/** URL の画面のキーを `currentTab` に渡す。項目を押すとその画面に移り、選択中の項目とプライマリカラーが変わる */
function RoutedFrame() {
  const { tab } = useParams();
  const currentTab = pages.find((p) => p.key === tab)?.key ?? "event";
  return (
    <Frame currentTab={currentTab} pages={pages} groups={groups} title="アプリの名前">
      <div className="text-muted-foreground p-6 text-sm">本文</div>
    </Frame>
  );
}

const meta: Meta<{ currentTab: string }> = {
  title: "UI/Frame",
  // 説明ページは ui/src/design-system/navigation.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  args: { currentTab: "event" },
  argTypes: {
    currentTab: {
      control: "select",
      options: pages.map((p) => p.key),
      description: "選択中の画面のキー。メニューの項目を押しても移る",
    },
  },
  // Frame は画面全体の高さを取るので、説明ページでは iframe の中に表示する
  parameters: { layout: "fullscreen", docs: { story: { inline: false, height: "560px" } } },
  render: ({ currentTab }) => (
    <MemoryRouter key={currentTab} initialEntries={[`/${currentTab}`]}>
      <Routes>
        <Route path="/:tab" element={<RoutedFrame />} />
      </Routes>
    </MemoryRouter>
  ),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 黄は、選択中の項目の文字を黒にする */
export const Yellow: Story = { args: { currentTab: "data" } };
