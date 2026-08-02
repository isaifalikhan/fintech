/**
 * Notification Service
 * =====================
 * CRUD for user notifications.
 *
 * When `VITE_API_BASE_URL` is set, uses REST routes from `architecture/api-backend-rollout.md` §15;
 * otherwise `dataStore`.
 */

import { Notification } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

const NOTIF_BASE = (userId: string, organizationId: string) =>
  `/users/${encodeURIComponent(userId)}/organizations/${encodeURIComponent(organizationId)}/notifications`;

function requireUserOrg<T>(userId: string, organizationId: string): ServiceResponse<T> | null {
  if (!userId.trim() || !organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'userId and organizationId required' };
  }
  return null;
}

export const notificationService = {
  async getAll(userId: string, organizationId: string): Promise<ServiceResponse<Notification[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireUserOrg<Notification[]>(userId, organizationId);
      if (err) return err;
      return apiGet<Notification[]>(NOTIF_BASE(userId, organizationId));
    }

    await simulateDelay();
    const notifications = dataStore.notifications.filter(
      n => n.userId === userId && n.organizationId === organizationId,
    );
    return { success: true, data: notifications };
  },

  async getUnreadCount(userId: string, organizationId: string): Promise<ServiceResponse<number>> {
    if (isHttpBackendConfigured()) {
      const err = requireUserOrg<number>(userId, organizationId);
      if (err) return err;
      return apiGet<number>(`${NOTIF_BASE(userId, organizationId)}/unread-count`);
    }

    await simulateDelay(50);
    const count = dataStore.notifications.filter(
      n => n.userId === userId && n.organizationId === organizationId && !n.isRead,
    ).length;
    return { success: true, data: count };
  },

  async markAsRead(notificationId: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<null>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
        body: '{}',
      });
    }

    await simulateDelay(80);
    const idx = dataStore.notifications.findIndex(n => n.id === notificationId);
    if (idx !== -1) {
      dataStore.notifications[idx].isRead = true;
      dataStore.notify('notifications');
    }
    return { success: true, data: null };
  },

  async markAllAsRead(userId: string, organizationId: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const err = requireUserOrg<null>(userId, organizationId);
      if (err) return err;
      return apiRequest<null>(`${NOTIF_BASE(userId, organizationId)}/read-all`, {
        method: 'POST',
        body: '{}',
      });
    }

    await simulateDelay(100);
    dataStore.notifications.forEach(n => {
      if (n.userId === userId && n.organizationId === organizationId) {
        n.isRead = true;
      }
    });
    dataStore.notify('notifications');
    return { success: true, data: null, message: 'All marked as read' };
  },

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<ServiceResponse<Notification>> {
    if (isHttpBackendConfigured()) {
      const err = requireUserOrg<Notification>(notification.userId, notification.organizationId);
      if (err) return err;
      return apiPostJson<Omit<Notification, 'id' | 'createdAt'>, Notification>(
        NOTIF_BASE(notification.userId, notification.organizationId),
        notification,
      );
    }

    await simulateDelay(100);
    const newNotif: Notification = {
      ...notification,
      id: generateId('notif'),
      createdAt: new Date().toISOString(),
    };
    dataStore.notifications.unshift(newNotif);
    dataStore.notify('notifications');
    return { success: true, data: newNotif };
  },

  async delete(notificationId: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<null>(`/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
    }

    await simulateDelay(80);
    const idx = dataStore.notifications.findIndex(n => n.id === notificationId);
    if (idx !== -1) {
      dataStore.notifications.splice(idx, 1);
      dataStore.notify('notifications');
    }
    return { success: true, data: null };
  },
};
