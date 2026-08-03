/**
 * REST API v1 — full mount point for `architecture/api-backend-rollout.md` §1–§19.
 * All handlers read/write the shared in-memory `store` (server/lib/store.ts), which is
 * persisted to SQLite (`data/finance-os.db`) after every mutation.
 *
 * Authorization: every route below `/organizations/:organizationId` is gated by a single
 * `requireAuth` + `requireOrgMembership` pair mounted on that prefix (see bottom of this file)
 * — Express walks middleware layers in registration order and matches each by path prefix, so
 * that one pair runs for every sub-router mounted under it (transactions, accounts, reports,
 * …) without needing to touch each of those files individually. Routes outside that prefix
 * (auth, users/:userId/*, /platform, /notifications) are gated explicitly per-route below.
 */

import { Router, type Request, type Response } from 'express';
import type {
  ActiveSession,
  Organization,
  OrganizationMember,
  User,
} from '../../src/services/types.js';
import type { AuthSession, LoginCredentials } from '../../src/services/authSessionTypes.js';
import { store } from '../lib/store.js';
import { ok, fail } from '../lib/http.js';
import { verifyPassword } from '../lib/passwords.js';
import { signAuthToken, verifyAuthToken, setAuthCookie, clearAuthCookie, readAuthToken } from '../lib/jwt.js';
import { toPublicUser } from '../lib/serialize.js';
import {
  requireAuth,
  requirePlatformRole,
  requireOrgMembership,
  requireSelfOrPlatformAdmin,
  isPlatformUser,
} from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';

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
import { createLoansRouter } from './loans.js';
import { createReportsRouter } from './reports.js';
import { createClassificationRouter, createPatternsRouter } from './classification.js';
import { createUserOrgNotificationsRouter, createGlobalNotificationsRouter } from './notifications.js';
import { createImportsRouter } from './imports.js';
import { createAuditRouter } from './audit.js';
import { createEmployeeMeRouter } from './employee.js';
import { createPlatformRouter } from './platform.js';

function primaryMembershipForUser(members: OrganizationMember[], userId: string): OrganizationMember | null {
  const mine = members.filter(m => m.userId === userId);
  return mine.find(m => m.role === 'employee') ?? mine[0] ?? null;
}

