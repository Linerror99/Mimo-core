"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsHouseholdView } from "@/components/features/settings/settings-household-view";
import { householdService } from "@/services/household-service";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsHouseholdPage() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuthStore();

  const { data: householdData = null, isLoading: loadingHousehold } = useQuery({
    queryKey: ["household-current"],
    queryFn: () => householdService.getCurrent(),
  });

  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ["household-invitations"],
    queryFn: () => householdService.getInvitations(),
  });

  const { data: archivedHouseholds = [] } = useQuery({
    queryKey: ["household-archived"],
    queryFn: () => householdService.getArchived(),
  });

  const refreshAll = async () => {
    await Promise.all([
      refreshUser(),
      queryClient.invalidateQueries({ queryKey: ["household-current"] }),
      queryClient.invalidateQueries({ queryKey: ["household-invitations"] }),
      queryClient.invalidateQueries({ queryKey: ["household-archived"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handleSendInvitation = async (email: string) => {
    try {
      await householdService.sendInvitation(email);
      toast.success(`Invitation envoyée à ${email}`);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    }
  };

  const handleAcceptInvitation = async (id: string) => {
    try {
      await householdService.acceptInvitation(id);
      toast.success("Foyer couple activé");
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    }
  };

  const handleRejectInvitation = async (id: string) => {
    try {
      await householdService.rejectInvitation(id);
      toast.success("Invitation refusée");
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    }
  };

  const handleCancelInvitation = async (id: string) => {
    try {
      await householdService.cancelInvitation(id);
      toast.success("Invitation annulée");
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Annulation impossible");
    }
  };

  const handleDissolveHousehold = async (householdId: string) => {
    try {
      await householdService.dissolve(householdId);
      toast.success("Foyer dissous et archivé");
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dissolution impossible");
    }
  };

  return (
    <AppShell activePath="/settings/household">
      <SettingsHouseholdView
        isLoading={loadingHousehold || loadingInvitations}
        currentUserId={user?.id}
        householdData={householdData}
        invitations={invitations}
        archivedHouseholds={archivedHouseholds}
        onSendInvitation={handleSendInvitation}
        onAcceptInvitation={handleAcceptInvitation}
        onRejectInvitation={handleRejectInvitation}
        onCancelInvitation={handleCancelInvitation}
        onDissolveHousehold={handleDissolveHousehold}
      />
    </AppShell>
  );
}
