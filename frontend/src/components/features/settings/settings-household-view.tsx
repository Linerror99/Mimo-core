"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Archive,
  Check,
  Mail,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateFr } from "@/lib/utils";
import type {
  ArchivedHousehold,
  CurrentHouseholdResponse,
  Invitation,
} from "@/types/household";

interface SettingsHouseholdViewProps {
  isLoading: boolean;
  currentUserId?: string;
  householdData: CurrentHouseholdResponse | null;
  invitations: Invitation[];
  archivedHouseholds: ArchivedHousehold[];
  onSendInvitation: (email: string) => Promise<void> | void;
  onAcceptInvitation: (id: string) => Promise<void> | void;
  onRejectInvitation: (id: string) => Promise<void> | void;
  onCancelInvitation: (id: string) => Promise<void> | void;
  onDissolveHousehold: (householdId: string) => Promise<void> | void;
}

export function HouseholdSkeleton() {
  return (
    <div data-testid="household-skeleton" className="space-y-6">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-44 rounded-xl" />
    </div>
  );
}

export function SettingsHouseholdView({
  isLoading,
  currentUserId,
  householdData,
  invitations,
  archivedHouseholds,
  onSendInvitation,
  onAcceptInvitation,
  onRejectInvitation,
  onCancelInvitation,
  onDissolveHousehold,
}: SettingsHouseholdViewProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDissolveOpen, setConfirmDissolveOpen] = useState(false);

  if (isLoading) return <HouseholdSkeleton />;

  const isCouple = householdData?.household.type === "couple";
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      await onSendInvitation(inviteEmail.trim());
      setInviteEmail("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          Foyer & Mode Couple
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
          Partagez vos finances à deux avec 3 portefeuilles tracés ou gérez vos
          invitations.
        </p>
      </div>

      {/* Current Household Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle>
              {householdData?.household.name || "Mon foyer"}
            </CardTitle>
          </div>
          <Badge variant={isCouple ? "success" : "neutral"}>
            {isCouple ? "Mode Couple actif" : "Foyer individuel"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {householdData && householdData.members.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {householdData.members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {member.email}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!isCouple ? (
            <form
              onSubmit={handleSend}
              className="flex flex-wrap items-end gap-2 pt-2"
            >
              <div className="w-full min-w-[200px] flex-1 sm:w-auto">
                <label
                  htmlFor="invite-email"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Inviter un(e) partenaire par e-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="partenaire@exemple.fr"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
                  />
                </div>
              </div>
              <Button type="submit" disabled={sending}>
                <Send className="h-4 w-4" />
                {sending ? "Envoi..." : "Envoyer l'invitation"}
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
              <div>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                  Dissoudre le foyer couple
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-zinc-400">
                  Archive l&apos;historique commun en lecture seule et recrée deux
                  foyers individuels séparés.
                </p>
              </div>
              <Button
                variant="danger-outline"
                onClick={() => setConfirmDissolveOpen(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                Dissoudre le foyer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations ({pendingInvitations.length} en attente)</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-5 w-5" />}
              title="Aucune invitation"
              description="Vos invitations envoyées ou reçues pour former un foyer couple apparaîtront ici."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {invitations.map((inv) => {
                const isSender = currentUserId
                  ? inv.inviter_user_id === currentUserId
                  : false;
                return (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                        {isSender
                          ? `Envoyée à ${inv.invitee_email}`
                          : `Reçue de ${inv.inviter_name} (${inv.inviter_email})`}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Le {formatDateFr(inv.created_at)} · Expire le{" "}
                        {formatDateFr(inv.expires_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          inv.status === "accepted"
                            ? "success"
                            : inv.status === "pending"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {inv.status}
                      </Badge>
                      {inv.status === "pending" && !isSender && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onAcceptInvitation(inv.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onRejectInvitation(inv.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Refuser
                          </Button>
                        </>
                      )}
                      {inv.status === "pending" && isSender && (
                        <Button
                          size="sm"
                          variant="danger-outline"
                          onClick={() => onCancelInvitation(inv.id)}
                        >
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archived Households */}
      {archivedHouseholds.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-slate-400" />
              <CardTitle>Foyers archivés ({archivedHouseholds.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {archivedHouseholds.map((arch) => (
              <div
                key={arch.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                    {arch.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Archivé le {formatDateFr(arch.archived_at)}
                  </p>
                </div>
                <Badge variant="neutral">Lecture seule</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dissolve Confirmation Modal */}
      <Modal
        open={confirmDissolveOpen}
        onClose={() => setConfirmDissolveOpen(false)}
        title="Confirmer la dissolution du foyer"
        description="Cette action archive le foyer couple et crée deux foyers individuels avec redistribution des soldes."
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmDissolveOpen(false)}
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (householdData) {
                await onDissolveHousehold(householdData.household.id);
              }
              setConfirmDissolveOpen(false);
            }}
          >
            Confirmer la dissolution
          </Button>
        </div>
      </Modal>
    </div>
  );
}
