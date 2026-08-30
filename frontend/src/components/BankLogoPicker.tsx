import React, { useState, useRef } from 'react'
import { BANK_PRESETS, BankPreset, getBankPreset } from '@/utils/bankLogos'
import { BankLogo } from '@/components/BankLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Link as LinkIcon, Sparkles, X, Check } from 'lucide-react'

interface BankLogoPickerProps {
  value?: string | null
  accountName?: string
  onChange: (logoUrl: string | null) => void
}

export function BankLogoPicker({ value, accountName, onChange }: BankLogoPickerProps) {
  const [mode, setMode] = useState<'preset' | 'upload' | 'url'>('preset')
  const [customUrl, setCustomUrl] = useState(value && (value.startsWith('http') || value.startsWith('data:')) ? value : '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activePreset = getBankPreset(accountName, value)

  const handleSelectPreset = (preset: BankPreset) => {
    onChange(preset.id)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, SVG, WebP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      onChange(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      onChange(customUrl.trim())
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700">Logo de la banque</Label>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setCustomUrl('')
            }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
          >
            <X className="w-3 h-3" />
            Réinitialiser le logo
          </button>
        )}
      </div>

      {/* Preview current selected logo */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <BankLogo accountName={accountName} logoUrl={value} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">
            {activePreset ? activePreset.name : (value ? 'Logo personnalisé' : 'Logo automatique (par nom)')}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {value ? (activePreset ? 'Preset bancaire sélectionné' : 'Image personnalisée') : 'Détecté selon le nom du compte'}
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
        <button
          type="button"
          className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${mode === 'preset' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
          onClick={() => setMode('preset')}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Banques
        </button>
        <button
          type="button"
          className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${mode === 'upload' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
          onClick={() => setMode('upload')}
        >
          <Upload className="w-3.5 h-3.5" />
          Fichier
        </button>
        <button
          type="button"
          className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${mode === 'url' ? 'bg-white shadow-sm font-bold text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
          onClick={() => setMode('url')}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Lien URL
        </button>
      </div>

      {/* Preset Grid */}
      {mode === 'preset' && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border rounded-xl bg-white">
          {BANK_PRESETS.map((preset) => {
            const isSelected = value === preset.id || (!value && activePreset?.id === preset.id)
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`relative flex flex-col items-center p-2 rounded-xl border transition-all hover:scale-105 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-100 hover:border-slate-300 bg-white'
                }`}
                title={preset.name}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs mb-1">
                  {preset.icon}
                </div>
                <span className="text-[10px] font-semibold text-slate-700 truncate w-full text-center">
                  {preset.shortName}
                </span>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xs">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* File Upload Mode */}
      {mode === 'upload' && (
        <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Choisir un logo depuis vos fichiers</p>
            <p className="text-[11px] text-slate-500">PNG, JPG, SVG jusqu'à 2 Mo</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold"
          >
            Parcourir mes fichiers
          </Button>
        </div>
      )}

      {/* URL Mode */}
      {mode === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://exemple.com/logo-banque.png"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleApplyUrl}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs shrink-0"
            >
              Appliquer
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">Collez le lien direct vers l'image du logo de votre banque.</p>
        </div>
      )}
    </div>
  )
}