function deviceTypeFromUserAgent(ua: string): string {
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function browserFromUserAgent(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari';
  return 'Unknown';
}

/** Creates and persists a new ActiveSession row for a fresh login. Only one session per user is
 *  ever flagged "current" — see the `/sessions/:sessionId` and `/sessions/end-others` handlers
 *  below, which rely on that flag to protect/replace the caller's own live session. */
function createSessionForUser(req: Request, user: User, org: Organization | null): ActiveSession {
  const ua = (req.headers['user-agent'] as string) || '';
  const session: ActiveSession = {
    id: store.generateId('session'),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    organizationId: org?.id ?? '',
    deviceType: deviceTypeFromUserAgent(ua),
    browser: browserFromUserAgent(ua),
    ipAddress: req.ip || 'unknown',
    location: 'Unknown',
    loginTime: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    isCurrentSession: true,
  };
  store.activeSessions.forEach(s => {
    if (s.userId === user.id) s.isCurrentSession = false;
  });
  store.activeSessions.push(session);
  store.persist();
  return session;
}

export function createApiV1Router(): Router {
  const r = Router();

  // ── §1 Auth & sessions ──────────────────────────────────────────────────

  r.post('/auth/login', loginRateLimiter, async (req: Request, res: Response) => {
    const body = req.body as LoginCredentials;
    const emailNorm = (body?.email ?? '').trim().toLowerCase();
    const slugNorm = (body?.orgSlug ?? '').trim().toLowerCase();
    const password = body?.password ?? '';

    if (!emailNorm || !password) return fail(res, 400, 'Email and password are required');

    const user = store.users.find(u => u.email.toLowerCase() === emailNorm);
    // Always run verifyPassword, even with no matching user (it safely handles an undefined
    // hash) — this keeps a "no such user" response taking roughly the same shape/time as a
    // "wrong password" one instead of the two being trivially distinguishable.
    const passwordOk = await verifyPassword(password, user?.passwordHash);
    if (!user || !passwordOk) return fail(res, 401, 'Invalid email or password');

    const isPlatform = isPlatformUser(user);
    let org: Organization | null = null;
    let membership: OrganizationMember | null = null;

    if (slugNorm) {
      const orgMatch = store.organizations.find(o => (o.slug || '').toLowerCase() === slugNorm);
      if (!orgMatch) return fail(res, 400, 'Workspace not found');
      if (!isPlatform) {
        const mem = store.organizationMembers.find(m => m.userId === user.id && m.organizationId === orgMatch.id);
        if (!mem) return fail(res, 403, 'No access to this workspace');
        membership = mem;
      }
      org = orgMatch;
    } else {
      membership = primaryMembershipForUser(store.organizationMembers, user.id);
      org = membership
        ? store.organizations.find(o => o.id === membership!.organizationId) || null
        : isPlatform ? store.organizations[0] || null : null;
    }

    const session = createSessionForUser(req, user, org);
    const token = signAuthToken({ sub: user.id, sid: session.id });
    setAuthCookie(res, token);

    const authSession: AuthSession = { user: toPublicUser(user) as User, organization: org, membership, token: '' };
    ok(res, authSession);
  });

  r.post('/auth/logout', (req: Request, res: Response) => {
    const token = readAuthToken(req);
    if (token) {
      try {
        const payload = verifyAuthToken(token);
        const idx = store.activeSessions.findIndex(s => s.id === payload.sid);
        if (idx !== -1) {
          store.activeSessions.splice(idx, 1);
          store.persist();
        }
      } catch {
        /* token already invalid/expired — nothing to revoke */
      }
    }
    clearAuthCookie(res);
    ok(res, null, 'Logged out');
  });

  r.get('/auth/session', requireAuth, (req: Request, res: Response) => {
    const user = req.authUser!;
    const membership = primaryMembershipForUser(store.organizationMembers, user.id);
    const org = membership
      ? store.organizations.find(o => o.id === membership.organizationId) || null
      : isPlatformUser(user) ? store.organizations[0] || null : null;

    const session: AuthSession = { user: toPublicUser(user) as User, organization: org, membership, token: '' };
    ok(res, session);
  });

  r.get('/users/:userId/organizations', requireAuth, requireSelfOrPlatformAdmin, (req: Request, res: Response) => {
    const userId = req.params.userId;
    const membershipOrgIds = store.organizationMembers.filter(m => m.userId === userId).map(m => m.organizationId);
    ok(res, store.organizations.filter(o => membershipOrgIds.includes(o.id)));
  });

  r.get('/organizations/:organizationId/membership', requireAuth, (req: Request, res: Response) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (!userId) return fail(res, 400, 'userId query required');
    const caller = req.authUser!;
    if (userId !== caller.id && !isPlatformUser(caller)) return fail(res, 403, 'Forbidden');
    const membership = store.organizationMembers.find(
      m => m.userId === userId && m.organizationId === req.params.organizationId,
    ) ?? null;
    ok(res, membership);
  });

  r.get('/users/:userId/sessions', requireAuth, requireSelfOrPlatformAdmin, (req: Request, res: Response) => {
    ok(res, store.activeSessions.filter((s: ActiveSession) => s.userId === req.params.userId));
  });

  r.delete('/sessions/:sessionId', requireAuth, (req: Request, res: Response) => {
    const idx = store.activeSessions.findIndex(s => s.id === req.params.sessionId);
    if (idx === -1) return fail(res, 404, 'Session not found');
    const session = store.activeSessions[idx];
    const caller = req.authUser!;
    if (session.userId !== caller.id && !isPlatformUser(caller)) return fail(res, 403, 'Forbidden');
    if (session.isCurrentSession) return fail(res, 400, 'Cannot end your current session');
    store.activeSessions.splice(idx, 1);
    store.persist();
    ok(res, null, 'Session ended successfully');
  });

  r.post('/users/:userId/sessions/end-others', requireAuth, requireSelfOrPlatformAdmin, (req: Request, res: Response) => {
    const userId = req.params.userId;
    const before = store.activeSessions.length;
    const kept = store.activeSessions.filter(s => s.userId !== userId || s.isCurrentSession);
    store.activeSessions = kept;
    store.persist();
    ok(res, null, `${before - kept.length} session(s) ended`);
  });

  // ── §3 Organization admin + members + §18 extras + §19 AI settings ─────
  // List/create-organization is a platform-console operation (see AuthContext.loadOrganizations
  // and platform/OrganizationsView — both only ever call it for platform_admin/platform_manager).
  // The auth + role gate lives INSIDE organizationsList.ts's own routes, not here — see the
  // comment on that file for why a blanket `.use(..., requirePlatformRole)` at this exact mount
  // point would also (incorrectly) reject every regular org member's deeper `/organizations/:id/*`
  // request, since Express prefix-matches `/organizations` against those paths too.
  r.use('/organizations', createOrganizationsListRouter());

  // Single gate for every org-scoped resource: Express matches this prefix layer on every
  // request under /organizations/:organizationId/*, runs requireAuth + requireOrgMembership,
  // then falls through to whichever more specific router below actually handles the route.
  r.use('/organizations/:organizationId', requireAuth, requireOrgMembership);

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
  r.use('/organizations/:organizationId/loans', createLoansRouter());
  r.use('/organizations/:organizationId/reports', createReportsRouter());
  r.use('/organizations/:organizationId/classification', createClassificationRouter());
  r.use('/organizations/:organizationId/patterns', createPatternsRouter());
  r.use('/organizations/:organizationId/imports', createImportsRouter());
  r.use('/organizations/:organizationId/audit-logs', createAuditRouter());
  r.use('/organizations/:organizationId/me', createEmployeeMeRouter());

  // §15 Notifications — outside the /organizations/:organizationId prefix, so gated explicitly.
  r.use(
    '/users/:userId/organizations/:organizationId/notifications',
    requireAuth,
    requireSelfOrPlatformAdmin,
    createUserOrgNotificationsRouter(),
  );
  r.use('/notifications', requireAuth, createGlobalNotificationsRouter());

  // §2 Platform console — platform staff only.
  r.use('/platform', requireAuth, requirePlatformRole('platform_admin', 'platform_manager'), createPlatformRouter());

  // Generic org admin (§3 root/members) + §18 team-directory/announcements + §19 ai-settings —
  // mount last; already covered by the /organizations/:organizationId gate above.
  r.use('/organizations/:organizationId', createOrganizationRouter());

  return r;
}

export type { Organization, User };
