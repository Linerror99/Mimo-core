"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Edit3,
  Landmark,
  PiggyBank,
  Plus,
  Power,
  RefreshCw,
  Scale,
  Trash2,
  Unlink,
  Wallet,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { BankConnectionsPanel } from "@/components/features/accounts/bank-connections-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { BankLogo } from "@/components/shared/bank-logo";
import { BankLogoPicker } from "@/components/shared/bank-logo-picker";
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountCreate,
  type AccountType,
  type AccountUpdate,
} from "@/types/account";

import type { BankConnection, BankInstitution } from "@/types/banking";

interface AccountsViewProps {
  isLoading: boolean;
  accounts: Account[];
  bankConnections?: BankConnection[];
  isSyncingBanks?: boolean;
  includeInactive: boolean;
  onToggleIncludeInactive: (next: boolean) => void;
  onCreate: (payload: AccountCreate) => Promise<void> | void;
  onUpdate: (id: string, payload: AccountUpdate) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onReconcileBalance?: (
    account: Account,
    realBalance: number
  ) => Promise<void> | void;
  onStartConnectBank?: (institution: BankInstitution) => Promise<void> | void;
  onSyncAllBanks?: () => Promise<void> | void;
  onSyncBankConnection?: (connectionId: string) => Promise<void> | void;
  onDeleteBankConnection?: (connectionId: string) => Promise<void> | void;
  onUnlinkBankAccount?: (accountId: string) => Promise<void> | void;
  defaultOpenCreate?: boolean;
}

const ACCOUNT_TYPES: AccountType[] = [
  "CHECKING",
  "SAVINGS",
  "INVESTMENT",
  "LOAN",
  "CASH",
  "OTHER",
];

