import { apiRequest } from "@/lib/api-client";
import type {
  Account,
  AccountCreate,
  AccountUpdate,
  TotalBalanceResponse,
} from "@/types/account";

export const accountService = {
  async list(includeInactive = false): Promise<Account[]> {
    const query = includeInactive ? "?include_inactive=true" : "";
    return apiRequest<Account[]>(`/accounts${query}`);
  },

  async getById(id: string): Promise<Account> {
    return apiRequest<Account>(`/accounts/${id}`);
  },

  async create(data: AccountCreate): Promise<Account> {
    return apiRequest<Account>("/accounts", { method: "POST", body: data });
  },

  async update(id: string, data: AccountUpdate): Promise<Account> {
    return apiRequest<Account>(`/accounts/${id}`, {
      method: "PATCH",
      body: data,
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/accounts/${id}`, { method: "DELETE" });
  },

  async getTotalBalance(): Promise<TotalBalanceResponse> {
    return apiRequest<TotalBalanceResponse>("/accounts/balance/total");
  },
};
