import React from 'react'

export interface BankPreset {
  id: string
  name: string
  shortName: string
  color: string
  textColor: string
  borderColor?: string
  icon: React.ReactNode
  keywords: string[]
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: 'sg',
    name: 'Société Générale',
    shortName: 'SG',
    color: '#E60028',
    textColor: '#FFFFFF',
    keywords: ['sg', 'societe generale', 'société générale', 'societe-generale'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="50" fill="#E60028" rx="8" />
        <rect y="50" width="100" height="50" fill="#1A1A1A" rx="8" />
        <rect y="46" width="100" height="8" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'bnp',
    name: 'BNP Paribas',
    shortName: 'BNP',
    color: '#00915A',
    textColor: '#FFFFFF',
    keywords: ['bnp', 'bnp paribas', 'paribas'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#00915A" />
        <path d="M22 68 L36 32 L46 32 L32 68 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M42 68 L56 32 L66 32 L52 68 Z" fill="#FFFFFF" opacity="0.9" />
        {/* Stars */}
        <circle cx="76" cy="36" r="4" fill="#FFFFFF" />
        <circle cx="82" cy="48" r="3.5" fill="#FFFFFF" />
        <circle cx="78" cy="62" r="3" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'boursorama',
    name: 'BoursoBank (Boursorama)',
    shortName: 'BoursoBank',
    color: '#E0004D',
    textColor: '#FFFFFF',
    keywords: ['bourso', 'boursorama', 'boursobank'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#002D62" />
        <circle cx="50" cy="50" r="34" fill="#E0004D" />
        <path d="M38 34 H52 C60 34 66 39 66 46 C66 50 63 53 59 55 C64 57 68 61 68 67 C68 74 61 80 52 80 H38 Z M46 41 V52 H51 C55 52 58 50 58 46 C58 43 55 41 51 41 Z M46 59 V73 H52 C57 73 60 70 60 66 C60 62 57 59 52 59 Z" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'hellobank',
    name: 'Hello bank!',
    shortName: 'Hello bank!',
    color: '#00A3E0',
    textColor: '#FFFFFF',
    keywords: ['hello', 'hello bank', 'hellobank'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#00A3E0" />
        <text x="50" y="58" fontSize="28" fontWeight="bold" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">hello!</text>
      </svg>
    )
  },
  {
    id: 'revolut',
    name: 'Revolut',
    shortName: 'Revolut',
    color: '#191C1F',
    textColor: '#FFFFFF',
    keywords: ['revolut', 'revo'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#191C1F" />
        <path d="M32 26 H56 C67 26 74 32 74 41 C74 48 69 54 62 56 L76 76 H63 L51 58 H44 V76 H32 V26 Z M44 36 V48 H55 C60 48 63 45 63 42 C63 38 60 36 55 36 H44 Z" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'upone',
    name: 'Up Déjeuner / UP One',
    shortName: 'UP One',
    color: '#FF6C00',
    textColor: '#FFFFFF',
    keywords: ['up', 'up one', 'up dejeuner', 'chèque déjeuner', 'ticket resto'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#FF6C00" />
        <circle cx="50" cy="50" r="32" fill="#FFFFFF" />
        <path d="M36 38 V52 C36 60 42 66 50 66 C58 66 64 60 64 52 V38 H56 V52 C56 56 53 59 50 59 C47 59 44 56 44 52 V38 H36 Z" fill="#FF6C00" />
      </svg>
    )
  },
  {
    id: 'creditagricole',
    name: 'Crédit Agricole',
    shortName: 'Crédit Agricole',
    color: '#007D8F',
    textColor: '#FFFFFF',
    keywords: ['ca', 'credit agricole', 'crédit agricole'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#007D8F" />
        <text x="50" y="62" fontSize="34" fontWeight="900" fill="#29B674" textAnchor="middle" fontFamily="sans-serif">CA</text>
      </svg>
    )
  },
  {
    id: 'banquepostale',
    name: 'La Banque Postale',
    shortName: 'Banque Postale',
    color: '#0B3B60',
    textColor: '#FEDD00',
    keywords: ['banque postale', 'la banque postale', 'poste', 'livret a'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#0B3B60" />
        <circle cx="50" cy="50" r="32" fill="#FEDD00" />
        <path d="M36 46 L50 36 L64 46 L58 64 L42 64 Z" fill="#0B3B60" />
      </svg>
    )
  },
  {
    id: 'n26',
    name: 'N26',
    shortName: 'N26',
    color: '#36A18B',
    textColor: '#FFFFFF',
    keywords: ['n26', 'number26'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#36A18B" />
        <text x="50" y="62" fontSize="32" fontWeight="bold" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">N26</text>
      </svg>
    )
  },
  {
    id: 'fortuneo',
    name: 'Fortuneo',
    shortName: 'Fortuneo',
    color: '#008559',
    textColor: '#FFFFFF',
    keywords: ['fortuneo', 'fortu'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#008559" />
        <path d="M30 70 L50 30 L70 70 Z" fill="#A4D233" />
      </svg>
    )
  },
  {
    id: 'lcl',
    name: 'LCL',
    shortName: 'LCL',
    color: '#003E7E',
    textColor: '#FFCD00',
    keywords: ['lcl', 'credit lyonnais', 'crédit lyonnais'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#003E7E" />
        <text x="50" y="62" fontSize="32" fontWeight="900" fill="#FFCD00" textAnchor="middle" fontFamily="sans-serif">LCL</text>
      </svg>
    )
  },
  {
    id: 'cic',
    name: 'CIC',
    shortName: 'CIC',
    color: '#004F9F',
    textColor: '#FFFFFF',
    keywords: ['cic'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#004F9F" />
        <text x="50" y="62" fontSize="34" fontWeight="900" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">CIC</text>
      </svg>
    )
  },
  {
    id: 'caisseepargne',
    name: "Caisse d'Épargne",
    shortName: "Caisse d'Épargne",
    color: '#CE0024',
    textColor: '#FFFFFF',
    keywords: ['caisse d epargne', "caisse d'épargne", 'caisse epargne', 'ecureuil'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#CE0024" />
        <circle cx="50" cy="50" r="30" fill="#FFFFFF" />
        <path d="M42 42 Q50 32 58 42 Q66 52 50 68 Q34 52 42 42 Z" fill="#CE0024" />
      </svg>
    )
  },
  {
    id: 'creditmutuel',
    name: 'Crédit Mutuel',
    shortName: 'Crédit Mutuel',
    color: '#E30613',
    textColor: '#FFFFFF',
    keywords: ['credit mutuel', 'crédit mutuel', 'cm'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#E30613" />
        <text x="50" y="62" fontSize="34" fontWeight="900" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">CM</text>
      </svg>
    )
  },
  {
    id: 'lydia',
    name: 'Lydia / Sumeria',
    shortName: 'Lydia',
    color: '#0082FB',
    textColor: '#FFFFFF',
    keywords: ['lydia', 'sumeria'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#0082FB" />
        <circle cx="50" cy="50" r="28" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="16" fill="#0082FB" />
      </svg>
    )
  },
  {
    id: 'trade_republic',
    name: 'Trade Republic',
    shortName: 'Trade Republic',
    color: '#111111',
    textColor: '#FFFFFF',
    keywords: ['trade republic', 'trade', 'tr'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#111111" />
        <text x="50" y="62" fontSize="32" fontWeight="900" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">TR</text>
      </svg>
    )
  },
  {
    id: 'cash',
    name: 'Espèces / Portefeuille',
    shortName: 'Espèces',
    color: '#D97706',
    textColor: '#FFFFFF',
    keywords: ['espece', 'espèces', 'especes', 'cash', 'liquide', 'portefeuille'],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect width="100" height="100" rx="20" fill="#D97706" />
        <rect x="22" y="32" width="56" height="36" rx="6" fill="#FDE68A" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="50" cy="50" r="10" fill="#D97706" />
      </svg>
    )
  }
]

/**
 * Find best matching bank preset based on logo_url or account name
 */
export function getBankPreset(accountName?: string, logoUrl?: string | null): BankPreset | null {
  if (logoUrl) {
    // Check direct preset ID match
    const directMatch = BANK_PRESETS.find(p => p.id === logoUrl.toLowerCase())
    if (directMatch) return directMatch
  }

  if (accountName) {
    const cleanName = accountName.toLowerCase().trim()
    
    // Check exact or keyword match
    for (const preset of BANK_PRESETS) {
      for (const kw of preset.keywords) {
        if (cleanName === kw || cleanName.startsWith(kw + ' ') || cleanName.endsWith(' ' + kw) || cleanName.includes(kw)) {
          return preset
        }
      }
    }
  }

  return null
}
