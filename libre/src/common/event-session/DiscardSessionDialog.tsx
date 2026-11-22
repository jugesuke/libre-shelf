import { ConfirmDialog } from "@shelf/ui/components/confirm-dialog";

type DiscardSessionDialogProps = {
  /** 開いているか */
  open: boolean;
  /** 開閉が求められたとき、次の `open` の値を渡して呼ぶ */
  onOpenChange: (open: boolean) => void;
  /** 「破棄する」を押したときに呼ぶ。モーダルを閉じてから呼ぶ */
  onDiscard: () => void;
};

/** 即売会のセッションを破棄する確認。「破棄」と入力するまで破棄できない。5 つの画面で共通 */
export function DiscardSessionDialog({
  open,
  onOpenChange,
  onDiscard,
}: DiscardSessionDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="セッションの破棄"
      message="このセッションを破棄しますか？　この操作は元に戻せません。"
      warning="この即売会の会計とレジ金の記録が、すべて失われます。"
      requireTyping="破棄"
      confirmLabel="破棄する"
      onConfirm={() => {
        onOpenChange(false);
        onDiscard();
      }}
    />
  );
}
