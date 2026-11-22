import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "./alert";

const variants = ["destructive", "success", "warning", "info"] as const;

const meta: Meta<typeof Alert> = {
  title: "UI/Alert",
  // 説明ページは alert.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Alert,
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
type Story = StoryObj<typeof Alert>;

export const Default: Story = { args: { variant: "info", children: "商品を選んでください" } };
export const Destructive: Story = { args: { variant: "destructive", children: "保存できませんでした" } };
export const Success: Story = { args: { variant: "success", children: "保存しました" } };
export const Warning: Story = { args: { variant: "warning", children: "まだ反映していません" } };
export const Info: Story = { args: { variant: "info", children: "商品を選んでください" } };

/** 種類を並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Alert {...args} variant="destructive">保存できませんでした</Alert>
      <Alert {...args} variant="success">保存しました</Alert>
      <Alert {...args} variant="warning">まだ反映していません</Alert>
      <Alert {...args} variant="info">商品を選んでください</Alert>
    </div>
  ),
};
