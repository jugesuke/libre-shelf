import * as React from "react";

import { Loader } from "./loader";
import { cn } from "../lib/utils";

/**
 * テーブル。枠線と角丸で囲み、横幅が足りないときは横に流す。HTML の `table` と同じ属性を受け取る。
 * `reloading` が真のとき、見出しの行を除いた中身の行を薄くして操作できなくし、その範囲の中央にローダーを重ねる。
 */
function Table({
  className,
  reloading,
  ...props
}: React.ComponentProps<"table"> & { reloading?: boolean }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  // 中身の行を操作できなくする。`TableBody` は利用側が組み立てるので、描いたあとの DOM に付ける
  React.useLayoutEffect(() => {
    const bodies = containerRef.current?.querySelectorAll("tbody") ?? [];
    bodies.forEach((body) => {
      body.inert = !!reloading;
    });
  });

  // ローダーを重ねる範囲の上端は、見出しの行の高さに合わせる。見出しの高さは決め打ちしない
  React.useLayoutEffect(() => {
    const header = containerRef.current?.querySelector("thead");
    const overlay = overlayRef.current;
    if (!reloading || !overlay) return;
    const place = () => {
      overlay.style.top = `${header?.offsetHeight ?? 0}px`;
    };
    place();
    if (!header) return;
    const observer = new ResizeObserver(place);
    observer.observe(header);
    return () => observer.disconnect();
  }, [reloading]);

  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      aria-busy={reloading || undefined}
      className="border-border relative w-full overflow-x-auto rounded-md border"
    >
      <table
        data-slot="table"
        className={cn(
          "text-foreground w-full caption-bottom text-sm",
          reloading && "[&_tbody_tr]:opacity-40",
          className,
        )}
        {...props}
      />
      {reloading && (
        <div
          ref={overlayRef}
          className="text-ring pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center"
        >
          <Loader />
        </div>
      )}
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:bg-surface-muted [&_tr]:border-border-muted [&_tr]:border-b",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

/** `interactive` を付けると、重ねたときと押している間に --muted の面を敷き、指の形にする。押すと詳細などが開く行に使う。 */
function TableRow({
  className,
  interactive,
  ...props
}: React.ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "data-[state=selected]:bg-muted border-border-muted border-b",
        interactive && "hover:bg-muted active:bg-muted cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

/** `numeric` を付けると右に寄せる。数量と金額の列に使い、商品 ID のような番号には付けない。 */
function TableHead({
  className,
  numeric,
  ...props
}: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-muted-foreground px-3 py-2 align-middle text-sm font-bold whitespace-nowrap [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

/** `numeric` を付けると右に寄せ、桁をそろえる。数量と金額のセルに使い、商品 ID のような番号には付けない。 */
function TableCell({
  className,
  numeric,
  ...props
}: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5",
        numeric && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

/** 行が 1 つもないときの 1 行。`colSpan` に列の数を渡し、何がないか、どうすれば出るかを書く。 */
type TableEmptyProps = React.ComponentProps<"td"> & {
  /**
   * 行にボタンや入力欄があるテーブルで付ける。高さをその行と同じ（52px）にして、
   * 読み込みが終わって 1 行が出たときに、テーブルの高さが変わらないようにする
   */
  controlRows?: boolean;
};

/** 行がないときの 1 行。`colSpan` に列の数を渡す。 */
function TableEmpty({ className, controlRows, children, ...props }: TableEmptyProps) {
  return (
    <tr data-slot="table-row" className="border-border-muted border-b">
      <td
        data-slot="table-empty"
        className={cn("text-muted-foreground px-3 py-2 text-center", className)}
        {...props}
      >
        <div className={cn("flex items-center justify-center", controlRows && "min-h-9")}>
          {children}
        </div>
      </td>
    </tr>
  );
}

/** 読み込み中の 1 行。行がないときの 1 行と同じ場所の中央にローダーを出す。`colSpan` に列の数を渡す。 */
function TableLoading(props: Omit<TableEmptyProps, "children">) {
  return (
    <TableEmpty {...props}>
      <Loader />
    </TableEmpty>
  );
}

export {
  Table,
  TableEmpty,
  TableLoading,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
