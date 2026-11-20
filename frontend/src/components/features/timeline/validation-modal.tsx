"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, Check, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AmountDisplay } from "@/components/shared/amount-display";
import { cn, formatDateFr } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

interface ValidationModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onValidate: (id: string, newAmount?: number) => Promise<void> | void;
  onPostpone?: (id: string, newDate: string) => Promise<void> | void;
  onCancelTransaction?: (id: string) => Promise<void> | void;
}

export function ValidationModal({
  transaction,
  onClose,
  onValidate,
  onPostpone,
  onCancelTransaction,
}: ValidationModalProps) {
  const [mode, setMode] = useState<"validate" | "postpone">("validate");
  const [amountInput, setAmountInput] = useState("");
  const [postponeDate, setPostponeDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setMode("validate");
      setAmountInput(String(Math.abs(Number(transaction.amount))));
      const baseDate = new Date(transaction.transaction_date);
      baseDate.setDate(baseDate.getDate() + 1);
      setPostponeDate(baseDate.toISOString().slice(0, 10));
    }
  }, [transaction]);

  if (!transaction) return null;

  const originalAbs = Math.abs(Number(transaction.amount));

  const handleValidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsed = Number.parseFloat(amountInput);
      const hasChanged =
        !Number.isNaN(parsed) &&
        parsed > 0 &&
        Math.abs(parsed - originalAbs) > 0.001;
      const signedNewAmount = hasChanged
        ? transaction.type === "EXPENSE"
          ? -Math.abs(parsed)
          : Math.abs(parsed)
        : undefined;
      await onValidate(transaction.id, signedNewAmount);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostponeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onPostpone || !postponeDate) return;
    setSubmitting(true);
    try {
      await onPostpone(transaction.id, postponeDate);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancelTransaction) return;
    setSubmitting(true);
    try {
      await onCancelTransaction(transaction.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={onClose}
      title="Valider ou reporter l'opération"
      description={`${transaction.description} · prévue le ${formatDateFr(transaction.transaction_date)}`}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {/* Operation Summary */}
        <div className="flex items-center justify-between rounded-lg border border-amber-300/60 bg-amber-50/70 px-3.5 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
              {transaction.description}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {transaction.account_name || "Compte"}
              {transaction.category_name
                ? ` · ${transaction.category_name}`
                : ""}
            </p>
          </div>
          <AmountDisplay
            amount={
              transaction.type === "EXPENSE"
                ? -originalAbs
                : originalAbs
            }
            signed={transaction.type !== "TRANSFER"}
            colored={transaction.type !== "TRANSFER"}
            className="text-base font-semibold"
          />
        </div>

        {/* Mode Switch */}
        {onPostpone && (
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setMode("validate")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors",
                mode === "validate"
                  ? "bg-white font-semibold text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-violet-400"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              Valider / Ajuster
            </button>
            <button
              type="button"
              onClick={() => setMode("postpone")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors",
                mode === "postpone"
                  ? "bg-white font-semibold text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-violet-400"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Reporter
            </button>
          </div>
        )}

        {mode === "validate" ? (
          <form onSubmit={handleValidateSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="val-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Montant réel constaté (€)
              </label>
              <input
                id="val-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                Laissez inchangé pour valider tel quel, ou saisissez le montant
                exact prélevé sur votre relevé.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {onCancelTransaction ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={submitting}
                  className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Annuler l&apos;échéance
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Fermer
                </Button>
                <Button type="submit" disabled={submitting}>
                  <Check className="h-4 w-4" />
                  {submitting ? "Validation..." : "Confirmer la validation"}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePostponeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="val-postpone-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Nouvelle date prévue
              </label>
              <input
                id="val-postpone-date"
                type="date"
                required
                value={postponeDate}
                onChange={(e) => setPostponeDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                L&apos;opération repassera en état projeté jusqu&apos;à cette
                nouvelle date.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                <CalendarClock className="h-4 w-4" />
                {submitting ? "Report..." : "Reporter l'opération"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
