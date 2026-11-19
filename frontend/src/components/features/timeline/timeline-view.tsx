"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Plus,
  Repeat,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import {
  cn,
  formatDateFr,
  formatFullMonthLabel,
  getTodayIso,
} from "@/lib/utils";
import type { Account } from "@/types/account";
import type { Category } from "@/types/category";
import {
  TEMPLATE_FREQUENCY_LABELS,
  type RecurringTemplate,
  type RecurringTemplateCreate,
  type TemplateFrequency,
} from "@/types/recurring-template";
import {
  RECURRENCE_FREQUENCY_LABELS,
  TRANSACTION_STATE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type RecurrenceFrequency,
  type RecurringTransactionCreate,
  type Transaction,
  type TransactionCreate,
  type TransactionState,
  type TransactionType,
  type TransactionUpdate,
} from "@/types/transaction";

interface TimelineViewProps {
  isLoading: boolean;
  year: number;
  month: number;
  onChangeMonth: (year: number, month: number) => void;
  transactions: Transaction[];
  templates: RecurringTemplate[];
  accounts: Account[];
  categories: Category[];
  onCreateTransaction: (
    payload: TransactionCreate | RecurringTransactionCreate,
    isRecurring: boolean
  ) => Promise<void> | void;
  onUpdateTransaction: (
    id: string,
    payload: TransactionUpdate
  ) => Promise<void> | void;
  onDeleteTransaction: (id: string) => Promise<void> | void;
  onValidateTransaction: (id: string) => Promise<void> | void;
  onCreateTemplate: (payload: RecurringTemplateCreate) => Promise<void> | void;
  onDeleteTemplate: (id: string) => Promise<void> | void;
  onExportPdf?: () => Promise<void> | void;
  defaultOpenCreate?: boolean;
}

