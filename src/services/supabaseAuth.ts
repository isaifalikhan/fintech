/**
 * Maps Supabase Auth sessions to Finance OS `AuthSession` and optional org rows from Postgres.
 * Create tables with `supabase/schema.sql` in the Supabase SQL editor when you are ready for org data.
 */

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { Organization, OrganizationMember, PlatformRole, User } from '@/services/types';
import type { ServiceResponse } from '@/services/types';
import type { AuthSession, LoginCredentials } from '@/services/authSessionTypes';
import { getSupabaseClient } from '@/lib/supabaseClient';

function isPlatformRole(v: unknown): v is PlatformRole {
  return v === 'platform_admin' || v === 'platform_manager' || v === 'organization_user';
}

function mapSupabaseUser(u: SupabaseUser): User {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (u.email?.split('@')[0] ?? 'User');
  const roleRaw = meta.platform_role;
  const role: PlatformRole = isPlatformRole(roleRaw) ? roleRaw : 'organization_user';
  return {
    id: u.id,
    email: u.email ?? '',
    name,
    avatar: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
    role,
    createdAt: u.created_at ?? new Date().toISOString(),
  };
}

export function mapOrgRow(row: Record<string, unknown>): Organization {
  const settings = row.settings;
  const settingsObj =
    settings && typeof settings === 'object' && settings !== null && !Array.isArray(settings)
      ? (settings as Organization['settings'])
      : { theme: 'dark', notifications: true };

  const createdRaw = row.created_at;
  const createdAt =
    typeof createdRaw === 'string'
      ? createdRaw
      : createdRaw instanceof Date
        ? createdRaw.toISOString()
        : new Date().toISOString();

  return {
    id: String(row.id),
    slug: typeof row.slug === 'string' ? row.slug : undefined,
    name: String(row.name ?? ''),
    logo: typeof row.logo === 'string' ? row.logo : undefined,
    currency: String(row.currency ?? 'USD'),
    fiscalYearStart: String(row.fiscal_year_start ?? '01-01'),
    createdAt,
    settings: settingsObj,
  };
}

type MemberRow = {
  role: string;
  organization_id: string;
  joined_at?: string;
  organizations: Record<string, unknown> | Record<string, unknown>[] | null;
};

async function fetchOrgBySlug(slug: string): Promise<Organization | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data, error } = await sb.from('organizations').select('*');
  if (error || !data?.length) return null;
  const slugLower = slug.trim().toLowerCase();
  const row = data.find(
    (r: { slug?: string }) => typeof r.slug === 'string' && r.slug.toLowerCase() === slugLower,
  );
  return row ? mapOrgRow(row as Record<string, unknown>) : null;
}

async function fetchMembershipAndOrg(
  userId: string,
  orgSlug?: string,
): Promise<{ organization: Organization | null; membership: OrganizationMember | null }> {
  const sb = getSupabaseClient();
  if (!sb) return { organization: null, membership: null };

  const { data, error } = await sb
    .from('organization_members')
    .select('role, organization_id, joined_at, organizations(*)')
    .eq('user_id', userId);

  if (error || !data?.length) {
    return { organization: null, membership: null };
  }

  const rows = data as unknown as MemberRow[];
  let chosen: MemberRow | undefined;

  if (orgSlug) {
    const slugLower = orgSlug.trim().toLowerCase();
    chosen = rows.find(r => {
      const org = r.organizations;
      const o = Array.isArray(org) ? org[0] : org;
      if (!o || typeof o !== 'object') return false;
      const s = (o as { slug?: string }).slug;
      return typeof s === 'string' && s.toLowerCase() === slugLower;
    });
  }
  if (!chosen) {
    chosen = rows.find(r => r.role === 'employee') ?? rows[0];
  }

  const orgRaw = chosen.organizations;
  const orgObj = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  if (!orgObj || typeof orgObj !== 'object') {
    return { organization: null, membership: null };
  }

  const organization = mapOrgRow(orgObj as Record<string, unknown>);
  const membership: OrganizationMember = {
    userId,
    organizationId: organization.id,
    role: chosen.role as OrganizationMember['role'],
    joinedAt: chosen.joined_at ?? new Date().toISOString(),
  };

  return { organization, membership };
}

