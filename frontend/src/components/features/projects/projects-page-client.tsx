"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectsView } from "@/components/features/projects/projects-view";
import { projectService } from "@/services/project-service";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import type {
  ProjectCreate,
  ProjectItemCreate,
  ProjectItemUpdate,
  ProjectUpdate,
} from "@/types/project";

export function ProjectsPageClient({
  initialProjectId,
}: {
  initialProjectId?: string;
}) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProjectId ?? null
  );

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
  });

  const { data: selectedProject = null } = useQuery({
    queryKey: ["project-detail", selectedId],
    queryFn: () => (selectedId ? projectService.getById(selectedId) : null),
    enabled: Boolean(selectedId),
  });

  const { data: simulation = null } = useQuery({
    queryKey: ["project-simulation", selectedId],
    queryFn: () => (selectedId ? projectService.simulate(selectedId) : null),
    enabled: Boolean(selectedId),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountService.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.list(),
  });

  const refreshProjects = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["project-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["project-simulation"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["projections"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
    ]);
  };

  const handleCreateProject = async (payload: ProjectCreate) => {
    try {
      const created = await projectService.create(payload);
      setSelectedId(created.id);
      toast.success(`Projet « ${created.name} » créé`);
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    }
  };

  const handleUpdateProject = async (id: string, payload: ProjectUpdate) => {
    try {
      await projectService.update(id, payload);
      toast.success("Projet mis à jour");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await projectService.remove(id);
      if (selectedId === id) setSelectedId(null);
      toast.success("Projet supprimé");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleDuplicateProject = async (id: string) => {
    try {
      const dup = await projectService.duplicate(id);
      setSelectedId(dup.id);
      toast.success("Projet dupliqué");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplication impossible");
    }
  };

  const handleAddProjectItem = async (
    projectId: string,
    item: ProjectItemCreate
  ) => {
    try {
      await projectService.addItem(projectId, item);
      toast.success("Dépense ajoutée et simulation recalculée");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ajout impossible");
    }
  };

  const handleUpdateProjectItem = async (
    projectId: string,
    itemId: string,
    item: ProjectItemUpdate
  ) => {
    try {
      await projectService.updateItem(projectId, itemId, item);
      toast.success("Dépense mise à jour");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  };

  const handleDeleteProjectItem = async (projectId: string, itemId: string) => {
    try {
      await projectService.removeItem(projectId, itemId);
      toast.success("Dépense retirée du projet");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleCommitProject = async (projectId: string) => {
    try {
      const res = await projectService.commit(projectId);
      toast.success(res.message || "Projet intégré à votre timeline");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Validation impossible");
    }
  };

  const handleRollbackProject = async (projectId: string) => {
    try {
      const res = await projectService.rollback(projectId);
      toast.success(res.message || "Projet repassé en simulation");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Annulation impossible");
    }
  };

  const handleShiftProjectDates = async (
    projectId: string,
    payload: { days?: number; months?: number }
  ) => {
    try {
      await projectService.shiftDates(projectId, payload);
      toast.success("Dates du projet décalées");
      await refreshProjects();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de décaler les dates"
      );
      throw err;
    }
  };

  return (
    <AppShell activePath="/projects">
      <ProjectsView
        isLoading={loadingProjects}
        projects={projects}
        selectedProject={selectedProject}
        simulation={simulation}
        accounts={accounts}
        categories={categories}
        onSelectProject={setSelectedId}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        onAddProjectItem={handleAddProjectItem}
        onUpdateProjectItem={handleUpdateProjectItem}
        onDeleteProjectItem={handleDeleteProjectItem}
        onCommitProject={handleCommitProject}
        onRollbackProject={handleRollbackProject}
        onShiftProjectDates={handleShiftProjectDates}
        defaultOpenCreate={searchParams.get("new") === "1"}
      />
    </AppShell>
  );
}
