import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
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
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { "aria-label": "注文数量", placeholder: "例: 100" } };
export const Disabled: Story = { args: { "aria-label": "注文数量", disabled: true, defaultValue: "100" } };
export const Invalid: Story = { args: { "aria-label": "注文数量", "aria-invalid": true, defaultValue: "0" } };

/** 通常、使えない、エラーを並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Input {...args} aria-label="注文数量" placeholder="例: 100" />
      <Input {...args} aria-label="注文数量" disabled defaultValue="100" />
      <Input {...args} aria-label="注文数量" aria-invalid defaultValue="0" />
    </div>
  ),
};
