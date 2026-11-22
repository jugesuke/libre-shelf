import { X } from "lucide-react";
import { createContext, use, useMemo, type ReactNode } from "react";
import { toast, Toaster } from "sonner";
import { Alert } from "./alert";
import { Button } from "./button";

const TOAST_DURATION_MS = 5000;

type ToastContextValue = {
  /** 成功を知らせるトーストを出す。5 秒で消える */
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** sonner の既定の見た目は使わず、success のアラートと閉じるボタンを表示する */
function showToast(message: string) {
  toast.custom(
    (id) => (
      <Alert variant="success" className="flex w-full items-center gap-2 shadow-md">
        <span className="flex-1">{message}</span>
        <Button size="icon" aria-label="閉じる" onClick={() => toast.dismiss(id)}>
          <X />
        </Button>
      </Alert>
    ),
    // 独自の見た目のトーストには sonner が幅を与えないので、並びの幅に合わせる
    { duration: TOAST_DURATION_MS, className: "w-full" },
  );
}

/**
 * トーストを画面の上部の中央に表示する。アプリの根元を包む。
 * 続けて出したトーストの重ね方、動き、読み上げは sonner が行う。
 */
function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ showToast }), []);
  return (
    <ToastContext value={value}>
      {children}
      <Toaster position="top-center" duration={TOAST_DURATION_MS} className="z-[60]" />
    </ToastContext>
  );
}

/** `ToastProvider` の中で、トーストを出す関数を返す */
function useToast(): ToastContextValue {
  const value = use(ToastContext);
  if (!value) throw new Error("useToast は ToastProvider の中で使う");
  return value;
}

// 決められたインターフェースにより、Provider とフックを同じファイルから export する
// eslint-disable-next-line react-refresh/only-export-components
export { ToastProvider, useToast };
