export interface BankInstitution {
  name: string;
  country: string;
  logo?: string | null;
  bic?: string | null;
}

export interface BankConnectPayload {
  institution_name: string;
  institution_country?: string;
  institution_logo?: string | null;
  redirect_url?: string;
}

export interface BankConnectResponse {
  connection_id: string;
  auth_url: string;
  state: string;
  provider: string;
}

export interface DiscoveredBankAccount {
  external_account_id: string;
  name: string;
  iban_masked?: string | null;
  currency: string;
  balance?: number | null;
  account_type: string;
}

export interface BankCallbackResponse {
  connection_id: string;
  institution_name: string;
  status: string;
  consent_expires_at?: string | null;
  discovered_accounts: DiscoveredBankAccount[];
}

export interface AccountLinkMapping {
  external_account_id: string;
  mimo_account_id?: string | null;
  new_account_name?: string | null;
  new_account_type?: string;
  iban_masked?: string | null;
  currency?: string;
  initial_balance?: number | null;
  sync_from_date?: string | null;
  sync_enabled?: boolean;
}

export interface BankConnectionAccountSummary {
  id: string;
  name: string;
  iban_masked?: string | null;
  sync_enabled: boolean;
  sync_from_date?: string | null;
}

export interface BankConnection {
  id: string;
  provider: string;
  institution_name: string;
  institution_country: string;
  institution_logo?: string | null;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "ERROR" | string;
  consent_expires_at?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  days_until_expiry?: number | null;
  linked_accounts: BankConnectionAccountSummary[];
  discovered_accounts: DiscoveredBankAccount[];
  created_at: string;
}

export interface BankSyncSummary {
  connections_synced: number;
  accounts_synced: number;
  imported: number;
  matched: number;
  skipped: number;
  errors: string[];
}

export interface MergeBankTransactionResponse {
  merged_transaction_id: string;
  removed_imported_id: string;
  amount: number;
  transaction_date: string;
  state: string;
  type?: string | null;
  external_transaction_id?: string | null;
  destination_external_transaction_id?: string | null;
  import_source: string;
}
