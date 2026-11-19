"use client";

import React, { useState } from "react";
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  PiggyBank,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import {
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
import { AmountDisplay } from "@/components/shared/amount-display";
import { cn, formatDateFr, getTodayIso } from "@/lib/utils";
import type { Account } from "@/types/account";
import type {
  PurchaseSimulationPayload,
  PurchaseSimulationResult,
  SimulationPaymentType,
} from "@/types/projection";

interface PurchaseSimulatorCardProps {
  accounts: Account[];
  defaultOpen?: boolean;
  onSimulate: (
    payload: PurchaseSimulationPayload
  ) => Promise<PurchaseSimulationResult>;
  onCommit?: (payload: PurchaseSimulationPayload) => Promise<void> | void;
}

export function PurchaseSimulatorCard({
  accounts,
  defaultOpen = false,
  onSimulate,
  onCommit,
}: PurchaseSimulatorCardProps) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [paymentType, setPaymentType] =
    useState<SimulationPaymentType>("DIRECT");
  const [amount, setAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("3");
  const [startDate, setStartDate] = useState(getTodayIso());
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [destAccountId, setDestAccountId] = useState("");
  const [createGoal, setCreateGoal] = useState(true);

  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<PurchaseSimulationResult | null>(null);
  const [lastPayload, setLastPayload] =
    useState<PurchaseSimulationPayload | null>(null);

  const buildPayload = (): PurchaseSimulationPayload => {
    const parsedAmount = Number.parseFloat(amount);
    const parsedCount = Math.max(
      1,
      Number.parseInt(installmentsCount, 10) || 3
    );
    const payload: PurchaseSimulationPayload = {
      name: name.trim(),
      is_saving: isSaving,
      payment_type: paymentType,
      start_date: startDate,
      account_id: accountId || accounts[0]?.id,
      create_goal: isSaving || createGoal,
    };
    if (paymentType === "RECURRING") {
      payload.monthly_amount = parsedAmount;
      payload.installments_count = parsedCount;
    } else if (paymentType === "INSTALLMENTS") {
      payload.total_amount = parsedAmount;
      payload.installments_count = parsedCount;
    } else {
      payload.total_amount = parsedAmount;
    }
    if (isSaving && destAccountId) {
      payload.destination_account_id = destAccountId;
    }
    return payload;
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setLoading(true);
    setResult(null);
    const payload = buildPayload();
    setLastPayload(payload);
    try {
      const res = await onSimulate(payload);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!onCommit || !lastPayload) return;
    setCommitting(true);
    try {
      await onCommit(lastPayload);
      setResult(null);
      setLastPayload(null);
      setName("");
      setAmount("");
      setExpanded(false);
    } finally {
      setCommitting(false);
    }
  };

  const status =
    result?.feasibility_status ??
    (result?.is_feasible === false ? "DANGER" : "SUCCESS");
  const message = result?.feasibility_message ?? result?.message;
  const minBalance =
    typeof result?.min_projected_balance === "number"
      ? result.min_projected_balance
      : result?.min_balance_after;

  return (
    <Card
      data-testid="purchase-simulator-card"
      className="border-violet-500/25 bg-white dark:bg-[#121215]"
    >
      <CardHeader className="cursor-pointer select-none">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-600 dark:text-violet-300">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Simulateur d&apos;achat &amp; d&apos;objectif</CardTitle>
                <Badge variant="info">
                  <Sparkles className="h-3 w-3" />
                  Aide à la décision
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                Testez un achat (comptant ou en Nx) ou un effort d&apos;épargne
                avant de l&apos;intégrer à vos objectifs et votre timeline.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-zinc-700 dark:text-zinc-200">
            {expanded ? (
              <>
                Réduire
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Ouvrir le simulateur
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </span>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t border-slate-100 pt-5 dark:border-zinc-800/80">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Form */}
            <form onSubmit={handleRun} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSaving(false);
                    setResult(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                    !isSaving
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
                    setIsSaving(true);
                    setPaymentType("RECURRING");
                    setResult(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                    isSaving
                      ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400"
                  )}
                >
                  <PiggyBank className="h-3.5 w-3.5" />
                  Effort d&apos;épargne
                </button>
              </div>

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
                      setPaymentType(opt.id);
                      setResult(null);
                    }}
                    className={cn(
                      "rounded-md py-1.5 transition-colors",
                      paymentType === opt.id
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
                  htmlFor="goal-sim-name"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Nom de l&apos;achat / objectif
                </label>
                <input
                  id="goal-sim-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. MacBook Pro, Canapé, Épargne Vacances..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="goal-sim-amount"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                  >
                    {paymentType === "RECURRING"
                      ? "Mensualité (€)"
                      : "Montant total (€)"}
                  </label>
                  <input
                    id="goal-sim-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
                  />
                </div>

                {paymentType !== "DIRECT" && (
                  <div>
                    <label
                      htmlFor="goal-sim-count"
                      className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                    >
                      {paymentType === "INSTALLMENTS"
                        ? "Mensualités (Nx)"
                        : "Durée (mois)"}
                    </label>
                    <input
                      id="goal-sim-count"
                      type="number"
                      min="2"
                      max="60"
                      required
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="goal-sim-date"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                  >
                    Date de début
                  </label>
                  <input
                    id="goal-sim-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="goal-sim-account"
                      className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                    >
                      Compte débité
                    </label>
                    <select
                      id="goal-sim-account"
                      value={accountId || accounts[0]?.id || ""}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isSaving && (
                    <div>
                      <label
                        htmlFor="goal-sim-dest"
                        className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                      >
                        Compte épargne cible
                      </label>
                      <select
                        id="goal-sim-dest"
                        value={destAccountId}
                        onChange={(e) => setDestAccountId(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
                      >
                        <option value="">Aucun</option>
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

              {!isSaving && onCommit && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={createGoal}
                    onChange={(e) => setCreateGoal(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Créer aussi l&apos;objectif associé lors de la validation
                </label>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button type="submit" disabled={loading}>
                  <Calculator className="h-4 w-4" />
                  {loading ? "Calcul en cours..." : "Simuler l'impact"}
                </Button>
                {result && onCommit && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCommit}
                    disabled={committing}
                    className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    <Check className="h-4 w-4" />
                    {committing
                      ? "Intégration..."
                      : "Valider et intégrer"}
                  </Button>
                )}
              </div>
            </form>

            {/* Right: Result + 12-month Chart + Schedule */}
            <div className="flex flex-col justify-center">
              {!result ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                  <Calculator className="mb-2 h-7 w-7 text-violet-500/70" />
                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                    Prêt à tester votre projet d&apos;achat ?
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-zinc-400">
                    Renseignez le montant et le mode de paiement à gauche pour
                    visualiser l&apos;impact sur votre solde sur 12 mois.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={cn(
                      "rounded-xl border p-4 text-xs",
                      status === "DANGER"
                        ? "border-rose-300 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10"
                        : status === "WARNING"
                          ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                          : "border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">
                        {status === "DANGER"
                          ? "Risque de découvert"
                          : status === "WARNING"
                            ? "Faisable avec vigilance"
                            : "Simulation viable"}
                      </span>
                      {typeof minBalance === "number" && (
                        <span className="text-[11px] text-slate-600 dark:text-zinc-300">
                          Solde min :{" "}
                          <AmountDisplay amount={minBalance} colored />
                          {result.lowest_balance_month
                            ? ` (${result.lowest_balance_month})`
                            : ""}
                        </span>
                      )}
                    </div>
                    {message && (
                      <p className="mt-1.5 text-slate-700 dark:text-zinc-200">
                        {message}
                      </p>
                    )}
                  </div>

                  {result.monthly_comparisons &&
                    result.monthly_comparisons.length > 0 && (
                      <div className="h-44 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={result.monthly_comparisons.map((m) => ({
                              mois: m.month_label,
                              Avant: Math.round(m.base_balance),
                              Après: Math.round(m.simulated_balance),
                            }))}
                            margin={{ top: 6, right: 8, left: -14, bottom: 0 }}
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

                  {result.schedule && result.schedule.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Échéancier ({result.schedule.length} échéance(s))
                      </p>
                      <div className="space-y-1">
                        {result.schedule.map((item, idx) => (
                          <div
                            key={`${item.date}-${idx}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-slate-700 dark:text-zinc-300">
                              {formatDateFr(item.date)} · {item.label}
                            </span>
                            <AmountDisplay
                              amount={-Math.abs(item.amount)}
                              signed
                              className="shrink-0 font-semibold text-rose-600 dark:text-rose-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
