/**
 * Account API Service
 */
import api from "./api";
import { Account, AccountCreate, AccountUpdate } from "../types/account";

export const accountService = {
  /**
   * Create a new account
   */
  async createAccount(data: AccountCreate): Promise<Account> {
    const response = await api.post<Account>("/accounts", data);
    return response.data;
  },

  /**
   * Get all accounts for the current user's household
   */
  async getAccounts(includeInactive: boolean = false): Promise<Account[]> {
    const params = includeInactive ? { include_inactive: true } : {};
    const response = await api.get<Account[]>("/accounts", { params });
    return response.data;
  },

  /**
   * Get a specific account by ID
   */
  async getAccount(id: string): Promise<Account> {
    const response = await api.get<Account>(`/accounts/${id}`);
    return response.data;
  },

  /**
   * Update an account
   */
  async updateAccount(id: string, data: AccountUpdate): Promise<Account> {
    const response = await api.patch<Account>(`/accounts/${id}`, data);
    return response.data;
  },

  /**
   * Delete an account
   */
  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/accounts/${id}`);
  },

  /**
   * Get total balance for all active accounts
   */
  async getTotalBalance(): Promise<{
    total_balance: number;
    accounts_count: number;
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      initial_balance: number;
      current_balance: number;
    }>;
  }> {
    const response = await api.get("/accounts/balance/total");
    return response.data;
  },
};
