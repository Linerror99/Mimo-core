/**
 * WalletCards Component - Sprint 6 Mode Couple
 * 
 * Affiche les 3 vues de portefeuilles pour un household COUPLE:
 * - Portefeuille Membre 1 (personnel + part commune)
 * - Portefeuille Membre 2 (personnel + part commune)
 * - Portefeuille Commun (dépenses partagées)
 * 
 * Pour INDIVIDUAL: affiche une seule carte avec le solde total
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Users, User } from 'lucide-react';
import { getWallets, WalletsResponse, MemberWallet } from '@/services/walletService';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WalletCards() {
  const [wallets, setWallets] = useState<WalletsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWallets();
      setWallets(data);
    } catch (err) {
      console.error('Failed to load wallets:', err);
      setError('Impossible de charger les portefeuilles');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!wallets) return null;

  // INDIVIDUAL: Une seule carte
  if (wallets.household_type === 'INDIVIDUAL') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mon Portefeuille</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(wallets.total_balance)}</div>
          <p className="text-xs text-muted-foreground">Solde total</p>
        </CardContent>
      </Card>
    );
  }

  // COUPLE: 3 cartes
  if (!wallets.members || !wallets.shared) return null;

  const membersList = Object.values(wallets.members);
  const [member1, member2] = membersList;

  return (
    <div className="space-y-4">
      {/* En-tête avec solde total */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Portefeuilles</h2>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Solde total du foyer</div>
          <div className="text-2xl font-bold">{formatCurrency(wallets.total_balance)}</div>
        </div>
      </div>

      {/* Les 3 cartes */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Carte Membre 1 */}
        <MemberWalletCard member={member1} icon={User} variant="primary" />

        {/* Carte Membre 2 */}
        <MemberWalletCard member={member2} icon={User} variant="secondary" />

        {/* Carte Portefeuille Commun */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portefeuille Commun</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(wallets.shared.balance)}
            </div>
            <p className="text-xs text-purple-700 mt-2">
              {formatCurrency(wallets.shared.split_per_person)} par personne
            </p>
            <Badge variant="outline" className="mt-3 border-purple-300 text-purple-700">
              Partagé 50/50
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Composant pour une carte de membre
interface MemberWalletCardProps {
  member: MemberWallet;
  icon: React.ElementType;
  variant: 'primary' | 'secondary';
}

function MemberWalletCard({ member, icon: Icon, variant }: MemberWalletCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const colors = {
    primary: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
      icon: 'text-blue-600',
      badge: 'border-blue-300 text-blue-700',
    },
    secondary: {
      border: 'border-green-200',
      bg: 'bg-green-50',
      text: 'text-green-900',
      subtext: 'text-green-700',
      icon: 'text-green-600',
      badge: 'border-green-300 text-green-700',
    },
  };

  const style = colors[variant];

  return (
    <Card className={`${style.border} ${style.bg}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{member.user_name}</CardTitle>
        <Icon className={`h-4 w-4 ${style.icon}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${style.text}`}>
          {formatCurrency(member.balance)}
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className={style.subtext}>Personnel:</span>
            <span className={`font-medium ${style.subtext}`}>
              {formatCurrency(member.personal_balance)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className={style.subtext}>Part commune:</span>
            <span className={`font-medium ${style.subtext}`}>
              {formatCurrency(member.shared_contribution)}
            </span>
          </div>
        </div>
        <Badge variant="outline" className={`mt-3 ${style.badge}`}>
          Portefeuille personnel
        </Badge>
      </CardContent>
    </Card>
  );
}

export default WalletCards;
