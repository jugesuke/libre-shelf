import * as React from "react";
import { Alert } from "./alert";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";
import { Input } from "./input";

type ConfirmDialogProps = {
  /** 開いているか */
  open: boolean;
  /** 開閉が求められたとき、次の `open` の値を渡して呼ぶ */
  onOpenChange: (open: boolean) => void;
  /** 見出し。「\{対象\}の\{操作\}」。例: `発注の削除` */
  title: string;
  /** 本文。例: `以下の発注を削除しますか？　この操作は元に戻せません。` */
  message: string;
  /** 対象。`[項目名, 値]` の配列。ID ではなく、人が見て分かる項目を渡す */
  target?: readonly (readonly [string, string])[];
  /** 注意事項。操作で失われるものなど。警告のアラートで出す */
  warning?: string;
  /**
   * 指定すると、確定の前にこの文字列の入力を求める。入力が一致するまで確定のボタンを押せない。影響が大きい操作に使う。
   * 言葉は見出しの「\{操作\}」と同じにする。例: 見出しが `セッションの破棄` なら `破棄`、`発注の削除` なら `削除`
   */
  requireTyping?: string;
  /** 確定のボタンの文字。実際に起きることを書く。例: `削除` */
  confirmLabel: string;
  /**
   * 確定のボタンを押したときに呼ぶ。Promise を返す間は、確定のボタンを処理中にする。
   * 閉じるのは呼び出し側。成功したら `onOpenChange(false)` を呼び、失敗したら `error` を渡して開いたままにする
   */
  onConfirm: () => void | Promise<unknown>;
  /** 処理の失敗のアラート。Dialog の `failure` に渡し、下部のボタンのすぐ下に浮かせて出す。省くと出さない */
  error?: string;
  /** 失敗のアラートの閉じるボタンか `Escape` キーで呼ぶ。呼び出し側で `error` を空にする */
  onErrorClose?: () => void;
};

/**
 * 元に戻せない操作の確認ダイアログ。最初のフォーカスは「やめる」に置く。
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  target,
  warning,
  requireTyping,
  confirmLabel,
  onConfirm,
  error,
  onErrorClose,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [pending, setPending] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  // 閉じ方は呼び出し側が決めるので、開き直したときに前の入力が残らないよう、閉じたら空に戻す
  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      initialFocus={cancelRef}
      failure={error}
      onFailureClose={onErrorClose}
      footer={
        <>
          <Button ref={cancelRef} onClick={() => onOpenChange(false)}>
            やめる
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            disabled={requireTyping !== undefined && typed !== requireTyping}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p>{message}</p>
        {target ? (
          <dl className="bg-surface-muted grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md p-3">
            {target.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {warning ? <Alert variant="warning">{warning}</Alert> : null}
        {requireTyping !== undefined ? (
          <Field label={`確認のため「${requireTyping}」と入力してください`}>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
        ) : null}
      </div>
    </Dialog>
  );
}

export { ConfirmDialog };
