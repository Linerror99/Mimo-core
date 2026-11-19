import { apiRequest } from "@/lib/api-client";
import type {
  Project,
  ProjectCommitResult,
  ProjectCreate,
  ProjectDetail,
  ProjectItem,
  ProjectItemCreate,
  ProjectItemUpdate,
  ProjectSimulation,
  ProjectUpdate,
} from "@/types/project";

export const projectService = {
  async list(): Promise<Project[]> {
    return apiRequest<Project[]>("/projects");
  },

  async getById(id: string): Promise<ProjectDetail> {
    return apiRequest<ProjectDetail>(`/projects/${id}`);
  },

  async create(data: ProjectCreate): Promise<ProjectDetail> {
    return apiRequest<ProjectDetail>("/projects", {
      method: "POST",
      body: data,
    });
  },

  async update(id: string, data: ProjectUpdate): Promise<ProjectDetail> {
    return apiRequest<ProjectDetail>(`/projects/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/projects/${id}`, { method: "DELETE" });
  },

  async duplicate(id: string): Promise<ProjectDetail> {
    return apiRequest<ProjectDetail>(`/projects/${id}/duplicate`, {
      method: "POST",
    });
  },

  async addItem(
    projectId: string,
    data: ProjectItemCreate
  ): Promise<ProjectItem> {
    return apiRequest<ProjectItem>(`/projects/${projectId}/items`, {
      method: "POST",
      body: data,
    });
  },

  async updateItem(
    projectId: string,
    itemId: string,
    data: ProjectItemUpdate
  ): Promise<ProjectItem> {
    return apiRequest<ProjectItem>(`/projects/${projectId}/items/${itemId}`, {
      method: "PUT",
      body: data,
    });
  },

  async removeItem(
    projectId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/projects/${projectId}/items/${itemId}`, {
      method: "DELETE",
    });
  },

  async simulate(projectId: string): Promise<ProjectSimulation> {
    return apiRequest<ProjectSimulation>(`/projects/${projectId}/simulate`);
  },

  async commit(projectId: string): Promise<ProjectCommitResult> {
    return apiRequest<ProjectCommitResult>(`/projects/${projectId}/commit`, {
      method: "POST",
    });
  },

  async rollback(projectId: string): Promise<ProjectCommitResult> {
    return apiRequest<ProjectCommitResult>(`/projects/${projectId}/rollback`, {
      method: "POST",
    });
  },
};
