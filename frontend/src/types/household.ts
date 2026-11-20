export interface Household {
  id: string;
  name: string;
  type: "individual" | "couple";
  status: "active" | "archived" | "merged_into_couple";
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface CurrentHouseholdResponse {
  household: Household;
  members: HouseholdMember[];
}

export interface ArchivedHousehold {
  id: string;
  name: string;
  type: string;
  status: string;
  archived_at: string;
  members: HouseholdMember[];
  created_at: string;
}

export interface DissolveHouseholdResponse {
  archived_household: {
    id: string;
    name: string;
    status: string;
  };
  new_households: Array<{
    id: string;
    name: string;
    owner: string;
    initial_balance: number;
  }>;
}

export interface Invitation {
  id: string;
  inviter_user_id: string;
  inviter_email: string;
  inviter_name: string;
  invitee_user_id: string;
  invitee_email: string;
  invitee_name: string | null;
  type: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

export interface MemberWallet {
  user_id: string;
  user_name: string;
  balance: number;
  personal_balance: number;
  shared_contribution: number;
}

export interface SharedWallet {
  balance: number;
  split_per_person: number;
}

export interface WalletsResponse {
  household_type: "INDIVIDUAL" | "COUPLE";
  total_balance: number;
  members: Record<string, MemberWallet> | null;
  shared: SharedWallet | null;
}