export function TimelineSkeleton() {
  return (
    <div data-testid="timeline-skeleton" className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export function TimelineView({
  isLoading,
  year,
  month,
  onChangeMonth,
  transactions,
  templates,
  accounts,
  categories,
  onCreateTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onValidateTransaction,
  onCreateTemplate,
  onDeleteTemplate,
  onExportPdf,
  defaultOpenCreate = false,
}: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<"transactions" | "templates">(
    "transactions"
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");
  const [stateFilter, setStateFilter] = useState<TransactionState | "ALL">(
    "ALL"
  );
  const [accountFilter, setAccountFilter] = useState<string>("ALL");

  // Transaction Modal
  const [txModalOpen, setTxModalOpen] = useState(defaultOpenCreate);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(getTodayIso());
  const [txType, setTxType] = useState<TransactionType>("EXPENSE");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [destAccountId, setDestAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>("NONE");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Template Modal
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplAmount, setTplAmount] = useState("");
  const [tplType, setTplType] = useState<TransactionType>("EXPENSE");
  const [tplFreq, setTplFreq] = useState<TemplateFrequency>("MONTHLY");
  const [tplStart, setTplStart] = useState(getTodayIso());
  const [tplAccountId, setTplAccountId] = useState(accounts[0]?.id || "");
  const [tplCategoryId, setTplCategoryId] = useState("");

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => !t.deleted_at)
      .filter((t) => (typeFilter === "ALL" ? true : t.type === typeFilter))
      .filter((t) => (stateFilter === "ALL" ? true : t.state === stateFilter))
      .filter((t) =>
        accountFilter === "ALL" ? true : t.account_id === accountFilter
      )
      .filter((t) =>
        !q
          ? true
          : t.description.toLowerCase().includes(q) ||
            (t.category_name || "").toLowerCase().includes(q) ||
            (t.account_name || "").toLowerCase().includes(q)
      )
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [transactions, search, typeFilter, stateFilter, accountFilter]);

  const monthIncome = filteredTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthExpense = filteredTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthNet = monthIncome - monthExpense;

  if (isLoading) return <TimelineSkeleton />;

  const goPrevMonth = () => {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  };

  const goNextMonth = () => {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
  };

  const goToday = () => {
    const now = new Date();
    onChangeMonth(now.getFullYear(), now.getMonth() + 1);
  };

  const openCreateTx = (prefill?: Transaction) => {
    if (prefill) {
      setEditingTx(null);
      setDescription(`${prefill.description} (copie)`);
      setAmount(String(Math.abs(Number(prefill.amount))));
      setTxDate(getTodayIso());
      setTxType(prefill.type);
      setAccountId(prefill.account_id);
      setDestAccountId(prefill.destination_account_id || "");
      setCategoryId(prefill.category_id || "");
      setNotes(prefill.notes || "");
      setRecurrence("NONE");
      setRecurrenceEnd("");
    } else {
      setEditingTx(null);
      setDescription("");
      setAmount("");
      setTxDate(getTodayIso());
      setTxType("EXPENSE");
      setAccountId(accounts[0]?.id || "");
      setDestAccountId("");
      setCategoryId("");
      setNotes("");
      setRecurrence("NONE");
      setRecurrenceEnd("");
    }
    setTxModalOpen(true);
  };

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setDescription(tx.description);
    setAmount(String(Math.abs(Number(tx.amount))));
    setTxDate(tx.transaction_date.slice(0, 10));
    setTxType(tx.type);
    setAccountId(tx.account_id);
    setDestAccountId(tx.destination_account_id || "");
    setCategoryId(tx.category_id || "");
    setNotes(tx.notes || "");
    setRecurrence("NONE");
    setTxModalOpen(true);
  };

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number.parseFloat(amount);
    if (!description.trim() || !accountId || Number.isNaN(numericAmount)) return;
    setSubmitting(true);
    try {
      if (editingTx) {
        await onUpdateTransaction(editingTx.id, {
          description: description.trim(),
          amount: numericAmount,
          transaction_date: txDate,
          type: txType,
          account_id: accountId,
          destination_account_id:
            txType === "TRANSFER" ? destAccountId || null : null,
          category_id: txType === "TRANSFER" ? null : categoryId || null,
          notes: notes.trim() || null,
        });
      } else if (recurrence !== "NONE") {
        await onCreateTransaction(
          {
            description: description.trim(),
            amount: numericAmount,
            transaction_date: txDate,
            type: txType,
            account_id: accountId,
            destination_account_id:
              txType === "TRANSFER" ? destAccountId || null : null,
            category_id: txType === "TRANSFER" ? null : categoryId || null,
            notes: notes.trim() || null,
            recurrence_frequency: recurrence,
            recurrence_end_date: recurrenceEnd || null,
          },
          true
        );
      } else {
        await onCreateTransaction(
          {
            description: description.trim(),
            amount: numericAmount,
            transaction_date: txDate,
            type: txType,
            account_id: accountId,
            destination_account_id:
              txType === "TRANSFER" ? destAccountId || null : null,
            category_id: txType === "TRANSFER" ? null : categoryId || null,
            notes: notes.trim() || null,
          },
          false
        );
      }
      setTxModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number.parseFloat(tplAmount);
    const selectedAccount = tplAccountId || accounts[0]?.id;
    if (!tplName.trim() || !selectedAccount || Number.isNaN(numericAmount)) {
      return;
    }
    setSubmitting(true);
    try {
      await onCreateTemplate({
        name: tplName.trim(),
        amount: numericAmount,
        type: tplType,
        frequency: tplFreq,
        start_date: tplStart,
        day_of_month: new Date(tplStart).getDate(),
        account_id: selectedAccount,
        category_id: tplCategoryId || null,
      });
      setTplModalOpen(false);
      setTplName("");
      setTplAmount("");
    } finally {
      setSubmitting(false);
    }
  };

  const stateBadgeVariant = (state: TransactionState) => {
    if (state === "REALIZED") return "success";
    if (state === "PENDING") return "warning";
    return "info";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Timeline financière
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Suivez vos opérations passées, validations du jour et échéances
            récurrentes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onExportPdf && (
            <Button variant="secondary" size="md" onClick={onExportPdf}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          )}
          <Button
            onClick={() =>
              viewMode === "templates"
                ? setTplModalOpen(true)
                : openCreateTx()
            }
          >
            <Plus className="h-4 w-4" />
            {viewMode === "templates"
              ? "Nouvelle récurrence"
              : "Nouvelle transaction"}
          </Button>
        </div>
      </div>

      {/* Mode Switch + Month Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setViewMode("transactions")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors",
              viewMode === "transactions"
                ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-slate-600 dark:text-zinc-400"
            )}
          >
            Opérations ({filteredTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("templates")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors",
              viewMode === "templates"
                ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-slate-600 dark:text-zinc-400"
            )}
          >
            Récurrences ({templates.length})
          </button>
        </div>

        {viewMode === "transactions" && (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 dark:border-zinc-800 dark:bg-[#121215]">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Mois précédent"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[136px] text-center text-xs font-semibold text-slate-900 dark:text-zinc-100">
              {formatFullMonthLabel(month, year)}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Mois suivant"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Aujourd&apos;hui
            </button>
          </div>
        )}
      </div>

      {viewMode === "transactions" ? (
        <>
          {/* Summary Bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Revenus
                </span>
                <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  <AmountDisplay amount={monthIncome} signed />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Dépenses
                </span>
                <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
                  <AmountDisplay amount={-monthExpense} signed />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Solde net du mois
                </span>
                <p className="mt-1 text-lg font-semibold">
                  <AmountDisplay amount={monthNet} signed colored />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par libellé, catégorie ou compte..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <select
              aria-label="Filtrer par type"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as TransactionType | "ALL")
              }
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium dark:border-zinc-800 dark:bg-[#121215]"
            >
              <option value="ALL">Tous les types</option>
              <option value="EXPENSE">Dépenses</option>
              <option value="INCOME">Revenus</option>
              <option value="TRANSFER">Virements</option>
            </select>
            <select
              aria-label="Filtrer par état"
              value={stateFilter}
              onChange={(e) =>
                setStateFilter(e.target.value as TransactionState | "ALL")
              }
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium dark:border-zinc-800 dark:bg-[#121215]"
            >
              <option value="ALL">Tous les états</option>
              <option value="REALIZED">Réalisées</option>
              <option value="PENDING">En attente</option>
              <option value="PROJECTED">Projetées</option>
            </select>
            <select
              aria-label="Filtrer par compte"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium dark:border-zinc-800 dark:bg-[#121215]"
            >
              <option value="ALL">Tous les comptes</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              title="Aucune transaction pour cette période"
              description="Ajustez vos filtres ou ajoutez une nouvelle opération à votre timeline."
              action={
                <Button onClick={() => openCreateTx()}>
                  <Plus className="h-4 w-4" />
                  Ajouter une transaction
                </Button>
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Libellé</th>
                      <th className="hidden px-4 py-3 md:table-cell">Compte</th>
                      <th className="px-4 py-3">État</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                    {filteredTransactions.map((tx) => {
                      const signedAmount =
                        tx.type === "EXPENSE"
                          ? -Math.abs(Number(tx.amount))
                          : Math.abs(Number(tx.amount));
                      const accLabel =
                        tx.account_name ||
                        accounts.find((a) => a.id === tx.account_id)?.name ||
                        "—";
                      const catLabel =
                        tx.category_name ||
                        categories.find((c) => c.id === tx.category_id)?.name;

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 tabular-money dark:text-zinc-400">
                            {formatDateFr(tx.transaction_date)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 dark:text-zinc-100">
                                {tx.description}
                              </span>
                              {(tx.recurring_template_id ||
                                tx.recurrence_frequency !== "NONE") && (
                                <Badge variant="neutral">
                                  <Repeat className="h-3 w-3" />
                                  Récurrent
                                </Badge>
                              )}
                            </div>
                            {catLabel && (
                              <p className="text-xs text-slate-500 dark:text-zinc-400">
                                {catLabel}
                              </p>
                            )}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400 md:table-cell">
                            {accLabel}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge variant={stateBadgeVariant(tx.state)}>
                              {TRANSACTION_STATE_LABELS[tx.state]}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                            <AmountDisplay
                              amount={signedAmount}
                              signed={tx.type !== "TRANSFER"}
                              colored={tx.type !== "TRANSFER"}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {tx.state === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => onValidateTransaction(tx.id)}
                                  aria-label={`Valider ${tx.description}`}
                                  title="Valider"
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditTx(tx)}
                                aria-label={`Modifier ${tx.description}`}
                                title="Modifier"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openCreateTx(tx)}
                                aria-label={`Dupliquer ${tx.description}`}
                                title="Dupliquer"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(tx.id)}
                                aria-label={`Supprimer ${tx.description}`}
                                title="Supprimer"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-zinc-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        /* Recurring Templates List */
        <div className="space-y-4">
          {templates.length === 0 ? (
            <EmptyState
              icon={<Repeat className="h-5 w-5" />}
              title="Aucun modèle récurrent"
              description="Automatisez votre loyer, salaire et abonnements pour alimenter vos projections 5 ans."
              action={
                <Button onClick={() => setTplModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Créer une récurrence
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {templates.map((tpl) => (
                <Card key={tpl.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                          {tpl.name}
                        </p>
                        <Badge variant="info">
                          {TEMPLATE_FREQUENCY_LABELS[tpl.frequency]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        Début : {formatDateFr(tpl.start_date)}
                        {tpl.day_of_month ? ` · Jour ${tpl.day_of_month}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AmountDisplay
                        amount={
                          tpl.type === "EXPENSE"
                            ? -Math.abs(Number(tpl.amount))
                            : Math.abs(Number(tpl.amount))
                        }
                        signed
                        colored
                        className="text-sm font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => onDeleteTemplate(tpl.id)}
                        aria-label={`Supprimer le modèle ${tpl.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Transaction Modal */}
      <Modal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title={
          editingTx ? "Modifier la transaction" : "Nouvelle transaction"
        }
      >
        <form onSubmit={handleSubmitTx} className="space-y-4">
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(["EXPENSE", "INCOME", "TRANSFER"] as TransactionType[]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxType(t)}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-semibold transition-colors",
                    txType === t
                      ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
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
              htmlFor="tx-desc"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Libellé
            </label>
            <input
              id="tx-desc"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex. Courses supermarché, Loyer, Salaire"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Montant (€)
              </label>
              <input
                id="tx-amount"
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
                htmlFor="tx-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-account"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Compte
              </label>
              <select
                id="tx-account"
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                <option value="">Sélectionner un compte</option>
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
                  htmlFor="tx-dest-account"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Compte destinataire
                </label>
                <select
                  id="tx-dest-account"
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
                  htmlFor="tx-category"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Catégorie
                </label>
                <select
                  id="tx-category"
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

          {!editingTx && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tx-recurrence"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Fréquence
                </label>
                <select
                  id="tx-recurrence"
                  value={recurrence}
                  onChange={(e) =>
                    setRecurrence(e.target.value as RecurrenceFrequency)
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                >
                  {(
                    Object.keys(
                      RECURRENCE_FREQUENCY_LABELS
                    ) as RecurrenceFrequency[]
                  ).map((freq) => (
                    <option key={freq} value={freq}>
                      {RECURRENCE_FREQUENCY_LABELS[freq]}
                    </option>
                  ))}
                </select>
              </div>
              {recurrence !== "NONE" && (
                <div>
                  <label
                    htmlFor="tx-recurrence-end"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                  >
                    Fin de récurrence (optionnel)
                  </label>
                  <input
                    id="tx-recurrence-end"
                    type="date"
                    value={recurrenceEnd}
                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="tx-notes"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Notes (optionnel)
            </label>
            <textarea
              id="tx-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTxModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Recurring Template Modal */}
      <Modal
        open={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        title="Nouveau modèle récurrent"
        description="Alimente automatiquement vos projections mensuelles jusqu'à 5 ans."
      >
        <form onSubmit={handleSubmitTemplate} className="space-y-4">
          <div>
            <label
              htmlFor="tpl-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom du modèle
            </label>
            <input
              id="tpl-name"
              type="text"
              required
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Ex. Loyer appartement, Salaire"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tpl-type"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Type
              </label>
              <select
                id="tpl-type"
                value={tplType}
                onChange={(e) => setTplType(e.target.value as TransactionType)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                <option value="EXPENSE">Dépense</option>
                <option value="INCOME">Revenu</option>
                <option value="TRANSFER">Virement</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="tpl-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Montant (€)
              </label>
              <input
                id="tpl-amount"
                type="number"
                step="0.01"
                required
                value={tplAmount}
                onChange={(e) => setTplAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tpl-freq"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Fréquence
              </label>
              <select
                id="tpl-freq"
                value={tplFreq}
                onChange={(e) =>
                  setTplFreq(e.target.value as TemplateFrequency)
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                {(
                  Object.keys(TEMPLATE_FREQUENCY_LABELS) as TemplateFrequency[]
                ).map((f) => (
                  <option key={f} value={f}>
                    {TEMPLATE_FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="tpl-start"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date de début
              </label>
              <input
                id="tpl-start"
                type="date"
                required
                value={tplStart}
                onChange={(e) => setTplStart(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tpl-account"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Compte
              </label>
              <select
                id="tpl-account"
                required
                value={tplAccountId || accounts[0]?.id || ""}
                onChange={(e) => setTplAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="tpl-category"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Catégorie
              </label>
              <select
                id="tpl-category"
                value={tplCategoryId}
                onChange={(e) => setTplCategoryId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTplModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              Créer la récurrence
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
