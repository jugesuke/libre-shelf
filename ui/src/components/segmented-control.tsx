import { cn } from "../lib/utils";

type SegmentedControlProps<T extends string> = {
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
 * 切り替え。選択肢を横に並べ、選んでいる側に `aria-pressed="true"` を付ける。
 * 押した選択肢の値を `onChange` に渡す。幅は中身の幅になる。
 */
function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={cn("inline-flex", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 px-3 border border-input text-sm cursor-pointer -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:relative",
              selected
                ? "bg-primary text-primary-foreground font-bold hover:brightness-92 active:brightness-85"
                : "bg-background text-foreground hover:bg-muted active:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
