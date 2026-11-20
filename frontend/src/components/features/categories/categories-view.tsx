"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, Edit3, Plus, Tag, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_COLOR_SWATCHES,
  CATEGORY_TYPE_LABELS,
  type Category,
  type CategoryCreate,
  type CategoryType,
  type CategoryUpdate,
} from "@/types/category";
import { cn } from "@/lib/utils";

interface CategoriesViewProps {
  isLoading: boolean;
  categories: Category[];
  onCreate: (payload: CategoryCreate) => Promise<void> | void;
  onUpdate: (id: string, payload: CategoryUpdate) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function CategoriesSkeleton() {
  return (
    <div data-testid="categories-skeleton" className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function CategoriesView({
  isLoading,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: CategoriesViewProps) {
  const [activeTab, setActiveTab] = useState<CategoryType>("EXPENSE");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLOR_SWATCHES[1]);
  const [parentId, setParentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () => categories.filter((c) => c.type === activeTab),
    [categories, activeTab]
  );

  const parentCategories = useMemo(
    () => filtered.filter((c) => !c.parent_id),
    [filtered]
  );

  if (isLoading) return <CategoriesSkeleton />;

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor(CATEGORY_COLOR_SWATCHES[1]);
    setParentId("");
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color || CATEGORY_COLOR_SWATCHES[1]);
    setParentId(cat.parent_id || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await onUpdate(editing.id, {
          name: name.trim(),
          color,
          parent_id: parentId || null,
        });
      } else {
        await onCreate({
          name: name.trim(),
          type: activeTab,
          color,
          parent_id: parentId || null,
        });
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Catégories
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Organisez vos dépenses et revenus par poste budgétaire.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
        {(["EXPENSE", "INCOME"] as CategoryType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-slate-600 dark:text-zinc-400"
            )}
          >
            {CATEGORY_TYPE_LABELS[tab]}s (
            {categories.filter((c) => c.type === tab).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-5 w-5" />}
          title={`Aucune catégorie de ${CATEGORY_TYPE_LABELS[activeTab].toLowerCase()}`}
          description="Créez des catégories claires pour analyser vos flux dans le tableau de bord."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Créer une catégorie
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => {
            const parent = cat.parent_id
              ? categories.find((c) => c.id === cat.parent_id)
              : null;
            return (
              <Card key={cat.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: cat.color || "#2563EB" }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-100">
                        {cat.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge
                          variant={
                            cat.type === "INCOME" ? "success" : "neutral"
                          }
                        >
                          {CATEGORY_TYPE_LABELS[cat.type]}
                        </Badge>
                        {parent && (
                          <span className="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                            ↳ {parent.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ActionMenu
                    ariaLabel={`Actions pour ${cat.name}`}
                    items={[
                      {
                        label: "Voir les opérations",
                        icon: <ArrowRight className="h-3.5 w-3.5" />,
                        href: `/timeline?category_id=${cat.id}`,
                      },
                      {
                        label: "Modifier",
                        icon: <Edit3 className="h-3.5 w-3.5" />,
                        onClick: () => openEdit(cat),
                      },
                      {
                        label: "Supprimer",
                        icon: <Trash2 className="h-3.5 w-3.5" />,
                        variant: "danger",
                        dividerBefore: true,
                        onClick: () => setCatToDelete(cat),
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="cat-name"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Nom
            </label>
            <input
              id="cat-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Logement, Alimentation, Salaire"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            />
          </div>

          <div>
            <label
              htmlFor="cat-parent"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Catégorie parente (optionnel)
            </label>
            <select
              id="cat-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#121215]"
            >
              <option value="">Aucune (catégorie principale)</option>
              {parentCategories
                .filter((p) => p.id !== editing?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Couleur
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Couleur ${swatch}`}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === swatch
                      ? "scale-110 border-slate-900 dark:border-white"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(catToDelete)}
        onClose={() => setCatToDelete(null)}
        onConfirm={async () => {
          if (!catToDelete) return;
          setDeleting(true);
          try {
            await onDelete(catToDelete.id);
            setCatToDelete(null);
          } finally {
            setDeleting(false);
          }
        }}
        loading={deleting}
        title="Supprimer cette catégorie ?"
        description={
          catToDelete
            ? `La catégorie « ${catToDelete.name} » sera supprimée. Les transactions existantes resteront intactes.`
            : ""
        }
        confirmLabel="Supprimer"
      />
    </div>
  );
}
