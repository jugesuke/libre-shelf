import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { SegmentedControl } from "./segmented-control";

const options = [
  { value: "barcode", label: "バーコード" },
  { value: "manual", label: "直接入力" },
];

const meta: Meta<typeof SegmentedControl> = {
  title: "UI/SegmentedControl",
  // 説明ページは segmented-control.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: SegmentedControl,
  args: { options, value: "barcode", onChange: fn() },
  argTypes: { value: { control: "inline-radio", options: options.map((o) => o.value) } },
};
export default meta;
type Story = StoryObj<typeof SegmentedControl>;

/** 押したとき `value` を書き換え、操作パネルの値と描いた選択肢をそろえる */
const render: Story["render"] = (args) => {
  const [, updateArgs] = useArgs();
  return (
    <SegmentedControl
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
