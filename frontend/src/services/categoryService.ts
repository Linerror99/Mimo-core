/**
 * Category API Service
 */
import api from "./api";
import {
  Category,
  CategoryCreate,
  CategoryUpdate,
  CategoryType,
  CategoryTree,
} from "../types/category";

export const categoryService = {
  /**
   * Create a new category
   */
  async createCategory(data: CategoryCreate): Promise<Category> {
    const response = await api.post<Category>("/categories", data);
    return response.data;
  },

  /**
   * Get all categories for the current user's household
   */
  async getCategories(
    type?: CategoryType,
    parentId?: string
  ): Promise<Category[]> {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (parentId) params.parent_id = parentId;

    const response = await api.get<Category[]>("/categories", { params });
    return response.data;
  },

  /**
   * Get categories organized as a tree
   */
  async getCategoryTree(type?: CategoryType): Promise<CategoryTree[]> {
    const params = type ? { type } : {};
    const response = await api.get<CategoryTree[]>("/categories/tree", {
      params,
    });
    return response.data;
  },

  /**
   * Get a specific category by ID
   */
  async getCategory(id: string): Promise<Category> {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  /**
   * Update a category
   */
  async updateCategory(id: string, data: CategoryUpdate): Promise<Category> {
    const response = await api.patch<Category>(`/categories/${id}`, data);
    return response.data;
  },

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
