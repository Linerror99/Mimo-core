import api from './api';
import {
  Project,
  ProjectCreate,
  ProjectDetail,
  ProjectUpdate,
  ProjectItem,
  ProjectItemCreate,
  ProjectItemUpdate,
  ProjectSimulation,
  ProjectCommitResult,
} from '../types/project';

export const projectService = {
  // Liste des projets
  getProjects: async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  // Détail d'un projet avec ses dépenses prévues
  getProject: async (id: string): Promise<ProjectDetail> => {
    const response = await api.get<ProjectDetail>(`/projects/${id}`);
    return response.data;
  },

  // Créer un projet
  createProject: async (data: ProjectCreate): Promise<ProjectDetail> => {
    const response = await api.post<ProjectDetail>('/projects', data);
    return response.data;
  },

  // Mettre à jour un projet
  updateProject: async (id: string, data: ProjectUpdate): Promise<ProjectDetail> => {
    const response = await api.put<ProjectDetail>(`/projects/${id}`, data);
    return response.data;
  },

  // Supprimer un projet
  deleteProject: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/projects/${id}`);
    return response.data;
  },

  // Ajouter une dépense planifiée
  addItem: async (projectId: string, data: ProjectItemCreate): Promise<ProjectItem> => {
    const response = await api.post<ProjectItem>(`/projects/${projectId}/items`, data);
    return response.data;
  },

  // Modifier une dépense planifiée
  updateItem: async (projectId: string, itemId: string, data: ProjectItemUpdate): Promise<ProjectItem> => {
    const response = await api.put<ProjectItem>(`/projects/${projectId}/items/${itemId}`, data);
    return response.data;
  },

  // Supprimer une dépense planifiée
  deleteItem: async (projectId: string, itemId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/projects/${projectId}/items/${itemId}`);
    return response.data;
  },

  // Lancer la simulation What-If
  simulate: async (projectId: string): Promise<ProjectSimulation> => {
    const response = await api.get<ProjectSimulation>(`/projects/${projectId}/simulate`);
    return response.data;
  },

  // Valider le projet (générer les transactions réelles)
  commit: async (projectId: string): Promise<ProjectCommitResult> => {
    const response = await api.post<ProjectCommitResult>(`/projects/${projectId}/commit`);
    return response.data;
  },

  // Repasser le projet en brouillon/simulation (retirer les transactions projetées)
  rollback: async (projectId: string): Promise<ProjectCommitResult> => {
    const response = await api.post<ProjectCommitResult>(`/projects/${projectId}/rollback`);
    return response.data;
  },
};
