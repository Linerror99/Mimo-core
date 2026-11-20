"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { CategoriesView } from "@/components/features/categories/categories-view";
import { categoryService } from "@/services/category-service";
import type { CategoryCreate, CategoryUpdate } from "@/types/category";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.list(),
  });

  const handleCreate = async (payload: CategoryCreate) => {
    try {
      await categoryService.create(payload);
      toast.success("Catégorie créée");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
      throw err;
    }
  };

  const handleUpdate = async (id: string, payload: CategoryUpdate) => {
    try {
      await categoryService.update(id, payload);
      toast.success("Catégorie mise à jour");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await categoryService.remove(id);
      toast.success("Catégorie supprimée");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  return (
    <AppShell activePath="/categories">
      <CategoriesView
        isLoading={isLoading}
        categories={categories}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </AppShell>
  );
}
