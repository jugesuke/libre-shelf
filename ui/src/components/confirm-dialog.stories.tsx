import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";

const meta: Meta<typeof ConfirmDialog> = {
  title: "UI/ConfirmDialog",
  tags: ["!autodocs"],
  component: ConfirmDialog,
  // ダイアログが説明ページ全体を覆わないよう、説明ページでは story を iframe の中で描く
  parameters: { docs: { story: { inline: false, height: "520px" } } },
  // 説明ページでボタンを押さずに見えるよう、開いた状態で始める
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: "発注の削除",
    message: "以下の発注を削除しますか？　この操作は元に戻せません。",
    target: [
      ["商品名", "みほん同人誌"],
      ["注文数量", "100"],
      ["注文日", "2026/11/01"],
    ],
    confirmLabel: "削除",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

/** 開くボタンを置き、操作に合わせて `open` を書き換えて表示する。確定が呼ばれた回数を横に出す */
function Harness({
  updateArgs,
  ...args
}: React.ComponentProps<typeof ConfirmDialog> & {
  updateArgs: (args: { open?: boolean; error?: string }) => void;
}) {
  const [confirmed, setConfirmed] = React.useState(0);
  const setOpen = (open: boolean) => {
    args.onOpenChange(open);
    updateArgs({ open });
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>確認を開く</Button>
      <p className="mt-2 text-sm">確定の回数: {confirmed}</p>
      <ConfirmDialog
        {...args}
        onOpenChange={setOpen}
        onErrorClose={() => updateArgs({ error: undefined })}
        onConfirm={() => {
          setConfirmed((n) => n + 1);
          return args.onConfirm();
        }}
      />
    </>
  );
}

// 操作で args が書き換わっても数えた回数が消えないよう、状態は story の外の部品に持たせる
const render: Story["render"] = (args) => {
  const [, updateArgs] = useArgs();
  return <Harness {...args} updateArgs={updateArgs} />;
};

export const Default: Story = { render };

export const WithWarning: Story = {
  args: {
    title: "セッションの破棄",
    message: "このセッションを破棄しますか？　この操作は元に戻せません。",
    target: undefined,
    warning: "この即売会の会計とレジ金の記録が、すべて失われます。",
    confirmLabel: "破棄する",
  },
  render,
};

/** 「破棄」と入力するまで、確定のボタンを押せない */
export const RequireTyping: Story = {
  args: {
    title: "セッションの破棄",
    message: "このセッションを破棄しますか？　この操作は元に戻せません。",
    target: undefined,
    warning: "この即売会の会計とレジ金の記録が、すべて失われます。",
    requireTyping: "破棄",
    confirmLabel: "破棄する",
  },
  render,
};

/** 確定を押すと処理中のまま終わらない */
export const Pending: Story = {
  args: { onConfirm: () => new Promise(() => {}) },
  render,
};

export const WithError: Story = {
  args: { error: "削除に失敗しました。もう一度お試しください。" },
  render,
};
