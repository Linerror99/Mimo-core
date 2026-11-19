import { apiRequest } from "@/lib/api-client";
import type {
  ArchivedHousehold,
  CurrentHouseholdResponse,
  DissolveHouseholdResponse,
  Invitation,
  WalletsResponse,
} from "@/types/household";

export const householdService = {
  async getCurrent(): Promise<CurrentHouseholdResponse> {
    return apiRequest<CurrentHouseholdResponse>("/households/me");
  },

  async getArchived(): Promise<ArchivedHousehold[]> {
    const data = await apiRequest<{ archived_households: ArchivedHousehold[] }>(
      "/households/archived"
    );
    return data.archived_households || [];
  },

  async dissolve(householdId: string): Promise<DissolveHouseholdResponse> {
    return apiRequest<DissolveHouseholdResponse>(
      `/households/${householdId}/dissolve`,
      { method: "POST" }
    );
  },

  async getWallets(): Promise<WalletsResponse> {
    return apiRequest<WalletsResponse>("/wallets");
  },

  async getInvitations(type?: "sent" | "received"): Promise<Invitation[]> {
    const qs = type ? `?type=${type}` : "";
    const data = await apiRequest<{ invitations: Invitation[] }>(
      `/invitations${qs}`
    );
    return data.invitations || [];
  },

  async sendInvitation(email: string): Promise<Invitation> {
    return apiRequest<Invitation>("/invitations", {
      method: "POST",
      body: { invitee_email: email },
    });
  },

  async acceptInvitation(id: string): Promise<void> {
    await apiRequest<void>(`/invitations/${id}/accept`, { method: "POST" });
  },

  async rejectInvitation(id: string): Promise<void> {
    await apiRequest<void>(`/invitations/${id}/reject`, { method: "POST" });
  },

  async cancelInvitation(id: string): Promise<void> {
    await apiRequest<void>(`/invitations/${id}`, { method: "DELETE" });
  },
};
