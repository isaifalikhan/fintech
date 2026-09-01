/**
 * §3 (org admin) + §18 (team-directory, announcements) + §19 (ai-settings)
 * Mounted at `/organizations/:organizationId` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Organization, OrganizationMember, OrgAiIntegrationSettings, User, AiChatTurn } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';
import { requireOrgRole } from '../middleware/auth.js';
import { toPublicUser } from '../lib/serialize.js';
import { findAuthUserIdByLegacyId, getSupabaseAdminClient, isSupabaseAdminConfigured } from '../lib/supabaseAdmin.js';
import { callConfiguredAiProvider, callGroq } from '../lib/aiProviders.js';
import { buildOrgContext, buildEmployeeContext, buildSystemPrompt } from '../lib/aiContext.js';
import { env } from '../config/env.js';
import { aiAssistantRateLimiter } from '../middleware/rateLimit.js';

function defaultAiSettings(): OrgAiIntegrationSettings {
  return { useCustomKey: false, providerName: '', modelName: 'gpt-4o-mini', apiKey: '' };
}

/** Owner/admin only — everything below is either a read (open to any member, checked by the
 *  requireAuth + requireOrgMembership gate mounted in apiV1.ts) or a mutation gated here. */
const ownerOrAdmin = requireOrgRole('owner', 'admin');

