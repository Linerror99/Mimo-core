"use client";

import React, { useState } from "react";
import {
  Building2,
  Edit3,
  PiggyBank,
  Plus,
  Power,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountCreate,
  type AccountType,
  type AccountUpdate,
} from "@/types/account";

interface AccountsViewProps {
  isLoading: boolean;
  accounts: Account[];
  includeInactive: boolean;
  onToggleIncludeInactive: (next: boolean) => void;
  onCreate: (payload: AccountCreate) => Promise<void> | void;
  onUpdate: (id: string, payload: AccountUpdate) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
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
  includeInactive,
  onToggleIncludeInactive,
  onCreate,
  onUpdate,
  onDelete,
  defaultOpenCreate = false,
}: AccountsViewProps) {
  const [modalOpen, setModalOpen] = useState(defaultOpenCreate);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [initialBalance, setInitialBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);

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
    setModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setInitialBalance(String(account.initial_balance));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await onUpdate(editing.id, {
          name: name.trim(),
          type,
        });
      } else {
        const parsedBalance = Number.parseFloat(initialBalance) || 0;
        await onCreate({
          name: name.trim(),
          type,
          initial_balance: parsedBalance,
          currency: "EUR",
        });
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
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
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-300">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => onToggleIncludeInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Afficher clôturés
          </label>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nouveau compte
          </Button>
        </div>
      </div>

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
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
                        {acc.name}
                      </h2>
                      {!acc.is_active && (
                        <Badge variant="neutral">Clôturé</Badge>
                      )}
                    </div>
                    <Badge variant="info" className="mt-1.5">
                      {ACCOUNT_TYPE_LABELS[acc.type]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(acc)}
                      aria-label={`Modifier ${acc.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate(acc.id, { is_active: !acc.is_active })
                      }
                      aria-label={
                        acc.is_active
                          ? `Clôturer ${acc.name}`
                          : `Réactiver ${acc.name}`
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(acc.id)}
                      aria-label={`Supprimer ${acc.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
        description="Définissez le libellé, le type et le solde d'ouverture."
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              {editing && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                  Le solde d&apos;un compte existant évolue uniquement via vos
                  transactions.
                </p>
              )}
            </div>
          </div>
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
    </div>
  );
}
