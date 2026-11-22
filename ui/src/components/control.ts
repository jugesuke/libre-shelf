/** 入力欄、選択欄、複数行の欄に共通する見た目 */
export const controlClassName = [
  "block w-full rounded-md border border-input bg-background px-3 text-sm text-foreground",
  "placeholder:text-placeholder",
  "focus:outline-2 focus:outline-offset-2 focus:outline-ring",
  "aria-invalid:border-destructive",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-placeholder",
].join(" ");
