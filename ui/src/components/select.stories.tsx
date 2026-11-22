import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Select } from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
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
type Story = StoryObj<typeof Select>;

const options = (
  <>
    <option>倉庫</option>
    <option>会場</option>
  </>
);

export const Default: Story = { args: { "aria-label": "ロケーション", children: options } };
export const Disabled: Story = { args: { "aria-label": "ロケーション", disabled: true, children: options } };

/** 通常と使えない状態を並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Select {...args} aria-label="ロケーション">{options}</Select>
      <Select {...args} aria-label="ロケーション" disabled>{options}</Select>
    </div>
  ),
};
