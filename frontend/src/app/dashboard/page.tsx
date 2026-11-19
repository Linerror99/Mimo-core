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
        monthTransactions,
        pendingTransactions,
        safeToSpend,
        wallets,
        projections,
      };
    },
  });

  const handleValidatePending = async (id: string) => {
    try {
      await transactionService.validate(id);
      toast.success("Transaction validée");
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de valider l'opération"
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
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
      />
    </AppShell>
  );
}
