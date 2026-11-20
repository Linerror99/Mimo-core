export type GoalType = "personal" | "household";

export interface Goal {
  id: string;
  household_id: string | null;
  user_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  target_amount?: number | null;
  current_amount: number;
  monthly_contribution?: number | null;
  target_date?: string | null;
  account_id?: string | null;
  destination_account_id?: string | null;
  created_at: string;
  updated_at: string;
  progress_percentage?: number;
  is_completed?: boolean;
  remaining_amount?: number;
}

export interface GoalCreate {
  goal_type: GoalType;
  name: string;
  description?: string;
  target_amount?: number;
  current_amount?: number;
  monthly_contribution?: number;
  start_date?: string;
  target_date?: string;
  account_id?: string;
  destination_account_id?: string;
}

export interface GoalUpdate {
  name?: string;
  description?: string | null;
  target_amount?: number | null;
  monthly_contribution?: number | null;
  target_date?: string | null;
  account_id?: string | null;
  destination_account_id?: string | null;
}
