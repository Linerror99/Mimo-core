"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { TimelineView } from "@/components/features/timeline/timeline-view";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { transactionService } from "@/services/transaction-service";
import { recurringService } from "@/services/recurring-service";
import { exportService } from "@/services/export-service";
import { getMonthDateRange } from "@/lib/utils";
import type { RecurringTemplateCreate } from "@/types/recurring-template";
import type {
  RecurringTransactionCreate,
  TransactionCreate,
  TransactionUpdate,
} from "@/types/transaction";

function TimelineContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { startDate, endDate } = getMonthDateRange(year, month);

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["transactions", year, month],
    queryFn: () =>
      transactionService.list({ start_date: startDate, end_date: endDate }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["recurring-templates"],
    queryFn: () => recurringService.list(),
  });

  const { data: accounts = [], isLoading: loadingAcc } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountService.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.list(),
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] }),
    ]);
  };

  const handleCreateTransaction = async (
    payload: TransactionCreate | RecurringTransactionCreate,
    isRecurring: boolean
  ) => {
    try {
      if (isRecurring) {
        await transactionService.createRecurring(
          payload as RecurringTransactionCreate
        );
      } else {
        await transactionService.create(payload);
      }
      toast.success("Transaction enregistrée");
      await invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
      throw err;
    }
  };

  const handleUpdateTransaction = async (
    id: string,
    payload: TransactionUpdate
  ) => {
    try {
      await transactionService.update(id, payload);
      toast.success("Transaction mise à jour");
      await invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
      throw err;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await transactionService.remove(id);
      toast.success("Transaction déplacée vers la corbeille");
      await invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleValidateTransaction = async (id: string) => {
    try {
      await transactionService.validate(id);
      toast.success("Transaction validée");
      await invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Validation impossible");
    }
  };

  const handleCreateTemplate = async (payload: RecurringTemplateCreate) => {
    try {
      await recurringService.create(payload);
      toast.success("Modèle récurrent créé");
      await invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
      throw err;
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await recurringService.remove(id);
      toast.success("Modèle récurrent supprimé");
      await invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportService.exportMonthlyPdf(year, month);
      toast.success("Rapport PDF téléchargé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export PDF impossible");
    }
  };

  return (
    <AppShell activePath="/timeline">
      <TimelineView
        isLoading={loadingTx || loadingAcc}
        year={year}
        month={month}
        onChangeMonth={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
        transactions={transactions}
        templates={templates}
        accounts={accounts}
        categories={categories}
        onCreateTransaction={handleCreateTransaction}
        onUpdateTransaction={handleUpdateTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onValidateTransaction={handleValidateTransaction}
        onCreateTemplate={handleCreateTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onExportPdf={handleExportPdf}
        defaultOpenCreate={searchParams.get("new") === "1"}
      />
    </AppShell>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelineContent />
    </Suspense>
  );
}
