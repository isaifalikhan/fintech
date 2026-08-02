/**
 * §3 (list/create half) — `GET/POST /api/v1/organizations`
 * Mirrors `organizationService.getAll` / `.create` (dataStore branch).
 */

import { Router, type Request, type Response } from 'express';
import type { Organization } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created } from '../lib/http.js';

export function createOrganizationsListRouter(): Router {
  const r = Router();

  r.get('/', (req: Request, res: Response) => {
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

  r.post('/', (req: Request, res: Response) => {
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
