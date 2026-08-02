/**
 * REST API v1 — full mount point for `architecture/api-backend-rollout.md` §1–§19.
 * All handlers read/write the shared in-memory `store` (server/lib/store.ts), which is
 * persisted to SQLite (`data/finance-os.db`) after every mutation.
 */

import { Router, type Request, type Response } from 'express';
import type {
  ActiveSession,
  AuthSession,
  LoginCredentials,
  Organization,
  OrganizationMember,
  User,
} from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, fail } from '../lib/http.js';

import { createOrganizationsListRouter } from './organizationsList.js';
import { createOrganizationRouter } from './organizations.js';
import { createTransactionsRouter } from './transactions.js';
import { createAccountsRouter } from './accounts.js';
import { createBankAccountsRouter } from './bankAccounts.js';
import { createCategoriesRouter } from './categories.js';
import { createDepartmentsRouter } from './departments.js';
import { createProjectsRouter } from './projects.js';
import { createRecurringRouter } from './recurring.js';
import { createAssetsRouter } from './assets.js';
import { createInventoryRouter } from './inventory.js';
import { createBudgetsRouter } from './budgets.js';
import { createReportsRouter } from './reports.js';
import { createClassificationRouter, createPatternsRouter } from './classification.js';
import { createUserOrgNotificationsRouter, createGlobalNotificationsRouter } from './notifications.js';
import { createImportsRouter } from './imports.js';
import { createAuditRouter } from './audit.js';
import { createEmployeeMeRouter } from './employee.js';
import { createPlatformRouter } from './platform.js';

const DEMO_PASSWORD = 'demo';