export function createOrganizationRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/', (req: Request, res: Response) => {
    const org = store.organizations.find(o => o.id === req.params.organizationId) || null;
    if (!org) return notFound(res, 'Organization');
    ok(res, org);
  });

  r.patch('/', ownerOrAdmin, (req: Request, res: Response) => {
    const idx = store.organizations.findIndex(o => o.id === req.params.organizationId);
    if (idx === -1) return notFound(res, 'Organization');
    store.organizations[idx] = { ...store.organizations[idx], ...(req.body as Partial<Organization>) };
    store.persist();
    ok(res, store.organizations[idx], 'Organization updated');
  });

  r.delete('/', ownerOrAdmin, (req: Request, res: Response) => {
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
        return user ? { ...m, user: toPublicUser(user) } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    ok(res, members);
  });

  r.post('/members', ownerOrAdmin, (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { userId, role } = req.body as { userId: string; role: OrganizationMember['role'] };
    const existing = store.organizationMembers.find(m => m.userId === userId && m.organizationId === orgId);
    if (existing) return fail(res, 409, 'User is already a member');
    const member: OrganizationMember = { userId, organizationId: orgId, role, joinedAt: new Date().toISOString(), status: 'active' };
    store.organizationMembers.push(member);
    store.persist();
    created(res, member, 'Member added');
  });

  r.patch('/members/:userId', ownerOrAdmin, async (req: Request, res: Response) => {
    const { organizationId, userId } = req.params;
    const idx = store.organizationMembers.findIndex(m => m.userId === userId && m.organizationId === organizationId);
    if (idx === -1) return notFound(res, 'Member');
    const { role } = req.body as { role: OrganizationMember['role'] };
    store.organizationMembers[idx] = { ...store.organizationMembers[idx], role };
    store.persist();

    // Best-effort: mirror the role change to the real `organization_members` table. The mock
    // userId isn't the row's real user_id (that's a Supabase Auth UUID) — resolve it via the
    // `legacy_id` stamped in that user's auth metadata at invite time. Never blocks the response.
    if (isSupabaseAdminConfigured()) {
      void (async () => {
        try {
          const realUserId = await findAuthUserIdByLegacyId(userId);
          if (!realUserId) return;
          const sb = getSupabaseAdminClient();
          const { error } = await sb!
            .from('organization_members')
            .update({ role })
            .eq('organization_id', organizationId)
            .eq('user_id', realUserId);
          if (error) console.error('[members] Supabase role-sync failed', error);
        } catch (e) {
          console.error('[members] Supabase role-sync threw', e);
        }
      })();
    }

    ok(res, store.organizationMembers[idx], 'Role updated');
  });

  r.post('/members/invite', ownerOrAdmin, async (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { email, name, role } = req.body as { email: string; name?: string; role: OrganizationMember['role'] };
    const trimmedEmail = email?.trim().toLowerCase();
    if (!trimmedEmail) return fail(res, 400, 'Email is required');

    let user = store.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        email: trimmedEmail,
        name: name?.trim() || trimmedEmail,
        role: 'organization_user',
        createdAt: new Date().toISOString(),
      } as User;
      store.users.push(user);
    }

    const existing = store.organizationMembers.find(m => m.userId === user!.id && m.organizationId === orgId);
    if (existing) return fail(res, 409, 'That person is already a member of this organization');

    const member: OrganizationMember = { userId: user.id, organizationId: orgId, role, joinedAt: new Date().toISOString(), status: 'pending' };
    store.organizationMembers.push(member);
    store.persist();

    let inviteEmailSent = false;
    if (isSupabaseAdminConfigured()) {
      try {
        const sb = getSupabaseAdminClient()!;
        const { data, error } = await sb.auth.admin.inviteUserByEmail(trimmedEmail, {
          data: { legacy_id: user.id, name: user.name },
        });
        if (error) {
          console.error('[members] Supabase inviteUserByEmail failed', error);
        } else if (data.user) {
          inviteEmailSent = true;
          const { error: insertErr } = await sb
            .from('organization_members')
            .insert({ organization_id: orgId, user_id: data.user.id, role });
          if (insertErr) console.error('[members] failed to insert real organization_members row', insertErr);
        }
      } catch (e) {
        console.error('[members] Supabase admin invite threw', e);
      }
    }

    created(
      res,
      member,
      inviteEmailSent
        ? `Invite email sent to ${trimmedEmail}`
        : `Member added. ${isSupabaseAdminConfigured() ? 'Invite email could not be sent — check server logs.' : 'Supabase admin invite is not configured on this server, so no email was sent.'}`,
    );
  });

  r.delete('/members/:userId', ownerOrAdmin, (req: Request, res: Response) => {
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
    ok(res, store.aiSettings[orgId] ?? null);
  });

  r.patch('/ai-settings', ownerOrAdmin, (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const prev = store.aiSettings[orgId] ?? defaultAiSettings();
    const next: OrgAiIntegrationSettings = { ...prev, ...(req.body as Partial<OrgAiIntegrationSettings>) };
    store.aiSettings = { ...store.aiSettings, [orgId]: next };
    store.persist();
    ok(res, next, 'AI connection settings saved.');
  });

  /**
   * Real chat completion, grounded in this organization's/employee's own data. Resolution order:
   * (1) the org's own configured provider key (`ai-settings` above) if set, (2) the server's free
   * Groq key (GROQ_API_KEY) as a zero-config fallback, (3) a clear "not configured" error if
   * neither is available. No silent fallback to canned replies — an honest error either way.
   */
  r.post('/ai-chat', aiAssistantRateLimiter, async (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const userId = req.authUser!.id;

    const { message, history, surface } = req.body as {
      message?: unknown;
      history?: unknown;
      surface?: unknown;
    };
    if (typeof message !== 'string' || !message.trim()) {
      return fail(res, 400, 'message is required');
    }
    if (surface !== 'org' && surface !== 'employee') {
      return fail(res, 400, 'surface must be "org" or "employee"');
    }
    const safeHistory: AiChatTurn[] = Array.isArray(history)
      ? history.filter(
          (h): h is AiChatTurn =>
            h && typeof h === 'object' && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string',
        )
      : [];

    const settings = store.aiSettings[orgId];
    const context =
      surface === 'org' ? buildOrgContext(orgId) : buildEmployeeContext(orgId, userId);
    const systemPrompt = buildSystemPrompt(surface, context);

    let result;
    if (settings?.useCustomKey && settings.apiKey.trim()) {
      result = await callConfiguredAiProvider({
        providerName: settings.providerName,
        modelName: settings.modelName,
        apiKey: settings.apiKey,
        systemPrompt,
        message,
        history: safeHistory,
      });
    } else if (env.groqApiKey) {
      result = await callGroq({
        providerName: 'Groq',
        modelName: 'llama-3.3-70b-versatile',
        apiKey: env.groqApiKey,
        systemPrompt,
        message,
        history: safeHistory,
      });
    } else {
      return fail(
        res,
        503,
        "AI Assistant isn't configured. Add your own AI provider key in Settings → AI Assistant → Integrations, or ask an admin to set GROQ_API_KEY on the server.",
      );
    }

    if (!result.success) return fail(res, 502, result.error);
    ok(res, { reply: result.reply });
  });

  return r;
}
