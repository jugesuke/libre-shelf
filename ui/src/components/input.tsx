import type * as React from "react";
import { cn } from "../lib/utils";
import { controlClassName } from "./control";

/** 1 行の入力欄。HTML の `input` と同じ属性を受け取る。 */
function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlClassName, "h-9", className)} {...props} />;
}
export { Input };
