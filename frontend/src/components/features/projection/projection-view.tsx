"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  PiggyBank,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
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
  SimulationPaymentType,
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
  onCommitSimulation?: (
    payload: PurchaseSimulationPayload
  ) => Promise<void> | void;
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
  onCommitSimulation,
}: ProjectionViewProps) {
  const [simOpen, setSimOpen] = useState(false);
  const [simName, setSimName] = useState("");
  const [simIsSaving, setSimIsSaving] = useState(false);
  const [simPaymentType, setSimPaymentType] =
    useState<SimulationPaymentType>("DIRECT");
  const [simAmount, setSimAmount] = useState("");
  const [simInstallments, setSimInstallments] = useState("3");
  const [simDate, setSimDate] = useState(getTodayIso());
  const [simAccountId, setSimAccountId] = useState(accounts[0]?.id || "");
  const [simDestAccountId, setSimDestAccountId] = useState("");
  const [simCreateGoal, setSimCreateGoal] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simCommitting, setSimCommitting] = useState(false);
  const [simResult, setSimResult] = useState<PurchaseSimulationResult | null>(
    null
  );
  const [lastPayload, setLastPayload] =
    useState<PurchaseSimulationPayload | null>(null);

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

  const buildPayload = (): PurchaseSimulationPayload => {
    const parsedAmount = Number.parseFloat(simAmount);
    const parsedCount = Math.max(1, Number.parseInt(simInstallments, 10) || 3);
    const payload: PurchaseSimulationPayload = {
      name: simName.trim(),
      is_saving: simIsSaving,
      payment_type: simPaymentType,
      start_date: simDate,
      account_id: simAccountId || accounts[0]?.id,
      create_goal: simIsSaving || simCreateGoal,
    };
    if (simPaymentType === "RECURRING") {
      payload.monthly_amount = parsedAmount;
      payload.installments_count = parsedCount;
    } else if (simPaymentType === "INSTALLMENTS") {
      payload.total_amount = parsedAmount;
      payload.installments_count = parsedCount;
    } else {
      payload.total_amount = parsedAmount;
    }
    if (simIsSaving && simDestAccountId) {
      payload.destination_account_id = simDestAccountId;
    }
    return payload;
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSimulatePurchase || !simName.trim() || !simAmount) return;
    setSimLoading(true);
    setSimResult(null);
    const payload = buildPayload();
    setLastPayload(payload);
    try {
      const res = await onSimulatePurchase(payload);
      setSimResult(res);
    } finally {
      setSimLoading(false);
    }
  };

  const handleCommitSimulation = async () => {
    if (!onCommitSimulation || !lastPayload) return;
    setSimCommitting(true);
    try {
      await onCommitSimulation(lastPayload);
      setSimOpen(false);
      setSimResult(null);
      setLastPayload(null);
    } finally {
      setSimCommitting(false);
    }
  };

  const simStatus =
    simResult?.feasibility_status ??
    (simResult?.is_feasible === false ? "DANGER" : "SUCCESS");
  const simMessage = simResult?.feasibility_message ?? simResult?.message;
  const simMinBalance =
    typeof simResult?.min_projected_balance === "number"
      ? simResult.min_projected_balance
      : simResult?.min_balance_after;

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
                          stopColor="#7C3AED"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="95%"
                          stopColor="#7C3AED"
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
                      stroke="#7C3AED"
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
            <div className="max-h-[540px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-[#16161A] dark:text-zinc-400">
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

      {/* Full Purchase / Savings Simulator Modal */}
      <Modal
        open={simOpen}
        onClose={() => {
          setSimOpen(false);
          setSimResult(null);
        }}
        title="Simulateur d'achat & d'épargne"
        description="Testez un paiement comptant, en plusieurs fois ou une épargne mensuelle avant de l'engager."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleRunSimulation} className="space-y-4">
          {/* Expense vs Saving */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSimIsSaving(false);
                setSimResult(null);
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                !simIsSaving
                  ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                  : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400"
              )}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Achat / Dépense
            </button>
            <button
              type="button"
              onClick={() => {
                setSimIsSaving(true);
                setSimPaymentType("RECURRING");
                setSimResult(null);
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                simIsSaving
                  ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                  : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400"
              )}
            >
              <PiggyBank className="h-3.5 w-3.5" />
              Effort d&apos;épargne
            </button>
          </div>

          {/* Payment Type */}
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900">
            {(
              [
                { id: "DIRECT", label: "Comptant" },
                { id: "INSTALLMENTS", label: "En plusieurs fois" },
                { id: "RECURRING", label: "Mensuel" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSimPaymentType(opt.id);
                  setSimResult(null);
                }}
                className={cn(
                  "rounded-md py-1.5 transition-colors",
                  simPaymentType === opt.id
                    ? "bg-white font-semibold text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-violet-400"
                    : "text-slate-600 dark:text-zinc-400"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="sim-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom du projet / achat
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="sim-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                {simPaymentType === "RECURRING"
                  ? "Mensualité (€)"
                  : "Montant total (€)"}
              </label>
              <input
                id="sim-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>

            {simPaymentType !== "DIRECT" && (
              <div>
                <label
                  htmlFor="sim-installments"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  {simPaymentType === "INSTALLMENTS"
                    ? "Mensualités (Nx)"
                    : "Durée (mois)"}
                </label>
                <input
                  id="sim-installments"
                  type="number"
                  min="2"
                  max="60"
                  required
                  value={simInstallments}
                  onChange={(e) => setSimInstallments(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="sim-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date de début
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              {simIsSaving && (
                <div>
                  <label
                    htmlFor="sim-dest-account"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                  >
                    Compte épargne cible
                  </label>
                  <select
                    id="sim-dest-account"
                    value={simDestAccountId}
                    onChange={(e) => setSimDestAccountId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                  >
                    <option value="">Aucun (dépense simple)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {!simIsSaving && onCommitSimulation && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={simCreateGoal}
                onChange={(e) => setSimCreateGoal(e.target.checked)}
                className="rounded border-slate-300"
              />
              Créer également un objectif associé lors de la validation
            </label>
          )}

          {simResult && (
            <div
              className={cn(
                "space-y-3 rounded-xl border p-4 text-xs",
                simStatus === "DANGER"
                  ? "border-rose-300 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10"
                  : simStatus === "WARNING"
                    ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                    : "border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-zinc-100">
                  {simStatus === "DANGER"
                    ? "Impact critique détecté"
                    : simStatus === "WARNING"
                      ? "Faisable avec vigilance"
                      : "Simulation réalisable"}
                </p>
                {typeof simMinBalance === "number" && (
                  <span className="text-[11px] text-slate-600 dark:text-zinc-300">
                    Point bas :{" "}
                    <AmountDisplay amount={simMinBalance} colored />
                    {simResult.lowest_balance_month
                      ? ` (${simResult.lowest_balance_month})`
                      : ""}
                  </span>
                )}
              </div>

              {simMessage && (
                <p className="text-slate-700 dark:text-zinc-200">{simMessage}</p>
              )}

              {simResult.monthly_comparisons &&
                simResult.monthly_comparisons.length > 0 && (
                  <div className="h-40 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={simResult.monthly_comparisons.map((m) => ({
                          mois: m.month_label,
                          Avant: Math.round(m.base_balance),
                          Après: Math.round(m.simulated_balance),
                        }))}
                        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,0.2)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="mois"
                          tick={{ fontSize: 10, fill: "#94A3B8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94A3B8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181B",
                            borderColor: "#27272A",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "#FAFAFA",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Avant"
                          stroke="#94A3B8"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="Après"
                          stroke="#7C3AED"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
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
            {simResult && onCommitSimulation && (
              <Button
                type="button"
                variant="primary"
                onClick={handleCommitSimulation}
                disabled={simCommitting}
              >
                <Check className="h-4 w-4" />
                {simCommitting
                  ? "Planification..."
                  : "Valider et planifier"}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
