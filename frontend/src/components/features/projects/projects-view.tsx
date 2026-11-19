"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FolderKanban,
  Play,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { cn, formatDateFr, getTodayIso } from "@/lib/utils";
import type { Account } from "@/types/account";
import type { Goal, GoalCreate, GoalType } from "@/types/goal";
import {
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectCreate,
  type ProjectDetail,
  type ProjectItemCreate,
  type ProjectSimulation,
} from "@/types/project";

interface ProjectsViewProps {
  isLoading: boolean;
  initialTab?: "projects" | "goals";
  projects: Project[];
  selectedProject: ProjectDetail | null;
  simulation: ProjectSimulation | null;
  goals: Goal[];
  accounts: Account[];
  isInCouple?: boolean;
  onSelectProject: (id: string) => void;
  onCreateProject: (payload: ProjectCreate) => Promise<void> | void;
  onDeleteProject: (id: string) => Promise<void> | void;
  onDuplicateProject: (id: string) => Promise<void> | void;
  onAddProjectItem: (
    projectId: string,
    item: ProjectItemCreate
  ) => Promise<void> | void;
  onDeleteProjectItem: (projectId: string, itemId: string) => Promise<void> | void;
  onCommitProject: (projectId: string) => Promise<void> | void;
  onRollbackProject: (projectId: string) => Promise<void> | void;
  onCreateGoal: (payload: GoalCreate) => Promise<void> | void;
  onAddGoalContribution: (goalId: string, amount: number) => Promise<void> | void;
  onDeleteGoal: (goalId: string) => Promise<void> | void;
  defaultOpenCreate?: boolean;
}

