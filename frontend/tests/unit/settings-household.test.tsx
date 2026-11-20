import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsHouseholdView } from "@/components/features/settings/settings-household-view";
import type { CurrentHouseholdResponse, Invitation } from "@/types/household";

const INDIVIDUAL_HOUSEHOLD: CurrentHouseholdResponse = {
  household: {
    id: "h-1",
    name: "Foyer d'Alex",
    type: "individual",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  members: [
    {
      id: "u-1",
      email: "alex@mimo.fr",
      first_name: "Alex",
      last_name: "Martin",
    },
  ],
};

const RECEIVED_INVITATION: Invitation = {
  id: "inv-1",
  inviter_user_id: "u-2",
  inviter_email: "camille@mimo.fr",
  inviter_name: "Camille Leroy",
  invitee_user_id: "u-1",
  invitee_email: "alex@mimo.fr",
  invitee_name: "Alex Martin",
  type: "couple",
  status: "pending",
  expires_at: "2026-11-30T00:00:00Z",
  accepted_at: null,
  rejected_at: null,
  created_at: "2026-11-18T00:00:00Z",
};

describe("SettingsHouseholdView — Mode Couple & Invitations", () => {
  it("permet d'envoyer une invitation et d'accepter une invitation reçue", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onAccept = vi.fn();

    render(
      <SettingsHouseholdView
        isLoading={false}
        currentUserId="u-1"
        householdData={INDIVIDUAL_HOUSEHOLD}
        invitations={[RECEIVED_INVITATION]}
        archivedHouseholds={[]}
        onSendInvitation={onSend}
        onAcceptInvitation={onAccept}
        onRejectInvitation={vi.fn()}
        onCancelInvitation={vi.fn()}
        onDissolveHousehold={vi.fn()}
      />
    );

    await user.type(
      screen.getByLabelText(/inviter un\(e\) partenaire/i),
      "partner@mimo.fr"
    );
    await user.click(
      screen.getByRole("button", { name: /envoyer l'invitation/i })
    );
    expect(onSend).toHaveBeenCalledWith("partner@mimo.fr");

    await user.click(screen.getByRole("button", { name: /accepter/i }));
    expect(onAccept).toHaveBeenCalledWith("inv-1");
  });
});
