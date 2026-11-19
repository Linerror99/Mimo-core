"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { cn, formatMonthLabel, getTodayIso } from "@/lib/utils";
import type { Account } from "@/types/account";
import type {
  MonthlyProjection,
  PurchaseSimulationPayload,
  PurchaseSimulationResult,
} from "@/types/projection";

export type ProjectionHorizonMonths = 3 | 6 | 12 | 36 | 60;

interface ProjectionViewProps {
  isLoading: boolean;
  horizonMonths: ProjectionHorizonMonths;
  onChangeHorizon: (months: ProjectionHorizonMonths) => void;
  projections: MonthlyProjection[];
  accounts: Account[];
  onSimulatePurchase?: (
    payload: PurchaseSimulationPayload
  ) => Promise<PurchaseSimulationResult>;
}

const HORIZONS: Array<{ months: ProjectionHorizonMonths; label: string }> = [
  { months: 3, label: "3 mois" },
  { months: 6, label: "6 mois" },
  { months: 12, label: "1 an" },
  { months: 36, label: "3 ans" },
  { months: 60, label: "5 ans" },
];

export function ProjectionSkeleton() {
  return (
    <div data-testid="projection-skeleton" className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export function ProjectionView({
  isLoading,
  horizonMonths,
  onChangeHorizon,
  projections,
  accounts,
  onSimulatePurchase,
}: ProjectionViewProps) {
  const [simOpen, setSimOpen] = useState(false);
  const [simName, setSimName] = useState("");
  const [simAmount, setSimAmount] = useState("");
  const [simDate, setSimDate] = useState(getTodayIso());
  const [simAccountId, setSimAccountId] = useState(accounts[0]?.id || "");
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<PurchaseSimulationResult | null>(
    null
  );

  const stats = useMemo(() => {
    if (projections.length === 0) {
      return {
        finalBalance: 0,
        minTreasury: 0,
        deficitMonths: 0,
        avgMonthlyNet: 0,
      };
    }
    const finalBalance = Number(
      projections[projections.length - 1]?.balance ?? 0
    );
    let minTreasury = Infinity;
    let deficitMonths = 0;
    let totalNet = 0;

    for (const p of projections) {
      const treasury = Number(p.treasury_balance ?? p.balance);
      if (treasury < minTreasury) minTreasury = treasury;
      const net = Number(p.income) - Math.abs(Number(p.expense));
      totalNet += net;
      if (net < 0 || treasury < 0) deficitMonths++;
    }

    return {
      finalBalance,
      minTreasury: minTreasury === Infinity ? 0 : minTreasury,
      deficitMonths,
      avgMonthlyNet: totalNet / projections.length,
    };
  }, [projections]);

  if (isLoading) return <ProjectionSkeleton />;

  const chartData = projections.map((p) => ({
    label: formatMonthLabel(p.month, p.year),
    Patrimoine: Math.round(Number(p.balance)),
    Trésorerie: Math.round(Number(p.treasury_balance ?? p.balance)),
  }));

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSimulatePurchase || !simName.trim() || !simAmount) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await onSimulatePurchase({
        name: simName.trim(),
        is_saving: false,
        total_amount: Number.parseFloat(simAmount),
        payment_type: "ONE_TIME",
        start_date: simDate,
        account_id: simAccountId || accounts[0]?.id,
      });
      setSimResult(res);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Projections financières
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Anticipez l&apos;évolution de votre patrimoine et détectez les tensions
            de trésorerie jusqu&apos;à 5 ans.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            {HORIZONS.map((h) => (
              <button
                key={h.months}
                type="button"
                onClick={() => onChangeHorizon(h.months)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  horizonMonths === h.months
                    ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-slate-600 dark:text-zinc-400"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>
          {onSimulatePurchase && (
            <Button variant="primary" onClick={() => setSimOpen(true)}>
              <Calculator className="h-4 w-4" />
              Simuler un achat
            </Button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Solde fin d&apos;horizon
              </span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-zinc-50">
              <AmountDisplay amount={stats.finalBalance} />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Flux net moyen :{" "}
              <AmountDisplay amount={stats.avgMonthlyNet} signed colored /> /
              mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Point bas trésorerie
              </span>
              <TrendingDown className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-semibold">
              <AmountDisplay amount={stats.minTreasury} colored />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Minimum observé sur la période
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Mois déficitaires
              </span>
              {stats.deficitMonths > 0 ? (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </div>
            <p
              data-testid="deficit-months-count"
              className={cn(
                "mt-2 font-mono text-2xl font-semibold tabular-money",
                stats.deficitMonths > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {stats.deficitMonths}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Sur {projections.length} mois projetés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      {projections.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-5 w-5" />}
          title="Aucune donnée de projection"
          description="Ajoutez vos revenus et charges récurrents dans la Timeline pour générer vos courbes."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Évolution du patrimoine & de la trésorerie</CardTitle>
              <Badge variant="info">{horizonMonths} mois</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="mimoPat" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#2563EB"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563EB"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.2)"
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
                    <Area
                      type="monotone"
                      dataKey="Patrimoine"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#mimoPat)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Trésorerie"
                      stroke="#10B981"
                      strokeWidth={1.75}
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Détail mensuel</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    <th className="px-4 py-3">Mois</th>
                    <th className="px-4 py-3 text-right">Revenus</th>
                    <th className="px-4 py-3 text-right">Dépenses</th>
                    <th className="px-4 py-3 text-right">Flux net</th>
                    <th className="px-4 py-3 text-right">Solde fin de mois</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {projections.map((p) => {
                    const net = Number(p.income) - Math.abs(Number(p.expense));
                    return (
                      <tr
                        key={`${p.year}-${p.month}`}
                        className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/40"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-zinc-100">
                          {formatMonthLabel(p.month, p.year)}
                          {net < 0 && (
                            <Badge variant="danger" className="ml-2">
                              Déficit
                            </Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <AmountDisplay
                            amount={Number(p.income)}
                            signed
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <AmountDisplay
                            amount={-Math.abs(Number(p.expense))}
                            signed
                            className="text-rose-600 dark:text-rose-400"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                          <AmountDisplay amount={net} signed colored />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-zinc-50">
                          <AmountDisplay amount={Number(p.balance)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Quick Purchase Simulator Modal */}
      <Modal
        open={simOpen}
        onClose={() => {
          setSimOpen(false);
          setSimResult(null);
        }}
        title="Simulateur d'achat rapide"
        description="Évaluez l'impact immédiat d'une dépense sur votre trajectoire financière."
      >
        <form onSubmit={handleRunSimulation} className="space-y-4">
          <div>
            <label
              htmlFor="sim-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom de l&apos;achat
            </label>
            <input
              id="sim-name"
              type="text"
              required
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              placeholder="Ex. Ordinateur portable"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="sim-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Montant (€)
              </label>
              <input
                id="sim-amount"
                type="number"
                step="0.01"
                required
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <div>
              <label
                htmlFor="sim-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date prévue
              </label>
              <input
                id="sim-date"
                type="date"
                required
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>
          {accounts.length > 0 && (
            <div>
              <label
                htmlFor="sim-account"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Compte débité
              </label>
              <select
                id="sim-account"
                value={simAccountId || accounts[0]?.id}
                onChange={(e) => setSimAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {simResult && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-semibold text-slate-900 dark:text-zinc-100">
                {simResult.is_feasible === false
                  ? "Impact critique détecté"
                  : "Simulation réalisable"}
              </p>
              {simResult.message && (
                <p className="mt-1 text-slate-600 dark:text-zinc-400">
                  {simResult.message}
                </p>
              )}
              {typeof simResult.min_balance_after === "number" && (
                <p className="mt-1 text-slate-600 dark:text-zinc-400">
                  Solde minimum projeté :{" "}
                  <AmountDisplay amount={simResult.min_balance_after} colored />
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSimOpen(false)}
            >
              Fermer
            </Button>
            <Button type="submit" disabled={simLoading}>
              {simLoading ? "Calcul..." : "Lancer la simulation"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
