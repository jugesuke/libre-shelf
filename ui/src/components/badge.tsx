import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 items-center rounded-full px-2 text-xs whitespace-nowrap",
  {
    variants: {
      variant: {
        success: "bg-success-muted text-success",
        warning: "bg-warning-muted text-warning",
        info: "bg-info-muted text-info",
        gray: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "gray",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & {
  /** 種類。省くと灰色 */
  variant?: VariantProps<typeof badgeVariants>["variant"];
};

/**
 * バッジ。状態や分類を短く示す札で、押す操作には使わない。`variant` を省くと灰色になる。
 */
function Badge({ variant, className, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
