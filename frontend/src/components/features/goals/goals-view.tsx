"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Edit3,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { cn, formatDateFr, getTodayIso } from "@/lib/utils";
import type { Account } from "@/types/account";
import type { Goal, GoalCreate, GoalType, GoalUpdate } from "@/types/goal";
import type { SafeToSpendData } from "@/types/projection";
import type { Transaction } from "@/types/transaction";

interface GoalsViewProps {
  isLoading: boolean;
  goals: Goal[];
  accounts: Account[];
  safeToSpend: SafeToSpendData | null;
  isInCouple?: boolean;
  selectedGoalTransactions?: Transaction[];
  loadingGoalTransactions?: boolean;
  onSelectGoalForDetail?: (goal: Goal | null) => void;
  onCreateGoal: (payload: GoalCreate) => Promise<void> | void;
  onUpdateGoal: (
    id: string,
    payload: GoalUpdate,
    currentAmount?: number
  ) => Promise<void> | void;
  onDeleteGoal: (id: string) => Promise<void> | void;
  onRecordContributionTx?: (payload: {
    goal: Goal;
    amount: number;
    date: string;
    description: string;
    accountId: string;
    destinationAccountId?: string;
  }) => Promise<void> | void;
  onDeleteContributionTx?: (txId: string) => Promise<void> | void;
  defaultOpenCreate?: boolean;
}

