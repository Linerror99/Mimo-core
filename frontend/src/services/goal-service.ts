import { apiRequest } from "@/lib/api-client";
import type { Goal, GoalCreate, GoalType, GoalUpdate } from "@/types/goal";
import type { Transaction } from "@/types/transaction";

interface GoalCreateBackend {
  name: string;
  description?: string;
  target_amount?: number;
  current_amount?: number;
  monthly_contribution?: number;
  start_date?: string;
  target_date?: string;
  account_id?: string;
  destination_account_id?: string;
  user_id?: string;
  household_id?: string;
}

export const goalService = {
  async list(goalType?: GoalType): Promise<Goal[]> {
    const qs = goalType ? `?goal_type=${goalType}` : "";
    return apiRequest<Goal[]>(`/goals${qs}`);
  },

  async getById(id: string): Promise<Goal> {
    return apiRequest<Goal>(`/goals/${id}`);
  },

  async getTransactions(goalId: string): Promise<Transaction[]> {
    return apiRequest<Transaction[]>(`/goals/${goalId}/transactions`);
  },

  async create(
    data: GoalCreate,
    ownerContext: { userId: string; householdId: string | null }
  ): Promise<Goal> {
    const backendData: GoalCreateBackend = {
      name: data.name,
      description: data.description,
      target_amount: data.target_amount,
      current_amount: data.current_amount ?? 0,
      monthly_contribution: data.monthly_contribution,
      start_date: data.start_date || undefined,
      target_date: data.target_date || undefined,
      account_id: data.account_id || undefined,
      destination_account_id: data.destination_account_id || undefined,
    };

    if (data.goal_type === "personal") {
      backendData.user_id = ownerContext.userId;
    } else {
      if (!ownerContext.householdId) {
        throw new Error("Vous devez être en couple pour créer un objectif foyer.");
      }
      backendData.household_id = ownerContext.householdId;
    }

    return apiRequest<Goal>("/goals", { method: "POST", body: backendData });
  },

  async update(id: string, data: GoalUpdate): Promise<Goal> {
    return apiRequest<Goal>(`/goals/${id}`, { method: "PATCH", body: data });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/goals/${id}`, { method: "DELETE" });
  },

  async addContribution(id: string, amount: number): Promise<Goal> {
    return apiRequest<Goal>(`/goals/${id}/contribution`, {
      method: "PATCH",
      body: { amount },
    });
  },

  async setContribution(id: string, amount: number): Promise<Goal> {
    return apiRequest<Goal>(`/goals/${id}/contribution`, {
      method: "PUT",
      body: { amount },
    });
  },
};
