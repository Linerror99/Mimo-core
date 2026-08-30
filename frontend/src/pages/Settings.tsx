/**
 * Settings Page - Sprint 6 Mode Couple
 * 
 * Page de paramètres avec gestion des invitations
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { SettingsHeader } from '@/components/SettingsHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, 
  Mail,
  AlertCircle,
  CheckCircle2,
  Send
} from 'lucide-react';
import toast from '@/utils/toast';
import logger from '@/utils/logger';
import { InvitationList } from '@/components/InvitationList';
import invitationService, { Invitation } from '@/services/invitationService';

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

interface SettingsProps {
  navigate: (page: Page) => void;
  onLogout: () => void;
}

export default function Settings({ navigate, onLogout }: SettingsProps) {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Charger les invitations au montage
  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const [sent, received] = await Promise.all([
        invitationService.getInvitations('sent'),
        invitationService.getInvitations('received'),
      ]);
      setSentInvitations(sent);
      setReceivedInvitations(received);
    } catch (err) {
      logger.error('Failed to load invitations', err);
      toast.error('Échec du chargement des invitations', err);
      setError('Échec du chargement des invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteeEmail.trim()) {
      setError('Veuillez entrer une adresse email');
      return;
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteeEmail)) {
      setError('Adresse email invalide');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await invitationService.createInvitation(inviteeEmail);
      
      toast.success('Invitation envoyée', `L'invitation a été envoyée à ${inviteeEmail}`);
      setSuccess(`Invitation envoyée à ${inviteeEmail} !`);
      setInviteeEmail('');
      
      // Recharger les invitations
      await loadInvitations();
    } catch (err: any) {
      logger.error('Failed to send invitation', err);
      toast.error('Échec de l\'envoi', err);
      const errorMessage = err.response?.data?.detail || 'Échec de l\'envoi de l\'invitation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await invitationService.acceptInvitation(invitationId);
      
      toast.success('Invitation acceptée', 'Votre foyer a été créé ! 🎉');
      setSuccess('Invitation acceptée ! Votre foyer a été créé. 🎉');
      
      // Recharger les invitations
      await loadInvitations();
      
      // Recharger la page après 2s pour mettre à jour le mode COUPLE
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      logger.error('Failed to accept invitation', err);
      toast.error('Échec de l\'acceptation', err);
      const errorMessage = err.response?.data?.detail || 'Échec de l\'acceptation';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (invitationId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await invitationService.rejectInvitation(invitationId);
      
      toast.info('Invitation refusée');
      setSuccess('Invitation refusée');
      
      // Recharger les invitations
      await loadInvitations();
    } catch (err: any) {
      logger.error('Failed to reject invitation', err);
      toast.error('Échec du refus', err);
      const errorMessage = err.response?.data?.detail || 'Échec du refus';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (invitationId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await invitationService.cancelInvitation(invitationId);
      
      toast.info('Invitation annulée');
      setSuccess('Invitation annulée');
      
      // Recharger les invitations
      await loadInvitations();
    } catch (err: any) {
      logger.error('Failed to cancel invitation', err);
      toast.error('Échec de l\'annulation', err);
      const errorMessage = err.response?.data?.detail || 'Échec de l\'annulation';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout currentPage="settings-invitations" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <SettingsHeader
          currentTab="invitations"
          navigate={navigate}
          title="Invitations & Partenaires"
          description="Invitez votre conjoint(e) ou gérez vos invitations de foyer"
        />

      {/* Messages de succès/erreur globaux */}
      {success && (
        <Alert className="mb-6 bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6 bg-red-50 text-red-900 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Formulaire d'invitation */}
      <Card className="p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Inviter mon partenaire</h2>
            <p className="text-sm text-muted-foreground">
              Créez un foyer à deux pour partager vos finances
            </p>
          </div>
        </div>

        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div>
            <Label htmlFor="email">Adresse email du partenaire</Label>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="partenaire@example.com"
                  value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading || !inviteeEmail.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Votre partenaire doit avoir un compte Duoflow. Une fois l'invitation acceptée, 
              vos foyers seront fusionnés automatiquement.
            </AlertDescription>
          </Alert>
        </form>
      </Card>

      {/* Listes des invitations */}
      <Card className="p-6">
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="received">
              Invitations reçues
              {receivedInvitations.filter(i => i.status === 'pending').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-accent text-accent-foreground rounded-full text-xs">
                  {receivedInvitations.filter(i => i.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              Invitations envoyées
              {sentInvitations.filter(i => i.status === 'pending').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                  {sentInvitations.filter(i => i.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : (
              <InvitationList
                invitations={receivedInvitations}
                type="received"
                onAccept={handleAccept}
                onReject={handleReject}
                loading={actionLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="sent">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : (
              <InvitationList
                invitations={sentInvitations}
                type="sent"
                onCancel={handleCancel}
                loading={actionLoading}
              />
            )}
          </TabsContent>
        </Tabs>
      </Card>
      </div>
    </Layout>
  );
}
