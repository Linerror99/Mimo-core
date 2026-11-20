export type CategoryType = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  household_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export interface CategoryCreate {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parent_id?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
  color?: string;
  parent_id?: string | null;
}

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  INCOME: "Revenu",
  EXPENSE: "Dépense",
};

export const CATEGORY_COLOR_SWATCHES = [
  "#0F172A",
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#E11D48",
  "#6366F1",
  "#0D9488",
  "#475569",
] as const;
