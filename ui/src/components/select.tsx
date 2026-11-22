import type * as React from "react";
import { cn } from "../lib/utils";
import { controlClassName } from "./control";

/** 選択欄。HTML の `select` と同じ属性を受け取る。 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(controlClassName, "h-9", className)} {...props} />;
}
export { Select };
