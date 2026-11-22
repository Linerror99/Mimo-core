import { apiRequest } from "@/lib/api-client";
import type {
  AccountLinkMapping,
  BankCallbackResponse,
  BankConnectPayload,
  BankConnectResponse,
  BankConnection,
  BankInstitution,
  BankSyncSummary,
  MergeBankTransactionResponse,
} from "@/types/banking";

export const bankingService = {
  async listInstitutions(
    country = "FR",
    search?: string
  ): Promise<BankInstitution[]> {
    const params = new URLSearchParams({ country });
    if (search && search.trim()) params.set("search", search.trim());
    return apiRequest<BankInstitution[]>(
      `/banking/institutions?${params.toString()}`
    );
  },

  async connect(payload: BankConnectPayload): Promise<BankConnectResponse> {
    return apiRequest<BankConnectResponse>("/banking/connect", {
      method: "POST",
      body: payload,
    });
  },

  async callback(code: string, state: string): Promise<BankCallbackResponse> {
    return apiRequest<BankCallbackResponse>("/banking/callback", {
      method: "POST",
      body: { code, state },
    });
  },

  async linkAccounts(
    connectionId: string,
    mappings: AccountLinkMapping[],
    runInitialSync = true
  ): Promise<BankSyncSummary> {
    return apiRequest<BankSyncSummary>(
      `/banking/connections/${connectionId}/link-accounts`,
      {
        method: "POST",
        body: { mappings, run_initial_sync: runInitialSync },
      }
    );
  },

  async listConnections(): Promise<BankConnection[]> {
    return apiRequest<BankConnection[]>("/banking/connections");
  },

  async deleteConnection(connectionId: string): Promise<void> {
    await apiRequest<void>(`/banking/connections/${connectionId}`, {
      method: "DELETE",
    });
  },

  async syncAll(): Promise<BankSyncSummary> {
    return apiRequest<BankSyncSummary>("/banking/sync", { method: "POST" });
  },

  async syncConnection(connectionId: string): Promise<BankSyncSummary> {
    return apiRequest<BankSyncSummary>(
      `/banking/connections/${connectionId}/sync`,
      { method: "POST" }
    );
  },

  async mergeTransaction(
    importedTxId: string,
    targetTransactionId: string
  ): Promise<MergeBankTransactionResponse> {
    return apiRequest<MergeBankTransactionResponse>(
      `/banking/transactions/${importedTxId}/merge`,
      {
        method: "POST",
        body: { target_transaction_id: targetTransactionId },
      }
    );
  },

  async unlinkTransaction(txId: string): Promise<void> {
    await apiRequest(`/banking/transactions/${txId}/unlink`, {
      method: "POST",
    });
  },
};
