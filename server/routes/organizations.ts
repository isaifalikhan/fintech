/**
 * §3 (org admin) + §18 (team-directory, announcements) + §19 (ai-settings)
 * Mounted at `/organizations/:organizationId` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Organization, OrganizationMember, OrgAiIntegrationSettings } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';

/** In-memory only (parity with client `aiSettingsService` demo localStorage — not part of the bundle). */
const aiSettingsByOrg = new Map<string, OrgAiIntegrationSettings>();

function defaultAiSettings(): OrgAiIntegrationSettings {
  return { useCustomKey: false, providerName: '', modelName: 'gpt-4o-mini', apiKey: '' };
}

export function createOrganizationRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/', (req: Request, res: Response) => {
    const org = store.organizations.find(o => o.id === req.params.organizationId) || null;
    if (!org) return notFound(res, 'Organization');
    ok(res, org);
  });

  r.patch('/', (req: Request, res: Response) => {
    const idx = store.organizations.findIndex(o => o.id === req.params.organizationId);
    if (idx === -1) return notFound(res, 'Organization');
    store.organizations[idx] = { ...store.organizations[idx], ...(req.body as Partial<Organization>) };
    store.persist();
    ok(res, store.organizations[idx], 'Organization updated');
  });

  r.delete('/', (req: Request, res: Response) => {
    const id = req.params.organizationId;
    const idx = store.organizations.findIndex(o => o.id === id);
    if (idx === -1) return notFound(res, 'Organization');
    store.organizations.splice(idx, 1);
    store.organizationMembers = store.organizationMembers.filter(m => m.organizationId !== id);
    store.transactions = store.transactions.filter(t => t.organizationId !== id);
    store.persist();
    ok(res, null, 'Organization deleted');
  });

  // ---- Members ----

  r.get('/members', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const members = store.organizationMembers
      .filter(m => m.organizationId === orgId)
      .map(m => {
        const user = store.users.find(u => u.id === m.userId);
        return user ? { ...m, user } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    ok(res, members);
  });

  r.post('/members', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { userId, role } = req.body as { userId: string; role: OrganizationMember['role'] };
    const existing = store.organizationMembers.find(m => m.userId === userId && m.organizationId === orgId);
    if (existing) return fail(res, 409, 'User is already a member');
    const member: OrganizationMember = { userId, organizationId: orgId, role, joinedAt: new Date().toISOString() };
    store.organizationMembers.push(member);
    store.persist();
    created(res, member, 'Member added');
  });

  r.patch('/members/:userId', (req: Request, res: Response) => {
    const { organizationId, userId } = req.params;
    const idx = store.organizationMembers.findIndex(m => m.userId === userId && m.organizationId === organizationId);
    if (idx === -1) return notFound(res, 'Member');
    const { role } = req.body as { role: OrganizationMember['role'] };
    store.organizationMembers[idx] = { ...store.organizationMembers[idx], role };
    store.persist();
    ok(res, store.organizationMembers[idx], 'Role updated');
  });

  r.delete('/members/:userId', (req: Request, res: Response) => {
    const { organizationId, userId } = req.params;
    const idx = store.organizationMembers.findIndex(m => m.userId === userId && m.organizationId === organizationId);
    if (idx === -1) return notFound(res, 'Member');
    store.organizationMembers.splice(idx, 1);
    store.persist();
    ok(res, null, 'Member removed');
  });

  // ---- §18 extras: team directory + announcements ----

  r.get('/team-directory', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    ok(res, store.teamMembers.filter(m => m.organizationId === orgId));
  });

  r.get('/announcements', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    ok(res, store.announcements.filter(a => a.organizationId === orgId));
  });

  // ---- §19 AI settings ----

  r.get('/ai-settings', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    ok(res, aiSettingsByOrg.get(orgId) ?? null);
  });

  r.patch('/ai-settings', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const prev = aiSettingsByOrg.get(orgId) ?? defaultAiSettings();
    const next: OrgAiIntegrationSettings = { ...prev, ...(req.body as Partial<OrgAiIntegrationSettings>) };
    aiSettingsByOrg.set(orgId, next);
    ok(res, next, 'AI connection settings saved.');
  });

  return r;
}
