export type ProjectStatus = 'DRAFT' | 'COMMITTED' | 'COMPLETED' | 'CANCELLED';

export interface ProjectItem {
  id: string;
  project_id: string;
  name: string;
  amount: number;
  planned_date: string;
  account_id: string;
  category_id?: string | null;
  owner_user_id?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  account_name?: string | null;
  category_name?: string | null;
  owner_name?: string | null;
}

export interface ProjectItemCreate {
  name: string;
  amount: number;
  planned_date: string;
  account_id: string;
  category_id?: string | null;
  owner_user_id?: string | null;
  notes?: string | null;
}

export interface ProjectItemUpdate {
  name?: string;
  amount?: number;
  planned_date?: string;
  account_id?: string;
  category_id?: string | null;
  owner_user_id?: string | null;
  notes?: string | null;
}

export interface Project {
  id: string;
  household_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  target_start_date?: string | null;
  target_end_date?: string | null;
  total_budget?: number | null;
  status: ProjectStatus;
  total_planned_amount: number;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  items: ProjectItem[];
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
  target_start_date?: string | null;
  target_end_date?: string | null;
  total_budget?: number | null;
  items?: ProjectItemCreate[];
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  target_start_date?: string | null;
  target_end_date?: string | null;
  total_budget?: number | null;
  status?: ProjectStatus;
}

export interface SimulationWarning {
  type: string;
  severity: 'CRITICAL' | 'WARNING';
  account_id?: string | null;
  account_name?: string | null;
  date: string;
  balance: number;
  message: string;
}

export interface SimulationTimelinePoint {
  date: string;
  baseline_balance: number;
  whatif_balance: number;
  impact: number;
  accounts: Record<string, { name: string; baseline: number; whatif: number }>;
}

export interface ProjectSimulation {
  project_id: string;
  project_name: string;
  is_viable: bool;
  status: ProjectStatus;
  total_cost: number;
  current_balance: number;
  projected_min_balance_baseline: number;
  projected_min_balance_whatif: number;
  critical_account_name?: string | null;
  critical_date?: string | null;
  warnings: SimulationWarning[];
  timeline: SimulationTimelinePoint[];
}

export interface ProjectCommitResult {
  success: boolean;
  project_id: string;
  status: ProjectStatus;
  transactions_created: number;
  message: string;
}
