import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { FloatingAlertBody } from "./floating-alert";

const dialogContentVariants = cva(
  // 画面の幅が足りないときは左右に 16px 空けて縮める
  "fixed top-1/2 left-1/2 flex w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md bg-background p-6 text-foreground",
  {
    variants: {
      size: { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" },
    },
    defaultVariants: { size: "sm" },
  },
);

type DialogProps = {
  /** 幅。`sm` は 448px まで、`md` は 672px まで。省くと `sm` */
  size?: VariantProps<typeof dialogContentVariants>["size"];
  /** 開いているか */
  open: boolean;
  /** 開閉が求められたとき、次の `open` の値を渡して呼ぶ（`Escape` キー、覆い、閉じるボタン） */
  onOpenChange: (open: boolean) => void;
  /** 見出し。ダイアログの名前になる */
  title: string;
  /** 下のボタン。最後のボタンが主な操作。横幅いっぱいに等分して並べ、`sm` 未満の幅では縦に積んで主な操作を上に置く。 */
  footer?: React.ReactNode;
  /** 本文 */
  children?: React.ReactNode;
  /**
   * 開いたときに最初にフォーカスを置く場所。省くと `content`。
   * - `content`: 本文の最初のフォーカスできる要素。本文になければ、下のボタンの最初のもの
   * - `title`: 見出し
   * - ref: その要素
   */
  initialFocus?: "content" | "title" | React.RefObject<HTMLElement | null>;
  /**
   * 処理の失敗の文言。下部のボタンの行のすぐ下に、行と同じ幅の destructive のアラートを浮かせて出し、枠の外へはみ出させる。
   * 三角は最後のボタンに向ける。`footer` がないと出さない。省くと出さない
   */
  failure?: string;
  /** 失敗のアラートの閉じるボタンか `Escape` キーで呼ぶ。アラートが出ている間の `Escape` キーは、ダイアログを閉じずにこれだけを呼ぶ */
  onFailureClose?: () => void;
  /** ダイアログの枠に足すクラス */
  className?: string;
};

/**
 * ダイアログ。`size` で幅（`sm`、`md`、`lg`）を選ぶ。`footer` のボタンは横幅いっぱいに等分する。
 * 開いている間はフォーカスを中に閉じ込め、`Escape` キーと覆いで閉じる。
 * 枠ははみ出しを隠さず、スクロールするのは本文だけ。`failure` のアラートが枠の外へはみ出せるようにするため。
 */
function Dialog({ open, onOpenChange, title, size, footer, children, initialFocus = "content", failure, onFailureClose, className }: DialogProps) {
  // Trigger を使わないので、Radix は閉じたときの戻り先を持たない。開く直前にフォーカスのあった要素を覚えておく
  const openerRef = React.useRef<Element | null>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  // Content は Portal の中で遅れて描かれるので、測る対象は ref ではなく状態に持つ
  const [footerEl, setFooterEl] = React.useState<HTMLDivElement | null>(null);
  const [caretLeft, setCaretLeft] = React.useState(0);
  // 縦に積む幅では最後のボタンが行の幅いっぱいになるので、三角の向きは測って決める
  React.useLayoutEffect(() => {
    const last = footerEl?.lastElementChild;
    if (!failure || !footerEl || !last) return;
    const update = () => {
      const row = footerEl.getBoundingClientRect();
      const box = last.getBoundingClientRect();
      setCaretLeft(box.left - row.left + box.width / 2);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footerEl);
    return () => observer.disconnect();
  }, [failure, footerEl]);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 bg-overlay" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          // 説明を持たないので、Radix の警告を止める
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            openerRef.current = document.activeElement;
            event.preventDefault();
            const focusable = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
            if (initialFocus === "title") return titleRef.current?.focus();
            if (typeof initialFocus === "object") return initialFocus.current?.focus();
            const first = bodyRef.current?.querySelector<HTMLElement>(focusable) ?? footerRef.current?.querySelector<HTMLElement>(focusable);
            first?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (!failure) return;
            event.preventDefault();
            onFailureClose?.();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
          }}
          className={cn(dialogContentVariants({ size }), className)}
        >
          <DialogPrimitive.Title ref={titleRef} tabIndex={-1} data-slot="dialog-title" className="shrink-0 pr-10 text-lg font-bold outline-none">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <Button size="icon" aria-label="閉じる" className="absolute top-4 right-4">
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
          <div
            ref={bodyRef}
            data-slot="dialog-body"
            // フォーカスリングが切れないよう内側に 4px 空け、同じだけ外へ出して、見出しや下部のボタンとの間を変えない
            className="-mx-1 mt-3 -mb-1 min-h-0 overflow-y-auto p-1"
          >
            {children}
          </div>
          {footer ? (
            <div className="relative mt-6 shrink-0">
              <div
                ref={(el) => {
                  footerRef.current = el;
                  setFooterEl(el);
                }}
                data-slot="dialog-footer" // 狭い画面では縦に積み、主な操作（最後のボタン）を上に置く
                className="flex flex-col-reverse gap-3 sm:flex-row sm:*:flex-1 *:whitespace-nowrap">
                {footer}
              </div>
              {failure ? (
                // 行の下 4px に出す。三角の上半分（6px）を、その外に出す
                <div className="absolute inset-x-0 top-full z-10 mt-2.5">
                  <FloatingAlertBody message={failure} onClose={() => onFailureClose?.()} caretLeft={caretLeft} />
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { Dialog };
