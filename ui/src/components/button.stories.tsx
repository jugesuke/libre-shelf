import type { Meta, StoryObj } from "@storybook/react-vite";
import { X } from "lucide-react";
import { useState } from "react";
import { fn } from "storybook/test";
import { Button } from "./button";

const variants = ["primary", "secondary", "destructive", "text"] as const;

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  // 説明ページは button.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Button,
  args: { onClick: fn() },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: { control: "select", options: variants },
    size: { control: "inline-radio", options: ["default", "icon"] },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: "ボタン" } };
export const Primary: Story = { args: { variant: "primary", children: "登録" } };
export const Secondary: Story = { args: { variant: "secondary", children: "キャンセル" } };
export const Destructive: Story = { args: { variant: "destructive", children: "削除" } };
export const Text: Story = { args: { variant: "text", children: "セッションを破棄する" } };
export const Disabled: Story = { args: { variant: "primary", disabled: true, children: "登録" } };
export const DisabledSecondary: Story = { args: { variant: "secondary", disabled: true, children: "キャンセル" } };
export const DisabledDestructive: Story = { args: { variant: "destructive", disabled: true, children: "削除" } };
export const DisabledText: Story = { args: { variant: "text", disabled: true, children: "セッションを破棄する" } };
export const Loading: Story = { args: { variant: "primary", loading: true, children: "登録" } };
export const LoadingSecondary: Story = { args: { variant: "secondary", loading: true, children: "キャンセル" } };
export const LoadingDestructive: Story = { args: { variant: "destructive", loading: true, children: "削除" } };
export const IconOnly: Story = {
  args: { variant: "text", size: "icon", "aria-label": "閉じる", children: <X /> },
};

export const IconOnlyDefaultVariant: Story = {
  args: { size: "icon", "aria-label": "閉じる", children: <X /> },
};

/** 使えない状態のボタンを押しても onClick が呼ばれないことを確認する */
export const ClickCount: Story = {
  render: (args) => {
    const [count, setCount] = useState(0);
    const onClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      args.onClick?.(event);
      setCount((c) => c + 1);
    };
    return (
      <div className="flex items-center gap-2">
        <Button {...args} onClick={onClick}>押せる</Button>
        <Button {...args} onClick={onClick} disabled>押せない</Button>
        <Button {...args} onClick={onClick} variant="primary" loading>処理中</Button>
        <span data-testid="count">{count}</span>
      </div>
    );
  },
};

/** 種類ごとに、使える状態と使えない状態を並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {variants.map((variant) => (
        <div key={variant} className="flex gap-2">
          <Button {...args} variant={variant}>{variant}</Button>
          <Button {...args} variant={variant} disabled>{variant}</Button>
        </div>
      ))}
      <Button {...args} size="icon" aria-label="閉じる"><X /></Button>
    </div>
  ),
};

/** フォームの中で処理中の送信ボタンを、キーボードで押しても送信されないことを確認する */
export const LoadingSubmit: Story = {
  render: (args) => {
    const [count, setCount] = useState(0);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setCount((c) => c + 1);
        }}
      >
        <Button {...args} type="submit" variant="primary" loading>登録</Button>
        <span data-testid="count">{count}</span>
      </form>
    );
  },
};
