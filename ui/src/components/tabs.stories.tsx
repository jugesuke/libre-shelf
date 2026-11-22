import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Tabs } from "./tabs";

const options = [
  { value: "list", label: "一覧から選択" },
  { value: "new", label: "新規入力" },
];

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  // 説明ページは tabs.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Tabs,
  args: { options, value: "list", onChange: fn() },
  argTypes: { value: { control: "inline-radio", options: options.map((o) => o.value) } },
};
export default meta;
type Story = StoryObj<typeof Tabs>;

/** 押したとき `value` を書き換え、操作パネルの値と描いた選択肢をそろえる */
const render: Story["render"] = (args) => {
  const [, updateArgs] = useArgs();
  return (
    <Tabs
      {...args}
      onChange={(value) => {
        args.onChange(value);
        updateArgs({ value });
      }}
    />
  );
};

export const Default: Story = { render };

/** 黄のプライマリカラーにする。文字とフォーカスリングが黒になる */
export const Yellow: Story = { render, globals: { color: "yellow" } };
