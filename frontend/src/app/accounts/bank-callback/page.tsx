"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AmountDisplay } from "@/components/shared/amount-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { accountService } from "@/services/account-service";
import { bankingService } from "@/services/banking-service";
import type {
  AccountLinkMapping,
  BankCallbackResponse,
  DiscoveredBankAccount,
} from "@/types/banking";

function defaultSyncFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

interface RowMappingState {
  selected: boolean;
  targetAccountId: string; // "" = créer un nouveau compte
  newAccountName: string;
  syncFromDate: string;
}

function BankCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const [callbackData, setCallbackData] = useState<BankCallbackResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<Record<string, RowMappingState>>({});
  const exchangedRef = useRef(false);

  const { data: existingAccounts = [] } = useQuery({
    queryKey: ["accounts", false],
    queryFn: () => accountService.list(false),
  });

  useEffect(() => {
    if (errorParam) {
      setErrorMsg(`Autorisation refusée par la banque (${errorParam}).`);
      setLoading(false);
      return;
    }
    if (!code || !state) {
      setErrorMsg("Paramètres de retour bancaire manquants (code ou state).");
      setLoading(false);
      return;
    }
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    bankingService
      .callback(code, state)
      .then((res) => {
        setCallbackData(res);
        const initial: Record<string, RowMappingState> = {};
        for (const acc of res.discovered_accounts) {
          initial[acc.external_account_id] = {
            selected: true,
            targetAccountId: "",
            newAccountName: acc.name,
            syncFromDate: defaultSyncFromDate(),
          };
        }
        setRows(initial);
      })
      .catch((err) => {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Impossible de finaliser la connexion bancaire."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code, state, errorParam]);

  const handleLinkAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackData) return;

    const mappings: AccountLinkMapping[] = [];
    for (const acc of callbackData.discovered_accounts) {
      const r = rows[acc.external_account_id];
      if (!r || !r.selected) continue;
      mappings.push({
        external_account_id: acc.external_account_id,
        mimo_account_id: r.targetAccountId || null,
        new_account_name: r.targetAccountId ? null : r.newAccountName || acc.name,
        new_account_type: acc.account_type || "CHECKING",
        iban_masked: acc.iban_masked || null,
        currency: acc.currency || "EUR",
        initial_balance: acc.balance ?? 0,
        sync_from_date: r.syncFromDate || defaultSyncFromDate(),
        sync_enabled: true,
      });
    }

    if (mappings.length === 0) {
      toast.error("Sélectionnez au moins un compte à relier.");
      return;
    }

    setSubmitting(true);
    try {
      const summary = await bankingService.linkAccounts(
        callbackData.connection_id,
        mappings,
        true
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["bank-connections"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success(
        `Banque reliée ! ${summary.imported} importée(s) · ${summary.matched} validée(s) automatiquement`
      );
      router.push("/accounts");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'association."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell activePath="/accounts">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/accounts")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux comptes
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">
              Association des comptes bancaires
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Reliez vos comptes bancaires à vos comptes Mimo existants pour
              conserver tout votre historique.
            </p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Finalisation de la connexion avec votre banque...
              </p>
            </CardContent>
          </Card>
        ) : errorMsg ? (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                {errorMsg}
              </p>
              <Button onClick={() => router.push("/accounts")}>
                Revenir sur Mes Comptes
              </Button>
            </CardContent>
          </Card>
        ) : callbackData ? (
          <form onSubmit={handleLinkAndSync} className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                        {callbackData.institution_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {callbackData.discovered_accounts.length} compte(s) détecté(s)
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Autorisé</Badge>
                </div>

                <div className="space-y-3">
                  {callbackData.discovered_accounts.map(
                    (acc: DiscoveredBankAccount) => {
                      const row = rows[acc.external_account_id] || {
                        selected: true,
                        targetAccountId: "",
                        newAccountName: acc.name,
                        syncFromDate: defaultSyncFromDate(),
                      };

                      return (
                        <div
                          key={acc.external_account_id}
                          className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex cursor-pointer items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) =>
                                  setRows((prev) => ({
                                    ...prev,
                                    [acc.external_account_id]: {
                                      ...row,
                                      selected: e.target.checked,
                                    },
                                  }))
                                }
                                className="rounded border-slate-300"
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                                  {acc.name}
                                </p>
                                {acc.iban_masked && (
                                  <p className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                                    {acc.iban_masked}
                                  </p>
                                )}
                              </div>
                            </label>
                            {acc.balance !== null &&
                              acc.balance !== undefined && (
                                <AmountDisplay
                                  amount={Number(acc.balance)}
                                  className="text-sm font-semibold text-slate-900 dark:text-zinc-100"
                                />
                              )}
                          </div>

                          {row.selected && (
                            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-zinc-800/80">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">
                                  Destination dans Mimo
                                </label>
                                <select
                                  value={row.targetAccountId}
                                  onChange={(e) =>
                                    setRows((prev) => ({
                                      ...prev,
                                      [acc.external_account_id]: {
                                        ...row,
                                        targetAccountId: e.target.value,
                                      },
                                    }))
                                  }
                                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs dark:border-zinc-800 dark:bg-[#121215]"
                                >
                                  <option value="">
                                    + Créer un nouveau compte (« {acc.name} »)
                                  </option>
                                  {existingAccounts.map((ex) => (
                                    <option key={ex.id} value={ex.id}>
                                      Associer au compte existant : {ex.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-zinc-400">
                                  Importer les opérations à partir du
                                </label>
                                <input
                                  type="date"
                                  value={row.syncFromDate}
                                  onChange={(e) =>
                                    setRows((prev) => ({
                                      ...prev,
                                      [acc.external_account_id]: {
                                        ...row,
                                        syncFromDate: e.target.value,
                                      },
                                    }))
                                  }
                                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs dark:border-zinc-800 dark:bg-[#121215]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push("/accounts")}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting
                      ? "Synchronisation en cours..."
                      : "Relier et synchroniser"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function BankCallbackPage() {
  return (
    <Suspense fallback={null}>
      <BankCallbackContent />
    </Suspense>
  );
}
