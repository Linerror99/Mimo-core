/**
 * InvitationList Component - Sprint 6 Mode Couple
 * 
 * Affiche les invitations envoyées et reçues avec actions
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Check, 
  X, 
  Clock, 
  UserPlus,
  Send
} from 'lucide-react';
import { Invitation } from '@/services/invitationService';

interface InvitationListProps {
  invitations: Invitation[];
  type: 'sent' | 'received';
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  loading?: boolean;
}

export function InvitationList({
  invitations,
  type,
  onAccept,
  onReject,
  onCancel,
  loading = false,
}: InvitationListProps) {
  if (invitations.length === 0) {
    return (
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          {type === 'sent'
            ? "Vous n'avez envoyé aucune invitation"
            : "Vous n'avez reçu aucune invitation"}
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = (status: Invitation['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Acceptée
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="h-3 w-3 mr-1" />
            Refusée
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <X className="h-3 w-3 mr-1" />
            Annulée
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => (
        <Card key={invitation.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">
                {type === 'sent' ? (
                  <Send className="h-5 w-5 text-primary" />
                ) : (
                  <UserPlus className="h-5 w-5 text-accent" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">
                    {type === 'sent'
                      ? invitation.invitee_email
                      : invitation.inviter_name || invitation.inviter_email}
                  </p>
                  {getStatusBadge(invitation.status)}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {type === 'sent' 
                    ? `Invitation envoyée le ${formatDate(invitation.created_at)}`
                    : `Reçue le ${formatDate(invitation.created_at)}`}
                </p>

                {invitation.invitee_name && type === 'sent' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Destinataire: {invitation.invitee_name}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-4">
              {type === 'received' && invitation.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onAccept?.(invitation.id)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accepter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject?.(invitation.id)}
                    disabled={loading}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                </>
              )}

              {type === 'sent' && invitation.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancel?.(invitation.id)}
                  disabled={loading}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
