import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const pageVariants = cva("mx-auto w-full p-3 md:p-6", {
  variants: {
    width: {
      wide: "max-w-300",
      narrow: "max-w-2xl",
    },
  },
  defaultVariants: { width: "wide" },
});

type PageProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** 最大の幅。`wide` は一覧の画面、`narrow` はフォームの画面。省くと `wide` */
  width?: VariantProps<typeof pageVariants>["width"];
  /** 見出し */
  title: string;
  /** 見出しの行の右に置く操作 */
  actions?: React.ReactNode;
};

/**
 * ページの枠。`width` で最大の幅（`wide` は 1200px、`narrow` は 672px）を選び、中央に寄せる。
 * 見出しの行に `title` を左、`actions` を右に置く。画面の幅が md 未満では `actions` が見出しの下に回る。
 */
function Page({ title, actions, width, children, className, ...props }: PageProps) {
  return (
    <div data-slot="page" className={cn(pageVariants({ width }), className)} {...props}>
      <div
        data-slot="page-header"
        className="mb-4 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between"
      >
        <h1 data-slot="page-title" className="text-2xl font-bold">
          {title}
        </h1>
        {actions ? <div data-slot="page-actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export { Page, pageVariants };
