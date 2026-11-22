import { cn } from "../lib/utils";

type TabsProps<T extends string> = {
  /** 選択肢。並べる順に書く */
  options: readonly { value: T; label: string }[];
  /** 選んでいる選択肢の `value` */
  value: T;
  /** 選択肢を押したとき、その `value` を渡して呼ぶ */
  onChange: (value: T) => void;
  /** 枠に足すクラス */
  className?: string;
};

/**
 * タブ。選択肢を横に並べ、選んでいる側に `aria-selected="true"` と下線を付ける。
 * 押した選択肢の値を `onChange` に渡す。並びの下に線を引く。
 */
function Tabs<T extends string>({ options, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn("flex border-b border-border", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              // 下線が並びの線に重なるよう、選んでいない側にも透明の下線を持たせて高さをそろえる
              "h-9 px-3 border-b-3 text-sm cursor-pointer -mb-px hover:bg-muted active:bg-muted",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "border-ring text-foreground font-bold"
                : "border-transparent text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
