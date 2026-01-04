/**
 * Category Types
 */

export enum CategoryType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

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

export interface CategoryCreate {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parent_id?: string;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  [CategoryType.INCOME]: "Revenu",
  [CategoryType.EXPENSE]: "Dépense",
};

export const DEFAULT_CATEGORY_COLORS = [
  "#27AE60", // Green
  "#E74C3C", // Red
  "#3498DB", // Blue
  "#F39C12", // Orange
  "#9B59B6", // Purple
  "#1ABC9C", // Turquoise
  "#E67E22", // Dark Orange
  "#34495E", // Dark Gray
  "#16A085", // Dark Turquoise
  "#C0392B", // Dark Red
];

export const DEFAULT_CATEGORY_ICONS = [
  "🏠", "🍔", "🚗", "🎮", "💊", "🎓", "✈️", "🛒",
  "💰", "💳", "📱", "⚡", "🎬", "🏋️", "🎨", "📚",
];
