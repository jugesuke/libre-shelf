import type * as React from "react";
import { cn } from "../lib/utils";
import { controlClassName } from "./control";

/** 複数行の欄。HTML の `textarea` と同じ属性を受け取る。 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlClassName, "min-h-16 resize-y py-2", className)} {...props} />;
}
export { Textarea };
