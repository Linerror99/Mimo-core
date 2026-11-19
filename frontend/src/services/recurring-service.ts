import { apiRequest } from "@/lib/api-client";
import type {
  RecurringTemplate,
  RecurringTemplateCreate,
  RecurringTemplateUpdate,
} from "@/types/recurring-template";

export const recurringService = {
  async list(includeInactive = false): Promise<RecurringTemplate[]> {
    return apiRequest<RecurringTemplate[]>(
      `/recurring-templates?include_inactive=${includeInactive}`
    );
  },

  async create(data: RecurringTemplateCreate): Promise<RecurringTemplate> {
    return apiRequest<RecurringTemplate>("/recurring-templates", {
      method: "POST",
      body: data,
    });
  },

  async update(
    id: string,
    data: RecurringTemplateUpdate
  ): Promise<RecurringTemplate> {
    return apiRequest<RecurringTemplate>(`/recurring-templates/${id}`, {
      method: "PATCH",
      body: data,
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/recurring-templates/${id}`, {
      method: "DELETE",
    });
  },
};
