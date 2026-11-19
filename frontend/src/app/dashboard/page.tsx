"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  DashboardView,
  type DashboardData,
} from "@/components/features/dashboard/dashboard-view";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { transactionService } from "@/services/transaction-service";
import { projectionService } from "@/services/projection-service";
import { householdService } from "@/services/household-service";
import { exportService } from "@/services/export-service";
import { getMonthDateRange } from "@/lib/utils";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", currentYear, currentMonth],
    queryFn: async () => {
      const { startDate, endDate } = getMonthDateRange(
        currentYear,
        currentMonth
      );
      const endProjDate = new Date(currentYear, currentMonth + 4, 1);

      const [
        totalBalanceRes,
        accounts,
        categories,
        monthTransactions,
        pendingTransactions,
        safeToSpend,
        wallets,
        projections,
      ] = await Promise.all([
        accountService.getTotalBalance().catch(() => ({
          total_balance: 0,
          accounts_count: 0,
          accounts: [],
        })),
        accountService.list().catch(() => []),
        categoryService.list().catch(() => []),
        transactionService
          .list({ start_date: startDate, end_date: endDate })
          .catch(() => []),
        transactionService.listPending().catch(() => []),
        projectionService.getSafeToSpend().catch(() => null),
        householdService.getWallets().catch(() => null),
        projectionService
          .getRange(
            currentYear,
            currentMonth,
            endProjDate.getFullYear(),
            endProjDate.getMonth() + 1
          )
          .catch(() => []),
      ]);

      return {
        totalBalance: totalBalanceRes.total_balance,
        accounts,
        categories,
        monthTransactions,
        pendingTransactions,
        safeToSpend,
        wallets,
        projections,
      };
    },
  });

  const refreshDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["project-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["project-simulation"] }),
    ]);
  };

  const handleValidatePending = async (id: string, newAmount?: number) => {
    try {
      await transactionService.validate(id, newAmount);
      toast.success(
        newAmount !== undefined
          ? "Transaction validée avec le montant ajusté"
          : "Transaction validée"
      );
      await refreshDashboard();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de valider l'opération"
      );
    }
  };

  const handlePostponePending = async (id: string, newDate: string) => {
    try {
      await transactionService.postpone(id, newDate);
      toast.success("Transaction reportée");
      await refreshDashboard();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de reporter l'opération"
      );
    }
  };

  const handleCancelPending = async (id: string) => {
    try {
      await transactionService.cancel(id);
      toast.success("Échéance annulée");
      await refreshDashboard();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'annuler l'opération"
      );
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportService.exportMonthlyPdf(currentYear, currentMonth);
      toast.success("Rapport PDF téléchargé");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Échec de l'export PDF"
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <AppShell
      activePath="/dashboard"
      initialTotalBalance={data?.totalBalance}
    >
      <DashboardView
        isLoading={isLoading}
        data={data ?? null}
        onValidatePending={handleValidatePending}
        onPostponePending={handlePostponePending}
        onCancelPending={handleCancelPending}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
      />
    </AppShell>
  );
}
