"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Download,
  Edit3,
  GitMerge,
  Landmark,
  Layers,
  List,
  Plus,
  Repeat,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { ValidationModal } from "@/components/features/timeline/validation-modal";
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
  type RecurringTemplateUpdate,
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

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

type BalanceStatus = "danger" | "warning" | "normal" | "success";

/**
 * Règles d'affichage du solde en fin de journée :
 * - Rouge (< 0 €) : danger
 * - Ambre (0 à 50 €) : warning
 * - Vert clair (50 à 100 €) : normal
 * - Vert (> 100 €) : success
 */
function getBalanceStatus(amount: number): BalanceStatus {
  if (amount < 0) return "danger";
  if (amount <= 50) return "warning";
  if (amount <= 100) return "normal";
  return "success";
}

const BALANCE_BADGE_CLASSES: Record<BalanceStatus, string> = {
  danger:
    "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  warning:
    "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  normal:
    "border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  success:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
};

const BALANCE_DOT_CLASSES: Record<BalanceStatus, string> = {
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  normal: "bg-emerald-400",
  success: "bg-emerald-600",
};

const BALANCE_CELL_CLASSES: Record<BalanceStatus, string> = {
  danger:
    "border-rose-300/80 bg-rose-50/70 hover:bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:hover:bg-rose-500/15",
  warning:
    "border-amber-300/80 bg-amber-50/70 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10 dark:hover:bg-amber-500/15",
  normal:
    "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/[0.06] dark:hover:bg-emerald-500/10",
  success:
    "border-emerald-300/70 bg-emerald-50/70 hover:bg-emerald-50 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15",
};

interface TimelineViewProps {
  isLoading: boolean;
  year: number;
  month: number;
  onChangeMonth: (year: number, month: number) => void;
  transactions: Transaction[];
  allTransactions?: Transaction[];
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
  onValidateTransaction: (
    id: string,
    newAmount?: number
  ) => Promise<void> | void;
  onPostponeTransaction?: (
    id: string,
    newDate: string
  ) => Promise<void> | void;
  onCancelTransaction?: (id: string) => Promise<void> | void;
  onCreateTemplate: (payload: RecurringTemplateCreate) => Promise<void> | void;
  onUpdateTemplate?: (
    id: string,
    payload: RecurringTemplateUpdate
  ) => Promise<void> | void;
  onBulkUpdateTemplate?: (
    id: string,
    payload: { start_date: string; end_date: string; amount: number }
  ) => Promise<void> | void;
  onBulkCancelTemplate?: (
    id: string,
    payload: { start_date: string; end_date: string }
  ) => Promise<void> | void;
  onDeleteTemplate: (id: string) => Promise<void> | void;
  onMergeBankTransaction?: (
    importedTxId: string,
    targetTxId: string
  ) => Promise<void> | void;
  onUnlinkBankTransaction?: (txId: string) => Promise<void> | void;
  onExportPdf?: () => Promise<void> | void;
  defaultOpenCreate?: boolean;
  initialAccountFilter?: string;
  initialCategoryFilter?: string;
}

