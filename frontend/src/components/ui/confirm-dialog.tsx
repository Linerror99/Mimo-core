"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={
              variant === "danger"
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Traitement..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
