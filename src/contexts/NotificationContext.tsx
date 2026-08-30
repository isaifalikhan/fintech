import { createContext, useCallback, useContext, type ReactNode } from 'react';
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
      await svc.notifications.markAsRead(id);
      await refetch();
    },
    [svc, refetch],
  );

  const markAllAsRead = useCallback(async () => {
    if (!svc.isReady) return;
    await svc.notifications.markAllAsRead();
    await refetch();
  }, [svc, refetch]);

  const removeNotification = useCallback(
    async (id: string) => {
      await svc.notifications.delete(id);
      await refetch();
    },
    [svc, refetch],
  );

  const clearAll = useCallback(async () => {
    await Promise.all(notifications.map(n => svc.notifications.delete(n.id)));
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
