import { ChevronDown, ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

type CardProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** 見出しに付ける補足の文字列。`title` があるときだけ表示する。見出しと同じ行に続け、入りきらなければ次の行から始める */
  description?: string;
  /** ヘッダーの右に置く操作。開閉のボタンの外に置くので、押しても開閉しない */
  actions?: React.ReactNode;
} & (
    | {
        /** 折りたためるか。`true` にすると `title`、`open`、`onOpenChange` が必須 */
        collapsible?: false;
        /** 見出し。あるときだけ上にヘッダーを出す */
        title?: string;
        open?: never;
        onOpenChange?: never;
      }
    | {
        /** 折りたためるか。`true` にすると `title`、`open`、`onOpenChange` が必須 */
        collapsible: true;
        /** 見出し。開閉のボタンの名前になる */
        title: string;
        /** 開いているか。`false` の間は中身を表示しない */
        open: boolean;
        /** 開閉のボタンを押したとき、次の `open` の値を渡して呼ぶ */
        onOpenChange: (open: boolean) => void;
      }
  );

/** 見出しと補足。補足は見出しの最後の行に続け、入りきらなければ次の行から始める */
function Heading({ title, description }: { title: string; description?: string }) {
  return (
    <div data-slot="card-heading">
      <span data-slot="card-title" className="text-base font-bold">
        {title}
      </span>
      {description ? (
        <span data-slot="card-description" className="ml-3 inline-block text-xs text-muted-foreground">
          {description}
        </span>
      ) : null}
    </div>
  );
}

// 最低の高さ 48px は線を含まない。線を出す帯は、線の 1px を足した 49px にする
const headerClass = "flex min-h-12 flex-wrap items-center gap-y-2 bg-surface-muted py-1";

/**
 * カード。`title` があるときは上に見出しの帯を出し、`description` を見出しに添え、`actions` を帯の右に置く。
 * `title` がないときはヘッダーを出さず、中身だけを囲む。`description` と `actions` を渡しても表示しない。
 * `collapsible` のときは、ヘッダーの左の矢印と `title` をまとめたボタンで開閉する。`open` が `false` の間は中身を表示せず、`title` は必須。
 * `actions` は開閉のボタンの外に置くので、押しても開閉しない。
 */
function Card({ title, description, actions, collapsible, open, onOpenChange, children, className, ...props }: CardProps) {
  const isCollapsible = collapsible === true && Boolean(title);
  const isOpen = !isCollapsible || open === true;
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  return (
    <div
      data-slot="card"
      // 帯の面が角の丸みに沿うように、はみ出しを隠す
      className={cn("overflow-hidden rounded-md border border-border bg-card", className)}
      {...props}
    >
      {title ? (
        isCollapsible ? (
          <div
            data-slot="card-header"
            className={cn(headerClass, "gap-x-2 pr-4 pl-2", isOpen && "border-b border-border min-h-[49px]")}
          >
            <button
              type="button"
              data-slot="card-toggle"
              aria-expanded={isOpen}
              onClick={() => onOpenChange?.(!isOpen)}
              className="flex min-h-9 flex-auto cursor-pointer items-center gap-2 rounded-sm px-2 text-left outline-offset-2 outline-ring hover:bg-muted focus-visible:outline-2 active:bg-muted"
            >
              <Chevron aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              <Heading title={title} description={description} />
            </button>
            {/* 帯の左の余白が 8px なので、次の行に回ったとき左端が 16px になるよう ml-2 を足し、同じ行にあるときの間 16px は gap-x-2 と合わせる */}
            {actions ? (
              <div data-slot="card-actions" className="ml-2 max-sm:basis-full">
                {actions}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            data-slot="card-header"
            className={cn(headerClass, "justify-between gap-x-4 border-b border-border px-4 min-h-[49px]")}
          >
            <Heading title={title} description={description} />
            {actions ? (
              <div data-slot="card-actions" className="max-sm:basis-full">
                {actions}
              </div>
            ) : null}
          </div>
        )
      ) : null}
      {isOpen ? (
        <div data-slot="card-content" className="p-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export { Card };
