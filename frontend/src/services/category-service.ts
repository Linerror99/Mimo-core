import { apiRequest } from "@/lib/api-client";
import type {
  Category,
  CategoryCreate,
  CategoryTree,
  CategoryType,
  CategoryUpdate,
} from "@/types/category";

export const categoryService = {
  async list(type?: CategoryType, parentId?: string): Promise<Category[]> {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (parentId) params.set("parent_id", parentId);
    const qs = params.toString();
    return apiRequest<Category[]>(`/categories${qs ? `?${qs}` : ""}`);
  },

  async getTree(type?: CategoryType): Promise<CategoryTree[]> {
    const qs = type ? `?type=${type}` : "";
    return apiRequest<CategoryTree[]>(`/categories/tree${qs}`);
  },

  async create(data: CategoryCreate): Promise<Category> {
    return apiRequest<Category>("/categories", { method: "POST", body: data });
  },

  async update(id: string, data: CategoryUpdate): Promise<Category> {
    return apiRequest<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: data,
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/categories/${id}`, { method: "DELETE" });
  },
};
