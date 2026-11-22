import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, type ReactNode, useState } from "react";
import { Alert } from "../../components/alert";
import { Button } from "../../components/button";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { Dialog } from "../../components/dialog";
import { Field } from "../../components/field";
import { Input } from "../../components/input";

const meta: Meta = {
  title: "デザインパターン/確認",
  tags: ["!autodocs"],
  // ダイアログが説明ページ全体を覆わないよう、説明ページでは story を iframe の中で描く
  parameters: { docs: { story: { inline: false, height: "520px" } } },
};
export default meta;
type Story = StoryObj;

/** 強い確認ダイアログ。開いた状態で始まり、閉じたら「ダイアログを開く」で開き直せる */
function StrongConfirmDialog({
  title,
  confirmLabel,
  canConfirm = true,
  children,
}: {
  title: string;
  confirmLabel: string;
  canConfirm?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="p-4">
        <Button onClick={() => setOpen(true)}>ダイアログを開く</Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>やめる</Button>
            <Button variant="destructive" disabled={!canConfirm}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">{children}</div>
      </Dialog>
    </>
  );
}

/** 開いた状態で始まり、閉じたら「ダイアログを開く」で開き直せる。確定でも閉じる */
function OpenedConfirm(
  props: Omit<
    ComponentProps<typeof ConfirmDialog>,
    "open" | "onOpenChange" | "onConfirm"
  >,
) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="p-4">
        <Button onClick={() => setOpen(true)}>ダイアログを開く</Button>
      </div>
      <ConfirmDialog
        {...props}
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

/** 削除の確認。対象を ID ではなく、名前などで示す */
export const DeleteOrder: Story = {
  name: "削除の確認",
  render: () => (
    <OpenedConfirm
      title="発注の削除"
      message="以下の発注を削除しますか？　この操作は元に戻せません。"
      target={[
        ["商品名", "みほん同人誌"],
        ["注文数量", "100"],
        ["注文日", "2026/11/01"],
      ]}
      confirmLabel="削除"
    />
  ),
};

/** 取り消しの確認。削除と同じ形 */
export const CancelTransaction: Story = {
  name: "取り消しの確認",
  render: () => (
    <OpenedConfirm
      title="会計の取り消し"
      message="以下の会計を取り消しますか？　この操作は元に戻せません。"
      target={[
        ["時刻", "11:00"],
        ["区分", "知り合い以外"],
        ["合計", "¥1,000"],
      ]}
      confirmLabel="取り消す"
    />
  ),
};

/** 影響が大きいときは、操作の名前（ここでは「破棄」）を入力させる */
export const StrongConfirmByTyping: Story = {
  name: "強い確認",
  render: () => {
    function Content() {
      const [value, setValue] = useState("");
      return (
        <StrongConfirmDialog
          title="セッションの破棄"
          confirmLabel="破棄する"
          canConfirm={value === "破棄"}
        >
          <p>このセッションを破棄しますか？　この操作は元に戻せません。</p>
          <Alert variant="warning">
            この即売会の会計とレジ金の記録が、すべて失われます。
          </Alert>
          <Field label="確認のため「破棄」と入力してください">
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        </StrongConfirmDialog>
      );
    }
    return <Content />;
  },
};
