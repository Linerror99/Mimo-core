"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AccountsView } from "@/components/features/accounts/accounts-view";
import { accountService } from "@/services/account-service";
import { transactionService } from "@/services/transaction-service";
import type { Account, AccountCreate, AccountUpdate } from "@/types/account";

function AccountsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts", includeInactive],
    queryFn: () => accountService.list(includeInactive),
  });

  const handleCreate = async (payload: AccountCreate) => {
    try {
      await accountService.create(payload);
      toast.success("Compte créé");
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
      throw err;
    }
  };

  const handleUpdate = async (id: string, payload: AccountUpdate) => {
    try {
      await accountService.update(id, payload);
      toast.success("Compte mis à jour");
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await accountService.remove(id);
      toast.success("Compte supprimé");
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleReconcileBalance = async (
    account: Account,
    realBalance: number
  ) => {
    const diff = Number((realBalance - Number(account.current_balance)).toFixed(2));
    if (Math.abs(diff) < 0.01) {
      toast.info("Le solde est déjà parfaitement aligné");
      return;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const txDate = yesterday.toISOString().slice(0, 10);
    try {
      await transactionService.create({
        description: `Ajustement de solde (${account.name})`,
        amount: diff,
        transaction_date: txDate,
        type: diff > 0 ? "INCOME" : "EXPENSE",
        account_id: account.id,
        notes: `Rapprochement bancaire : solde recalé à ${realBalance.toFixed(2)} €`,
      });
      toast.success("Solde rapproché avec succès");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projections"] }),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de rapprocher le solde"
      );
      throw err;
    }
  };

  return (
    <AppShell activePath="/accounts">
      <AccountsView
        isLoading={isLoading}
        accounts={accounts}
        includeInactive={includeInactive}
        onToggleIncludeInactive={setIncludeInactive}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReconcileBalance={handleReconcileBalance}
        defaultOpenCreate={searchParams.get("new") === "1"}
      />
    </AppShell>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsContent />
    </Suspense>
  );
}
