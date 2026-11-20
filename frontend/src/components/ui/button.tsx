import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-violet-600 text-white shadow-sm hover:bg-violet-700 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500",
        accent:
          "bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/30",
        secondary:
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-100 dark:hover:bg-zinc-800",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        danger:
          "bg-[#E11D48] text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500",
        "danger-outline":
          "border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-3.5 text-sm",
        lg: "h-10 px-4 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
