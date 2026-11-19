import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        neutral:
          "border-slate-200 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        danger:
          "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        info:
          "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