function primaryMembershipForUser(members: OrganizationMember[], userId: string): OrganizationMember | null {
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

export function createApiV1Router(): Router {
  const r = Router();

  // ── §1 Auth & sessions ──────────────────────────────────────────────────

  r.post('/auth/login', (req: Request, res: Response) => {
    const body = req.body as LoginCredentials;
    const emailNorm = (body?.email ?? '').trim().toLowerCase();
    const slugNorm = (body?.orgSlug ?? '').trim().toLowerCase();
    const password = body?.password ?? '';

    if (password !== DEMO_PASSWORD) return fail(res, 401, 'Invalid email or password');

    const user = store.users.find(u => u.email.toLowerCase() === emailNorm);
    if (!user) return fail(res, 401, 'Invalid email or password');

    const isPlatform = user.role === 'platform_admin' || user.role === 'platform_manager';

    if (slugNorm) {
      const orgMatch = store.organizations.find(o => (o.slug || '').toLowerCase() === slugNorm);
      if (!orgMatch) return fail(res, 400, 'Workspace not found');
      if (isPlatform) {
        const session: AuthSession = { user, organization: orgMatch, membership: null, token: `mock-token-${user.id}-${Date.now()}` };
        return ok(res, session);
      }
      const mem = store.organizationMembers.find(m => m.userId === user.id && m.organizationId === orgMatch.id);
      if (!mem) return fail(res, 403, 'No access to this workspace');
      const session: AuthSession = { user, organization: orgMatch, membership: mem, token: `mock-token-${user.id}-${Date.now()}` };
      return ok(res, session);
    }

    const membership = primaryMembershipForUser(store.organizationMembers, user.id);
    const org = membership
      ? store.organizations.find(o => o.id === membership.organizationId) || null
      : isPlatform ? store.organizations[0] || null : null;

    const session: AuthSession = { user, organization: org, membership, token: `mock-token-${user.id}-${Date.now()}` };
    ok(res, session);
  });

  r.post('/auth/logout', (_req: Request, res: Response) => ok(res, null, 'Logged out'));

  r.get('/auth/session', (req: Request, res: Response) => {
    const token = parseBearer(req);
    if (!token) return fail(res, 401, 'Missing token');

    const userId = parseMockTokenUserId(token);
    if (!userId) return fail(res, 401, 'Invalid token');

    const user = store.users.find(u => u.id === userId);
    if (!user) return fail(res, 401, 'User not found');

    const membership = primaryMembershipForUser(store.organizationMembers, user.id);
    const org = membership
      ? store.organizations.find(o => o.id === membership.organizationId) || null
      : user.role === 'platform_admin' || user.role === 'platform_manager'
        ? store.organizations[0] || null
        : null;

    const session: AuthSession = { user, organization: org, membership, token };
    ok(res, session);
  });

  r.get('/users/:userId/organizations', (req: Request, res: Response) => {
    const userId = req.params.userId;
    const membershipOrgIds = store.organizationMembers.filter(m => m.userId === userId).map(m => m.organizationId);
    ok(res, store.organizations.filter(o => membershipOrgIds.includes(o.id)));
  });

  r.get('/organizations/:organizationId/membership', (req: Request, res: Response) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (!userId) return fail(res, 400, 'userId query required');
    const membership = store.organizationMembers.find(
      m => m.userId === userId && m.organizationId === req.params.organizationId,
    ) ?? null;
    ok(res, membership);
  });

  r.get('/users/:userId/sessions', (req: Request, res: Response) => {
    ok(res, store.activeSessions.filter((s: ActiveSession) => s.userId === req.params.userId));
  });

  r.delete('/sessions/:sessionId', (req: Request, res: Response) => {
    const idx = store.activeSessions.findIndex(s => s.id === req.params.sessionId);
    if (idx === -1) return fail(res, 404, 'Session not found');
    if (store.activeSessions[idx].isCurrentSession) return fail(res, 400, 'Cannot end your current session');
    store.activeSessions.splice(idx, 1);
    store.persist();
    ok(res, null, 'Session ended successfully');
  });

  r.post('/users/:userId/sessions/end-others', (req: Request, res: Response) => {
    const userId = req.params.userId;
    const before = store.activeSessions.length;
    const kept = store.activeSessions.filter(s => s.userId !== userId || s.isCurrentSession);
    store.activeSessions = kept;
    store.persist();
    ok(res, null, `${before - kept.length} session(s) ended`);
  });

  // ── §3 Organization admin + members + §18 extras + §19 AI settings ─────
  r.use('/organizations', createOrganizationsListRouter());

  // Org-scoped resource routers (registered before the generic org-admin router;
  // Express falls through to the next matching mount when a router has no matching route).
  r.use('/organizations/:organizationId/transactions', createTransactionsRouter());
  r.use('/organizations/:organizationId/accounts', createAccountsRouter());
  r.use('/organizations/:organizationId/bank-accounts', createBankAccountsRouter());
  r.use('/organizations/:organizationId/categories', createCategoriesRouter());
  r.use('/organizations/:organizationId/departments', createDepartmentsRouter());
  r.use('/organizations/:organizationId/projects', createProjectsRouter());
  r.use('/organizations/:organizationId/recurring-transactions', createRecurringRouter());
  r.use('/organizations/:organizationId/assets', createAssetsRouter());
  r.use('/organizations/:organizationId/inventory', createInventoryRouter());
  r.use('/organizations/:organizationId/budgets', createBudgetsRouter());
  r.use('/organizations/:organizationId/reports', createReportsRouter());
  r.use('/organizations/:organizationId/classification', createClassificationRouter());
  r.use('/organizations/:organizationId/patterns', createPatternsRouter());
  r.use('/organizations/:organizationId/imports', createImportsRouter());
  r.use('/organizations/:organizationId/audit-logs', createAuditRouter());
  r.use('/organizations/:organizationId/me', createEmployeeMeRouter());

  // §15 Notifications
  r.use('/users/:userId/organizations/:organizationId/notifications', createUserOrgNotificationsRouter());
  r.use('/notifications', createGlobalNotificationsRouter());

  // §2 Platform console
  r.use('/platform', createPlatformRouter());

  // Generic org admin (§3 root/members) + §18 team-directory/announcements + §19 ai-settings — mount last.
  r.use('/organizations/:organizationId', createOrganizationRouter());

  return r;
}

export type { Organization, User };
