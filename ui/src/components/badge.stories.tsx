import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const variants = ["success", "warning", "info", "gray"] as const;

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  // 説明ページは badge.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Badge,
  argTypes: { variant: { control: "select", options: variants } },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: "倉庫" } };
export const Success: Story = { args: { variant: "success", children: "入荷" } };
export const Warning: Story = { args: { variant: "warning", children: "イベント" } };
export const Info: Story = { args: { variant: "info", children: "移動" } };
export const Gray: Story = { args: { variant: "gray", children: "倉庫" } };

/** 種類を並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex gap-2">
      <Badge {...args} variant="success">入荷</Badge>
      <Badge {...args} variant="warning">イベント</Badge>
      <Badge {...args} variant="info">移動</Badge>
      <Badge {...args} variant="gray">倉庫</Badge>
    </div>
  ),
};