export function ProjectsSkeleton() {
  return (
    <div data-testid="projects-skeleton" className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}

export function ProjectsView({
  isLoading,
  initialTab = "projects",
  projects,
  selectedProject,
  simulation,
  goals,
  accounts,
  isInCouple = false,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onAddProjectItem,
  onDeleteProjectItem,
  onCommitProject,
  onRollbackProject,
  onCreateGoal,
  onAddGoalContribution,
  onDeleteGoal,
  defaultOpenCreate = false,
}: ProjectsViewProps) {
  const [activeTab, setActiveTab] = useState<"projects" | "goals">(initialTab);

  // Project create modal
  const [projectModalOpen, setProjectModalOpen] = useState(
    defaultOpenCreate && initialTab === "projects"
  );
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projBudget, setProjBudget] = useState("");

  // Project item modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemDate, setItemDate] = useState(getTodayIso());
  const [itemAccountId, setItemAccountId] = useState(accounts[0]?.id || "");

  // Goal create modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("personal");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("0");
  const [goalDate, setGoalDate] = useState("");

  // Contribution modal
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState("");

  if (isLoading) return <ProjectsSkeleton />;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    await onCreateProject({
      name: projName.trim(),
      description: projDesc.trim() || null,
      total_budget: projBudget ? Number.parseFloat(projBudget) : null,
      color: "#2563EB",
    });
    setProjectModalOpen(false);
    setProjName("");
    setProjDesc("");
    setProjBudget("");
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const accId = itemAccountId || accounts[0]?.id;
    if (!selectedProject || !itemName.trim() || !itemAmount || !accId) return;
    await onAddProjectItem(selectedProject.id, {
      name: itemName.trim(),
      amount: Number.parseFloat(itemAmount),
      planned_date: itemDate,
      account_id: accId,
    });
    setItemModalOpen(false);
    setItemName("");
    setItemAmount("");
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;
    await onCreateGoal({
      goal_type: goalType,
      name: goalName.trim(),
      target_amount: goalTarget ? Number.parseFloat(goalTarget) : undefined,
      current_amount: Number.parseFloat(goalCurrent) || 0,
      target_date: goalDate || undefined,
    });
    setGoalModalOpen(false);
    setGoalName("");
    setGoalTarget("");
    setGoalCurrent("0");
    setGoalDate("");
  };

  const handleSubmitContrib = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoal || !contribAmount) return;
    await onAddGoalContribution(
      contribGoal.id,
      Number.parseFloat(contribAmount)
    );
    setContribGoal(null);
    setContribAmount("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Projets & Objectifs d&apos;épargne
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Simulez vos projets (What-If) avant de les valider et suivez vos
            cagnottes d&apos;épargne.
          </p>
        </div>

        <Button
          onClick={() =>
            activeTab === "projects"
              ? setProjectModalOpen(true)
              : setGoalModalOpen(true)
          }
        >
          <Plus className="h-4 w-4" />
          {activeTab === "projects" ? "Nouveau projet" : "Nouvel objectif"}
        </Button>
      </div>

      {/* Unified Tabs */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={cn(
            "rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "projects"
              ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-slate-600 dark:text-zinc-400"
          )}
        >
          Projets & What-If ({projects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("goals")}
          className={cn(
            "rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "goals"
              ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-slate-600 dark:text-zinc-400"
          )}
        >
          Objectifs d&apos;épargne ({goals.length})
        </button>
      </div>

      {activeTab === "projects" ? (
        projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="Aucun projet planifié"
            description="Créez une enveloppe (vacances, travaux, achat majeur) pour simuler son impact sur votre trésorerie."
            action={
              <Button onClick={() => setProjectModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Créer mon premier projet
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Projects List */}
            <div className="space-y-2.5">
              {projects.map((p) => {
                const isSelected = selectedProject?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProject(p.id)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-colors",
                      isSelected
                        ? "border-slate-900 bg-white shadow-sm dark:border-zinc-200 dark:bg-[#18181B]"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-[#121215] dark:hover:bg-zinc-900/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                        {p.name}
                      </p>
                      <Badge
                        variant={p.status === "COMMITTED" ? "success" : "info"}
                      >
                        {PROJECT_STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span>{p.items_count} poste(s)</span>
                      <AmountDisplay
                        amount={Number(p.total_planned_amount)}
                        className="font-semibold text-slate-900 dark:text-zinc-100"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Project Detail & What-If Panel */}
            <div className="space-y-4 lg:col-span-2">
              {selectedProject ? (
                <>
                  <Card>
                    <CardHeader>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{selectedProject.name}</CardTitle>
                          <Badge
                            variant={
                              selectedProject.status === "COMMITTED"
                                ? "success"
                                : "info"
                            }
                          >
                            {PROJECT_STATUS_LABELS[selectedProject.status]}
                          </Badge>
                        </div>
                        {selectedProject.description && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                            {selectedProject.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedProject.status === "DRAFT" ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onCommitProject(selectedProject.id)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Valider dans la timeline
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              onRollbackProject(selectedProject.id)
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Repasser en simulation
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onDuplicateProject(selectedProject.id)}
                          aria-label="Dupliquer le projet"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger-outline"
                          onClick={() => onDeleteProject(selectedProject.id)}
                          aria-label="Supprimer le projet"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* What-If Simulation Verdict */}
                      {simulation && (
                        <div
                          data-testid="whatif-simulation-panel"
                          className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {simulation.is_viable ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                              )}
                              <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                                {simulation.is_viable
                                  ? "Projet viable financièrement"
                                  : "Alerte trésorerie détectée"}
                              </span>
                            </div>
                            <Badge
                              variant={
                                simulation.is_viable ? "success" : "danger"
                              }
                            >
                              Solde min What-If :{" "}
                              <AmountDisplay
                                amount={simulation.projected_min_balance_whatif}
                              />
                            </Badge>
                          </div>

                          {simulation.warnings.length > 0 && (
                            <div className="space-y-1.5">
                              {simulation.warnings.map((w, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                                >
                                  {w.message} ({formatDateFr(w.date)})
                                </div>
                              ))}
                            </div>
                          )}

                          {simulation.timeline.length > 0 && (
                            <div className="h-52 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={simulation.timeline}>
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(148,163,184,0.2)"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <YAxis
                                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "#18181B",
                                      borderColor: "#27272A",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      color: "#FAFAFA",
                                    }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="baseline_balance"
                                    name="Baseline"
                                    stroke="#94A3B8"
                                    strokeWidth={1.75}
                                    dot={false}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="whatif_balance"
                                    name="Avec projet"
                                    stroke={
                                      simulation.is_viable
                                        ? "#10B981"
                                        : "#E11D48"
                                    }
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Planned Items */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                            Dépenses planifiées ({selectedProject.items.length})
                          </h3>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setItemModalOpen(true)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Ajouter un poste
                          </Button>
                        </div>

                        {selectedProject.items.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                            Aucun poste de dépense ajouté à ce projet.
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                            {selectedProject.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 px-4 py-2.5"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                                    {formatDateFr(item.planned_date)}
                                    {item.account_name
                                      ? ` · ${item.account_name}`
                                      : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <AmountDisplay
                                    amount={Number(item.amount)}
                                    className="text-sm font-semibold text-slate-900 dark:text-zinc-100"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onDeleteProjectItem(
                                        selectedProject.id,
                                        item.id
                                      )
                                    }
                                    aria-label={`Supprimer ${item.name}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-500/10 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <EmptyState
                  icon={<FolderKanban className="h-5 w-5" />}
                  title="Sélectionnez un projet"
                  description="Cliquez sur un projet à gauche pour inspecter ses dépenses et lancer sa simulation What-If."
                />
              )}
            </div>
          </div>
        )
      ) : /* Goals Tab */
      goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="Aucun objectif d'épargne"
          description="Fixez un montant cible pour votre épargne de précaution, un apport immobilier ou un projet commun."
          action={
            <Button onClick={() => setGoalModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Créer un objectif
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const target = Number(goal.target_amount || 0);
            const current = Number(goal.current_amount || 0);
            const pct =
              goal.progress_percentage ??
              (target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0);

            return (
              <Card key={goal.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
                        {goal.name}
                      </h2>
                      <Badge
                        variant={goal.household_id ? "info" : "neutral"}
                        className="mt-1"
                      >
                        {goal.household_id ? "Foyer" : "Personnel"}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      aria-label={`Supprimer l'objectif ${goal.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <AmountDisplay
                        amount={current}
                        className="text-base font-semibold text-slate-900 dark:text-zinc-50"
                      />
                      {target > 0 && (
                        <span className="font-mono text-slate-500 tabular-money dark:text-zinc-400">
                          / <AmountDisplay amount={target} /> ({pct}%)
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct >= 100 ? "bg-emerald-500" : "bg-blue-600"
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {goal.target_date
                        ? `Échéance : ${formatDateFr(goal.target_date)}`
                        : "Sans échéance"}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setContribGoal(goal);
                        setContribAmount("");
                      }}
                    >
                      + Contribuer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: New Project */}
      <Modal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title="Nouveau projet"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label
              htmlFor="proj-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom du projet
            </label>
            <input
              id="proj-name"
              type="text"
              required
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Ex. Voyage Japon, Rénovation cuisine"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div>
            <label
              htmlFor="proj-budget"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Budget cible (€, optionnel)
            </label>
            <input
              id="proj-budget"
              type="number"
              step="0.01"
              value={projBudget}
              onChange={(e) => setProjBudget(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div>
            <label
              htmlFor="proj-desc"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Description
            </label>
            <textarea
              id="proj-desc"
              rows={2}
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProjectModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">Créer le projet</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Project Item */}
      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title="Ajouter un poste de dépense"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label
              htmlFor="item-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Libellé
            </label>
            <input
              id="item-name"
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Ex. Billets d'avion"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="item-amount"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Montant (€)
              </label>
              <input
                id="item-amount"
                type="number"
                step="0.01"
                required
                value={itemAmount}
                onChange={(e) => setItemAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <div>
              <label
                htmlFor="item-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date prévue
              </label>
              <input
                id="item-date"
                type="date"
                required
                value={itemDate}
                onChange={(e) => setItemDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="item-account"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Compte
            </label>
            <select
              id="item-account"
              value={itemAccountId || accounts[0]?.id || ""}
              onChange={(e) => setItemAccountId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setItemModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Goal */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Nouvel objectif d'épargne"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label
              htmlFor="goal-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom de l&apos;objectif
            </label>
            <input
              id="goal-name"
              type="text"
              required
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="Ex. Épargne de précaution"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          {isInCouple && (
            <div>
              <label
                htmlFor="goal-type"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Portée
              </label>
              <select
                id="goal-type"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                <option value="personal">Personnel</option>
                <option value="household">Commun (Foyer)</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="goal-target"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Cible (€)
              </label>
              <input
                id="goal-target"
                type="number"
                step="0.01"
                required
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <div>
              <label
                htmlFor="goal-current"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Déjà épargné (€)
              </label>
              <input
                id="goal-current"
                type="number"
                step="0.01"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="goal-date"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Date cible (optionnel)
            </label>
            <input
              id="goal-date"
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setGoalModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">Créer l&apos;objectif</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Contribute to Goal */}
      <Modal
        open={Boolean(contribGoal)}
        onClose={() => setContribGoal(null)}
        title={`Contribuer à « ${contribGoal?.name ?? ""} »`}
      >
        <form onSubmit={handleSubmitContrib} className="space-y-4">
          <div>
            <label
              htmlFor="contrib-amount"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Montant à ajouter (ou négatif pour retirer) (€)
            </label>
            <input
              id="contrib-amount"
              type="number"
              step="0.01"
              required
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setContribGoal(null)}
            >
              Annuler
            </Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
