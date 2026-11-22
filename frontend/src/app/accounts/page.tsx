"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AccountsView } from "@/components/features/accounts/accounts-view";
import { accountService } from "@/services/account-service";
import { bankingService } from "@/services/banking-service";
import { transactionService } from "@/services/transaction-service";
import type { Account, AccountCreate, AccountUpdate } from "@/types/account";
import type { BankInstitution } from "@/types/banking";

function AccountsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isSyncingBanks, setIsSyncingBanks] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts", includeInactive],
    queryFn: () => accountService.list(includeInactive),
  });

  const { data: bankConnections = [] } = useQuery({
    queryKey: ["bank-connections"],
    queryFn: () => bankingService.listConnections(),
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

  const invalidateBankAndFinance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["bank-connections"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["projections"] }),
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
    ]);
  };

  const handleStartConnectBank = async (institution: BankInstitution) => {
    try {
      const redirectUrl = `${window.location.origin}/accounts/bank-callback`;
      const res = await bankingService.connect({
        institution_name: institution.name,
        institution_country: institution.country || "FR",
        institution_logo: institution.logo || null,
        redirect_url: redirectUrl,
      });
      window.location.assign(res.auth_url);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer la connexion bancaire"
      );
    }
  };

  const handleSyncAllBanks = async () => {
    setIsSyncingBanks(true);
    try {
      const summary = await bankingService.syncAll();
      await invalidateBankAndFinance();
      if (summary.errors.length > 0) {
        toast.warning(`Synchro partielle : ${summary.errors[0]}`);
      } else {
        toast.success(
          `Synchro terminée : ${summary.imported} importée(s) · ${summary.matched} validée(s) · ${summary.skipped} déjà à jour`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur de synchronisation"
      );
    } finally {
      setIsSyncingBanks(false);
    }
  };

  const handleSyncSingleConnection = async (connectionId: string) => {
    setIsSyncingBanks(true);
    try {
      const summary = await bankingService.syncConnection(connectionId);
      await invalidateBankAndFinance();
      if (summary.errors.length > 0) {
        toast.warning(`Synchro partielle : ${summary.errors[0]}`);
      } else {
        toast.success(
          `Banque synchronisée : ${summary.imported} importée(s) · ${summary.matched} validée(s)`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur de synchronisation"
      );
    } finally {
      setIsSyncingBanks(false);
    }
  };

  const handleDeleteBankConnection = async (connectionId: string) => {
    try {
      await bankingService.deleteConnection(connectionId);
      toast.success("Banque déconnectée");
      await invalidateBankAndFinance();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Déconnexion impossible"
      );
    }
  };

  const handleUnlinkBankAccount = async (accountId: string) => {
    try {
      await bankingService.unlinkAccount(accountId);
      toast.success("Synchronisation désactivée pour ce compte");
      await invalidateBankAndFinance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    }
  };

  return (
    <AppShell activePath="/accounts">
      <AccountsView
        isLoading={isLoading}
        accounts={accounts}
        bankConnections={bankConnections}
        isSyncingBanks={isSyncingBanks}
        includeInactive={includeInactive}
        onToggleIncludeInactive={setIncludeInactive}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReconcileBalance={handleReconcileBalance}
        onStartConnectBank={handleStartConnectBank}
        onSyncAllBanks={handleSyncAllBanks}
        onSyncBankConnection={handleSyncSingleConnection}
        onDeleteBankConnection={handleDeleteBankConnection}
        onUnlinkBankAccount={handleUnlinkBankAccount}
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
