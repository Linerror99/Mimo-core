import { apiRequest } from "@/lib/api-client";
import type {
  RecurringTemplate,
  RecurringTemplateCreate,
  RecurringTemplateUpdate,
} from "@/types/recurring-template";

export interface BulkCancelPayload {
  start_date: string;
  end_date: string;
}

export interface BulkUpdatePayload {
  start_date: string;
  end_date: string;
  amount: number;
}

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

  async bulkCancel(
    id: string,
    payload: BulkCancelPayload
  ): Promise<{ message: string; deleted_count: number }> {
    return apiRequest<{ message: string; deleted_count: number }>(
      `/recurring-templates/${id}/bulk-cancel`,
      {
        method: "POST",
        body: payload,
      }
    );
  },

  async bulkUpdate(
    id: string,
    payload: BulkUpdatePayload
  ): Promise<{ message: string; updated_count: number; new_amount: number }> {
    return apiRequest<{
      message: string;
      updated_count: number;
      new_amount: number;
    }>(`/recurring-templates/${id}/bulk-update`, {
      method: "POST",
      body: payload,
    });
  },
};
