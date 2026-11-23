import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextLink } from "./text-link";

const meta: Meta<typeof TextLink> = {
  title: "UI/TextLink",
  tags: ["!autodocs"],
  component: TextLink,
  args: { href: "#destination", children: "使い方を読む" },
  argTypes: {
    target: { control: "select", options: [undefined, "_self", "_blank"] },
  },
  decorators: [
    (Story) => (
      <div className="p-4 text-sm leading-relaxed">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextLink>;

export const Default: Story = {};
export const NewTab: Story = {
  args: { target: "_blank", rel: "author", children: "作者のWebサイト" },
};
export const WithAccessibleName: Story = {
  args: { target: "_blank", "aria-label": "作者のWebサイトを読む" },
};

/** 文中のリンクと新規タブの記号の配置を確認する。 */
export const InText: Story = {
  render: (args) => (
    <p className="max-w-sm text-base leading-8">
      開発については、
      <TextLink {...args} target="_blank">
        作者のWebサイト
      </TextLink>
      をご覧ください。
    </p>
  ),
};

export const Standalone: Story = {
  args: { className: "inline-block min-h-8 py-1" },
};

/** 幅の狭い場所で長いURLを折り返す。 */
export const LongUrl: Story = {
  args: {
    children: "https://example.com/guide/getting-started-with-your-first-event",
    target: "_blank",
  },
  render: (args) => (
    <div className="w-48 max-w-full">
      <TextLink {...args} />
    </div>
  ),
};

/** 記号だけが次の行へ送られないことを確認する。 */
export const Wrapping: Story = {
  args: { children: "使い方について詳しく読む", target: "_blank" },
  render: (args) => (
    <p className="w-32">
      説明は、
      <TextLink {...args} />
      をご覧ください。
    </p>
  ),
};

/** リンクをキーボードで開いたときの移動先を置く。 */
export const Navigation: Story = {
  render: (args) => (
    <div className="space-y-4">
      <TextLink {...args} />
      <p id="destination">リンク先</p>
    </div>
  ),
};

/** 新規タブと同じタブの表示を並べる。 */
export const All: Story = {
  render: (args) => (
    <div className="space-y-6">
      <p>
        <TextLink {...args}>使い方を読む</TextLink>
      </p>
      <p>
        開発については、
        <TextLink {...args} target="_blank">
          作者のWebサイト
        </TextLink>
        をご覧ください。
      </p>
    </div>
  ),
};
