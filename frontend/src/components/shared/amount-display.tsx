"use client";

import React from "react";
import { cn, formatCurrencyEur } from "@/lib/utils";
import { usePrivacyStore } from "@/stores/privacy-store";

interface AmountDisplayProps {
  amount: number;
  signed?: boolean;
  decimals?: number;
  colored?: boolean;
  className?: string;
}

export function AmountDisplay({
  amount,
  signed = false,
  decimals = 2,
  colored = false,
  className,
}: AmountDisplayProps) {
  const isPrivate = usePrivacyStore((s) => s.isPrivate);

  const colorClass = colored
    ? amount > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : amount < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-700 dark:text-zinc-300"
    : "";

  return (
    <span className={cn("font-mono tabular-money", colorClass, className)}>
      {isPrivate ? "•••• €" : formatCurrencyEur(amount, { signed, decimals })}
    </span>
  );
}