const WEEKDAYS = [
  { value: 0, label: "Lundi" },
  { value: 1, label: "Mardi" },
  { value: 2, label: "Mercredi" },
  { value: 3, label: "Jeudi" },
  { value: 4, label: "Vendredi" },
  { value: 5, label: "Samedi" },
  { value: 6, label: "Dimanche" },
];

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

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
  allTransactions,
  templates,
  accounts,
  categories,
  onCreateTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onValidateTransaction,
  onPostponeTransaction,
  onCancelTransaction,
  onCreateTemplate,
  onUpdateTemplate,
  onBulkUpdateTemplate,
  onBulkCancelTemplate,
  onDeleteTemplate,
  onMergeBankTransaction,
  onUnlinkBankTransaction,
  onExportPdf,
  defaultOpenCreate = false,
  initialAccountFilter = "ALL",
  initialCategoryFilter = "ALL",
}: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<"transactions" | "templates">(
    "transactions"
  );
  const [displayMode, setDisplayMode] = useState<"list" | "calendar">("list");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");
  const [stateFilter, setStateFilter] = useState<TransactionState | "ALL">(
    "ALL"
  );
  const [accountFilter, setAccountFilter] = useState<string>(
    initialAccountFilter || "ALL"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialCategoryFilter || "ALL"
  );
  const [filterScope, setFilterScope] = useState<
    "current_month" | "all_time" | "custom"
  >("current_month");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [tplApplyToFuture, setTplApplyToFuture] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    setAccountFilter(initialAccountFilter || "ALL");
  }, [initialAccountFilter]);

  useEffect(() => {
    setCategoryFilter(initialCategoryFilter || "ALL");
  }, [initialCategoryFilter]);

  // Clear selection when month or filters change
  useEffect(() => {
    setSelectedIds([]);
    setSelectedCalendarDay(null);
  }, [year, month, viewMode]);

  // Keyboard navigation Left/Right between months (disabled while typing or modal open)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        txModalOpen ||
        tplModalOpen ||
        Boolean(validatingTx) ||
        Boolean(bulkTpl) ||
        Boolean(txToDelete) ||
        Boolean(tplToDelete) ||
        confirmBulkDeleteOpen
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (month === 1) onChangeMonth(year - 1, 12);
        else onChangeMonth(year, month - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (month === 12) onChangeMonth(year + 1, 1);
        else onChangeMonth(year, month + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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

  // Template Modal (Create & Edit)
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<RecurringTemplate | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplAmount, setTplAmount] = useState("");
  const [tplType, setTplType] = useState<TransactionType>("EXPENSE");
  const [tplFreq, setTplFreq] = useState<TemplateFrequency>("MONTHLY");
  const [tplStart, setTplStart] = useState(getTodayIso());
  const [tplDayOfMonth, setTplDayOfMonth] = useState(
    String(new Date().getDate())
  );
  const [tplDayOfWeek, setTplDayOfWeek] = useState("0");
  const [tplCustomDays, setTplCustomDays] = useState("14");
  const [tplAccountId, setTplAccountId] = useState(accounts[0]?.id || "");
  const [tplDestAccountId, setTplDestAccountId] = useState("");
  const [tplCategoryId, setTplCategoryId] = useState("");

  // Validation / Postpone Modal
  const [validatingTx, setValidatingTx] = useState<Transaction | null>(null);

  // Merge imported bank transaction into existing planned transaction modal
  const [mergingTx, setMergingTx] = useState<Transaction | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergingBusy, setMergingBusy] = useState(false);

  // Bulk Action Modal on Recurring Template
  const [bulkTpl, setBulkTpl] = useState<RecurringTemplate | null>(null);
  const [bulkMode, setBulkMode] = useState<"update" | "cancel">("update");
  const [bulkStart, setBulkStart] = useState(getTodayIso());
  const [bulkEnd, setBulkEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [bulkAmount, setBulkAmount] = useState("");

  // Confirm Delete Dialogs
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [tplToDelete, setTplToDelete] = useState<RecurringTemplate | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const isGlobalSearchActive =
    filterScope === "all_time" ||
    filterScope === "custom" ||
    search.trim().length > 0;

  const activeFiltersCount = [
    typeFilter !== "ALL",
    stateFilter !== "ALL",
    accountFilter !== "ALL",
    categoryFilter !== "ALL",
    filterScope !== "current_month",
    filterMinAmount.trim() !== "",
    filterMaxAmount.trim() !== "",
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setStateFilter("ALL");
    setAccountFilter("ALL");
    setCategoryFilter("ALL");
    setFilterScope("current_month");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterMinAmount("");
    setFilterMaxAmount("");
  };

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minAmt =
      filterMinAmount.trim() !== ""
        ? Number.parseFloat(filterMinAmount)
        : null;
    const maxAmt =
      filterMaxAmount.trim() !== ""
        ? Number.parseFloat(filterMaxAmount)
        : null;

    // Quand on recherche ou qu'on choisit une portée globale/personnalisée, on cherche dans TOUT l'historique
    const sourceList =
      isGlobalSearchActive && allTransactions && allTransactions.length > 0
        ? allTransactions
        : transactions;

    return sourceList
      .filter((t) => !t.deleted_at)
      .filter((t) => {
        if (filterScope === "custom") {
          const d = t.transaction_date.slice(0, 10);
          if (filterStartDate && d < filterStartDate) return false;
          if (filterEndDate && d > filterEndDate) return false;
        }
        return true;
      })
      .filter((t) => (typeFilter === "ALL" ? true : t.type === typeFilter))
      .filter((t) => (stateFilter === "ALL" ? true : t.state === stateFilter))
      .filter((t) =>
        accountFilter === "ALL" ? true : t.account_id === accountFilter
      )
      .filter((t) =>
        categoryFilter === "ALL" ? true : t.category_id === categoryFilter
      )
      .filter((t) => {
        const absVal = Math.abs(Number(t.amount));
        if (minAmt !== null && !Number.isNaN(minAmt) && absVal < minAmt) {
          return false;
        }
        if (maxAmt !== null && !Number.isNaN(maxAmt) && absVal > maxAmt) {
          return false;
        }
        return true;
      })
      .filter((t) =>
        !q
          ? true
          : t.description.toLowerCase().includes(q) ||
            (t.notes || "").toLowerCase().includes(q) ||
            (t.category_name || "").toLowerCase().includes(q) ||
            (t.account_name || "").toLowerCase().includes(q)
      )
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [
    transactions,
    allTransactions,
    isGlobalSearchActive,
    search,
    filterScope,
    filterStartDate,
    filterEndDate,
    filterMinAmount,
    filterMaxAmount,
    typeFilter,
    stateFilter,
    accountFilter,
    categoryFilter,
  ]);

  const monthIncome = filteredTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthExpense = filteredTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthNet = monthIncome - monthExpense;

  // Groupement des transactions filtrées par jour (YYYY-MM-DD)
  const groupedByDate = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const tx of filteredTransactions) {
      const key = tx.transaction_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    }
    return map;
  }, [filteredTransactions]);

  // Solde cumulé en fin de journée (pour tout l'historique + chaque jour du mois affiché)
  const dailyBalancesMap = useMemo(() => {
    const scopedAccounts =
      accountFilter !== "ALL"
        ? accounts.filter((a) => a.id === accountFilter)
        : accounts.filter((a) => a.is_active);
    const activeAccountIds = new Set(scopedAccounts.map((a) => a.id));
    const initialBalance = scopedAccounts.reduce(
      (sum, acc) => sum + Number(acc.initial_balance || 0),
      0
    );

    const historySource =
      allTransactions && allTransactions.length > 0
        ? allTransactions
        : transactions;

    const sortedHistory = historySource
      .filter((t) => !t.deleted_at)
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

    const deltaForTx = (tx: Transaction): number => {
      const absAmt = Math.abs(Number(tx.amount));
      if (accountFilter !== "ALL") {
        if (tx.type === "TRANSFER") {
          let d = 0;
          if (tx.account_id === accountFilter) d -= absAmt;
          if (tx.destination_account_id === accountFilter) d += absAmt;
          return d;
        }
        if (tx.account_id !== accountFilter) return 0;
        return tx.type === "INCOME" ? absAmt : tx.type === "EXPENSE" ? -absAmt : 0;
      }
      if (tx.type === "TRANSFER") {
        const fromIn = activeAccountIds.has(tx.account_id);
        const toIn = tx.destination_account_id
          ? activeAccountIds.has(tx.destination_account_id)
          : false;
        if (fromIn && !toIn) return -absAmt;
        if (!fromIn && toIn) return absAmt;
        return 0;
      }
      if (activeAccountIds.size > 0 && !activeAccountIds.has(tx.account_id)) {
        return 0;
      }
      return tx.type === "INCOME" ? absAmt : tx.type === "EXPENSE" ? -absAmt : 0;
    };

    const dailyDeltas: Record<string, number> = {};
    for (const tx of sortedHistory) {
      const d = tx.transaction_date.slice(0, 10);
      dailyDeltas[d] = (dailyDeltas[d] || 0) + deltaForTx(tx);
    }

    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    const monthDates: string[] = [];
    for (let d = 1; d <= lastDay; d++) {
      monthDates.push(`${year}-${mm}-${String(d).padStart(2, "0")}`);
    }

    const allDates = Array.from(
      new Set([...Object.keys(dailyDeltas), ...monthDates])
    ).sort((a, b) => a.localeCompare(b));

    const balanceMap: Record<string, number> = {};
    let running = initialBalance;
    for (const d of allDates) {
      running += dailyDeltas[d] || 0;
      balanceMap[d] = running;
    }
    return balanceMap;
  }, [accounts, accountFilter, allTransactions, transactions, year, month]);

  const endOfMonthBalance = useMemo(() => {
    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    const lastKey = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
    return dailyBalancesMap[lastKey];
  }, [dailyBalancesMap, year, month]);

  // Grille calendrier du mois (Lundi = 0, semaine ISO)
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();
    const startDow = (firstDay.getDay() + 6) % 7;
    const days: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    const mm = String(month).padStart(2, "0");
    for (let d = 1; d <= lastDay; d++) {
      days.push(`${year}-${mm}-${String(d).padStart(2, "0")}`);
    }
    return days;
  }, [year, month]);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedCalendarDay) return [];
    return groupedByDate[selectedCalendarDay] || [];
  }, [selectedCalendarDay, groupedByDate]);

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

  const openCreateTx = (prefill?: Transaction, prefillDate?: string) => {
    if (prefill) {
      setEditingTx(null);
      setDescription(`${prefill.description} (copie)`);
      setAmount(String(Math.abs(Number(prefill.amount))));
      setTxDate(prefillDate || getTodayIso());
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
      setTxDate(prefillDate || getTodayIso());
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
    const signedTxAmount =
      txType === "EXPENSE" || txType === "TRANSFER"
        ? -Math.abs(numericAmount)
        : Math.abs(numericAmount);
    setSubmitting(true);
    try {
      if (editingTx) {
        await onUpdateTransaction(editingTx.id, {
          description: description.trim(),
          amount: signedTxAmount,
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
            amount: signedTxAmount,
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
            amount: signedTxAmount,
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

  const openCreateTemplate = () => {
    setEditingTpl(null);
    setTplName("");
    setTplAmount("");
    setTplType("EXPENSE");
    setTplFreq("MONTHLY");
    const today = getTodayIso();
    setTplStart(today);
    setTplDayOfMonth(String(new Date(today).getDate()));
    setTplDayOfWeek("0");
    setTplCustomDays("14");
    setTplAccountId(accounts[0]?.id || "");
    setTplDestAccountId("");
    setTplCategoryId("");
    setTplModalOpen(true);
  };

  const openEditTemplate = (tpl: RecurringTemplate) => {
    setEditingTpl(tpl);
    setTplName(tpl.name);
    setTplAmount(String(Math.abs(Number(tpl.amount))));
    setTplType(tpl.type);
    setTplFreq(tpl.frequency);
    setTplStart(tpl.start_date.slice(0, 10));
    setTplDayOfMonth(String(tpl.day_of_month ?? new Date(tpl.start_date).getDate()));
    setTplDayOfWeek(String(tpl.day_of_week ?? 0));
    setTplCustomDays(String(tpl.custom_days ?? 14));
    setTplAccountId(tpl.account_id);
    setTplDestAccountId(tpl.destination_account_id || "");
    setTplCategoryId(tpl.category_id || "");
    setTplModalOpen(true);
  };

  const openBulkModal = (tpl: RecurringTemplate) => {
    setBulkTpl(tpl);
    setBulkMode("update");
    setBulkStart(getTodayIso());
    setBulkAmount(String(Math.abs(Number(tpl.amount))));
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.abs(Number.parseFloat(tplAmount));
    const selectedAccount = tplAccountId || accounts[0]?.id;
    if (!tplName.trim() || !selectedAccount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }
    if (!editingTpl && tplType === "TRANSFER" && !tplDestAccountId) {
      return;
    }
    setSubmitting(true);
    try {
      const parsedDayOfMonth = Math.min(
        31,
        Math.max(1, Number.parseInt(tplDayOfMonth, 10) || new Date(tplStart).getDate())
      );
      const parsedDayOfWeek = Math.min(
        6,
        Math.max(0, Number.parseInt(tplDayOfWeek, 10) || 0)
      );
      const parsedCustomDays = Math.max(
        1,
        Number.parseInt(tplCustomDays, 10) || 14
      );

      if (editingTpl && onUpdateTemplate) {
        await onUpdateTemplate(editingTpl.id, {
          name: tplName.trim(),
          amount: numericAmount,
          day_of_month:
            tplFreq === "MONTHLY" ||
            tplFreq === "QUARTERLY" ||
            tplFreq === "YEARLY"
              ? parsedDayOfMonth
              : null,
          day_of_week: tplFreq === "WEEKLY" ? parsedDayOfWeek : null,
          custom_days: tplFreq === "CUSTOM" ? parsedCustomDays : null,
          category_id: tplType === "TRANSFER" ? null : tplCategoryId || null,
          apply_to_future: tplApplyToFuture,
        });
      } else {
        await onCreateTemplate({
          name: tplName.trim(),
          amount: numericAmount,
          type: tplType,
          frequency: tplFreq,
          start_date: tplStart,
          day_of_month:
            tplFreq === "MONTHLY" ||
            tplFreq === "QUARTERLY" ||
            tplFreq === "YEARLY"
              ? parsedDayOfMonth
              : null,
          day_of_week: tplFreq === "WEEKLY" ? parsedDayOfWeek : null,
          custom_days: tplFreq === "CUSTOM" ? parsedCustomDays : null,
          account_id: selectedAccount,
          destination_account_id:
            tplType === "TRANSFER" ? tplDestAccountId : null,
          category_id: tplType === "TRANSFER" ? null : tplCategoryId || null,
        });
      }
      setTplModalOpen(false);
      setEditingTpl(null);
      setTplName("");
      setTplAmount("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTpl) return;
    setSubmitting(true);
    try {
      if (bulkMode === "update" && onBulkUpdateTemplate) {
        const parsed = Number.parseFloat(bulkAmount);
        if (Number.isNaN(parsed) || parsed <= 0) return;
        const signedBulkAmount =
          bulkTpl.type === "EXPENSE" ? -Math.abs(parsed) : Math.abs(parsed);
        await onBulkUpdateTemplate(bulkTpl.id, {
          start_date: bulkStart,
          end_date: bulkEnd,
          amount: signedBulkAmount,
        });
      } else if (bulkMode === "cancel" && onBulkCancelTemplate) {
        await onBulkCancelTemplate(bulkTpl.id, {
          start_date: bulkStart,
          end_date: bulkEnd,
        });
      }
      setBulkTpl(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteTx = async () => {
    if (!txToDelete) return;
    setDeleting(true);
    try {
      await onDeleteTransaction(txToDelete.id);
      setTxToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDeleteTpl = async () => {
    if (!tplToDelete) return;
    setDeleting(true);
    try {
      await onDeleteTemplate(tplToDelete.id);
      setTplToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const stateBadgeVariant = (state: TransactionState) => {
    if (state === "REALIZED") return "success";
    if (state === "PENDING") return "warning";
    return "neutral";
  };

  const pendingInMonth = filteredTransactions.filter(
    (t) => t.state === "PENDING"
  );

  const handleValidateAllPending = async () => {
    for (const tx of pendingInMonth) {
      await onValidateTransaction(tx.id);
    }
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
                ? openCreateTemplate()
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

      {/* Mode Switch + List/Calendar Toggle + Month Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                aria-label="Vue liste"
                onClick={() => setDisplayMode("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  displayMode === "list"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-slate-600 dark:text-zinc-400"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Liste
              </button>
              <button
                type="button"
                aria-label="Vue calendrier"
                onClick={() => setDisplayMode("calendar")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  displayMode === "calendar"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-slate-600 dark:text-zinc-400"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendrier
              </button>
            </div>
          )}
        </div>

        {viewMode === "transactions" && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 dark:border-zinc-800 dark:bg-[#121215]">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Mois précédent"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select
              aria-label="Choisir le mois"
              value={month}
              onChange={(e) => onChangeMonth(year, Number(e.target.value))}
              className="h-7 rounded-md bg-transparent px-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:bg-[#121215] dark:text-zinc-100"
            >
              {MONTHS_FR.map((label, idx) => (
                <option key={label} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Choisir l'année"
              value={year}
              onChange={(e) => onChangeMonth(Number(e.target.value), month)}
              className="h-7 rounded-md bg-transparent px-1.5 font-mono text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:bg-[#121215] dark:text-zinc-100"
            >
              {Array.from({ length: 9 }, (_, i) => year - 3 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Solde net du mois
                  </span>
                  {endOfMonthBalance !== undefined && (
                    <span
                      title="Solde prévisionnel en fin de mois"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        BALANCE_BADGE_CLASSES[getBalanceStatus(endOfMonthBalance)]
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          BALANCE_DOT_CLASSES[getBalanceStatus(endOfMonthBalance)]
                        )}
                      />
                      Fin mois : <AmountDisplay amount={endOfMonthBalance} />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-lg font-semibold">
                  <AmountDisplay amount={monthNet} signed colored />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Validation Banner */}
          {pendingInMonth.length > 0 && (
            <div
              data-testid="pending-alert-banner"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    {pendingInMonth.length} opération(s) à valider
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    Ces opérations sont arrivées à échéance et attendent votre
                    confirmation.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={handleValidateAllPending}
              >
                <Check className="h-3.5 w-3.5" />
                Tout valider
              </Button>
            </div>
          )}

          {/* Global Search & Advanced Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[200px] flex-1 sm:w-auto">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par libellé, catégorie, compte ou note (tout l'historique)..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                />
              </div>

              <select
                aria-label="Portée de recherche"
                value={filterScope}
                onChange={(e) =>
                  setFilterScope(
                    e.target.value as "current_month" | "all_time" | "custom"
                  )
                }
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium dark:border-zinc-800 dark:bg-[#121215]"
              >
                <option value="current_month">Mois affiché</option>
                <option value="all_time">Tout l&apos;historique</option>
                <option value="custom">Période personnalisée</option>
              </select>

              <Button
                type="button"
                variant={showAdvancedFilters ? "primary" : "secondary"}
                size="sm"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                aria-label="Filtres avancés"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {(activeFiltersCount > 0 || search.trim() !== "") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                >
                  Réinitialiser
                </Button>
              )}
            </div>

            {/* Active Global/Custom Scope Indicator */}
            {isGlobalSearchActive && (
              <div
                data-testid="timeline-global-scope-banner"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-300/60 bg-violet-50/70 px-3.5 py-2 text-xs text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
              >
                <span>
                  {filterScope === "custom"
                    ? `Période personnalisée (${filterStartDate || "début"} → ${filterEndDate || "fin"})`
                    : "Recherche globale sur tout l'historique"}{" "}
                  · <strong>{filteredTransactions.length} résultat(s)</strong>
                </span>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="font-semibold underline hover:opacity-80"
                >
                  Revenir au mois affiché ({formatFullMonthLabel(month, year)})
                </button>
              </div>
            )}

            {/* Collapsible Advanced Filters Panel */}
            {(showAdvancedFilters || filterScope === "custom") && (
              <div
                data-testid="timeline-advanced-filters"
                className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-[#121215]"
              >
                {filterScope === "custom" && (
                  <>
                    <div>
                      <label
                        htmlFor="filter-start-date"
                        className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                      >
                        Du
                      </label>
                      <input
                        id="filter-start-date"
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="filter-end-date"
                        className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                      >
                        Au
                      </label>
                      <input
                        id="filter-end-date"
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label
                    htmlFor="filter-type"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                  >
                    Type
                  </label>
                  <select
                    id="filter-type"
                    aria-label="Filtrer par type"
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(e.target.value as TransactionType | "ALL")
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="ALL">Tous les types</option>
                    <option value="EXPENSE">Dépenses</option>
                    <option value="INCOME">Revenus</option>
                    <option value="TRANSFER">Virements</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-state"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                  >
                    État
                  </label>
                  <select
                    id="filter-state"
                    aria-label="Filtrer par état"
                    value={stateFilter}
                    onChange={(e) =>
                      setStateFilter(e.target.value as TransactionState | "ALL")
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="ALL">Tous les états</option>
                    <option value="REALIZED">Réalisées</option>
                    <option value="PENDING">En attente</option>
                    <option value="PROJECTED">Projetées</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-account"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                  >
                    Compte
                  </label>
                  <select
                    id="filter-account"
                    aria-label="Filtrer par compte"
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="ALL">Tous les comptes</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-category"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                  >
                    Catégorie
                  </label>
                  <select
                    id="filter-category"
                    aria-label="Filtrer par catégorie"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="ALL">Toutes les catégories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-min-amount"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                  >
                    Montant min (€)
                  </label>
                  <input
                    id="filter-min-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="filter-max-amount"
                    className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400"
                  >
                    Montant max (€)
                  </label>
                  <input
                    id="filter-max-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="∞"
                    value={filterMaxAmount}
                    onChange={(e) => setFilterMaxAmount(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bulk Selection Bar */}
          {selectedIds.length > 0 && (
            <div
              data-testid="timeline-bulk-bar"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-300/70 bg-violet-50/80 px-4 py-2.5 text-xs dark:border-violet-500/40 dark:bg-violet-500/15"
            >
              <div className="flex items-center gap-2 font-semibold text-violet-900 dark:text-violet-200">
                <span>{selectedIds.length} opération(s) sélectionnée(s)</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] font-medium underline opacity-80 hover:opacity-100"
                >
                  Effacer
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filteredTransactions.some(
                  (t) => selectedIds.includes(t.id) && t.state === "PENDING"
                ) && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={bulkBusy}
                    onClick={async () => {
                      setBulkBusy(true);
                      try {
                        const pendingIds = filteredTransactions
                          .filter(
                            (t) =>
                              selectedIds.includes(t.id) &&
                              t.state === "PENDING"
                          )
                          .map((t) => t.id);
                        for (const id of pendingIds) {
                          await onValidateTransaction(id);
                        }
                        setSelectedIds([]);
                      } finally {
                        setBulkBusy(false);
                      }
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Valider la sélection
                  </Button>
                )}
                {categories.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      aria-label="Catégorie pour le lot"
                      value={bulkCategoryId}
                      onChange={(e) => setBulkCategoryId(e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-zinc-700 dark:bg-[#121215]"
                    >
                      <option value="">Recatégoriser...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {bulkCategoryId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={bulkBusy}
                        onClick={async () => {
                          setBulkBusy(true);
                          try {
                            for (const id of selectedIds) {
                              await onUpdateTransaction(id, {
                                category_id: bulkCategoryId,
                              });
                            }
                            setBulkCategoryId("");
                            setSelectedIds([]);
                          } finally {
                            setBulkBusy(false);
                          }
                        }}
                      >
                        Appliquer
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="danger-outline"
                  disabled={bulkBusy}
                  onClick={() => setConfirmBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer ({selectedIds.length})
                </Button>
              </div>
            </div>
          )}

          {/* Vue Calendrier ou Vue Liste */}
          {displayMode === "calendar" ? (
            <div data-testid="timeline-calendar-view" className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-3 sm:p-5">
                  {/* Légende compacte */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-[11px] text-slate-500 dark:border-zinc-800/80 dark:text-zinc-400">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Revenu
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Dépense
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                        Virement
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        &lt; 0 €
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        0 – 50 €
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        50 – 100 €
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                        &gt; 100 €
                      </span>
                    </div>
                  </div>

                  {/* Grille ISO Lundi -> Dimanche */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {DAYS_FR.map((d) => (
                      <div
                        key={d}
                        className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500"
                      >
                        {d}
                      </div>
                    ))}
                    {calendarGrid.map((dayStr, idx) => {
                      if (!dayStr) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="min-h-[58px] rounded-lg bg-slate-50/40 sm:min-h-[78px] dark:bg-zinc-900/20"
                          />
                        );
                      }
                      const dayTxs = groupedByDate[dayStr] || [];
                      const hasTxs = dayTxs.length > 0;
                      const isToday = dayStr === getTodayIso();
                      const isSelected = dayStr === selectedCalendarDay;
                      const dayBalance = dailyBalancesMap[dayStr];
                      const balanceStatus =
                        hasTxs && dayBalance !== undefined
                          ? getBalanceStatus(dayBalance)
                          : undefined;
                      const dayNum = Number.parseInt(dayStr.split("-")[2], 10);

                      return (
                        <button
                          key={dayStr}
                          type="button"
                          data-testid={`calendar-day-${dayStr}`}
                          onClick={() =>
                            setSelectedCalendarDay(isSelected ? null : dayStr)
                          }
                          title={
                            dayBalance !== undefined && hasTxs
                              ? `Solde fin de journée : ${dayBalance.toFixed(2)} €`
                              : formatDateFr(dayStr)
                          }
                          className={cn(
                            "flex min-h-[58px] flex-col justify-between rounded-lg border p-1.5 text-left transition-all sm:min-h-[78px] sm:p-2",
                            balanceStatus
                              ? BALANCE_CELL_CLASSES[balanceStatus]
                              : "border-slate-200/80 bg-white hover:bg-slate-50 dark:border-zinc-800/80 dark:bg-[#121215] dark:hover:bg-zinc-900/60",
                            isToday &&
                              "ring-2 ring-violet-500/70 ring-offset-1 dark:ring-offset-[#121215]",
                            isSelected &&
                              "border-violet-600 ring-2 ring-violet-600 dark:border-violet-400 dark:ring-violet-400"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={cn(
                                "font-mono text-xs font-semibold tabular-money",
                                isToday
                                  ? "text-violet-600 dark:text-violet-400"
                                  : "text-slate-700 dark:text-zinc-200"
                              )}
                            >
                              {dayNum}
                            </span>
                            {balanceStatus && (
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  BALANCE_DOT_CLASSES[balanceStatus]
                                )}
                              />
                            )}
                          </div>

                          {/* Pastilles d'opérations du jour */}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {dayTxs.slice(0, 6).map((t) => {
                              const dotColor =
                                t.type === "INCOME"
                                  ? "bg-emerald-500"
                                  : t.type === "TRANSFER"
                                    ? "bg-violet-500"
                                    : "bg-rose-500";
                              return (
                                <span
                                  key={t.id}
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2",
                                    dotColor
                                  )}
                                  title={`${TRANSACTION_TYPE_LABELS[t.type]} : ${t.description}`}
                                />
                              );
                            })}
                            {dayTxs.length > 6 && (
                              <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400">
                                +{dayTxs.length - 6}
                              </span>
                            )}
                          </div>

                          {/* Mini aperçu solde fin de journée sur écran >= sm */}
                          {hasTxs && dayBalance !== undefined && (
                            <div className="mt-1 hidden truncate font-mono text-[10px] font-semibold text-slate-700 tabular-money sm:block dark:text-zinc-200">
                              <AmountDisplay amount={dayBalance} decimals={0} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Panneau du jour sélectionné */}
              {selectedCalendarDay && (
                <Card data-testid="calendar-day-panel">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800/80">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                          {formatDateFr(selectedCalendarDay)}
                        </h3>
                        {dailyBalancesMap[selectedCalendarDay] !==
                          undefined && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                              BALANCE_BADGE_CLASSES[
                                getBalanceStatus(
                                  dailyBalancesMap[selectedCalendarDay]
                                )
                              ]
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                BALANCE_DOT_CLASSES[
                                  getBalanceStatus(
                                    dailyBalancesMap[selectedCalendarDay]
                                  )
                                ]
                              )}
                            />
                            Solde fin de journée :{" "}
                            <AmountDisplay
                              amount={dailyBalancesMap[selectedCalendarDay]}
                            />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            openCreateTx(undefined, selectedCalendarDay)
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter ce jour
                        </Button>
                        <button
                          type="button"
                          onClick={() => setSelectedCalendarDay(null)}
                          aria-label="Fermer le panneau du jour"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {dailyBalancesMap[selectedCalendarDay] !== undefined &&
                      dailyBalancesMap[selectedCalendarDay] < 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Solde négatif :</strong> votre solde sera à{" "}
                            <strong>
                              <AmountDisplay
                                amount={dailyBalancesMap[selectedCalendarDay]}
                              />
                            </strong>{" "}
                            en fin de journée.
                          </span>
                        </div>
                      )}

                    {selectedDayTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          Aucune transaction prévue ce jour.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-3"
                          onClick={() =>
                            openCreateTx(undefined, selectedCalendarDay)
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter une transaction
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                        {selectedDayTransactions.map((tx) => {
                          const signedAmount =
                            tx.type === "EXPENSE"
                              ? -Math.abs(Number(tx.amount))
                              : Math.abs(Number(tx.amount));
                          const accLabel =
                            tx.account_name ||
                            accounts.find((a) => a.id === tx.account_id)
                              ?.name ||
                            "—";
                          const catLabel =
                            tx.category_name ||
                            categories.find((c) => c.id === tx.category_id)
                              ?.name;
                          const isProjected = tx.state === "PROJECTED";
                          const isPending = tx.state === "PENDING";

                          return (
                            <div
                              key={tx.id}
                              className={cn(
                                "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
                                isProjected && "opacity-70"
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                                    {tx.description}
                                  </span>
                                  <Badge variant={stateBadgeVariant(tx.state)}>
                                    {TRANSACTION_STATE_LABELS[tx.state]}
                                  </Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                                  {accLabel}
                                  {catLabel ? ` · ${catLabel}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <AmountDisplay
                                  amount={signedAmount}
                                  signed={tx.type !== "TRANSFER"}
                                  colored={tx.type !== "TRANSFER"}
                                  className="text-sm font-semibold"
                                />
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onValidateTransaction(tx.id)
                                    }
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/25 dark:text-amber-300"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Valider
                                  </button>
                                )}
                                <ActionMenu
                                  ariaLabel={`Actions pour ${tx.description}`}
                                  items={[
                                    ...(isPending
                                      ? [
                                          {
                                            label: "Ajuster / Reporter",
                                            icon: (
                                              <SlidersHorizontal className="h-3.5 w-3.5" />
                                            ),
                                            onClick: () => setValidatingTx(tx),
                                          },
                                        ]
                                      : []),
                                    {
                                      label: "Modifier",
                                      icon: <Edit3 className="h-3.5 w-3.5" />,
                                      onClick: () => openEditTx(tx),
                                    },
                                    {
                                      label: "Dupliquer",
                                      icon: <Copy className="h-3.5 w-3.5" />,
                                      onClick: () => openCreateTx(tx),
                                    },
                                    {
                                      label: "Supprimer",
                                      icon: <Trash2 className="h-3.5 w-3.5" />,
                                      variant: "danger",
                                      dividerBefore: true,
                                      onClick: () => setTxToDelete(tx),
                                    },
                                  ]}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : filteredTransactions.length === 0 ? (
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
              <div className="max-h-[68vh] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-[#16161A] dark:text-zinc-400">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label="Tout sélectionner"
                          checked={
                            filteredTransactions.length > 0 &&
                            selectedIds.length === filteredTransactions.length
                          }
                          onChange={(e) =>
                            setSelectedIds(
                              e.target.checked
                                ? filteredTransactions.map((t) => t.id)
                                : []
                            )
                          }
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-3 py-3 sm:px-4">Libellé</th>
                      <th className="hidden px-4 py-3 md:table-cell">Compte</th>
                      <th className="px-3 py-3 sm:px-4">État</th>
                      <th className="px-3 py-3 text-right sm:px-4">Montant</th>
                      <th className="px-3 py-3 text-right sm:px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                    {Object.keys(groupedByDate)
                      .sort((a, b) => b.localeCompare(a))
                      .map((dateKey) => {
                        const dayTxs = groupedByDate[dateKey] || [];
                        const dayBalance = dailyBalancesMap[dateKey];
                        const dayBalanceStatus =
                          dayBalance !== undefined
                            ? getBalanceStatus(dayBalance)
                            : undefined;

                        return (
                          <React.Fragment key={dateKey}>
                            {/* En-tête de journée (date + solde unique en fin de journée) */}
                            <tr className="border-t border-slate-200/80 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/70">
                              <td colSpan={6} className="px-3 py-2 sm:px-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-semibold text-slate-800 tabular-money dark:text-zinc-100">
                                      {formatDateFr(dateKey)}
                                    </span>
                                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                                      · {dayTxs.length}{" "}
                                      {dayTxs.length > 1
                                        ? "opérations"
                                        : "opération"}
                                    </span>
                                  </div>
                                  {dayBalance !== undefined &&
                                    dayBalanceStatus && (
                                      <span
                                        data-testid={`day-balance-${dateKey}`}
                                        title="Solde restant en fin de journée"
                                        className={cn(
                                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-money",
                                          BALANCE_BADGE_CLASSES[
                                            dayBalanceStatus
                                          ]
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "h-1.5 w-1.5 shrink-0 rounded-full",
                                            BALANCE_DOT_CLASSES[
                                              dayBalanceStatus
                                            ]
                                          )}
                                        />
                                        Solde :{" "}
                                        <AmountDisplay amount={dayBalance} />
                                      </span>
                                    )}
                                </div>
                              </td>
                            </tr>

                            {dayTxs.map((tx) => {
                              const signedAmount =
                                tx.type === "EXPENSE"
                                  ? -Math.abs(Number(tx.amount))
                                  : Math.abs(Number(tx.amount));
                              const accLabel =
                                tx.account_name ||
                                accounts.find((a) => a.id === tx.account_id)
                                  ?.name ||
                                "—";
                              const catLabel =
                                tx.category_name ||
                                categories.find((c) => c.id === tx.category_id)
                                  ?.name;

                              const isProjected = tx.state === "PROJECTED";
                              const isPending = tx.state === "PENDING";

                              return (
                                <tr
                                  key={tx.id}
                                  data-state={tx.state}
                                  className={cn(
                                    "transition-colors",
                                    isPending &&
                                      "border-l-[3px] border-l-amber-500 bg-amber-50/90 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/15",
                                    isProjected &&
                                      "bg-slate-50/60 opacity-60 hover:opacity-85 dark:bg-zinc-900/40",
                                    !isPending &&
                                      !isProjected &&
                                      "hover:bg-slate-50/80 dark:hover:bg-zinc-900/40"
                                  )}
                                >
                                  <td className="w-10 px-3 py-3">
                                    <input
                                      type="checkbox"
                                      aria-label={`Sélectionner ${tx.description}`}
                                      checked={selectedIds.includes(tx.id)}
                                      onChange={(e) =>
                                        setSelectedIds((prev) =>
                                          e.target.checked
                                            ? [...prev, tx.id]
                                            : prev.filter((id) => id !== tx.id)
                                        )
                                      }
                                      className="rounded border-slate-300"
                                    />
                                  </td>
                                  <td className="px-3 py-3 sm:px-4">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={cn(
                                          "font-medium",
                                          isProjected
                                            ? "italic text-slate-500 dark:text-zinc-400"
                                            : "text-slate-900 dark:text-zinc-100"
                                        )}
                                      >
                                        {tx.description}
                                      </span>
                                      {(tx.recurring_template_id ||
                                        tx.recurrence_frequency !== "NONE") && (
                                        <Badge variant="neutral">
                                          <Repeat className="h-3 w-3" />
                                          Récurrent
                                        </Badge>
                                      )}
                                      {tx.project_id && (
                                        <Link
                                          href={`/projects/${tx.project_id}`}
                                          title="Ouvrir le projet lié"
                                        >
                                          <Badge
                                            variant="info"
                                            className="cursor-pointer hover:opacity-85"
                                          >
                                            <Compass className="h-3 w-3" />
                                            {tx.project_name || "Projet"}
                                          </Badge>
                                        </Link>
                                      )}
                                      {tx.goal_id && (
                                        <Link
                                          href="/goals"
                                          title="Ouvrir l'objectif lié"
                                        >
                                          <Badge
                                            variant="success"
                                            className="cursor-pointer hover:opacity-85"
                                          >
                                            <Target className="h-3 w-3" />
                                            {tx.goal_name || "Objectif"}
                                          </Badge>
                                        </Link>
                                      )}
                                      {(tx.import_source === "open_banking" ||
                                        Boolean(tx.external_transaction_id) ||
                                        Boolean(
                                          tx.destination_external_transaction_id
                                        )) && (
                                        <Badge
                                          variant="info"
                                          title={
                                            tx.type === "TRANSFER"
                                              ? tx.external_transaction_id &&
                                                tx.destination_external_transaction_id
                                                ? "Virement synchronisé sur les 2 banques (source et destination)"
                                                : "Virement synchronisé sur 1 banque sur 2 (vous pouvez encore fusionner l'autre banque)"
                                              : "Opération synchronisée par Open Banking"
                                          }
                                        >
                                          <Landmark className="h-3 w-3" />
                                          {tx.type === "TRANSFER"
                                            ? tx.external_transaction_id &&
                                              tx.destination_external_transaction_id
                                              ? "Banque 2/2"
                                              : "Banque 1/2"
                                            : "Banque"}
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
                                  <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                                    <Badge
                                      variant={stateBadgeVariant(tx.state)}
                                      className={cn(
                                        isProjected && "border-dashed"
                                      )}
                                    >
                                      {TRANSACTION_STATE_LABELS[tx.state]}
                                    </Badge>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold sm:px-4">
                                    <AmountDisplay
                                      amount={signedAmount}
                                      signed={tx.type !== "TRANSFER"}
                                      colored={
                                        tx.type !== "TRANSFER" && !isProjected
                                      }
                                      className={cn(
                                        isProjected &&
                                          "text-slate-500 dark:text-zinc-400"
                                      )}
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                                    <div className="inline-flex items-center gap-1">
                                      {isPending && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onValidateTransaction(tx.id)
                                          }
                                          aria-label={`Valider ${tx.description}`}
                                          title="Valider l'opération"
                                          className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/25 dark:text-amber-300"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                          Valider
                                        </button>
                                      )}
                                      <ActionMenu
                                        ariaLabel={`Actions pour ${tx.description}`}
                                        items={[
                                          ...(isPending
                                            ? [
                                                {
                                                  label: "Ajuster / Reporter",
                                                  icon: (
                                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                                  ),
                                                  onClick: () =>
                                                    setValidatingTx(tx),
                                                },
                                              ]
                                            : []),
                                          ...(onMergeBankTransaction &&
                                          (tx.import_source === "open_banking" ||
                                            Boolean(
                                              tx.external_transaction_id
                                            ) ||
                                            Boolean(
                                              tx.destination_external_transaction_id
                                            )) &&
                                          !(
                                            tx.type === "TRANSFER" &&
                                            Boolean(
                                              tx.external_transaction_id
                                            ) &&
                                            Boolean(
                                              tx.destination_external_transaction_id
                                            )
                                          )
                                            ? [
                                                {
                                                  label:
                                                    "Fusionner avec une opération prévue",
                                                  icon: (
                                                    <GitMerge className="h-3.5 w-3.5" />
                                                  ),
                                                  onClick: () => {
                                                    setMergingTx(tx);
                                                    setMergeTargetId("");
                                                    setMergeSearch("");
                                                  },
                                                },
                                              ]
                                            : []),
                                          ...(onUnlinkBankTransaction &&
                                          (tx.import_source === "open_banking" ||
                                            Boolean(
                                              tx.external_transaction_id
                                            ) ||
                                            Boolean(
                                              tx.destination_external_transaction_id
                                            ))
                                            ? [
                                                {
                                                  label: "Délier de la banque",
                                                  icon: (
                                                    <Unlink className="h-3.5 w-3.5" />
                                                  ),
                                                  onClick: () =>
                                                    onUnlinkBankTransaction(
                                                      tx.id
                                                    ),
                                                },
                                              ]
                                            : []),
                                          {
                                            label: "Modifier",
                                            icon: (
                                              <Edit3 className="h-3.5 w-3.5" />
                                            ),
                                            onClick: () => openEditTx(tx),
                                          },
                                          {
                                            label: "Dupliquer",
                                            icon: (
                                              <Copy className="h-3.5 w-3.5" />
                                            ),
                                            onClick: () => openCreateTx(tx),
                                          },
                                          {
                                            label: "Supprimer",
                                            icon: (
                                              <Trash2 className="h-3.5 w-3.5" />
                                            ),
                                            variant: "danger",
                                            dividerBefore: true,
                                            onClick: () => setTxToDelete(tx),
                                          },
                                        ]}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
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
                <Button onClick={openCreateTemplate}>
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
                        {tpl.frequency === "WEEKLY" && tpl.day_of_week !== null
                          ? ` · ${WEEKDAYS[tpl.day_of_week]?.label ?? ""}`
                          : ""}
                        {tpl.frequency === "CUSTOM" && tpl.custom_days
                          ? ` · Tous les ${tpl.custom_days} j`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AmountDisplay
                        amount={
                          tpl.type === "EXPENSE"
                            ? -Math.abs(Number(tpl.amount))
                            : Math.abs(Number(tpl.amount))
                        }
                        signed
                        colored
                        className="mr-1.5 text-sm font-semibold"
                      />
                      <ActionMenu
                        ariaLabel={`Actions pour ${tpl.name}`}
                        items={[
                          ...(onUpdateTemplate
                            ? [
                                {
                                  label: "Modifier le modèle",
                                  icon: <Edit3 className="h-3.5 w-3.5" />,
                                  onClick: () => openEditTemplate(tpl),
                                },
                              ]
                            : []),
                          ...(onBulkUpdateTemplate || onBulkCancelTemplate
                            ? [
                                {
                                  label: "Actions en masse",
                                  icon: <Layers className="h-3.5 w-3.5" />,
                                  onClick: () => openBulkModal(tpl),
                                },
                              ]
                            : []),
                          {
                            label: "Supprimer le modèle",
                            icon: <Trash2 className="h-3.5 w-3.5" />,
                            variant: "danger",
                            dividerBefore: true,
                            onClick: () => setTplToDelete(tpl),
                          },
                        ]}
                      />
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
          {editingTx &&
            (editingTx.recurring_template_id ||
              editingTx.recurrence_frequency !== "NONE") && (
              <div className="flex items-start gap-2 rounded-lg border border-violet-300/60 bg-violet-50/70 px-3 py-2 text-xs text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Occurrence récurrente :</strong> la modification du
                  montant ou de la date s&apos;appliquera uniquement à cette
                  occurrence sans modifier le modèle récurrent.
                </span>
              </div>
            )}
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

      {/* Create / Edit Recurring Template Modal */}
      <Modal
        open={tplModalOpen}
        onClose={() => {
          setTplModalOpen(false);
          setEditingTpl(null);
        }}
        title={
          editingTpl
            ? "Modifier le modèle récurrent"
            : "Nouveau modèle récurrent"
        }
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
                disabled={Boolean(editingTpl)}
                onChange={(e) => setTplType(e.target.value as TransactionType)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-60 dark:border-zinc-800 dark:bg-[#121215]"
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
                min="0.01"
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
                disabled={Boolean(editingTpl)}
                onChange={(e) =>
                  setTplFreq(e.target.value as TemplateFrequency)
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-60 dark:border-zinc-800 dark:bg-[#121215]"
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
                disabled={Boolean(editingTpl)}
                value={tplStart}
                onChange={(e) => {
                  setTplStart(e.target.value);
                  const d = new Date(e.target.value);
                  if (!Number.isNaN(d.getTime())) {
                    setTplDayOfMonth(String(d.getDate()));
                  }
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-60 dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>

          {/* Conditional Recurrence Parameter */}
          {tplFreq === "WEEKLY" ? (
            <div>
              <label
                htmlFor="tpl-weekday"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Jour de la semaine
              </label>
              <select
                id="tpl-weekday"
                value={tplDayOfWeek}
                onChange={(e) => setTplDayOfWeek(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          ) : tplFreq === "CUSTOM" ? (
            <div>
              <label
                htmlFor="tpl-custom-days"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Intervalle personnalisé (en jours)
              </label>
              <input
                id="tpl-custom-days"
                type="number"
                min="1"
                max="365"
                required
                value={tplCustomDays}
                onChange={(e) => setTplCustomDays(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="tpl-day-of-month"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Jour du mois (1 à 31)
              </label>
              <input
                id="tpl-day-of-month"
                type="number"
                min="1"
                max="31"
                required
                value={tplDayOfMonth}
                onChange={(e) => setTplDayOfMonth(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tpl-account"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Compte source
              </label>
              <select
                id="tpl-account"
                required
                disabled={Boolean(editingTpl)}
                value={tplAccountId || accounts[0]?.id || ""}
                onChange={(e) => setTplAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-60 dark:border-zinc-800 dark:bg-[#121215]"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            {tplType === "TRANSFER" ? (
              <div>
                <label
                  htmlFor="tpl-dest-account"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Compte destinataire
                </label>
                <select
                  id="tpl-dest-account"
                  required
                  disabled={Boolean(editingTpl)}
                  value={tplDestAccountId}
                  onChange={(e) => setTplDestAccountId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-60 dark:border-zinc-800 dark:bg-[#121215]"
                >
                  <option value="">Choisir la destination</option>
                  {accounts
                    .filter((a) => a.id !== (tplAccountId || accounts[0]?.id))
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
                  {categories
                    .filter((c) => c.type === tplType)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
          {editingTpl && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-violet-300/60 bg-violet-50/70 px-3 py-2 text-xs font-medium text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              <input
                type="checkbox"
                checked={tplApplyToFuture}
                onChange={(e) => setTplApplyToFuture(e.target.checked)}
                className="rounded border-violet-300"
              />
              Appliquer aussi aux occurrences futures déjà planifiées (projetées)
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTplModalOpen(false);
                setEditingTpl(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingTpl ? "Enregistrer" : "Créer la récurrence"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Update / Cancel Occurrences Modal */}
      <Modal
        open={Boolean(bulkTpl)}
        onClose={() => setBulkTpl(null)}
        title={`Actions en masse — ${bulkTpl?.name ?? ""}`}
        description="Modifiez le montant ou annulez temporairement les occurrences futures sur une période."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSubmitBulk} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setBulkMode("update")}
              className={cn(
                "rounded-md py-1.5 transition-colors",
                bulkMode === "update"
                  ? "bg-white font-semibold text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-violet-400"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              Ajuster le montant
            </button>
            <button
              type="button"
              onClick={() => setBulkMode("cancel")}
              className={cn(
                "rounded-md py-1.5 transition-colors",
                bulkMode === "cancel"
                  ? "bg-white font-semibold text-rose-600 shadow-xs dark:bg-zinc-800 dark:text-rose-400"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              Annuler la période
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="bulk-start"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Du
              </label>
              <input
                id="bulk-start"
                type="date"
                required
                value={bulkStart}
                onChange={(e) => setBulkStart(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <div>
              <label
                htmlFor="bulk-end"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Au
              </label>
              <input
                id="bulk-end"
                type="date"
                required
                value={bulkEnd}
                onChange={(e) => setBulkEnd(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>

          {bulkMode === "update" && (
            <div>
              <label
                htmlFor="bulk-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Nouveau montant (€)
              </label>
              <input
                id="bulk-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBulkTpl(null)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant={bulkMode === "cancel" ? "danger" : "primary"}
              disabled={submitting}
            >
              {bulkMode === "cancel"
                ? "Annuler les occurrences"
                : "Appliquer le montant"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Validation / Adjust / Postpone Modal */}
      <ValidationModal
        transaction={validatingTx}
        onClose={() => setValidatingTx(null)}
        onValidate={onValidateTransaction}
        onPostpone={onPostponeTransaction}
        onCancelTransaction={onCancelTransaction}
      />

      {/* Merge Bank Transaction into Planned Transaction Modal */}
      <Modal
        open={Boolean(mergingTx)}
        onClose={() => setMergingTx(null)}
        title="Fusionner avec une opération déjà prévue"
        description="Reliez cette écriture bancaire à une opération existante (ex. salaire ou échéance arrivée plus tôt ou avec un montant différent)."
        maxWidthClass="max-w-lg"
      >
        {mergingTx &&
          (() => {
            const byId = new Map<string, Transaction>();
            for (const t of allTransactions ?? []) {
              byId.set(t.id, t);
            }
            for (const t of transactions) {
              byId.set(t.id, t);
            }
            const accountsById = new Map(accounts.map((a) => [a.id, a]));
            const pool = Array.from(byId.values());
            const q = mergeSearch.trim().toLowerCase();
            const qNormalized = q.replace(",", ".");
            const mergingAbs = Math.abs(Number(mergingTx.amount));
            const mergingDateMs = new Date(
              `${mergingTx.transaction_date}T00:00:00`
            ).getTime();

            const getDaysDiff = (isoDate: string) => {
              const ms = new Date(`${isoDate}T00:00:00`).getTime();
              return Math.round(Math.abs(ms - mergingDateMs) / 86_400_000);
            };

            const isInterbankPair = (t: Transaction) =>
              t.account_id !== mergingTx.account_id &&
              ((mergingTx.type === "EXPENSE" && t.type === "INCOME") ||
                (mergingTx.type === "INCOME" && t.type === "EXPENSE"));

            const isCompatibleTarget = (t: Transaction) => {
              // 1. Virement interne existant (accepte 2 jambes : source + destination)
              if (t.type === "TRANSFER") {
                if (mergingTx.type === "EXPENSE") {
                  return (
                    !t.external_transaction_id &&
                    t.destination_account_id !== mergingTx.account_id
                  );
                }
                if (mergingTx.type === "INCOME") {
                  return (
                    !t.destination_external_transaction_id &&
                    (t.destination_account_id === mergingTx.account_id ||
                      t.account_id !== mergingTx.account_id)
                  );
                }
                return false;
              }
              // 2. Paire de virement inter-banques (débit SG + crédit BNP) -> conversion en 1 TRANSFER 2/2
              if (isInterbankPair(t)) {
                return true;
              }
              // 3. Fusion classique même type sur opération non encore liée
              return t.type === mergingTx.type && !t.external_transaction_id;
            };

            const scoreCandidate = (t: Transaction) => {
              const daysDiff = getDaysDiff(t.transaction_date);
              const sameAmount =
                Math.abs(Math.abs(Number(t.amount)) - mergingAbs) < 0.005;
              const sameAccount =
                t.account_id === mergingTx.account_id ||
                t.destination_account_id === mergingTx.account_id;
              const interbank = isInterbankPair(t);
              const isPlanned = t.state !== "REALIZED";

              let tier = 5;
              if (sameAmount && (sameAccount || interbank) && daysDiff <= 7) {
                tier = 0;
              } else if (sameAmount && daysDiff <= 15) {
                tier = 1;
              } else if (isPlanned && sameAccount && daysDiff <= 35) {
                tier = 2;
              } else if (sameAccount && daysDiff <= 14) {
                tier = 3;
              } else if (isPlanned) {
                tier = 4;
              }

              return {
                tier,
                plannedRank: isPlanned ? 0 : 1,
                daysDiff,
                isProbable: tier === 0,
                isInterbank: interbank,
              };
            };

            const candidates = pool
              .filter(
                (t) =>
                  !t.deleted_at &&
                  t.id !== mergingTx.id &&
                  isCompatibleTarget(t)
              )
              .filter((t) => {
                if (!q) return true;
                const [y, m, d] = t.transaction_date.split("-");
                const frNumericDate = d && m && y ? `${d}/${m}/${y}` : "";
                const frShortDate = d && m ? `${d}/${m}` : "";
                const amountAbs = Math.abs(Number(t.amount));
                const amountDot = amountAbs.toFixed(2);
                const amountComma = amountDot.replace(".", ",");
                const amountRaw = String(amountAbs);
                const accName = (
                  accountsById.get(t.account_id)?.name ?? ""
                ).toLowerCase();
                const destAccName = t.destination_account_id
                  ? (
                      accountsById.get(t.destination_account_id)?.name ?? ""
                    ).toLowerCase()
                  : "";
                return (
                  t.description.toLowerCase().includes(q) ||
                  t.transaction_date.includes(q) ||
                  frNumericDate.includes(q) ||
                  frShortDate.includes(q) ||
                  formatDateFr(t.transaction_date).toLowerCase().includes(q) ||
                  amountDot.includes(qNormalized) ||
                  amountComma.includes(q) ||
                  amountRaw.includes(qNormalized) ||
                  accName.includes(q) ||
                  destAccName.includes(q)
                );
              })
              .map((t) => ({ tx: t, score: scoreCandidate(t) }))
              .sort((a, b) => {
                if (a.score.tier !== b.score.tier) {
                  return a.score.tier - b.score.tier;
                }
                if (a.score.daysDiff !== b.score.daysDiff) {
                  return a.score.daysDiff - b.score.daysDiff;
                }
                if (a.score.plannedRank !== b.score.plannedRank) {
                  return a.score.plannedRank - b.score.plannedRank;
                }
                return b.tx.transaction_date.localeCompare(
                  a.tx.transaction_date
                );
              })
              .slice(0, 50);

            return (
              <div className="space-y-4">
                <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.05] p-3.5 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-zinc-100">
                    Écriture bancaire (référence) : {mergingTx.description}
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-zinc-400">
                    Date banque :{" "}
                    <strong>{formatDateFr(mergingTx.transaction_date)}</strong>{" "}
                    · Montant banque :{" "}
                    <AmountDisplay
                      amount={
                        mergingTx.type === "EXPENSE"
                          ? -Math.abs(Number(mergingTx.amount))
                          : Math.abs(Number(mergingTx.amount))
                      }
                      signed
                      colored
                      className="font-semibold"
                    />
                  </p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                    placeholder="Rechercher par libellé, montant (ex. 95) ou date (ex. 19/11)..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs dark:border-zinc-800 dark:bg-[#121215]"
                  />
                </div>

                {candidates.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                    Aucune opération compatible trouvée à fusionner.
                  </p>
                ) : (
                  <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {candidates.map(({ tx: cand, score }) => {
                      const selected = mergeTargetId === cand.id;
                      const candAccountName = accountsById.get(
                        cand.account_id
                      )?.name;
                      const signedCandAmount =
                        cand.type === "EXPENSE" ||
                        (cand.type === "TRANSFER" &&
                          cand.account_id === mergingTx.account_id)
                          ? -Math.abs(Number(cand.amount))
                          : Math.abs(Number(cand.amount));
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => setMergeTargetId(cand.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors",
                            selected
                              ? "bg-violet-500/10 ring-1 ring-inset ring-violet-500/40"
                              : "hover:bg-slate-50 dark:hover:bg-zinc-900"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate font-semibold text-slate-900 dark:text-zinc-100">
                                {cand.description}
                              </span>
                              <Badge variant={stateBadgeVariant(cand.state)}>
                                {TRANSACTION_STATE_LABELS[cand.state]}
                              </Badge>
                              {cand.type === "TRANSFER" && (
                                <Badge variant="neutral">
                                  {cand.external_transaction_id ||
                                  cand.destination_external_transaction_id
                                    ? "Virement (1/2 lié)"
                                    : "Virement"}
                                </Badge>
                              )}
                              {score.isInterbank && (
                                <Badge variant="warning">
                                  Virement inter-banques
                                </Badge>
                              )}
                              {score.isProbable && (
                                <Badge variant="info">
                                  Correspondance probable
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                              {cand.state === "REALIZED" ? "Le" : "Prévue le"}{" "}
                              {formatDateFr(cand.transaction_date)}
                              {candAccountName ? ` · ${candAccountName}` : ""}
                            </p>
                          </div>
                          <AmountDisplay
                            amount={signedCandAmount}
                            signed={cand.type !== "TRANSFER"}
                            className="shrink-0 font-semibold text-slate-700 dark:text-zinc-200"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  L&apos;opération sélectionnée sera mise à jour avec le{" "}
                  <strong>montant exact de la banque</strong> et sa{" "}
                  <strong>date réelle</strong>, passera en{" "}
                  <strong>Réalisée</strong>, conservera ses liens (récurrence,
                  projet, objectif), et le doublon importé sera supprimé.
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMergingTx(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    disabled={!mergeTargetId || mergingBusy}
                    onClick={async () => {
                      if (!mergeTargetId || !onMergeBankTransaction) return;
                      setMergingBusy(true);
                      try {
                        await onMergeBankTransaction(
                          mergingTx.id,
                          mergeTargetId
                        );
                        setMergingTx(null);
                      } finally {
                        setMergingBusy(false);
                      }
                    }}
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    {mergingBusy ? "Fusion..." : "Fusionner et valider"}
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* Delete Confirmations */}
      <ConfirmDialog
        open={Boolean(txToDelete)}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleConfirmDeleteTx}
        loading={deleting}
        title="Supprimer cette transaction ?"
        description={
          txToDelete
            ? `La transaction « ${txToDelete.description} » sera déplacée vers la corbeille.`
            : ""
        }
        confirmLabel="Déplacer vers la corbeille"
      />

      <ConfirmDialog
        open={Boolean(tplToDelete)}
        onClose={() => setTplToDelete(null)}
        onConfirm={handleConfirmDeleteTpl}
        loading={deleting}
        title="Supprimer ce modèle récurrent ?"
        description={
          tplToDelete
            ? `Le modèle « ${tplToDelete.name} » et ses occurrences futures non réalisées seront supprimés.`
            : ""
        }
        confirmLabel="Supprimer le modèle"
      />

      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
        onConfirm={async () => {
          setBulkBusy(true);
          try {
            for (const id of selectedIds) {
              await onDeleteTransaction(id);
            }
            setSelectedIds([]);
            setConfirmBulkDeleteOpen(false);
          } finally {
            setBulkBusy(false);
          }
        }}
        loading={bulkBusy}
        title={`Supprimer ${selectedIds.length} transaction(s) ?`}
        description="Les opérations sélectionnées seront déplacées vers la corbeille."
        confirmLabel="Déplacer vers la corbeille"
      />
    </div>
  );
}
