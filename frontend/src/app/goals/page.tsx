"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { GoalsView } from "@/components/features/goals/goals-view";
import { goalService } from "@/services/goal-service";
import { accountService } from "@/services/account-service";
import { projectionService } from "@/services/projection-service";
import { transactionService } from "@/services/transaction-service";
import { useAuthStore } from "@/stores/auth-store";
import type { Goal, GoalCreate, GoalUpdate } from "@/types/goal";
import type { PurchaseSimulationPayload } from "@/types/projection";

function GoalsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => goalService.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountService.list(),
  });

  const { data: safeToSpend = null } = useQuery({
    queryKey: ["safe-to-spend"],
    queryFn: () => projectionService.getSafeToSpend().catch(() => null),
  });

  const {
    data: selectedGoalTransactions = [],
    isLoading: loadingGoalTransactions,
  } = useQuery({
    queryKey: ["goal-transactions", selectedGoal?.id],
    queryFn: () =>
      selectedGoal ? goalService.getTransactions(selectedGoal.id) : [],
    enabled: Boolean(selectedGoal?.id),
  });

  const refreshGoals = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["goal-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handleCreateGoal = async (payload: GoalCreate) => {
    if (!user) return;
    try {
      await goalService.create(payload, {
        userId: user.id,
        householdId: user.household_id,
      });
      toast.success(`Objectif « ${payload.name} » créé`);
      await refreshGoals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    }
  };

  const handleUpdateGoal = async (
    id: string,
    payload: GoalUpdate,
    currentAmount?: number
  ) => {
    try {
      await goalService.update(id, payload);
      if (currentAmount !== undefined) {
        await goalService.setContribution(id, currentAmount);
      }
      toast.success("Objectif mis à jour");
      await refreshGoals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await goalService.remove(id);
      toast.success("Objectif supprimé");
      await refreshGoals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleRecordContributionTx = async (params: {
    goal: Goal;
    amount: number;
    date: string;
    description: string;
    accountId: string;
    destinationAccountId?: string;
  }) => {
    try {
      const isTransfer = Boolean(params.destinationAccountId);
      await transactionService.create({
        amount: isTransfer ? params.amount : -Math.abs(params.amount),
        description: params.description,
        transaction_date: params.date,
        type: isTransfer ? "TRANSFER" : "EXPENSE",
        account_id: params.accountId,
        destination_account_id: isTransfer
          ? params.destinationAccountId
          : undefined,
        goal_id: params.goal.id,
      });
      toast.success("Versement enregistré");
      await refreshGoals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Versement impossible");
    }
  };

  const handleDeleteContributionTx = async (txId: string) => {
    try {
      await transactionService.remove(txId);
      toast.success("Versement retiré");
      await refreshGoals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleSimulatePurchase = async (payload: PurchaseSimulationPayload) => {
    try {
      return await projectionService.simulatePurchase(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation impossible");
      throw err;
    }
  };

  const handleCommitSimulation = async (payload: PurchaseSimulationPayload) => {
    try {
      await projectionService.commitSimulation(payload);
      toast.success("Simulation intégrée dans vos objectifs et votre timeline");
      await Promise.all([
        refreshGoals(),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["projections"] }),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible d'intégrer la simulation"
      );
      throw err;
    }
  };

  return (
    <AppShell activePath="/goals">
      <GoalsView
        isLoading={isLoading}
        goals={goals}
        accounts={accounts}
        safeToSpend={safeToSpend}
        isInCouple={Boolean(user?.is_in_couple)}
        selectedGoalTransactions={selectedGoalTransactions}
        loadingGoalTransactions={loadingGoalTransactions}
        onSelectGoalForDetail={setSelectedGoal}
        onCreateGoal={handleCreateGoal}
        onUpdateGoal={handleUpdateGoal}
        onDeleteGoal={handleDeleteGoal}
        onRecordContributionTx={handleRecordContributionTx}
        onDeleteContributionTx={handleDeleteContributionTx}
        onSimulatePurchase={handleSimulatePurchase}
        onCommitSimulation={handleCommitSimulation}
        defaultOpenCreate={searchParams.get("new") === "1"}
      />
    </AppShell>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsContent />
    </Suspense>
  );
}
