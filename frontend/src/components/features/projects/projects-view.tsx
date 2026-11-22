"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Compass,
  Copy,
  Edit3,
  Home,
  PartyPopper,
  Plane,
  Plus,
  RotateCcw,
  ShoppingBag,
  Sparkles,
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
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountDisplay } from "@/components/shared/amount-display";
import { cn, formatDateFr, getTodayIso } from "@/lib/utils";
import type { Account } from "@/types/account";
import type { Category } from "@/types/category";
import { TRANSACTION_STATE_LABELS } from "@/types/transaction";
import {
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectCreate,
  type ProjectDetail,
  type ProjectItem,
  type ProjectItemCreate,
  type ProjectItemUpdate,
  type ProjectSimulation,
  type ProjectUpdate,
} from "@/types/project";

const PROJECT_ICONS = [
  { name: "Compass", icon: Compass, label: "Général" },
  { name: "Plane", icon: Plane, label: "Voyage" },
  { name: "Home", icon: Home, label: "Maison" },
  { name: "Car", icon: Car, label: "Mobilité" },
  { name: "PartyPopper", icon: PartyPopper, label: "Événement" },
  { name: "ShoppingBag", icon: ShoppingBag, label: "Achats" },
] as const;

const PROJECT_COLORS = [
  "#7c3aed",
  "#6366f1",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
] as const;

const PROJECT_TEMPLATES = [
  {
    title: "Vacances / Voyage",
    name: "Voyage d'été",
    description: "Vol, hébergement, réservations et extras sur place",
    budget: "2500",
    color: "#3b82f6",
    icon: "Plane",
    items: [
      { name: "Billets de transport A/R", amount: 550, daysOffset: 15 },
      { name: "Réservation hébergement", amount: 950, daysOffset: 45 },
      { name: "Activités & sorties", amount: 350, daysOffset: 60 },
    ],
  },
  {
    title: "Travaux & Déco",
    name: "Rénovation intérieur",
    description: "Matériaux, artisanat et aménagement",
    budget: "3200",
    color: "#10b981",
    icon: "Home",
    items: [
      { name: "Peinture & matériaux", amount: 650, daysOffset: 10 },
      { name: "Main d'œuvre / Artisan", amount: 1600, daysOffset: 25 },
      { name: "Mobilier & décoration", amount: 950, daysOffset: 40 },
    ],
  },
  {
    title: "Déménagement",
    name: "Déménagement appartement",
    description: "Caution, utilitaire et fournitures",
    budget: "1700",
    color: "#f59e0b",
    icon: "Car",
    items: [
      { name: "Caution nouveau logement", amount: 1100, daysOffset: 10 },
      { name: "Location utilitaire", amount: 350, daysOffset: 20 },
      { name: "Cartons & fournitures", amount: 150, daysOffset: 5 },
    ],
  },
  {
    title: "Événement / Fête",
    name: "Organisation événement",
    description: "Lieu, traiteur et animations",
    budget: "1500",
    color: "#ec4899",
    icon: "PartyPopper",
    items: [
      { name: "Acompte salle / espace", amount: 600, daysOffset: 15 },
      { name: "Traiteur & boissons", amount: 700, daysOffset: 45 },
      { name: "Décoration & extras", amount: 200, daysOffset: 55 },
    ],
  },
];

function renderProjectIcon(iconName?: string, className = "h-5 w-5") {
  switch (iconName) {
    case "Plane":
      return <Plane className={className} />;
    case "Home":
      return <Home className={className} />;
    case "Car":
      return <Car className={className} />;
    case "PartyPopper":
      return <PartyPopper className={className} />;
    case "ShoppingBag":
      return <ShoppingBag className={className} />;
    default:
      return <Compass className={className} />;
  }
}

