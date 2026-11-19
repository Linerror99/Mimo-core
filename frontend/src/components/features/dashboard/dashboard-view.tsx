"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock,
  Download,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { formatDateFr, formatMonthLabel } from "@/lib/utils";
import type { Account } from "@/types/account";
import type { WalletsResponse } from "@/types/household";
import type { MonthlyProjection, SafeToSpendData } from "@/types/projection";
import type { Transaction } from "@/types/transaction";

export interface DashboardData {
  totalBalance: number;
  accounts: Account[];
  monthTransactions: Transaction[];
  pendingTransactions: Transaction[];
  safeToSpend: SafeToSpendData | null;
  wallets: WalletsResponse | null;
  projections: MonthlyProjection[];
}

interface DashboardViewProps {
  isLoading: boolean;
  data: DashboardData | null;
  onValidatePending?: (id: string) => Promise<void> | void;
  onExportPdf?: () => Promise<void> | void;
  isExportingPdf?: boolean;
}

export function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-skeleton" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#121215]"
          >
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardView({
  isLoading,
  data,
  onValidatePending,
  onExportPdf,
  isExportingPdf = false,
}: DashboardViewProps) {
  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const monthIncome = data.monthTransactions
    .filter((t) => t.type === "INCOME" && !t.deleted_at)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const monthExpense = data.monthTransactions
    .filter((t) => t.type === "EXPENSE" && !t.deleted_at)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const monthNet = monthIncome - monthExpense;

  const chartData = data.projections.slice(0, 6).map((p) => ({
    label: formatMonthLabel(p.month, p.year),
    Revenus: Math.round(Number(p.income)),
    Dépenses: Math.round(Math.abs(Number(p.expense))),
  }));

  const safeStatus = data.safeToSpend?.status ?? "healthy";
  const safeBadgeVariant =
    safeStatus === "danger"
      ? "danger"
      : safeStatus === "caution"
        ? "warning"
        : "success";

  const safeStatusLabel =
    safeStatus === "danger"
      ? "Zone critique"
      : safeStatus === "caution"
        ? "Vigilance"
        : "Trésorerie saine";

  return (
    <div className="space-y-6">
      {/* Page Header — Loi de Hick: 1 action primaire */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Tableau de bord
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Vue consolidée de votre patrimoine, de votre reste à vivre et des
            flux du mois.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onExportPdf && (
            <Button
              variant="secondary"
              size="md"
              onClick={onExportPdf}
              disabled={isExportingPdf}
            >
              <Download className="h-4 w-4" />
              {isExportingPdf ? "Export..." : "Rapport PDF"}
            </Button>
          )}
          <Link href="/timeline?new=1">
            <Button variant="primary" size="md">
              <Plus className="h-4 w-4" />
              Nouvelle transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Patrimoine global
              </span>
              <Wallet className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
              <AmountDisplay amount={data.totalBalance} />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              {data.accounts.filter((a) => a.is_active).length} compte(s) actif(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Revenus du mois
              </span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
              <AmountDisplay amount={monthIncome} signed />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Entrées constatées & prévues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Dépenses du mois
              </span>
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-rose-600 dark:text-rose-400">
              <AmountDisplay amount={-monthExpense} signed />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Charges fixes & variables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Flux net mensuel
              </span>
              <CalendarClock className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              <AmountDisplay amount={monthNet} signed colored />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Capacité d&apos;épargne du mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Safe-to-Spend + Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Cashflow Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Flux prévisionnels (6 mois)</CardTitle>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Comparaison mensuelle des revenus et dépenses projetés
              </p>
            </div>
            <Link
              href="/projection"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Voir 5 ans →
            </Link>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title="Aucune projection disponible"
                description="Créez vos premières transactions récurrentes pour visualiser votre trésorerie future."
                action={
                  <Link href="/timeline">
                    <Button variant="secondary" size="sm">
                      Configurer la timeline
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.2)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181B",
                        borderColor: "#27272A",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#FAFAFA",
                      }}
                    />
                    <Bar dataKey="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="Dépenses"
                      fill="#E11D48"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safe-to-Spend Card */}
        <Card>
          <CardHeader>
            <CardTitle>Reste à vivre réel</CardTitle>
            <Badge variant={safeBadgeVariant}>{safeStatusLabel}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.safeToSpend ? (
              <>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Disponible avant prochain revenu
                  </p>
                  <p
                    data-testid="safe-to-spend-amount"
                    className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50"
                  >
                    <AmountDisplay amount={data.safeToSpend.safe_to_spend} />
                  </p>
                </div>

                <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Solde courant
                    </span>
                    <AmountDisplay
                      amount={data.safeToSpend.current_balance}
                      className="font-medium text-slate-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Dépenses engagées
                    </span>
                    <AmountDisplay
                      amount={-Math.abs(data.safeToSpend.committed_expenses)}
                      signed
                      className="font-medium text-rose-600 dark:text-rose-400"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Prochain revenu
                    </span>
                    <span className="font-mono font-medium text-slate-900 tabular-money dark:text-zinc-100">
                      J+{data.safeToSpend.days_until_next_income} (
                      {formatDateFr(data.safeToSpend.next_income_date)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                  {safeStatus === "danger" ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  )}
                  <span>
                    Calculé jusqu&apos;au{" "}
                    {formatDateFr(data.safeToSpend.horizon_date)}.
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Indicateur en attente"
                description="Ajoutez un compte courant et un revenu récurrent pour activer le calcul du reste à vivre."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Couple Wallets (if COUPLE household) */}
      {data.wallets && data.wallets.household_type === "COUPLE" && (
        <Card data-testid="couple-wallets-section">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <CardTitle>Portefeuilles du foyer (Mode Couple)</CardTitle>
            </div>
            <Link
              href="/settings/household"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Gérer le foyer
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data.wallets.members &&
                Object.values(data.wallets.members).map((member) => (
                  <div
                    key={member.user_id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      {member.user_name}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-zinc-50">
                      <AmountDisplay amount={member.balance} />
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                      Perso : <AmountDisplay amount={member.personal_balance} />{" "}
                      · Part commun :{" "}
                      <AmountDisplay amount={member.shared_contribution} />
                    </p>
                  </div>
                ))}
              {data.wallets.shared && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    Portefeuille commun
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-zinc-50">
                    <AmountDisplay amount={data.wallets.shared.balance} />
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                    Part / personne :{" "}
                    <AmountDisplay amount={data.wallets.shared.split_per_person} />
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Validations & Recent Transactions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending Validations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <CardTitle>En attente de validation</CardTitle>
            </div>
            <Badge
              variant={
                data.pendingTransactions.length > 0 ? "warning" : "neutral"
              }
            >
              {data.pendingTransactions.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {data.pendingTransactions.length === 0 ? (
              <EmptyState
                icon={<Check className="h-5 w-5 text-emerald-500" />}
                title="Tout est à jour"
                description="Aucune transaction du jour n'est en attente de validation."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {data.pendingTransactions.slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-100">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {formatDateFr(tx.transaction_date)}
                        {tx.account_name ? ` · ${tx.account_name}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AmountDisplay
                        amount={
                          tx.type === "EXPENSE"
                            ? -Math.abs(Number(tx.amount))
                            : Math.abs(Number(tx.amount))
                        }
                        signed
                        colored
                        className="text-sm font-semibold"
                      />
                      {onValidatePending && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onValidatePending(tx.id)}
                          aria-label={`Valider ${tx.description}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Valider
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Month Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Opérations récentes du mois</CardTitle>
            <Link
              href="/timeline"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Ouvrir la timeline →
            </Link>
          </CardHeader>
          <CardContent>
            {data.monthTransactions.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title="Aucune opération ce mois-ci"
                description="Enregistrez une première transaction pour démarrer le suivi."
                action={
                  <Link href="/timeline?new=1">
                    <Button size="sm" variant="primary">
                      Ajouter une transaction
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {data.monthTransactions.slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-100">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {formatDateFr(tx.transaction_date)}
                        {tx.category_name ? ` · ${tx.category_name}` : ""}
                      </p>
                    </div>
                    <AmountDisplay
                      amount={
                        tx.type === "EXPENSE"
                          ? -Math.abs(Number(tx.amount))
                          : tx.type === "INCOME"
                            ? Math.abs(Number(tx.amount))
                            : Number(tx.amount)
                      }
                      signed={tx.type !== "TRANSFER"}
                      colored={tx.type !== "TRANSFER"}
                      className="text-sm font-semibold"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
