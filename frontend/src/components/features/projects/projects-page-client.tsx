"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectsView } from "@/components/features/projects/projects-view";
import { projectService } from "@/services/project-service";
import { goalService } from "@/services/goal-service";
import { accountService } from "@/services/account-service";
import { useAuthStore } from "@/stores/auth-store";
import type { GoalCreate } from "@/types/goal";
import type { ProjectCreate, ProjectItemCreate } from "@/types/project";

export function ProjectsPageClient({
  initialProjectId,
}: {
  initialProjectId?: string;
}) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProjectId ?? null
  );

  const initialTab =
    searchParams.get("tab") === "goals" ? "goals" : "projects";

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
  });

  useEffect(() => {
    if (!selectedId && projects.length > 0) {
      setSelectedId(projects[0].id);
    }
  }, [selectedId, projects]);

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

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => goalService.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountService.list(),
  });

  const refreshProjects = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["project-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["project-simulation"] }),
    ]);
  };

  const handleCreateProject = async (payload: ProjectCreate) => {
    try {
      const created = await projectService.create(payload);
      setSelectedId(created.id);
      toast.success("Projet créé");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
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
      toast.success("Poste ajouté");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ajout impossible");
    }
  };

  const handleDeleteProjectItem = async (projectId: string, itemId: string) => {
    try {
      await projectService.removeItem(projectId, itemId);
      toast.success("Poste supprimé");
      await refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const handleCommitProject = async (projectId: string) => {
    try {
      const res = await projectService.commit(projectId);
      toast.success(res.message || "Projet injecté dans la timeline");
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

  const handleCreateGoal = async (payload: GoalCreate) => {
    if (!user) return;
    try {
      await goalService.create(payload, {
        userId: user.id,
        householdId: user.household_id,
      });
      toast.success("Objectif créé");
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    }
  };

  const handleAddGoalContribution = async (goalId: string, amount: number) => {
    try {
      await goalService.addContribution(goalId, amount);
      toast.success("Contribution enregistrée");
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await goalService.remove(goalId);
      toast.success("Objectif supprimé");
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  return (
    <AppShell activePath="/projects">
      <ProjectsView
        isLoading={loadingProjects || loadingGoals}
        initialTab={initialTab}
        projects={projects}
        selectedProject={selectedProject}
        simulation={simulation}
        goals={goals}
        accounts={accounts}
        isInCouple={Boolean(user?.is_in_couple)}
        onSelectProject={setSelectedId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        onAddProjectItem={handleAddProjectItem}
        onDeleteProjectItem={handleDeleteProjectItem}
        onCommitProject={handleCommitProject}
        onRollbackProject={handleRollbackProject}
        onCreateGoal={handleCreateGoal}
        onAddGoalContribution={handleAddGoalContribution}
        onDeleteGoal={handleDeleteGoal}
        defaultOpenCreate={searchParams.get("new") === "1"}
      />
    </AppShell>
  );
}
