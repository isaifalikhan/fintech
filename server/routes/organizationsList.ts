/**
 * §3 (list/create half) — `GET/POST /api/v1/organizations`
 * Mirrors `organizationService.getAll` / `.create` (dataStore branch).
 */

import { Router, type Request, type Response } from 'express';
import type { Organization } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created } from '../lib/http.js';
import { requireAuth, requirePlatformRole } from '../middleware/auth.js';

/**
 * IMPORTANT: this router is mounted at the exact `/organizations` prefix in apiV1.ts, which
 * (being an Express prefix match) also matches every deeper `/organizations/:id/...` request.
 * Those deeper requests fall through this router (neither route below matches a non-`/` path)
 * and continue on to the org-scoped middleware/routers mounted after it. The platform-only gate
 * below MUST stay attached to these two individual routes rather than applied as a blanket
 * `router.use(...)` — a blanket mount here would also run for, and incorrectly reject, every
 * regular (non-platform) org member's request to their own organization's sub-resources.
 */
export function createOrganizationsListRouter(): Router {
  const r = Router();

  r.get('/', requireAuth, requirePlatformRole('platform_admin', 'platform_manager'), (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 20) || 20;
    const total = store.organizations.length;
    const items = store.organizations.slice((page - 1) * pageSize, page * pageSize);
    ok(res, {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    });
  });

  r.post('/', requireAuth, requirePlatformRole('platform_admin', 'platform_manager'), (req: Request, res: Response) => {
    const data = req.body as Omit<Organization, 'id' | 'createdAt'>;
    const newOrg: Organization = {
      ...data,
      id: store.generateId('org'),
      createdAt: new Date().toISOString(),
    };
    store.organizations.push(newOrg);
    store.persist();
    created(res, newOrg, 'Organization created');
  });

  return r;
}
