"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Landmark,
  Link2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { bankingService } from "@/services/banking-service";
import { cn, formatDateFr } from "@/lib/utils";
import type { BankConnection, BankInstitution } from "@/types/banking";

interface BankConnectionsPanelProps {
  connections: BankConnection[];
  isSyncing: boolean;
  connectModalOpen: boolean;
  onCloseConnectModal: () => void;
  onSyncAll: () => Promise<void> | void;
  onSyncConnection: (connectionId: string) => Promise<void> | void;
  onDeleteConnection: (connectionId: string) => Promise<void> | void;
  onStartConnect: (institution: BankInstitution) => Promise<void> | void;
}

export function BankConnectionsPanel({
  connections,
  isSyncing,
  connectModalOpen,
  onCloseConnectModal,
  onSyncAll,
  onSyncConnection,
  onDeleteConnection,
  onStartConnect,
}: BankConnectionsPanelProps) {
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingName, setConnectingName] = useState<string | null>(null);
  const [connToDelete, setConnToDelete] = useState<BankConnection | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!connectModalOpen) return;
    let cancelled = false;
    setLoadingInstitutions(true);
    bankingService
      .listInstitutions("FR")
      .then((list) => {
        if (!cancelled) setInstitutions(list);
      })
      .catch(() => {
        if (!cancelled) setInstitutions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInstitutions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connectModalOpen]);

  const filteredInstitutions = institutions.filter((i) =>
    !searchQuery.trim()
      ? true
      : i.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleChooseInstitution = async (inst: BankInstitution) => {
    setConnectingName(inst.name);
    try {
      await onStartConnect(inst);
    } finally {
      setConnectingName(null);
    }
  };

  return (
    <>
      {connections.length > 0 && (
        <Card data-testid="bank-connections-panel">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                    Connexions bancaires Open Banking (DSP2)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Synchronisation automatique toutes les 6h · ou manuelle à tout moment.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={isSyncing}
                onClick={() => onSyncAll()}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
                />
                {isSyncing ? "Synchronisation..." : "Synchroniser maintenant"}
              </Button>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
              {connections.map((conn) => {
                const isExpired = conn.status === "EXPIRED";
                const isExpiringSoon =
                  conn.days_until_expiry !== null &&
                  conn.days_until_expiry !== undefined &&
                  conn.days_until_expiry <= 7 &&
                  conn.days_until_expiry >= 0;

                return (
                  <div
                    key={conn.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                          {conn.institution_name}
                        </span>
                        <Badge
                          variant={
                            isExpired
                              ? "danger"
                              : isExpiringSoon
                                ? "warning"
                                : conn.status === "ACTIVE"
                                  ? "success"
                                  : "neutral"
                          }
                        >
                          {isExpired
                            ? "Expiré"
                            : isExpiringSoon
                              ? `Expire dans ${conn.days_until_expiry}j`
                              : conn.status === "ACTIVE"
                                ? "Connecté"
                                : conn.status}
                        </Badge>
                        {conn.provider === "mock" && (
                          <Badge variant="neutral">Mode Test</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                        {conn.linked_accounts.length} compte(s) lié(s)
                        {conn.last_synced_at
                          ? ` · Dernière synchro : ${formatDateFr(conn.last_synced_at)}`
                          : " · Jamais synchronisé"}
                        {conn.consent_expires_at
                          ? ` · Consentement jusqu'au ${formatDateFr(conn.consent_expires_at)}`
                          : ""}
                      </p>
                      {conn.last_error && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {conn.last_error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(isExpired || isExpiringSoon) && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            handleChooseInstitution({
                              name: conn.institution_name,
                              country: conn.institution_country,
                              logo: conn.institution_logo,
                            })
                          }
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Renouveler
                        </Button>
                      )}
                      <ActionMenu
                        ariaLabel={`Actions pour ${conn.institution_name}`}
                        items={[
                          {
                            label: "Synchroniser cette banque",
                            icon: <RefreshCw className="h-3.5 w-3.5" />,
                            disabled: isSyncing || isExpired,
                            onClick: () => onSyncConnection(conn.id),
                          },
                          {
                            label: "Reconnecter / Renouveler",
                            icon: <Link2 className="h-3.5 w-3.5" />,
                            onClick: () =>
                              handleChooseInstitution({
                                name: conn.institution_name,
                                country: conn.institution_country,
                                logo: conn.institution_logo,
                              }),
                          },
                          {
                            label: "Déconnecter",
                            icon: <Trash2 className="h-3.5 w-3.5" />,
                            variant: "danger",
                            dividerBefore: true,
                            onClick: () => setConnToDelete(conn),
                          },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Choisir une banque à connecter */}
      <Modal
        open={connectModalOpen}
        onClose={onCloseConnectModal}
        title="Connecter une banque (Open Banking DSP2)"
        description="Connexion sécurisée en lecture seule via votre application bancaire. Aucun mot de passe n'est stocké par Mimo."
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher votre banque (ex. Société Générale, BoursoBank, Revolut)..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>

          {loadingInstitutions ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-zinc-800"
                />
              ))}
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-zinc-400">
              Aucune banque trouvée pour « {searchQuery} ».
            </p>
          ) : (
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
              {filteredInstitutions.map((inst) => (
                <button
                  key={`${inst.country}-${inst.name}`}
                  type="button"
                  disabled={connectingName !== null}
                  onClick={() => handleChooseInstitution(inst)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    {inst.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inst.logo}
                        alt={inst.name}
                        className="h-7 w-7 rounded-md object-contain"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Landmark className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                        {inst.name}
                      </p>
                      {inst.bic && (
                        <p className="font-mono text-[10px] text-slate-400 dark:text-zinc-500">
                          {inst.bic} · {inst.country}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                    {connectingName === inst.name
                      ? "Redirection..."
                      : "Connecter →"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(connToDelete)}
        onClose={() => setConnToDelete(null)}
        onConfirm={async () => {
          if (!connToDelete) return;
          setDeleting(true);
          try {
            await onDeleteConnection(connToDelete.id);
            setConnToDelete(null);
          } finally {
            setDeleting(false);
          }
        }}
        loading={deleting}
        title="Déconnecter cette banque ?"
        description={
          connToDelete
            ? `La synchronisation automatique pour « ${connToDelete.institution_name} » sera arrêtée. Vos comptes et transactions déjà importées sont conservés.`
            : ""
        }
        confirmLabel="Déconnecter"
      />
    </>
  );
}
