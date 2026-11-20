import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyEur(
  amount: number,
  options?: { signed?: boolean; decimals?: number }
): string {
  const decimals = options?.decimals ?? 2;
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount));

  if (options?.signed) {
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
  }
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatDateFr(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

export function formatFullMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthDateRange(year: number, month: number): {
  startDate: string;
  endDate: string;
} {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const dd = String(lastDay).padStart(2, "0");
  return {
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${dd}`,
  };
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName || "").trim().charAt(0).toUpperCase();
  const l = (lastName || "").trim().charAt(0).toUpperCase();
  return `${f}${l}` || "MF";
}
