import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { Button } from "./button";
import { Field } from "./field";
import { FloatingAlert } from "./floating-alert";
import { Input } from "./input";

const meta: Meta = {
  title: "UI/FloatingAlert",
  // 説明ページは alert.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
};
export default meta;
type Story = StoryObj;

/**
 * 入力欄とボタンの行を、はみ出しを隠すカードに置く。失敗のアラートはカードの外へはみ出して出る。
 * 「追加」を押すたびに出し入れする
 */
function Harness({ message }: { message: string }) {
  const [open, setOpen] = React.useState(true);
  const row = React.useRef<HTMLDivElement>(null);
  const target = React.useRef<HTMLButtonElement>(null);
  return (
    <div className="p-4">
      <div data-testid="card" className="max-w-xl overflow-hidden rounded-md border p-4">
        <div ref={row} className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="ISDN">
              <Input placeholder="ISDNコードを入力" />
            </Field>
          </div>
          <Button ref={target} variant="primary" onClick={() => setOpen((v) => !v)}>
            追加
          </Button>
        </div>
      </div>
      <FloatingAlert anchor={row} target={target} message={message} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export const Default: Story = {
  render: () => <Harness message="商品を追加できませんでした。通信状態を確認して、もう一度追加してください。" />,
};
