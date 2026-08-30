import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useServiceArray } from '@/hooks/useService';
import type { Notification } from '@/services/types';

export type { Notification };

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (
    notification: Omit<Notification, 'id' | 'createdAt' | 'userId' | 'organizationId' | 'isRead'>,
  ) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const svc = useOrgServices();

  const { data: notifications, loading, refetch } = useServiceArray<Notification>(
    () => (svc.isReady ? svc.notifications.getAll() : Promise.resolve({ success: true, data: [] })),
    [svc.orgId, svc.userId],
    ['notifications'],
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id' | 'createdAt' | 'userId' | 'organizationId' | 'isRead'>) => {
      if (!svc.isReady) return;
      await svc.notifications.create({ ...notification, isRead: false });
      await refetch();
    },
    [svc, refetch],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      const res = await svc.notifications.markAsRead(id);
      if (!res.success) {
        toast.error(res.error || 'Could not mark notification as read.');
        return;
      }
      await refetch();
    },
    [svc, refetch],
  );

  const markAllAsRead = useCallback(async () => {
    if (!svc.isReady) return;
    const res = await svc.notifications.markAllAsRead();
    if (!res.success) {
      toast.error(res.error || 'Could not mark all notifications as read.');
      return;
    }
    await refetch();
  }, [svc, refetch]);

  const removeNotification = useCallback(
    async (id: string) => {
      const res = await svc.notifications.delete(id);
      if (!res.success) {
        toast.error(res.error || 'Could not remove notification.');
        return;
      }
      await refetch();
    },
    [svc, refetch],
  );

  const clearAll = useCallback(async () => {
    const results = await Promise.all(notifications.map(n => svc.notifications.delete(n.id)));
    if (results.some(r => !r.success)) {
      toast.error('Some notifications could not be cleared.');
    }
    await refetch();
  }, [svc, notifications, refetch]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
