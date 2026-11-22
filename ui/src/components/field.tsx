import * as React from "react";

type FieldProps = {
  /** 項目名 */
  label: string;
  /** 必須の札を出すか */
  required?: boolean;
  /** エラーの理由。あるとき欄に `aria-invalid` を付ける */
  error?: string;
  /**
   * 切り替えと欄とボタンのように、いくつかの要素を組み合わせた欄を置くときに、
   * 項目名をつなぐ欄の `id` を指定する。指定すると、中の要素に `id` などを渡さない。
   */
  controlId?: string;
  /** `controlId` を指定したとき、エラーの理由の文字に付ける `id`。使う側が欄の `aria-describedby` に指定する */
  describedById?: string;
  /** 欄（`Input`、`Select`、`Textarea` のどれか 1 つ。`controlId` を指定したときは、組み合わせた要素） */
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
};

/**
 * 項目名と欄をまとめる。欄に `id`、`aria-invalid`、`aria-describedby` を渡して、
 * 項目名とエラーの理由を欄につなぐ。
 */
function Field({ label, required, error, controlId, describedById, children }: FieldProps) {
  const generatedId = React.useId();
  const id = controlId ?? generatedId;
  const errorId = controlId ? describedById : `${generatedId}-error`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-sm font-bold text-foreground">
          {label}
        </label>
        {required && (
          <span className="rounded-full bg-destructive-muted px-2 text-xs text-destructive-muted-foreground">必須</span>
        )}
      </div>
      {controlId
        ? children
        : React.cloneElement(children, {
            id,
            ...(error ? { "aria-invalid": true, "aria-describedby": errorId } : {}),
          })}
      {error && (
        <p id={errorId} className="text-xs text-destructive-muted-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
export { Field };