const CURRENCIES = [
  { code: "EUR", label: "EUR (€)" },
  { code: "USD", label: "USD ($)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "CHF", label: "CHF" },
];

export function AccountsSkeleton() {
  return (
    <div data-testid="accounts-skeleton" className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AccountsView({
  isLoading,
  accounts,
  bankConnections = [],
  isSyncingBanks = false,
  includeInactive,
  onToggleIncludeInactive,
  onCreate,
  onUpdate,
  onDelete,
  onReconcileBalance,
  onStartConnectBank,
  onSyncAllBanks,
  onSyncBankConnection,
  onDeleteBankConnection,
  onUnlinkBankAccount,
  defaultOpenCreate = false,
}: AccountsViewProps) {
  const [modalOpen, setModalOpen] = useState(defaultOpenCreate);
  const [connectBankModalOpen, setConnectBankModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [initialBalance, setInitialBalance] = useState("0");
  const [currency, setCurrency] = useState("EUR");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [syncFromDate, setSyncFromDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Destructive delete confirmation
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Balance reconciliation modal
  const [reconcileAccount, setReconcileAccount] = useState<Account | null>(
    null
  );
  const [realBalanceInput, setRealBalanceInput] = useState("");
  const [reconciling, setReconciling] = useState(false);

  if (isLoading) return <AccountsSkeleton />;

  const activeAccounts = accounts.filter((a) => a.is_active);
  const totalBalance = activeAccounts.reduce(
    (sum, a) => sum + Number(a.current_balance),
    0
  );
  const savingsTotal = activeAccounts
    .filter((a) => a.type === "SAVINGS" || a.type === "INVESTMENT")
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const openCreateModal = () => {
    setEditing(null);
    setName("");
    setType("CHECKING");
    setInitialBalance("0");
    setCurrency("EUR");
    setLogoUrl(null);
    setSyncFromDate("");
    setModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setInitialBalance(String(account.initial_balance));
    setCurrency(account.currency || "EUR");
    setLogoUrl(account.logo_url ?? null);
    setSyncFromDate(account.sync_from_date?.slice(0, 10) || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        const payload: AccountUpdate = {
          name: name.trim(),
          type,
        };
        if (logoUrl !== (editing.logo_url ?? null)) {
          payload.logo_url = logoUrl;
        }
        if (
          editing.sync_enabled &&
          syncFromDate &&
          syncFromDate !== (editing.sync_from_date?.slice(0, 10) || "")
        ) {
          payload.sync_from_date = syncFromDate;
        }
        await onUpdate(editing.id, payload);
      } else {
        const parsedBalance = Number.parseFloat(initialBalance) || 0;
        const payload: AccountCreate = {
          name: name.trim(),
          type,
          initial_balance: parsedBalance,
          currency,
        };
        if (logoUrl) {
          payload.logo_url = logoUrl;
        }
        await onCreate(payload);
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    setDeleting(true);
    try {
      await onDelete(accountToDelete.id);
      setAccountToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Comptes bancaires
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Suivez l&apos;ensemble de vos comptes courants, livrets, placements et
            prêts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-300">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => onToggleIncludeInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Afficher clôturés
          </label>
          {onSyncAllBanks && bankConnections.length > 0 && (
            <Button
              variant="secondary"
              disabled={isSyncingBanks}
              onClick={() => onSyncAllBanks()}
            >
              <RefreshCw
                className={
                  isSyncingBanks ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
              Synchroniser
            </Button>
          )}
          {onStartConnectBank && (
            <Button
              variant="secondary"
              onClick={() => setConnectBankModalOpen(true)}
            >
              <Landmark className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Connecter une banque
            </Button>
          )}
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nouveau compte
          </Button>
        </div>
      </div>

      {onStartConnectBank &&
        onSyncAllBanks &&
        onSyncBankConnection &&
        onDeleteBankConnection && (
          <BankConnectionsPanel
            connections={bankConnections}
            isSyncing={isSyncingBanks}
            connectModalOpen={connectBankModalOpen}
            onCloseConnectModal={() => setConnectBankModalOpen(false)}
            onSyncAll={onSyncAllBanks}
            onSyncConnection={onSyncBankConnection}
            onDeleteConnection={onDeleteBankConnection}
            onStartConnect={onStartConnectBank}
          />
        )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Solde total actif
              </span>
              <Wallet className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-zinc-50">
              <AmountDisplay amount={totalBalance} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Épargne & Placements
              </span>
              <PiggyBank className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              <AmountDisplay amount={savingsTotal} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Comptes actifs
              </span>
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-money dark:text-zinc-50">
              {activeAccounts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Aucun compte enregistré"
          description="Créez votre premier compte bancaire ou d'épargne pour commencer à suivre vos transactions."
          action={
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Ajouter un compte
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className={!acc.is_active ? "opacity-65" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <BankLogo
                      accountName={acc.name}
                      logoUrl={acc.logo_url}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
                          {acc.name}
                        </h2>
                        {!acc.is_active && (
                          <Badge variant="neutral">Clôturé</Badge>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="info">
                          {ACCOUNT_TYPE_LABELS[acc.type]}
                        </Badge>
                        {acc.sync_enabled && (
                          <Badge variant="success">
                            <Landmark className="h-3 w-3" />
                            Synchro banque
                          </Badge>
                        )}
                        {acc.currency && acc.currency !== "EUR" && (
                          <Badge variant="neutral">{acc.currency}</Badge>
                        )}
                      </div>
                      {acc.iban_masked && (
                        <p className="mt-1 font-mono text-[11px] text-slate-400 dark:text-zinc-500">
                          {acc.iban_masked}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ActionMenu
                      ariaLabel={`Actions pour ${acc.name}`}
                      items={[
                        {
                          label: "Modifier",
                          icon: <Edit3 className="h-3.5 w-3.5" />,
                          onClick: () => openEditModal(acc),
                        },
                        ...(acc.is_active && onReconcileBalance
                          ? [
                              {
                                label: "Rapprocher le solde",
                                icon: <Scale className="h-3.5 w-3.5" />,
                                onClick: () => {
                                  setReconcileAccount(acc);
                                  setRealBalanceInput(
                                    String(
                                      Number(acc.current_balance).toFixed(2)
                                    )
                                  );
                                },
                              },
                            ]
                          : []),
                        ...(acc.sync_enabled && onUnlinkBankAccount
                          ? [
                              {
                                label: "Délier la synchro banque",
                                icon: <Unlink className="h-3.5 w-3.5" />,
                                onClick: () => onUnlinkBankAccount(acc.id),
                              },
                            ]
                          : []),
                        {
                          label: acc.is_active ? "Clôturer" : "Réactiver",
                          icon: <Power className="h-3.5 w-3.5" />,
                          onClick: () =>
                            onUpdate(acc.id, { is_active: !acc.is_active }),
                        },
                        {
                          label: "Supprimer",
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          variant: "danger",
                          dividerBefore: true,
                          onClick: () => setAccountToDelete(acc),
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-zinc-800/80">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Solde actuel
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-zinc-50">
                    <AmountDisplay amount={Number(acc.current_balance)} />
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                    Solde initial :{" "}
                    <AmountDisplay amount={Number(acc.initial_balance)} />
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 pt-2">
                    <Link
                      href={`/timeline?account_id=${acc.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                    >
                      Voir les opérations
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    {acc.is_active && onReconcileBalance && (
                      <button
                        type="button"
                        onClick={() => {
                          setReconcileAccount(acc);
                          setRealBalanceInput(
                            String(Number(acc.current_balance).toFixed(2))
                          );
                        }}
                        aria-label={`Rapprocher ${acc.name}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-violet-400 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-500 dark:hover:text-violet-400"
                      >
                        <Scale className="h-3 w-3" />
                        Rapprocher
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier le compte" : "Nouveau compte bancaire"}
        description="Définissez le libellé, le type, la banque et le solde d'ouverture."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="acc-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom du compte
            </label>
            <input
              id="acc-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Compte courant Boursorama"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="acc-type"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Type
              </label>
              <select
                id="acc-type"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="acc-currency"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Devise
              </label>
              <select
                id="acc-currency"
                value={currency}
                disabled={Boolean(editing)}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-zinc-800 dark:bg-[#121215] dark:disabled:bg-zinc-900"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="acc-balance"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                {editing ? "Solde actuel (verrouillé)" : "Solde initial (€)"}
              </label>
              <input
                id="acc-balance"
                type="number"
                step="0.01"
                disabled={Boolean(editing)}
                value={
                  editing ? String(editing.current_balance) : initialBalance
                }
                onChange={(e) => setInitialBalance(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-zinc-800 dark:bg-[#121215] dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500"
              />
            </div>
          </div>

          {editing && (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Le solde d&apos;un compte existant évolue uniquement via vos
              transactions.
            </p>
          )}

          {editing?.sync_enabled && (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] p-3.5">
              <label
                htmlFor="acc-sync-from"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Importer les opérations banque à partir du
              </label>
              <input
                id="acc-sync-from"
                type="date"
                value={syncFromDate}
                onChange={(e) => setSyncFromDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                Après modification, cliquez sur « Synchroniser maintenant » pour
                récupérer les écritures depuis cette date.
              </p>
            </div>
          )}

          <BankLogoPicker
            value={logoUrl}
            onChange={setLogoUrl}
            accountName={name}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : editing
                  ? "Enregistrer"
                  : "Créer le compte"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Balance Reconciliation Modal */}
      <Modal
        open={Boolean(reconcileAccount)}
        onClose={() => setReconcileAccount(null)}
        title={`Rapprocher le solde — ${reconcileAccount?.name ?? ""}`}
        description="Saisissez le solde réel affiché par votre banque : Mimo créera automatiquement une opération d'ajustement."
        maxWidthClass="max-w-md"
      >
        {reconcileAccount && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!onReconcileBalance) return;
              const parsed = Number.parseFloat(realBalanceInput);
              if (Number.isNaN(parsed)) return;
              setReconciling(true);
              try {
                await onReconcileBalance(reconcileAccount, parsed);
                setReconcileAccount(null);
              } finally {
                setReconciling(false);
              }
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-slate-500 dark:text-zinc-400">
                Solde actuel dans Mimo
              </span>
              <AmountDisplay
                amount={Number(reconcileAccount.current_balance)}
                className="font-semibold text-slate-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="reconcile-real-balance"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Solde réel constaté sur votre banque (€)
              </label>
              <input
                id="reconcile-real-balance"
                type="number"
                step="0.01"
                required
                value={realBalanceInput}
                onChange={(e) => setRealBalanceInput(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>

            {(() => {
              const parsed = Number.parseFloat(realBalanceInput);
              if (Number.isNaN(parsed)) return null;
              const diff = parsed - Number(reconcileAccount.current_balance);
              return (
                <div className="flex items-center justify-between rounded-lg border border-violet-300/60 bg-violet-50/70 px-3.5 py-2.5 text-xs dark:border-violet-500/30 dark:bg-violet-500/10">
                  <span className="text-violet-800 dark:text-violet-300">
                    Ajustement qui sera créé
                  </span>
                  <AmountDisplay
                    amount={diff}
                    signed
                    colored
                    className="font-semibold"
                  />
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReconcileAccount(null)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={reconciling}>
                {reconciling ? "Rapprochement..." : "Recaler le solde"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Destructive Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Clôturer ce compte ?"
        description={
          accountToDelete
            ? `Le compte « ${accountToDelete.name} » sera clôturé (soft-delete). Votre historique de transactions reste préservé.`
            : ""
        }
        confirmLabel="Clôturer le compte"
      />
    </div>
  );
}
