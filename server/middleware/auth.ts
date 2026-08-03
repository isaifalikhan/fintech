/**
 * Authorization middleware for `/api/v1` and `/api/bundle`.
 *
 * Revocation design: a JWT alone can't be revoked once issued, so `requireAuth` treats the JWT's
 * `sid` claim as a pointer into `store.activeSessions` and re-checks that row on every request.
 * Deleting the `ActiveSession` (logout, "end session", "end other sessions") is what actually
 * invalidates access — the token's signature/expiry are a hard backstop, not the only check.
 * See server/lib/jwt.ts for the token shape and server/routes/apiV1.ts for where sessions are
 * created/deleted.
 */

import type { Request, Response, NextFunction } from 'express';
import { store } from '../lib/store.js';
import { readAuthToken, verifyAuthToken } from '../lib/jwt.js';
import { fail } from '../lib/http.js';
import type { User, OrganizationMember } from '../../src/services/types.js';

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: User;
    authSessionId?: string;
    orgMembership?: OrganizationMember;
  }
}

const PLATFORM_ROLES = new Set(['platform_admin', 'platform_manager']);

export function isPlatformUser(user: User): boolean {
  return PLATFORM_ROLES.has(user.role);
}

/** Verifies the token's signature/expiry AND that its session hasn't been revoked. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readAuthToken(req);
  if (!token) {
    fail(res, 401, 'Not authenticated');
    return;
  }

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    fail(res, 401, 'Invalid or expired session');
    return;
  }

  const session = store.activeSessions.find(s => s.id === payload.sid);
  if (!session) {
    fail(res, 401, 'Session has been revoked');
    return;
  }

  const user = store.users.find(u => u.id === payload.sub);
  if (!user) {
    fail(res, 401, 'User no longer exists');
    return;
  }

  session.lastActivity = new Date().toISOString();
  req.authUser = user;
  req.authSessionId = session.id;
  next();
}

export function requirePlatformRole(...roles: Array<'platform_admin' | 'platform_manager'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser || !roles.includes(req.authUser.role as 'platform_admin' | 'platform_manager')) {
      fail(res, 403, 'Insufficient privileges');
      return;
    }
    next();
  };
}

/** Platform admins/managers bypass org-membership checks, mirroring the existing client convention. */
export function requireOrgMembership(req: Request, res: Response, next: NextFunction): void {
  const user = req.authUser;
  if (!user) {
    fail(res, 401, 'Not authenticated');
    return;
  }
  const organizationId = req.params.organizationId;
  if (isPlatformUser(user)) {
    next();
    return;
  }
  const membership = store.organizationMembers.find(
    m => m.userId === user.id && m.organizationId === organizationId,
  );
  if (!membership) {
    fail(res, 403, 'No access to this organization');
    return;
  }
  req.orgMembership = membership;
  next();
}

/** For /users/:userId/* — caller must be that user, or platform staff. */
export function requireSelfOrPlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.authUser;
  if (!user) {
    fail(res, 401, 'Not authenticated');
    return;
  }
  if (user.id === req.params.userId || isPlatformUser(user)) {
    next();
    return;
  }
  fail(res, 403, 'Forbidden');
}

/** Finer-grained org-role gate (owner/admin/viewer/employee), for the highest-value admin actions. */
export function requireOrgRole(...roles: Array<'owner' | 'admin' | 'viewer' | 'employee'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      fail(res, 401, 'Not authenticated');
      return;
    }
    if (isPlatformUser(user)) {
      next();
      return;
    }
    const membership = req.orgMembership;
    if (!membership || !roles.includes(membership.role)) {
      fail(res, 403, 'Insufficient role');
      return;
    }
    next();
  };
}
