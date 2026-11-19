import { apiRequest } from "@/lib/api-client";
import type {
  RecurringTransactionCreate,
  Transaction,
  TransactionCreate,
  TransactionFilters,
  TransactionUpdate,
} from "@/types/transaction";

export const transactionService = {
  async list(filters?: TransactionFilters): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.set("start_date", filters.start_date);
    if (filters?.end_date) params.set("end_date", filters.end_date);
    if (filters?.type) params.set("transaction_type", filters.type);
    if (filters?.account_id) params.set("account_id", filters.account_id);
    if (filters?.category_id) params.set("category_id", filters.category_id);
    if (filters?.state) params.set("state", filters.state);
    if (filters?.include_deleted !== undefined) {
      params.set("include_deleted", String(filters.include_deleted));
    }
    const qs = params.toString();
    return apiRequest<Transaction[]>(`/transactions${qs ? `?${qs}` : ""}`);
  },

  async create(data: TransactionCreate): Promise<Transaction> {
    return apiRequest<Transaction>("/transactions", {
      method: "POST",
      body: data,
    });
  },

  async createRecurring(
    data: RecurringTransactionCreate
  ): Promise<Transaction> {
    return apiRequest<Transaction>("/transactions/recurring", {
      method: "POST",
      body: data,
    });
  },

  async update(id: string, data: TransactionUpdate): Promise<Transaction> {
    return apiRequest<Transaction>(`/transactions/${id}`, {
      method: "PATCH",
      body: data,
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/transactions/${id}`, { method: "DELETE" });
  },

  async listTrash(): Promise<Transaction[]> {
    return apiRequest<Transaction[]>("/transactions/trash");
  },

  async restore(id: string): Promise<Transaction> {
    return apiRequest<Transaction>(`/transactions/${id}/restore`, {
      method: "PATCH",
    });
  },

  async permanentDelete(id: string): Promise<void> {
    await apiRequest<void>(`/transactions/${id}/permanent`, {
      method: "DELETE",
    });
  },

  async emptyTrash(): Promise<{ message: string; count: number }> {
    return apiRequest<{ message: string; count: number }>(
      "/transactions/trash",
      { method: "DELETE" }
    );
  },

  async listPending(): Promise<Transaction[]> {
    return apiRequest<Transaction[]>("/transactions/pending");
  },

  async validate(id: string, newAmount?: number): Promise<Transaction> {
    const qs = newAmount !== undefined ? `?new_amount=${newAmount}` : "";
    return apiRequest<Transaction>(`/transactions/${id}/validate${qs}`, {
      method: "PATCH",
    });
  },

  async postpone(id: string, newDate: string): Promise<Transaction> {
    return apiRequest<Transaction>(
      `/transactions/${id}/postpone?new_date=${encodeURIComponent(newDate)}`,
      { method: "PATCH" }
    );
  },
};
