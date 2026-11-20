import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
        {title}
      </p>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-zinc-400">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