export async function buildAuthSessionFromSupabase(
  session: Session,
  orgSlug?: string,
): Promise<AuthSession> {
  const user = mapSupabaseUser(session.user);
  const isPlatform = user.role === 'platform_admin' || user.role === 'platform_manager';
  const slugNorm = orgSlug?.trim();

  if (slugNorm && isPlatform) {
    const org = await fetchOrgBySlug(slugNorm);
    if (org) {
      return {
        user,
        organization: org,
        membership: null,
        token: session.access_token,
      };
    }
  }

  const { organization, membership } = await fetchMembershipAndOrg(session.user.id, orgSlug);

  if (!organization && isPlatform && !slugNorm) {
    return {
      user,
      organization: null,
      membership: null,
      token: session.access_token,
    };
  }

  return {
    user,
    organization,
    membership,
    token: session.access_token,
  };
}

export async function supabaseLogin(credentials: LoginCredentials): Promise<ServiceResponse<AuthSession>> {
  const sb = getSupabaseClient();
  if (!sb) {
    return { success: false, data: null as unknown as AuthSession, error: 'Supabase client unavailable' };
  }

  const emailNorm = credentials.email.trim().toLowerCase();
  const { data, error } = await sb.auth.signInWithPassword({
    email: emailNorm,
    password: credentials.password,
  });

  if (error) {
    return { success: false, data: null as unknown as AuthSession, error: error.message };
  }
  if (!data.session) {
    return { success: false, data: null as unknown as AuthSession, error: 'No session returned' };
  }

  const session = await buildAuthSessionFromSupabase(data.session, credentials.orgSlug);
  return { success: true, data: session };
}

export async function supabaseLogout(): Promise<ServiceResponse<null>> {
  const sb = getSupabaseClient();
  if (!sb) return { success: true, data: null };
  const { error } = await sb.auth.signOut();
  if (error) return { success: false, data: null, error: error.message };
  return { success: true, data: null, message: 'Logged out' };
}

export async function supabaseGetSession(): Promise<ServiceResponse<AuthSession | null>> {
  const sb = getSupabaseClient();
  if (!sb) {
    return { success: false, data: null, error: 'Supabase client unavailable' };
  }

  const {
    data: { session },
    error,
  } = await sb.auth.getSession();
  if (error) {
    return { success: false, data: null, error: error.message };
  }
  if (!session) {
    return { success: true, data: null };
  }

  const mapped = await buildAuthSessionFromSupabase(session);
  return { success: true, data: mapped };
}

export async function supabaseGetUserOrganizations(userId: string): Promise<ServiceResponse<Organization[]>> {
  const sb = getSupabaseClient();
  if (!sb) return { success: true, data: [] };

  const { data, error } = await sb
    .from('organization_members')
    .select('organizations(*)')
    .eq('user_id', userId);

  if (error || !data?.length) {
    return { success: true, data: [] };
  }

  const orgs: Organization[] = [];
  for (const row of data as { organizations: Record<string, unknown> | Record<string, unknown>[] | null }[]) {
    const o = row.organizations;
    const orgObj = Array.isArray(o) ? o[0] : o;
    if (orgObj && typeof orgObj === 'object') {
      orgs.push(mapOrgRow(orgObj as Record<string, unknown>));
    }
  }
  return { success: true, data: orgs };
}

export async function supabaseGetUserRole(
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<OrganizationMember | null>> {
  const sb = getSupabaseClient();
  if (!sb) return { success: true, data: null };

  const { data, error } = await sb
    .from('organization_members')
    .select('role, joined_at')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !data) {
    return { success: true, data: null };
  }

  const row = data as { role: string; joined_at?: string };
  return {
    success: true,
    data: {
      userId,
      organizationId,
      role: row.role as OrganizationMember['role'],
      joinedAt: row.joined_at ?? new Date().toISOString(),
    },
  };
}
