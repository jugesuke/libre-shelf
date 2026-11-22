import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

const alertVariants = cva("rounded-md px-3 py-2 text-sm", {
  variants: {
    variant: {
      destructive: "bg-destructive-muted text-destructive-muted-foreground",
      success: "bg-success-muted text-success",
      warning: "bg-warning-muted text-warning",
      info: "bg-info-muted text-info",
    },
  },
});

type AlertProps = Omit<React.ComponentProps<"div">, "role"> & {
  /** 種類。危険と警告は role="alert"、成功と情報は role="status" になる */
  variant: NonNullable<VariantProps<typeof alertVariants>["variant"]>;
};

/**
 * アラート。`variant` で種類を決める。危険と警告は role="alert"、成功と情報は role="status" にする。
 */
function Alert({ variant, className, ...props }: AlertProps) {
  const role = variant === "destructive" || variant === "warning" ? "alert" : "status";
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert };
