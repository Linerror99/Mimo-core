"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { TrashView } from "@/components/features/trash/trash-view";
import { transactionService } from "@/services/transaction-service";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: () => transactionService.listTrash(),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trash"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
  };

  const handleRestore = async (id: string) => {
    try {
      await transactionService.restore(id);
      toast.success("Transaction restaurée");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restauration impossible");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await transactionService.permanentDelete(id);
      toast.success("Transaction supprimée définitivement");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const res = await transactionService.emptyTrash();
      toast.success(`${res.count} transaction(s) purgée(s)`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    }
  };

  return (
    <AppShell activePath="/trash">
      <TrashView
        isLoading={isLoading}
        items={items}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onEmptyTrash={handleEmptyTrash}
      />
    </AppShell>
  );
}
