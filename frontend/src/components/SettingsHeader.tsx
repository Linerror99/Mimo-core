import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Home, UserPlus } from 'lucide-react';

type SettingsTab = 'profile' | 'household' | 'invitations';

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings'
  | 'settings-profile'
  | 'settings-household'
  | 'settings-invitations'
  | 'trash'
  | 'notifications';

interface SettingsHeaderProps {
  currentTab: SettingsTab;
  navigate: (page: Page) => void;
  title?: string;
  description?: string;
}

export function SettingsHeader({ currentTab, navigate, title, description }: SettingsHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Bouton retour vers le tableau de bord */}
      <div>
        <button
          type="button"
          onClick={() => navigate('dashboard')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au tableau de bord</span>
        </button>
        {title && <h1 className="text-3xl font-bold text-slate-900">{title}</h1>}
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>

      {/* Onglets de navigation des paramètres */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          variant={currentTab === 'profile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate('settings-profile')}
          className="rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          <span>Profil</span>
        </Button>

        <Button
          variant={currentTab === 'household' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate('settings-household')}
          className="rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Foyer & Membres</span>
        </Button>

        <Button
          variant={currentTab === 'invitations' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => navigate('settings-invitations')}
          className="rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invitations</span>
        </Button>
      </div>
    </div>
  );
}
