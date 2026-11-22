import { X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Alert } from "./alert";
import { Button } from "./button";

type FloatingAlertBodyProps = {
  /** 文言 */
  message: string;
  /** 閉じるボタンを押したときに呼ぶ */
  onClose: () => void;
  /** 三角の中心の位置。アラートの左端からの距離（px） */
  caretLeft: number;
};

/**
 * 三角と閉じるボタンの付いた destructive のアラート。置く位置は呼び出し側が決める。
 * `FloatingAlert` と `Dialog` が、同じ見た目で使う。
 */
function FloatingAlertBody({ message, onClose, caretLeft }: FloatingAlertBodyProps) {
  return (
    <div data-slot="floating-alert" className="relative">
      <span
        data-slot="floating-alert-caret"
        aria-hidden="true"
        className="absolute -top-1.5 size-3 rotate-45 bg-destructive-muted"
        style={{ left: caretLeft - 6 }}
      />
      <Alert variant="destructive" className="relative flex items-center gap-2 shadow-md">
        <span className="flex-1">{message}</span>
        <Button size="icon" aria-label="閉じる" onClick={onClose}>
          <X aria-hidden="true" />
        </Button>
      </Alert>
    </div>
  );
}

type FloatingAlertProps = {
  /** 行の要素。幅と左右の端をこれにそろえ、下端の 4px 下に出す */
  anchor: React.RefObject<HTMLElement | null>;
  /** 三角を向ける要素。操作したボタン、ボタンがないときは入力欄 */
  target: React.RefObject<HTMLElement | null>;
  /** 文言 */
  message: string;
  /** 出すか */
  open: boolean;
  /** 閉じるボタンか `Escape` キーで呼ぶ */
  onClose: () => void;
};

type Rects = { anchor: DOMRect; target: DOMRect };

/**
 * 処理の失敗を、行のすぐ下に浮かせて重ねて出す。ボタンの横に置けないときに使う。
 * `body` の直下に描くので、カードなどのはみ出しを隠す指定で切れない。
 * 画面のスクロールや幅の変化に合わせて、`anchor` の下に置き直す。
 * ダイアログの失敗は、これではなく `Dialog` の `failure` で出す。
 */
function FloatingAlert({ anchor, target, message, open, onClose }: FloatingAlertProps) {
  const [rects, setRects] = React.useState<Rects | null>(null);

  React.useLayoutEffect(() => {
    const anchorEl = anchor.current;
    const targetEl = target.current;
    if (!open || !anchorEl || !targetEl) return;
    const update = () =>
      setRects({ anchor: anchorEl.getBoundingClientRect(), target: targetEl.getBoundingClientRect() });
    update();
    // どの親がスクロールしても位置が変わるので、捕捉の段階で受ける
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(anchorEl);
    observer.observe(targetEl);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [open, anchor, target]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !rects) return null;
  return createPortal(
    <div
      className="fixed z-50"
      // 三角の上半分（6px）を、行の下 4px の外に出す
      style={{ top: rects.anchor.bottom + 4 + 6, left: rects.anchor.left, width: rects.anchor.width }}
    >
      <FloatingAlertBody
        message={message}
        onClose={onClose}
        caretLeft={rects.target.left + rects.target.width / 2 - rects.anchor.left}
      />
    </div>,
    document.body,
  );
}

export { FloatingAlert, FloatingAlertBody };
