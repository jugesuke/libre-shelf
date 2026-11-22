import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center rounded-md cursor-pointer",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        // primary と secondary の枠は透明にして、destructive と幅をそろえる。ダイアログの下のボタンは横幅を等分するため、枠の幅がずれると並びが崩れる
        primary:
          "px-3 border border-transparent bg-primary text-primary-foreground text-sm font-bold enabled:hover:brightness-92 enabled:active:brightness-85 disabled:border-dashed disabled:border-primary disabled:bg-[color-mix(in_srgb,var(--primary)_15%,white)]",
        secondary:
          "px-3 border border-transparent bg-secondary text-foreground text-sm font-bold enabled:hover:brightness-92 enabled:active:brightness-85 disabled:border-dashed disabled:border-muted-foreground disabled:bg-surface-muted disabled:text-disabled-foreground",
        destructive:
          "px-3 border border-destructive bg-background text-destructive text-sm font-bold enabled:hover:bg-destructive-muted enabled:active:bg-destructive-muted disabled:border-dashed disabled:text-[color-mix(in_srgb,var(--destructive)_40%,white)]",
        text: "px-2 text-muted-foreground text-sm underline enabled:hover:bg-muted enabled:active:bg-muted disabled:text-disabled-foreground",
      },
      size: {
        // 高さは種類によらず入力欄と同じ 36px。アイコンだけのときは size-8 で別に決める。text-[20px] は variant の text-sm を後ろから上書きする
        default: "h-9",
        icon: "size-8 p-0 no-underline text-[20px] [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

/** 処理中の背景、枠線の色、ローダーの色（文字色）。種類ごとに決める */
const loadingLooks = {
  primary: "border-ring bg-[color-mix(in_srgb,var(--primary)_15%,white)] text-ring",
  secondary: "border-muted-foreground bg-muted text-muted-foreground",
  destructive: "border-destructive bg-background text-destructive",
  // text と icon は処理中にしない（仕様）。型を満たすために文字色だけ置く
  text: "text-muted-foreground",
} as const;

type ButtonProps = React.ComponentProps<"button"> & {
  /** 種類。省くと `secondary` */
  variant?: VariantProps<typeof buttonVariants>["variant"];
  /** 大きさ。`icon` はアイコンだけのボタンで、`variant` によらず `text` の形になる */
  size?: VariantProps<typeof buttonVariants>["size"];
  /** 処理中。ラベルを隠してローダーに置き換え、押せなくする。見た目は種類ごと */
  loading?: boolean;
};

/**
 * ボタン。`variant` で種類、`size="icon"` でアイコンだけのボタンにする（`variant` によらず `text` の形）。
 * アイコンだけのときは `aria-label` を渡す。`type` の既定は `button`。
 */
function Button({ className, variant, size, type = "button", loading, children, onClick, ...props }: ButtonProps) {
  const resolvedVariant = size === "icon" ? "text" : variant;
  return (
    <button
      type={type}
      className={cn(
        buttonVariants({ variant: resolvedVariant, size }),
        loading && "pointer-events-none relative cursor-wait border-dashed",
        loading && loadingLooks[resolvedVariant ?? "secondary"],
        className,
      )}
      aria-busy={loading ? "true" : undefined}
      // disabled にするとフォーカスが外れるので使わない。キーボードの Enter/Space はクリックとして届くので、既定の動作（フォームの送信）もここで止める
      onClick={loading ? (event) => event.preventDefault() : onClick}
      {...props}
    >
      {loading ? (
        <>
          {/* visibility:hidden だとボタンの名前が読み上げから消えるので、opacity で隠す */}
          <span className="opacity-0">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <LoaderCircle aria-hidden="true" strokeWidth={2.5} className="size-5 animate-spin" />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export { Button, buttonVariants };
