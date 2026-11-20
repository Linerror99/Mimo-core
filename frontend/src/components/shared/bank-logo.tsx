"use client";

import React, { useState } from "react";
import { Building2 } from "lucide-react";
import { getBankPreset } from "@/lib/bank-logos";
import { cn } from "@/lib/utils";

interface BankLogoProps {
  accountName?: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-[10px] rounded-md",
  sm: "h-7 w-7 text-xs rounded-lg",
  md: "h-10 w-10 text-sm rounded-xl",
  lg: "h-12 w-12 text-base rounded-2xl",
};

export function BankLogo({
  accountName,
  logoUrl,
  size = "md",
  className,
}: BankLogoProps) {
  const [imgError, setImgError] = useState(false);
  const preset = getBankPreset(accountName, logoUrl);
  const sizeClass = SIZE_CLASSES[size];

  const isCustomImage =
    Boolean(logoUrl) &&
    (logoUrl!.startsWith("http://") ||
      logoUrl!.startsWith("https://") ||
      logoUrl!.startsWith("data:image/")) &&
    !imgError;

  if (isCustomImage) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-xs dark:border-zinc-700",
          sizeClass,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl!}
          alt={accountName || "Logo bancaire"}
          className="h-full w-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (preset) {
    return (
      <div
        title={preset.name}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden shadow-xs",
          sizeClass,
          className
        )}
      >
        {preset.icon}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border border-slate-200 bg-violet-500/10 text-violet-600 dark:border-zinc-800 dark:text-violet-400",
        sizeClass,
        className
      )}
    >
      <Building2 className="h-4 w-4" />
    </div>
  );
}
