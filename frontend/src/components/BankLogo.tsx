import React, { useState } from 'react'
import { getBankPreset, BankPreset } from '@/utils/bankLogos'
import { Building2 } from 'lucide-react'

interface BankLogoProps {
  accountName?: string
  logoUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[10px] rounded-md',
  sm: 'w-7 h-7 text-xs rounded-lg',
  md: 'w-10 h-10 text-sm rounded-xl',
  lg: 'w-12 h-12 text-base rounded-2xl',
  xl: 'w-16 h-16 text-lg rounded-2xl',
}

export function BankLogo({ accountName, logoUrl, size = 'md', className = '' }: BankLogoProps) {
  const [imgError, setImgError] = useState(false)
  const preset: BankPreset | null = getBankPreset(accountName, logoUrl)

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md

  // 1. Custom URL or Base64 Image
  if (logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:image/')) && !imgError) {
    return (
      <div className={`relative overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-slate-200/80 bg-white ${sizeClass} ${className}`}>
        <img
          src={logoUrl}
          alt={accountName || 'Logo de banque'}
          className="w-full h-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // 2. Matching Bank Preset
  if (preset) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-transform ${sizeClass} ${className}`}
        title={preset.name}
      >
        {preset.icon}
      </div>
    )
  }

  // 3. Fallback Initial Badge
  const initial = accountName ? accountName.slice(0, 2).toUpperCase() : 'BK'

  return (
    <div
      className={`flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shadow-sm ${sizeClass} ${className}`}
      title={accountName || 'Compte'}
    >
      {accountName ? initial : <Building2 className="w-1/2 h-1/2" />}
    </div>
  )
}
