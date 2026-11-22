import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  args: { onChange: fn() },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = { args: { "aria-label": "メモ" } };
export const Disabled: Story = { args: { "aria-label": "メモ", disabled: true, defaultValue: "メモ" } };

/** 通常と使えない状態を並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Textarea {...args} aria-label="メモ" />
      <Textarea {...args} aria-label="メモ" disabled defaultValue="メモ" />
    </div>
  ),
};
