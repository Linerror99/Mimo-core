import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types/notification';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Clock, 
} from 'lucide-react';
import { toast } from 'sonner';

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'
  | 'notifications';

interface NotificationsPageProps {
  navigate: (page: Page) => void;
  onLogout: () => void;
}

export function NotificationsPage({ navigate, onLogout }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getAll();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification marquée comme lue');
    } catch (error) {
      toast.error('Échec du marquage');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      toast.error('Erreur lors du marquage groupé');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    // Rediriger vers le tableau de bord pour valider ou consulter les opérations
    navigate('dashboard');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <Layout currentPage="notifications" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate('dashboard')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour au tableau de bord</span>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">Centre de notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              Consultez l'ensemble des alertes et des opérations nécessitant votre attention
            </p>
          </div>

          {/* Action Tout marquer comme lu */}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold shadow-xs"
            >
              <CheckCheck className="w-4 h-4 text-primary" />
              <span>Tout marquer comme lu</span>
            </Button>
          )}
        </div>

        {/* Barre de filtres */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="rounded-lg text-xs font-semibold"
            >
              Toutes ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="rounded-lg text-xs font-semibold"
            >
              Non lues ({unreadCount})
            </Button>
          </div>
        </div>

        {/* Liste des notifications */}
        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Aucune notification</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {filter === 'unread'
                ? "Vous êtes à jour ! Aucune notification non lue pour le moment."
                : "Vous n'avez pas encore reçu de notification."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map(notification => {
              const isUnread = !notification.is_read;
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer gap-4 ${
                    isUnread
                      ? 'bg-indigo-50/40 border-indigo-200/90 shadow-xs hover:border-indigo-300'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isUnread ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm md:text-base ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {notification.message}
                        </p>
                        {isUnread && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" title="Non lu" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(notification.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions individuelles */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        <span>Lu</span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDelete(notification.id, e)}
                      className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600"
                      title="Supprimer la notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
