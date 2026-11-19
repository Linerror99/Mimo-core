"use client";

import React, { useRef, useState } from "react";
import { Check, Link as LinkIcon, Sparkles, Upload, X } from "lucide-react";
import { BANK_PRESETS, getBankPreset, type BankPreset } from "@/lib/bank-logos";
import { BankLogo } from "@/components/shared/bank-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BankLogoPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  accountName?: string;
}

export function BankLogoPicker({
  value,
  onChange,
  accountName,
}: BankLogoPickerProps) {
  const [mode, setMode] = useState<"preset" | "upload" | "url">("preset");
  const [customUrl, setCustomUrl] = useState(
    value && value.startsWith("http") ? value : ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = getBankPreset(accountName, value);

  const handleSelectPreset = (preset: BankPreset) => {
    onChange(preset.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    const trimmed = customUrl.trim();
    if (trimmed) onChange(trimmed);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
          Logo de la banque
        </span>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setCustomUrl("");
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:text-zinc-400"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
        <BankLogo accountName={accountName} logoUrl={value} size="md" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-zinc-100">
            {activePreset?.name || (value ? "Logo personnalisé" : "Auto-détecté")}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            {value
              ? activePreset
                ? "Preset bancaire sélectionné"
                : "Image personnalisée"
              : "Détecté automatiquement selon le nom du compte"}
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900">
        {(
          [
            { id: "preset", label: "Banques", icon: Sparkles },
            { id: "upload", label: "Fichier", icon: Upload },
            { id: "url", label: "Lien URL", icon: LinkIcon },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md py-1.5 transition-colors",
              mode === id
                ? "bg-white font-semibold text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-violet-400"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Preset Grid */}
      {mode === "preset" && (
        <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-6 dark:border-zinc-800 dark:bg-[#121215]">
          {BANK_PRESETS.map((preset) => {
            const isSelected =
              value === preset.id || (!value && activePreset?.id === preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                title={preset.name}
                className={cn(
                  "relative flex flex-col items-center rounded-xl border p-2 transition-all hover:scale-[1.03]",
                  isSelected
                    ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/30"
                    : "border-slate-100 bg-slate-50/40 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
                )}
              >
                <div className="mb-1 h-7 w-7 overflow-hidden rounded-lg">
                  {preset.icon}
                </div>
                <span className="w-full truncate text-center text-[10px] font-medium text-slate-700 dark:text-zinc-300">
                  {preset.shortName}
                </span>
                {isSelected && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Upload Mode */}
      {mode === "upload" && (
        <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">
            Importer un logo (PNG, JPG, SVG — max 2 Mo)
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Parcourir mes fichiers
          </Button>
        </div>
      )}

      {/* URL Mode */}
      {mode === "url" && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://exemple.com/logo-banque.png"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-zinc-800 dark:bg-[#121215]"
          />
          <Button type="button" size="sm" onClick={handleApplyUrl}>
            Appliquer
          </Button>
        </div>
      )}
    </div>
  );
}
