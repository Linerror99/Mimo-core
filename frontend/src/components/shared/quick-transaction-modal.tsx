"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { transactionService } from "@/services/transaction-service";
import { recurringService } from "@/services/recurring-service";
import { cn, getTodayIso } from "@/lib/utils";
import type { Account } from "@/types/account";
import type { Category } from "@/types/category";
import {
  TEMPLATE_FREQUENCY_LABELS,
  type TemplateFrequency,
} from "@/types/recurring-template";
import {
  TRANSACTION_TYPE_LABELS,
  type Transaction,
  type TransactionType,
} from "@/types/transaction";

const LAST_ACCOUNT_STORAGE_KEY = "mimo_last_account_id";

interface QuickTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickTransactionModal({
  open,
  onClose,
}: QuickTransactionModalProps) {
  const queryClient = useQueryClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [txType, setTxType] = useState<TransactionType>("EXPENSE");
  const [isRecurring, setIsRecurring] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(getTodayIso());
  const [accountId, setAccountId] = useState("");
  const [destAccountId, setDestAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<TemplateFrequency>("MONTHLY");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setDescription("");
    setAmount("");
    setTxDate(getTodayIso());
    setIsRecurring(false);
    setCategoryId("");
    setDestAccountId("");
    setNotes("");

    Promise.all([
      accountService.list().catch(() => []),
      categoryService.list().catch(() => []),
      transactionService.list().catch(() => []),
    ])
      .then(([accs, cats, txs]) => {
        if (cancelled) return;
        setAccounts(accs);
        setCategories(cats);
        setRecentTxs(txs.slice(0, 120));
        const savedAccId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(LAST_ACCOUNT_STORAGE_KEY)
            : null;
        const defaultAcc =
          accs.find((a) => a.id === savedAccId)?.id || accs[0]?.id || "";
        setAccountId(defaultAcc);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Auto-suggest category from historical transactions matching description
  const suggestedCategory = useMemo(() => {
    const q = description.trim().toLowerCase();
    if (q.length < 3 || txType === "TRANSFER" || categoryId) return null;
    const match = recentTxs.find(
      (t) =>
        t.type === txType &&
        t.category_id &&
        t.description.toLowerCase().includes(q)
    );
    if (!match?.category_id) return null;
    return categories.find((c) => c.id === match.category_id) ?? null;
  }, [description, txType, categoryId, recentTxs, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number.parseFloat(amount);
    if (!description.trim() || !accountId || Number.isNaN(numeric) || numeric <= 0) {
      return;
    }
    if (txType === "TRANSFER" && !destAccountId) return;

    setSubmitting(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_ACCOUNT_STORAGE_KEY, accountId);
      }

      if (isRecurring) {
        const d = new Date(txDate);
        const dayOfMonth = Number.isNaN(d.getTime()) ? 1 : d.getDate();
        const jsDay = Number.isNaN(d.getTime()) ? 1 : d.getDay();
        const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

        await recurringService.create({
          name: description.trim(),
          amount: Math.abs(numeric),
          type: txType,
          frequency,
          start_date: txDate,
          day_of_month:
            frequency === "MONTHLY" ||
            frequency === "QUARTERLY" ||
            frequency === "YEARLY"
              ? dayOfMonth
              : null,
          day_of_week: frequency === "WEEKLY" ? dayOfWeek : null,
          custom_days: frequency === "CUSTOM" ? 14 : null,
          account_id: accountId,
          destination_account_id:
            txType === "TRANSFER" ? destAccountId : null,
          category_id: txType === "TRANSFER" ? null : categoryId || null,
        });
        toast.success("Récurrence rapide enregistrée");
      } else {
        const signedAmount =
          txType === "EXPENSE" ? -Math.abs(numeric) : Math.abs(numeric);
        await transactionService.create({
          description: description.trim(),
          amount: signedAmount,
          transaction_date: txDate,
          type: txType,
          account_id: accountId,
          destination_account_id:
            txType === "TRANSFER" ? destAccountId : null,
          category_id: txType === "TRANSFER" ? null : categoryId || null,
          notes: notes.trim() || null,
        });
        toast.success("Transaction rapide enregistrée");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projections"] }),
        queryClient.invalidateQueries({ queryKey: ["recurring-templates"] }),
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'enregistrer l'opération"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transaction rapide"
      description="Enregistrez une dépense, un revenu ou un virement sans quitter votre page."
      maxWidthClass="max-w-lg"
    >
      {loading ? (
        <div className="space-y-3 py-4">
          <div className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-zinc-800" />
          <div className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-zinc-800" />
          <div className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-zinc-800" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Switch */}
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(["EXPENSE", "INCOME", "TRANSFER"] as TransactionType[]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTxType(t);
                    setCategoryId("");
                  }}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-semibold transition-colors",
                    txType === t
                      ? "bg-white text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-violet-400"
                      : "text-slate-600 dark:text-zinc-400"
                  )}
                >
                  {TRANSACTION_TYPE_LABELS[t]}
                </button>
              )
            )}
          </div>

          <div>
            <label
              htmlFor="qtx-desc"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Libellé
            </label>
            <input
              id="qtx-desc"
              type="text"
              required
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex. Courses Carrefour, Loyer, Salaire..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
            {suggestedCategory && (
              <button
                type="button"
                onClick={() => setCategoryId(suggestedCategory.id)}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300"
              >
                <Sparkles className="h-3 w-3" />
                Catégorie suggérée : {suggestedCategory.name} (cliquer pour
                appliquer)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="qtx-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Montant (€)
              </label>
              <input
                id="qtx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <div>
              <label
                htmlFor="qtx-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                {isRecurring ? "Date de début" : "Date"}
              </label>
              <input
                id="qtx-date"
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="qtx-account"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Compte
              </label>
              <select
                id="qtx-account"
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                <option value="">Choisir un compte</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {txType === "TRANSFER" ? (
              <div>
                <label
                  htmlFor="qtx-dest-account"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Compte destinataire
                </label>
                <select
                  id="qtx-dest-account"
                  required
                  value={destAccountId}
                  onChange={(e) => setDestAccountId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                >
                  <option value="">Choisir la destination</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="qtx-category"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Catégorie
                </label>
                <select
                  id="qtx-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                >
                  <option value="">Sans catégorie</option>
                  {categories
                    .filter((c) => c.type === txType)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Toggle Récurrent */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Repeat className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              Opération récurrente
            </label>
            {isRecurring && (
              <select
                aria-label="Fréquence récurrente"
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as TemplateFrequency)
                }
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-[#121215]"
              >
                {(
                  Object.keys(TEMPLATE_FREQUENCY_LABELS) as TemplateFrequency[]
                ).map((f) => (
                  <option key={f} value={f}>
                    {TEMPLATE_FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!isRecurring && (
            <div>
              <label
                htmlFor="qtx-notes"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Notes (optionnel)
              </label>
              <input
                id="qtx-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Commentaire rapide..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