interface ProjectsViewProps {
  isLoading: boolean;
  projects: Project[];
  selectedProject: ProjectDetail | null;
  simulation: ProjectSimulation | null;
  accounts: Account[];
  categories: Category[];
  onSelectProject: (id: string | null) => void;
  onCreateProject: (payload: ProjectCreate) => Promise<void> | void;
  onUpdateProject: (id: string, payload: ProjectUpdate) => Promise<void> | void;
  onDeleteProject: (id: string) => Promise<void> | void;
  onDuplicateProject: (id: string) => Promise<void> | void;
  onAddProjectItem: (
    projectId: string,
    item: ProjectItemCreate
  ) => Promise<void> | void;
  onUpdateProjectItem: (
    projectId: string,
    itemId: string,
    item: ProjectItemUpdate
  ) => Promise<void> | void;
  onDeleteProjectItem: (
    projectId: string,
    itemId: string
  ) => Promise<void> | void;
  onCommitProject: (projectId: string) => Promise<void> | void;
  onRollbackProject: (projectId: string) => Promise<void> | void;
  onShiftProjectDates?: (
    projectId: string,
    payload: { days?: number; months?: number }
  ) => Promise<void> | void;
  defaultOpenCreate?: boolean;
}

export function ProjectsSkeleton() {
  return (
    <div data-testid="projects-skeleton" className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ProjectsView({
  isLoading,
  projects,
  selectedProject,
  simulation,
  accounts,
  categories,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
  onAddProjectItem,
  onUpdateProjectItem,
  onDeleteProjectItem,
  onCommitProject,
  onRollbackProject,
  onShiftProjectDates,
  defaultOpenCreate = false,
}: ProjectsViewProps) {
  // Onglets internes à la Vue 2 (Détail projet) : Dépenses prévues / Simulation What-If
  const [detailTab, setDetailTab] = useState<"expenses" | "simulation">(
    "expenses"
  );

  // Project create / edit modal
  const [projectModalOpen, setProjectModalOpen] = useState(defaultOpenCreate);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projBudget, setProjBudget] = useState("");
  const [projColor, setProjColor] = useState<string>(PROJECT_COLORS[0]);
  const [projIcon, setProjIcon] = useState<string>("Compass");
  const [projStart, setProjStart] = useState("");
  const [projEnd, setProjEnd] = useState("");
  const [templateItems, setTemplateItems] = useState<ProjectItemCreate[]>([]);

  // Item create / edit modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemDate, setItemDate] = useState(getTodayIso());
  const [itemAccountId, setItemAccountId] = useState(accounts[0]?.id || "");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  // Destructive delete confirmation
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Shift dates modal
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftDays, setShiftDays] = useState("7");
  const [shifting, setShifting] = useState(false);

  if (isLoading) return <ProjectsSkeleton />;

  const openCreateProject = () => {
    setEditingProject(null);
    setProjName("");
    setProjDesc("");
    setProjBudget("");
    setProjColor(PROJECT_COLORS[0]);
    setProjIcon("Compass");
    setProjStart("");
    setProjEnd("");
    setTemplateItems([]);
    setProjectModalOpen(true);
  };

  const openEditProject = (proj: Project) => {
    setEditingProject(proj);
    setProjName(proj.name);
    setProjDesc(proj.description || "");
    setProjBudget(proj.total_budget ? String(proj.total_budget) : "");
    setProjColor(proj.color || PROJECT_COLORS[0]);
    setProjIcon(proj.icon || "Compass");
    setProjStart(proj.target_start_date?.slice(0, 10) || "");
    setProjEnd(proj.target_end_date?.slice(0, 10) || "");
    setTemplateItems([]);
    setProjectModalOpen(true);
  };

  const applyTemplate = (tpl: (typeof PROJECT_TEMPLATES)[number]) => {
    setProjName(tpl.name);
    setProjDesc(tpl.description);
    setProjBudget(tpl.budget);
    setProjColor(tpl.color);
    setProjIcon(tpl.icon);
    const defaultAcc = accounts[0]?.id || "";
    if (defaultAcc) {
      setTemplateItems(
        tpl.items.map((it) => {
          const d = new Date();
          d.setDate(d.getDate() + it.daysOffset);
          return {
            name: it.name,
            amount: it.amount,
            planned_date: d.toISOString().slice(0, 10),
            account_id: defaultAcc,
          };
        })
      );
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    if (editingProject) {
      await onUpdateProject(editingProject.id, {
        name: projName.trim(),
        description: projDesc.trim() || null,
        total_budget: projBudget ? Number.parseFloat(projBudget) : null,
        color: projColor,
        icon: projIcon,
        target_start_date: projStart || null,
        target_end_date: projEnd || null,
      });
    } else {
      await onCreateProject({
        name: projName.trim(),
        description: projDesc.trim() || null,
        total_budget: projBudget ? Number.parseFloat(projBudget) : null,
        color: projColor,
        icon: projIcon,
        target_start_date: projStart || null,
        target_end_date: projEnd || null,
        items: templateItems.length > 0 ? templateItems : undefined,
      });
    }
    setProjectModalOpen(false);
  };

  const openCreateItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemAmount("");
    setItemDate(getTodayIso());
    setItemAccountId(accounts[0]?.id || "");
    setItemCategoryId("");
    setItemNotes("");
    setItemModalOpen(true);
  };

  const openEditItem = (item: ProjectItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemAmount(String(item.amount));
    setItemDate(item.planned_date.slice(0, 10));
    setItemAccountId(item.account_id);
    setItemCategoryId(item.category_id || "");
    setItemNotes(item.notes || "");
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const accId = itemAccountId || accounts[0]?.id;
    if (!selectedProject || !itemName.trim() || !itemAmount || !accId) return;
    if (editingItem) {
      await onUpdateProjectItem(selectedProject.id, editingItem.id, {
        name: itemName.trim(),
        amount: Number.parseFloat(itemAmount),
        planned_date: itemDate,
        account_id: accId,
        category_id: itemCategoryId || null,
        notes: itemNotes.trim() || null,
      });
    } else {
      await onAddProjectItem(selectedProject.id, {
        name: itemName.trim(),
        amount: Number.parseFloat(itemAmount),
        planned_date: itemDate,
        account_id: accId,
        category_id: itemCategoryId || null,
        notes: itemNotes.trim() || null,
      });
    }
    setItemModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* VUE 2 : PAGE DÉDIÉE AU PROJET SÉLECTIONNÉ (comme l'ancien Mimo)   */}
      {/* ================================================================= */}
      {selectedProject ? (
        <div className="space-y-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectProject(null)}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à tous les projets
            </Button>
          </div>

          <Card>
            <CardContent className="space-y-6 p-6">
              {/* En-tête du projet */}
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 dark:border-zinc-800 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: selectedProject.color || "#7c3aed" }}
                  >
                    {renderProjectIcon(selectedProject.icon, "h-6 w-6")}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                        {selectedProject.name}
                      </h1>
                      <Badge
                        variant={
                          selectedProject.status === "COMMITTED"
                            ? "success"
                            : "warning"
                        }
                      >
                        {selectedProject.status === "COMMITTED"
                          ? "Validé & Actif"
                          : PROJECT_STATUS_LABELS[selectedProject.status]}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                      {(selectedProject.target_start_date ||
                        selectedProject.target_end_date) && (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
                          <Calendar className="h-3.5 w-3.5 text-violet-500" />
                          {formatDateFr(selectedProject.target_start_date)}
                          {selectedProject.target_end_date
                            ? ` → ${formatDateFr(selectedProject.target_end_date)}`
                            : ""}
                        </span>
                      )}
                      {selectedProject.description && (
                        <span>{selectedProject.description}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Validation / Rollback + Menu ⋯ */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedProject.status === "DRAFT" ? (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={selectedProject.items.length === 0}
                      onClick={() => onCommitProject(selectedProject.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Valider et intégrer au budget
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => onRollbackProject(selectedProject.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Repasser en simulation
                    </Button>
                  )}
                  <ActionMenu
                    ariaLabel="Actions du projet"
                    items={[
                      ...(onShiftProjectDates && selectedProject.items.length > 0
                        ? [
                            {
                              label: "Décaler les dates",
                              icon: <Calendar className="h-3.5 w-3.5" />,
                              onClick: () => setShiftOpen(true),
                            },
                          ]
                        : []),
                      {
                        label: "Modifier le projet",
                        icon: <Edit3 className="h-3.5 w-3.5" />,
                        onClick: () => openEditProject(selectedProject),
                      },
                      {
                        label: "Dupliquer le projet",
                        icon: <Copy className="h-3.5 w-3.5" />,
                        onClick: () => onDuplicateProject(selectedProject.id),
                      },
                      {
                        label: "Supprimer le projet",
                        icon: <Trash2 className="h-3.5 w-3.5" />,
                        variant: "danger",
                        dividerBefore: true,
                        onClick: () => setProjectToDelete(selectedProject),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* 4 KPIs de synthèse financière du projet */}
              {(() => {
                const planned = Number(selectedProject.total_planned_amount || 0);
                const budget = selectedProject.total_budget
                  ? Number(selectedProject.total_budget)
                  : null;
                const diff = budget !== null ? budget - planned : null;
                return (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Budget alloué
                      </span>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-zinc-50">
                        {budget !== null ? (
                          <AmountDisplay amount={budget} />
                        ) : (
                          "Non fixé"
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Dépenses prévues
                      </span>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-zinc-50">
                        <AmountDisplay amount={planned} />
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Marge / Écart
                      </span>
                      <p className="mt-1 text-lg font-semibold">
                        {diff !== null ? (
                          <AmountDisplay amount={diff} signed colored />
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Postes planifiés
                      </span>
                      <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-money dark:text-zinc-50">
                        {selectedProject.items.length}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Double barre d'avancement des décaissements (projets engagés) */}
              {selectedProject.status === "COMMITTED" &&
                selectedProject.items.length > 0 &&
                (() => {
                  const todayIso = getTodayIso();
                  const totalPlanned = selectedProject.items.reduce(
                    (sum, it) => sum + Math.abs(Number(it.amount)),
                    0
                  );
                  const disbursed = selectedProject.items
                    .filter((it) =>
                      it.transaction_state
                        ? it.transaction_state === "REALIZED"
                        : it.planned_date.slice(0, 10) <= todayIso
                    )
                    .reduce((sum, it) => sum + Math.abs(Number(it.amount)), 0);
                  const remaining = Math.max(0, totalPlanned - disbursed);
                  const disbursedPct =
                    totalPlanned > 0
                      ? Math.min(100, Math.round((disbursed / totalPlanned) * 100))
                      : 0;
                  const remainingPct = Math.max(0, 100 - disbursedPct);
                  const allRealized =
                    selectedProject.items.length > 0 &&
                    selectedProject.items.every(
                      (it) => it.transaction_state === "REALIZED"
                    );

                  return (
                    <div
                      data-testid="project-disbursement-progress"
                      className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 dark:bg-emerald-500/[0.07]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-zinc-100">
                            Avancement des décaissements
                          </span>
                          {allRealized && (
                            <Badge variant="success">Terminé · 100 % payé</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Déjà décaissé :{" "}
                            <AmountDisplay
                              amount={disbursed}
                              className="font-semibold"
                            />{" "}
                            ({disbursedPct}%)
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
                            <span className="h-2 w-2 rounded-full bg-violet-500" />
                            Restant à décaisser :{" "}
                            <AmountDisplay
                              amount={remaining}
                              className="font-semibold"
                            />{" "}
                            ({remainingPct}%)
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${disbursedPct}%` }}
                        />
                        <div
                          className="h-full bg-violet-500/75 transition-all"
                          style={{ width: `${remainingPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

              {/* Onglets internes du projet : Dépenses prévues / Simulation What-If */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDetailTab("expenses")}
                  className={cn(
                    "border-b-2 px-3 pb-3 text-sm font-medium transition-colors",
                    detailTab === "expenses"
                      ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  )}
                >
                  Dépenses prévues ({selectedProject.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("simulation")}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 pb-3 text-sm font-medium transition-colors",
                    detailTab === "simulation"
                      ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Simulation What-If
                  {simulation && !simulation.is_viable && (
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </button>
              </div>

              {/* Onglet 1 : Dépenses prévues */}
              {detailTab === "expenses" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                        Paiements & réservations du projet
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Chaque dépense est associée à son compte bancaire et à
                        sa date prévue.
                      </p>
                    </div>
                    <Button size="sm" onClick={openCreateItem}>
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter une dépense
                    </Button>
                  </div>

                  {selectedProject.items.length === 0 ? (
                    <EmptyState
                      icon={<Compass className="h-5 w-5" />}
                      title="Aucune dépense planifiée"
                      description="Ajoutez vos postes de dépenses pour calculer l'impact exact sur votre trésorerie."
                      action={
                        <Button size="sm" onClick={openCreateItem}>
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter une dépense
                        </Button>
                      }
                    />
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                      {selectedProject.items.map((item) => {
                        const txState = item.transaction_state;
                        const isRealized = txState === "REALIZED";
                        const isPending = txState === "PENDING";
                        const isProjected = txState === "PROJECTED";
                        const stateBadgeVariant = isRealized
                          ? "success"
                          : isPending
                            ? "warning"
                            : "neutral";

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
                              isProjected && "opacity-70"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                                  {item.name}
                                </p>
                                {txState ? (
                                  <Badge
                                    variant={stateBadgeVariant}
                                    className={cn(isProjected && "border-dashed")}
                                  >
                                    {TRANSACTION_STATE_LABELS[txState]}
                                  </Badge>
                                ) : selectedProject.status === "DRAFT" ? (
                                  <Badge variant="neutral">Simulation</Badge>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                                {formatDateFr(item.planned_date)}
                                {item.account_name
                                  ? ` · ${item.account_name}`
                                  : ""}
                                {item.category_name
                                  ? ` · ${item.category_name}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AmountDisplay
                                amount={Number(item.amount)}
                                className={cn(
                                  "mr-1 text-sm font-semibold",
                                  isRealized
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-900 dark:text-zinc-100"
                                )}
                              />
                              <ActionMenu
                                ariaLabel={`Actions pour ${item.name}`}
                                items={[
                                  {
                                    label: "Modifier",
                                    icon: <Edit3 className="h-3.5 w-3.5" />,
                                    onClick: () => openEditItem(item),
                                  },
                                  {
                                    label: "Supprimer",
                                    icon: <Trash2 className="h-3.5 w-3.5" />,
                                    variant: "danger",
                                    dividerBefore: true,
                                    onClick: () =>
                                      onDeleteProjectItem(
                                        selectedProject.id,
                                        item.id
                                      ),
                                  },
                                ]}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Onglet 2 : Simulation What-If */
                <div
                  data-testid="whatif-simulation-panel"
                  className="space-y-4"
                >
                  {simulation ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2.5">
                          {simulation.is_viable ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                              {simulation.is_viable
                                ? "Projet viable financièrement"
                                : "Alerte trésorerie détectée"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                              Solde min Baseline :{" "}
                              <AmountDisplay
                                amount={simulation.projected_min_balance_baseline}
                              />{" "}
                              → Avec projet :{" "}
                              <AmountDisplay
                                amount={simulation.projected_min_balance_whatif}
                                colored
                              />
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={simulation.is_viable ? "success" : "danger"}
                        >
                          Coût total :{" "}
                          <AmountDisplay amount={simulation.total_cost} />
                        </Badge>
                      </div>

                      {simulation.warnings.length > 0 && (
                        <div className="space-y-1.5">
                          {simulation.warnings.map((w, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300"
                            >
                              {w.message} ({formatDateFr(w.date)})
                            </div>
                          ))}
                        </div>
                      )}

                      {simulation.timeline.length > 0 && (
                        <div className="h-64 w-full rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={simulation.timeline}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(148,163,184,0.2)"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: "#94A3B8" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: "#94A3B8" }}
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
                                  simulation.is_viable ? "#7c3aed" : "#E11D48"
                                }
                                strokeWidth={2.25}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      icon={<Sparkles className="h-5 w-5" />}
                      title="Simulation indisponible"
                      description="Ajoutez au moins un poste de dépense pour lancer la simulation What-If."
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ================================================================= */
        /* VUE 1 : GRILLE DE CARTES DE TOUS LES PROJETS (disposition ancien) */
        /* ================================================================= */
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                Projets & Simulations What-If
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                Planifiez vos enveloppes (voyages, travaux, achats) et simulez
                leur impact avant de les valider dans votre timeline.
              </p>
            </div>
            <Button onClick={openCreateProject}>
              <Plus className="h-4 w-4" />
              Nouveau projet
            </Button>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={<Compass className="h-5 w-5" />}
              title="Aucun projet planifié"
              description="Créez votre premier projet ou partez d'un modèle prêt à l'emploi pour tester votre budget."
              action={
                <Button onClick={openCreateProject}>
                  <Plus className="h-4 w-4" />
                  Créer mon premier projet
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((proj) => {
                const planned = Number(proj.total_planned_amount || 0);
                const budget = proj.total_budget
                  ? Number(proj.total_budget)
                  : null;
                const pct =
                  budget && budget > 0
                    ? Math.min(100, Math.round((planned / budget) * 100))
                    : null;
                const overBudget = budget !== null && planned > budget;

                return (
                  <Card
                    key={proj.id}
                    className="cursor-pointer transition-colors hover:border-violet-500/50"
                    onClick={() => {
                      setDetailTab("expenses");
                      onSelectProject(proj.id);
                    }}
                  >
                    <CardContent className="flex h-full flex-col justify-between p-5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                              style={{
                                backgroundColor: proj.color || "#7c3aed",
                              }}
                            >
                              {renderProjectIcon(proj.icon, "h-5 w-5")}
                            </div>
                            <div className="min-w-0">
                              <h2 className="truncate text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
                                {proj.name}
                              </h2>
                              <Badge
                                variant={
                                  proj.status === "COMMITTED"
                                    ? "success"
                                    : "warning"
                                }
                                className="mt-1"
                              >
                                {proj.status === "COMMITTED"
                                  ? "Validé & Actif"
                                  : "Simulation"}
                              </Badge>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            <ActionMenu
                              ariaLabel={`Actions pour ${proj.name}`}
                              items={[
                                {
                                  label: "Modifier",
                                  icon: <Edit3 className="h-3.5 w-3.5" />,
                                  onClick: () => openEditProject(proj),
                                },
                                {
                                  label: "Dupliquer",
                                  icon: <Copy className="h-3.5 w-3.5" />,
                                  onClick: () => onDuplicateProject(proj.id),
                                },
                                {
                                  label: "Supprimer",
                                  icon: <Trash2 className="h-3.5 w-3.5" />,
                                  variant: "danger",
                                  dividerBefore: true,
                                  onClick: () => setProjectToDelete(proj),
                                },
                              ]}
                            />
                          </div>
                        </div>

                        {proj.description && (
                          <p className="mt-3 line-clamp-2 text-xs text-slate-500 dark:text-zinc-400">
                            {proj.description}
                          </p>
                        )}

                        <div className="mt-4">
                          <div className="flex items-baseline justify-between">
                            <AmountDisplay
                              amount={planned}
                              className="text-lg font-semibold text-slate-900 dark:text-zinc-50"
                            />
                            {budget !== null && (
                              <span className="text-xs text-slate-500 dark:text-zinc-400">
                                / <AmountDisplay amount={budget} />
                              </span>
                            )}
                          </div>
                          {pct !== null && (
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  overBudget ? "bg-rose-500" : "bg-violet-600"
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-zinc-800/80 dark:text-zinc-400">
                        <span>{proj.items_count} dépense(s) prévue(s)</span>
                        <span className="font-medium text-violet-600 dark:text-violet-400">
                          Ouvrir →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Create / Edit Project (avec modèles rapides en création) */}
      <Modal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title={editingProject ? "Modifier le projet" : "Nouveau projet"}
        description="Configurez votre enveloppe ou partez d'un modèle prêt à l'emploi."
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          {!editingProject && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Modèles rapides
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-violet-500/50 hover:bg-violet-500/5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="proj-budget"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Budget alloué (€)
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
                htmlFor="proj-start"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date début
              </label>
              <input
                id="proj-start"
                type="date"
                value={projStart}
                onChange={(e) => setProjStart(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
            <div>
              <label
                htmlFor="proj-end"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Date fin
              </label>
              <input
                id="proj-end"
                type="date"
                value={projEnd}
                onChange={(e) => setProjEnd(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Icône
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_ICONS.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setProjIcon(name)}
                    title={label}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      projIcon === name
                        ? "border-violet-600 bg-violet-600/15 text-violet-600 dark:text-violet-300"
                        : "border-slate-200 text-slate-500 dark:border-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Couleur
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setProjColor(c)}
                    aria-label={`Couleur ${c}`}
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      projColor === c
                        ? "scale-110 border-slate-900 dark:border-white"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
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
            <Button type="submit">
              {editingProject ? "Enregistrer" : "Créer le projet"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add / Edit Project Item */}
      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={
          editingItem
            ? "Modifier la dépense du projet"
            : "Ajouter une dépense au projet"
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label
                htmlFor="item-category"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Catégorie
              </label>
              <select
                id="item-category"
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
              >
                <option value="">Sans catégorie</option>
                {categories
                  .filter((c) => c.type === "EXPENSE")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div>
            <label
              htmlFor="item-notes"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Notes (optionnel)
            </label>
            <input
              id="item-notes"
              type="text"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setItemModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">
              {editingItem ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shift All Project Dates Modal */}
      <Modal
        open={shiftOpen && Boolean(selectedProject)}
        onClose={() => setShiftOpen(false)}
        title="Décaler toutes les dates du projet"
        description="Décale simultanément les dates cibles, toutes les activités et les transactions futures liées."
        maxWidthClass="max-w-md"
      >
        {selectedProject && onShiftProjectDates && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { label: "+ 1 semaine", payload: { days: 7 } },
                  { label: "+ 1 mois", payload: { months: 1 } },
                  { label: "+ 3 mois", payload: { months: 3 } },
                  { label: "- 1 mois", payload: { months: -1 } },
                ] as const
              ).map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="secondary"
                  disabled={shifting}
                  onClick={async () => {
                    setShifting(true);
                    try {
                      await onShiftProjectDates(
                        selectedProject.id,
                        preset.payload
                      );
                      setShiftOpen(false);
                    } finally {
                      setShifting(false);
                    }
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const d = Number.parseInt(shiftDays, 10);
                if (Number.isNaN(d) || d === 0) return;
                setShifting(true);
                try {
                  await onShiftProjectDates(selectedProject.id, { days: d });
                  setShiftOpen(false);
                } finally {
                  setShifting(false);
                }
              }}
              className="space-y-3 border-t border-slate-200 pt-3 dark:border-zinc-800"
            >
              <div>
                <label
                  htmlFor="shift-custom-days"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Décalage personnalisé (en jours, négatif pour avancer)
                </label>
                <input
                  id="shift-custom-days"
                  type="number"
                  required
                  value={shiftDays}
                  onChange={(e) => setShiftDays(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm dark:border-zinc-800 dark:bg-[#121215]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShiftOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={shifting}>
                  {shifting ? "Décalage..." : "Appliquer"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={async () => {
          if (!projectToDelete) return;
          setDeletingProject(true);
          try {
            await onDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
          } finally {
            setDeletingProject(false);
          }
        }}
        loading={deletingProject}
        title="Supprimer ce projet ?"
        description={
          projectToDelete
            ? `Le projet « ${projectToDelete.name} » et tous ses postes planifiés seront supprimés.`
            : ""
        }
        confirmLabel="Supprimer le projet"
      />
    </div>
  );
}
