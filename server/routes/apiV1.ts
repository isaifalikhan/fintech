/**
 * REST API v1 — auth + lightweight user/org reads against the SQLite bundle.
 * Aligns with `src/services/authService.ts` when `VITE_API_BASE_URL=/api/v1` (Vite proxies to this server).
 */

import { Router, type Request, type Response } from 'express';
import type {
  ActiveSession,
  AuthSession,
  LoginCredentials,
  Organization,
  OrganizationMember,
  User,
} from '../../src/services/types.ts';
import { loadBundleRow, saveBundle } from '../lib/bundleStore.js';

const DEMO_PASSWORD = 'demo';

function primaryMembershipForUser(
  members: OrganizationMember[],
  userId: string,
): OrganizationMember | null {
  const mine = members.filter(m => m.userId === userId);
  return mine.find(m => m.role === 'employee') ?? mine[0] ?? null;
}

function parseBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

function parseMockTokenUserId(token: string): string | null {
  const m = token.match(/^mock-token-([\w-]+)-/);
  return m?.[1] ?? null;
}

function jsonOk<T>(res: Response, data: T) {
  res.json({ success: true, data });
}

function jsonErr(res: Response, status: number, message: string) {
  res.status(status).json({ success: false, data: null, error: message });
}

export function createApiV1Router(): Router {
  const r = Router();

  r.post('/auth/login', (req: Request, res: Response) => {
    const body = req.body as LoginCredentials;
    const emailNorm = (body?.email ?? '').trim().toLowerCase();
    const slugNorm = (body?.orgSlug ?? '').trim().toLowerCase();
    const password = body?.password ?? '';

    const row = loadBundleRow();
    if (!row) {
      jsonErr(res, 500, 'Server data not initialized');
      return;
    }

    const users = (row.payload.users as User[] | undefined) ?? [];
    const organizations = (row.payload.organizations as Organization[] | undefined) ?? [];
    const organizationMembers =
      (row.payload.organizationMembers as OrganizationMember[] | undefined) ?? [];

    if (password !== DEMO_PASSWORD) {
      jsonErr(res, 401, 'Invalid email or password');
      return;
    }

    const user = users.find(u => u.email.toLowerCase() === emailNorm);
    if (!user) {
      jsonErr(res, 401, 'Invalid email or password');
      return;
    }

    const isPlatform = user.role === 'platform_admin' || user.role === 'platform_manager';

    if (slugNorm) {
      const orgMatch = organizations.find(o => (o.slug || '').toLowerCase() === slugNorm);
      if (!orgMatch) {
        jsonErr(res, 400, 'Workspace not found');
        return;
      }
      if (isPlatform) {
        const session: AuthSession = {
          user,
          organization: orgMatch,
          membership: null,
          token: `mock-token-${user.id}-${Date.now()}`,
        };
        jsonOk(res, session);
        return;
      }
      const mem = organizationMembers.find(
        m => m.userId === user.id && m.organizationId === orgMatch.id,
      );
      if (!mem) {
        jsonErr(res, 403, 'No access to this workspace');
        return;
      }
      const session: AuthSession = {
        user,
        organization: orgMatch,
        membership: mem,
        token: `mock-token-${user.id}-${Date.now()}`,
      };
      jsonOk(res, session);
      return;
    }

    const membership = primaryMembershipForUser(organizationMembers, user.id);
    const org = membership
      ? organizations.find(o => o.id === membership.organizationId) || null
      : isPlatform
        ? organizations[0] || null
        : null;

    const session: AuthSession = {
      user,
      organization: org,
      membership,
      token: `mock-token-${user.id}-${Date.now()}`,
    };
    jsonOk(res, session);
  });

  r.post('/auth/logout', (_req: Request, res: Response) => {
    res.json({ success: true, data: null, message: 'Logged out' });
  });

  r.get('/auth/session', (req: Request, res: Response) => {
    const token = parseBearer(req);
    if (!token) {
      jsonErr(res, 401, 'Missing token');
      return;
    }

    const row = loadBundleRow();
    if (!row) {
      jsonErr(res, 500, 'Server data not initialized');
      return;
    }

    const users = (row.payload.users as User[] | undefined) ?? [];
    const organizations = (row.payload.organizations as Organization[] | undefined) ?? [];
    const organizationMembers =
      (row.payload.organizationMembers as OrganizationMember[] | undefined) ?? [];

    const userId = parseMockTokenUserId(token);
    if (!userId) {
      jsonErr(res, 401, 'Invalid token');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      jsonErr(res, 401, 'User not found');
      return;
    }

    const membership = primaryMembershipForUser(organizationMembers, user.id);
    const org = membership
      ? organizations.find(o => o.id === membership.organizationId) || null
      : user.role === 'platform_admin' || user.role === 'platform_manager'
        ? organizations[0] || null
        : null;

    const session: AuthSession = {
      user,
      organization: org,
      membership,
      token,
    };
    jsonOk(res, session);
  });

  r.get('/users/:userId/organizations', (req: Request, res: Response) => {
    const row = loadBundleRow();
    if (!row) {
      jsonErr(res, 500, 'Server data not initialized');
      return;
    }
    const userId = req.params.userId;
    const organizations = (row.payload.organizations as Organization[] | undefined) ?? [];
    const organizationMembers =
      (row.payload.organizationMembers as OrganizationMember[] | undefined) ?? [];

    const membershipOrgIds = organizationMembers
      .filter(m => m.userId === userId)
      .map(m => m.organizationId);
    const orgs = organizations.filter(o => membershipOrgIds.includes(o.id));
    jsonOk(res, orgs);
  });

  r.get('/organizations/:organizationId/membership', (req: Request, res: Response) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (!userId) {
      jsonErr(res, 400, 'userId query required');
      return;
    }
    const row = loadBundleRow();
    if (!row) {
      jsonErr(res, 500, 'Server data not initialized');
      return;
    }
    const organizationMembers =
      (row.payload.organizationMembers as OrganizationMember[] | undefined) ?? [];
    const membership =
      organizationMembers.find(
        m => m.userId === userId && m.organizationId === req.params.organizationId,
      ) ?? null;
    jsonOk(res, membership);
  });

  r.get('/users/:userId/sessions', (req: Request, res: Response) => {
    const row = loadBundleRow();
    if (!row) {
      jsonErr(res, 500, 'Server data not initialized');
      return;
    }
    const sessions = (row.payload.activeSessions as ActiveSession[] | undefined) ?? [];
    const list = sessions.filter(s => s.userId === req.params.userId);
    jsonOk(res, list);
  });

  r.delete('/sessions/:sessionId', (req: Request, res: Response) => {
    const row = loadBundleRow();
    if (!row) {
      jsonErr(res, 500, 'Server data not initialized');
      return;
    }
    const sessions = (row.payload.activeSessions as ActiveSession[] | undefined) ?? [];
    const idx = sessions.findIndex(s => s.id === req.params.sessionId);
    if (idx === -1) {
      jsonErr(res, 404, 'Session not found');
      return;
    }
    if (sessions[idx].isCurrentSession) {
      jsonErr(res, 400, 'Cannot end your current session');
      return;
    }
    sessions.splice(idx, 1);
    row.payload.activeSessions = sessions;
    saveBundle(row.schemaVersion, row.payload);
    res.json({ success: true, data: null, message: 'Session ended successfully' });
  });

  r.post('/users/:userId/sessions/end-others', (req: Request, res: Response) => {
    const row = loadBundleRow();
    if (!row) {
      jsonErr(res, 500, 'Server data not initialized');
      return;
    }
    const userId = req.params.userId;
    const sessions = (row.payload.activeSessions as ActiveSession[] | undefined) ?? [];
    const before = sessions.length;
    const kept = sessions.filter(s => s.userId !== userId || s.isCurrentSession);
    row.payload.activeSessions = kept;
    saveBundle(row.schemaVersion, row.payload);
    const ended = before - kept.length;
    res.json({ success: true, data: null, message: `${ended} session(s) ended` });
  });

  return r;
}
