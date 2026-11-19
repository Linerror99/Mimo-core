"use client";

import React from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { formatDateFr } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

interface TrashViewProps {
  isLoading: boolean;
  items: Transaction[];
  onRestore: (id: string) => Promise<void> | void;
  onPermanentDelete: (id: string) => Promise<void> | void;
  onEmptyTrash: () => Promise<void> | void;
}

export function TrashSkeleton() {
  return (
    <div data-testid="trash-skeleton" className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function TrashView({
  isLoading,
  items,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}: TrashViewProps) {
  if (isLoading) return <TrashSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Corbeille
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Restaurez vos transactions supprimées ou purgez-les définitivement.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="danger-outline" onClick={onEmptyTrash}>
            <Trash2 className="h-4 w-4" />
            Vider la corbeille ({items.length})
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="h-5 w-5" />}
          title="La corbeille est vide"
          description="Aucune transaction supprimée à restaurer."
        />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-zinc-800/80">
          {items.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                  {tx.description}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Date : {formatDateFr(tx.transaction_date)} · Supprimée le{" "}
                  {formatDateFr(tx.deleted_at)}
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onRestore(tx.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurer
                </Button>
                <Button
                  size="sm"
                  variant="danger-outline"
                  onClick={() => onPermanentDelete(tx.id)}
                  aria-label={`Supprimer définitivement ${tx.description}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
