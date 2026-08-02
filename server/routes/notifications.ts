/**
 * §15 — Notifications.
 * Org-scoped list mounted at `/users/:userId/organizations/:organizationId/notifications` (mergeParams).
 * Global by-id actions mounted at `/notifications`.
 */

import { Router, type Request, type Response } from 'express';
import type { Notification } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created } from '../lib/http.js';

export function createUserOrgNotificationsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/unread-count', (req: Request, res: Response) => {
    const { userId, organizationId } = req.params;
    const count = store.notifications.filter(n => n.userId === userId && n.organizationId === organizationId && !n.isRead).length;
    ok(res, count);
  });

  r.post('/read-all', (req: Request, res: Response) => {
    const { userId, organizationId } = req.params;
    store.notifications.forEach(n => {
      if (n.userId === userId && n.organizationId === organizationId) n.isRead = true;
    });
    store.persist();
    ok(res, null, 'All marked as read');
  });

  r.get('/', (req: Request, res: Response) => {
    const { userId, organizationId } = req.params;
    ok(res, store.notifications.filter(n => n.userId === userId && n.organizationId === organizationId));
  });

  r.post('/', (req: Request, res: Response) => {
    const { userId, organizationId } = req.params;
    const data = req.body as Omit<Notification, 'id' | 'createdAt' | 'userId' | 'organizationId'>;
    const newNotif: Notification = {
      ...data,
      userId,
      organizationId,
      id: store.generateId('notif'),
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(newNotif);
    store.persist();
    created(res, newNotif);
  });

  return r;
}

export function createGlobalNotificationsRouter(): Router {
  const r = Router();

  r.patch('/:id/read', (req: Request, res: Response) => {
    const idx = store.notifications.findIndex(n => n.id === req.params.id);
    if (idx !== -1) {
      store.notifications[idx].isRead = true;
      store.persist();
    }
    ok(res, null);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.notifications.findIndex(n => n.id === req.params.id);
    if (idx !== -1) {
      store.notifications.splice(idx, 1);
      store.persist();
    }
    ok(res, null);
  });

  return r;
}