export function GoalsSkeleton() {
  return (
    <div data-testid="goals-skeleton" className="space-y-6">
      <Skeleton className="h-24 rounded-xl" />
      <div className="flex justify-between">
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function GoalsView({
  isLoading,
  goals,
  accounts,
  safeToSpend,
  isInCouple = false,
  selectedGoalTransactions = [],
  loadingGoalTransactions = false,
  onSelectGoalForDetail,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  onRecordContributionTx,
  onDeleteContributionTx,
  defaultOpenCreate = false,
}: GoalsViewProps) {
  // Dialog création / édition (processus exact de l'ancien GoalDialog)
  const [dialogOpen, setDialogOpen] = useState(defaultOpenCreate);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalType, setGoalType] = useState<GoalType>("personal");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasTargetAmount, setHasTargetAmount] = useState(true);
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [startDate, setStartDate] = useState(getTodayIso());
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");

  // Modale détail & versements (processus exact de l'ancien GoalDetailModal)
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);
  const [showAddTx, setShowAddTx] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(getTodayIso());
  const [txDescription, setTxDescription] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txDestAccountId, setTxDestAccountId] = useState("");
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState(false);

  if (isLoading) return <GoalsSkeleton />;

  const openCreateDialog = () => {
    setEditingGoal(null);
    setGoalType("personal");
    setName("");
    setDescription("");
    setHasTargetAmount(true);
    setTargetAmount("");
    setCurrentAmount("0");
    setMonthlyContribution("");
    setStartDate(getTodayIso());
    setTargetDate("");
    setAccountId("");
    setDestinationAccountId("");
    setDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalType(goal.user_id ? "personal" : "household");
    setName(goal.name);
    setDescription(goal.description || "");
    setHasTargetAmount(
      goal.target_amount !== null && goal.target_amount !== undefined
    );
    setTargetAmount(goal.target_amount ? String(goal.target_amount) : "");
    setCurrentAmount(String(goal.current_amount ?? 0));
    setMonthlyContribution(
      goal.monthly_contribution ? String(goal.monthly_contribution) : ""
    );
    setStartDate(getTodayIso());
    setTargetDate(goal.target_date ? goal.target_date.slice(0, 10) : "");
    setAccountId(goal.account_id || "");
    setDestinationAccountId(goal.destination_account_id || "");
    setDialogOpen(true);
  };

  const openDetailModal = (goal: Goal) => {
    setDetailGoal(goal);
    setShowAddTx(false);
    setTxAmount("");
    setTxDate(getTodayIso());
    setTxDescription("");
    setTxAccountId(goal.account_id || accounts[0]?.id || "");
    setTxDestAccountId(goal.destination_account_id || "");
    onSelectGoalForDetail?.(goal);
  };

  const closeDetailModal = () => {
    setDetailGoal(null);
    onSelectGoalForDetail?.(null);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const currentVal = Number.parseFloat(currentAmount || "0") || 0;
    const parsedTarget =
      hasTargetAmount && targetAmount
        ? Number.parseFloat(targetAmount)
        : undefined;
    const targetVal =
      parsedTarget !== undefined && !Number.isNaN(parsedTarget) && parsedTarget > 0
        ? parsedTarget
        : undefined;
    const parsedMonthly = monthlyContribution
      ? Number.parseFloat(monthlyContribution)
      : undefined;
    const monthlyVal =
      parsedMonthly !== undefined && !Number.isNaN(parsedMonthly) && parsedMonthly > 0
        ? parsedMonthly
        : undefined;

    if (editingGoal) {
      await onUpdateGoal(
        editingGoal.id,
        {
          name: name.trim(),
          description: description.trim() || null,
          target_amount: targetVal ?? null,
          monthly_contribution: monthlyVal ?? null,
          target_date: targetDate || null,
          account_id: accountId || null,
          destination_account_id: destinationAccountId || null,
        },
        currentVal
      );
    } else {
      await onCreateGoal({
        goal_type: goalType,
        name: name.trim(),
        description: description.trim() || undefined,
        target_amount: targetVal,
        current_amount: currentVal,
        monthly_contribution: monthlyVal,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        account_id: accountId || undefined,
        destination_account_id: destinationAccountId || undefined,
      });
    }
    setDialogOpen(false);
  };

  const handleSubmitContributionTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailGoal || !txAmount || !onRecordContributionTx) return;
    const numericAmount = Number.parseFloat(txAmount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) return;

    await onRecordContributionTx({
      goal: detailGoal,
      amount: numericAmount,
      date: txDate,
      description: txDescription.trim() || `Versement ${detailGoal.name}`,
      accountId: txAccountId || detailGoal.account_id || accounts[0]?.id || "",
      destinationAccountId: txDestAccountId || undefined,
    });
    setShowAddTx(false);
    setTxAmount("");
    setTxDescription("");
  };

  return (
    <div className="space-y-6">
      {/* Top Safe-to-Spend Strip (disposition identique à l'ancien SavingsGoalsSection) */}
      {safeToSpend && (
        <Card className="border-violet-500/25 bg-violet-500/[0.04] dark:bg-violet-500/[0.07]">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/15 text-violet-600 dark:text-violet-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Reste à vivre disponible pour épargner
                </p>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-2.5">
                  <AmountDisplay
                    amount={safeToSpend.safe_to_spend}
                    className="text-xl font-semibold text-slate-900 dark:text-zinc-50"
                  />
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    jusqu&apos;au {formatDateFr(safeToSpend.horizon_date)} (J+
                    {safeToSpend.days_until_next_income})
                  </span>
                </div>
              </div>
            </div>
            <Link href="/projects">
              <Button variant="secondary" size="sm">
                <Compass className="h-3.5 w-3.5 text-violet-500" />
                Simuler un projet
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
              Objectifs d&apos;épargne & Cagnottes
            </h1>
            <Badge variant="info">{goals.length}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Créez des cagnottes libres ou fixez des objectifs chiffrés pour
            piloter votre épargne personnelle ou commune.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nouvel objectif
        </Button>
      </div>

      {/* Grid of Goals (disposition 3 colonnes de l'ancien SavingsGoalsSection) */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="Aucun objectif d'épargne pour le moment"
          description="Créez une cagnotte libre ou fixez-vous un montant cible pour concrétiser vos projets financiers."
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Créer un objectif
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const target =
              goal.target_amount && Number(goal.target_amount) > 0
                ? Number(goal.target_amount)
                : null;
            const current = Number(goal.current_amount || 0);
            const progress =
              target !== null
                ? Math.min(100, Math.round((current / target) * 100))
                : null;

            return (
              <Card
                key={goal.id}
                className="cursor-pointer transition-colors hover:border-violet-500/50"
                onClick={() => openDetailModal(goal)}
              >
                <CardContent className="flex h-full flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge variant={goal.user_id ? "neutral" : "info"}>
                        {goal.user_id ? "Personnel" : "Foyer"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                        Détails
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>

                    <h2 className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
                      {goal.name}
                    </h2>
                    {goal.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-zinc-400">
                        {goal.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                      <AmountDisplay
                        amount={current}
                        decimals={0}
                        className="text-xl font-semibold text-slate-900 dark:text-zinc-50"
                      />
                      {target !== null ? (
                        <span className="text-xs text-slate-500 dark:text-zinc-400">
                          sur <AmountDisplay amount={target} decimals={0} />
                        </span>
                      ) : (
                        <Badge variant="neutral">Épargne libre</Badge>
                      )}
                    </div>

                    {progress !== null && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                          <span>Progression</span>
                          <span className="font-mono tabular-money">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              progress >= 100
                                ? "bg-emerald-500"
                                : "bg-violet-600"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta Footer (Prélèvement + Échéance) */}
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-zinc-800/80">
                    <div>
                      <span className="block text-[11px] text-slate-500 dark:text-zinc-400">
                        Prélèvement
                      </span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200">
                        {goal.monthly_contribution ? (
                          <>
                            <AmountDisplay
                              amount={Number(goal.monthly_contribution)}
                              decimals={0}
                            />{" "}
                            / mois
                          </>
                        ) : (
                          "Libre"
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-500 dark:text-zinc-400">
                        Échéance
                      </span>
                      <span className="font-mono font-medium text-slate-800 tabular-money dark:text-zinc-200">
                        {goal.target_date
                          ? formatDateFr(goal.target_date)
                          : "Libre"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Goal (processus exact de GoalDialog) */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={
          editingGoal
            ? "Modifier l'épargne / objectif"
            : "Nouvel objectif ou épargne"
        }
        description="Définissez une cagnotte libre ou un montant cible avec prélèvement programmé."
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          {!editingGoal && isInCouple && (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              {(["personal", "household"] as GoalType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setGoalType(t)}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-semibold transition-colors",
                    goalType === t
                      ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-slate-600 dark:text-zinc-400"
                  )}
                >
                  {t === "personal" ? "Personnel" : "Commun (Foyer)"}
                </button>
              ))}
            </div>
          )}

          <div>
            <label
              htmlFor="goal-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom de l&apos;objectif
            </label>
            <input
              id="goal-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Fonds de sécurité, Apport immobilier"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>

          <div>
            <label
              htmlFor="goal-desc"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Description (optionnel)
            </label>
            <textarea
              id="goal-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hasTargetAmount}
              onChange={(e) => setHasTargetAmount(e.target.checked)}
              className="rounded border-slate-300"
            />
            Fixer un montant cible (décocher pour une épargne libre)
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hasTargetAmount && (
              <div>
                <label
                  htmlFor="goal-target"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Montant cible (€)
                </label>
                <input
                  id="goal-target"
                  type="number"
                  step="0.01"
                  required={hasTargetAmount}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="goal-current"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Montant déjà épargné (€)
              </label>
              <input
                id="goal-current"
                type="number"
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="goal-monthly"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Prélèvement mensuel (€)
              </label>
              <input
                id="goal-monthly"
                type="number"
                step="0.01"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="Ex. 200"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <div>
              <label
                htmlFor="goal-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date cible (optionnel)
              </label>
              <input
                id="goal-date"
                type="date"
                min={editingGoal ? undefined : getTodayIso()}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>

          {accounts.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="goal-src-acc"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Compte source
                </label>
                <select
                  id="goal-src-acc"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                >
                  <option value="">Aucun</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="goal-dst-acc"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Compte d&apos;épargne (destination)
                </label>
                <select
                  id="goal-dst-acc"
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                >
                  <option value="">Aucun</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">
              {editingGoal ? "Enregistrer" : "Créer l'objectif"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Goal Detail & Versements (processus exact de GoalDetailModal) */}
      <Modal
        open={Boolean(detailGoal)}
        onClose={closeDetailModal}
        title={detailGoal?.name ?? ""}
        description={detailGoal?.description ?? undefined}
        maxWidthClass="max-w-xl"
      >
        {detailGoal && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Épargne accumulée
                </span>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-zinc-50">
                  <AmountDisplay amount={Number(detailGoal.current_amount)} />
                  {detailGoal.target_amount ? (
                    <span className="ml-2 text-xs font-normal text-slate-500 dark:text-zinc-400">
                      /{" "}
                      <AmountDisplay amount={Number(detailGoal.target_amount)} />
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const g = detailGoal;
                    closeDetailModal();
                    openEditDialog(g);
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="danger-outline"
                  onClick={() => {
                    const g = detailGoal;
                    closeDetailModal();
                    setGoalToDelete(g);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </Button>
              </div>
            </div>

            {/* Versement form toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Historique des versements ({selectedGoalTransactions.length})
              </h3>
              {onRecordContributionTx && (
                <Button
                  size="sm"
                  variant={showAddTx ? "secondary" : "primary"}
                  onClick={() => setShowAddTx((prev) => !prev)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showAddTx ? "Fermer" : "Enregistrer un versement"}
                </Button>
              )}
            </div>

            {showAddTx && (
              <form
                onSubmit={handleSubmitContributionTx}
                className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="gtx-amount"
                      className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                    >
                      Montant (€)
                    </label>
                    <input
                      id="gtx-amount"
                      type="number"
                      step="0.01"
                      required
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="gtx-date"
                      className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                    >
                      Date
                    </label>
                    <input
                      id="gtx-date"
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="gtx-desc"
                    className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                  >
                    Libellé
                  </label>
                  <input
                    id="gtx-desc"
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder={`Versement ${detailGoal.name}`}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                  />
                </div>
                {accounts.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="gtx-src"
                        className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                      >
                        Compte source
                      </label>
                      <select
                        id="gtx-src"
                        value={txAccountId}
                        onChange={(e) => setTxAccountId(e.target.value)}
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
                        htmlFor="gtx-dst"
                        className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                      >
                        Vers compte épargne (optionnel)
                      </label>
                      <select
                        id="gtx-dst"
                        value={txDestAccountId}
                        onChange={(e) => setTxDestAccountId(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                      >
                        <option value="">Dépense directe</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    Valider le versement
                  </Button>
                </div>
              </form>
            )}

            {/* Liste des transactions liées à l'objectif */}
            {loadingGoalTransactions ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : selectedGoalTransactions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                Aucun versement enregistré pour cet objectif.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                {selectedGoalTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-zinc-100">
                        {tx.description}
                      </p>
                      <p className="text-slate-500 dark:text-zinc-400">
                        {formatDateFr(tx.transaction_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AmountDisplay
                        amount={Math.abs(Number(tx.amount))}
                        className="font-semibold text-emerald-600 dark:text-emerald-400"
                      />
                      {onDeleteContributionTx && (
                        <button
                          type="button"
                          onClick={() => onDeleteContributionTx(tx.id)}
                          aria-label={`Supprimer le versement ${tx.description}`}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-rose-500/10 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(goalToDelete)}
        onClose={() => setGoalToDelete(null)}
        onConfirm={async () => {
          if (!goalToDelete) return;
          setDeletingGoal(true);
          try {
            await onDeleteGoal(goalToDelete.id);
            setGoalToDelete(null);
          } finally {
            setDeletingGoal(false);
          }
        }}
        loading={deletingGoal}
        title="Supprimer cet objectif ?"
        description={
          goalToDelete
            ? `L'objectif « ${goalToDelete.name} » et ses échéances prévisionnelles futures seront supprimés.`
            : ""
        }
        confirmLabel="Supprimer l'objectif"
      />
    </div>
  );
}
