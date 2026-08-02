/**
 * Authentication Service
 * =======================
 * Handles login, logout, session management, and role verification.
 *
 * MIGRATION: Replace method bodies with real auth API calls (JWT, OAuth, etc.)
 * The function signatures and return types stay the same.
 */

import { User, OrganizationMember, Organization, ActiveSession } from '@/services/types';
import { DEMO_AUTH_PASSWORD } from '@/data/mockDatabase';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { dataStore, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';
import type { AuthSession, LoginCredentials } from './authSessionTypes';
import {
  supabaseGetSession,
  supabaseGetUserOrganizations,
  supabaseGetUserRole,
  supabaseLogin,
  supabaseLogout,
} from './supabaseAuth';

export type { AuthSession, LoginCredentials } from './authSessionTypes';

/** Prefer employee membership when present so session + redirect match FLOW demos. */
function primaryMembershipForUser(userId: string): OrganizationMember | null {
  const memberships = dataStore.organizationMembers.filter(m => m.userId === userId);
  return memberships.find(m => m.role === 'employee') ?? memberships[0] ?? null;
}

export const authService = {
  /**
   * Authenticate user with email/password
   * TODO: Replace with POST /api/auth/login
   */
  async login(credentials: LoginCredentials): Promise<ServiceResponse<AuthSession>> {
    if (isSupabaseConfigured()) {
      return supabaseLogin(credentials);
    }

    const emailNorm = credentials.email.trim().toLowerCase();
    const slugNorm = credentials.orgSlug?.trim().toLowerCase() ?? '';

    if (isHttpBackendConfigured()) {
      const body: LoginCredentials = {
        email: emailNorm,
        password: credentials.password,
        ...(slugNorm ? { orgSlug: slugNorm } : {}),
      };
      return apiPostJson<LoginCredentials, AuthSession>('/auth/login', body);
    }

    await simulateDelay(300);

    if (credentials.password !== DEMO_AUTH_PASSWORD) {
      return { success: false, data: null as unknown as AuthSession, error: 'Invalid email or password' };
    }

    const user = dataStore.users.find(u => u.email.toLowerCase() === emailNorm);
    if (!user) {
      return { success: false, data: null as unknown as AuthSession, error: 'Invalid email or password' };
    }

    const isPlatform = user.role === 'platform_admin' || user.role === 'platform_manager';

    if (slugNorm) {
      const orgMatch = dataStore.organizations.find(
        o => (o.slug || '').toLowerCase() === slugNorm,
      );
      if (!orgMatch) {
        return { success: false, data: null as unknown as AuthSession, error: 'Workspace not found' };
      }
      if (isPlatform) {
        return {
          success: true,
          data: {
            user,
            organization: orgMatch,
            membership: null,
            token: `mock-token-${user.id}-${Date.now()}`,
          },
        };
      }
      const mem = dataStore.organizationMembers.find(
        m => m.userId === user.id && m.organizationId === orgMatch.id,
      );
      if (!mem) {
        return {
          success: false,
          data: null as unknown as AuthSession,
          error: 'No access to this workspace',
        };
      }
      return {
        success: true,
        data: {
          user,
          organization: orgMatch,
          membership: mem,
          token: `mock-token-${user.id}-${Date.now()}`,
        },
      };
    }

    const membership = primaryMembershipForUser(user.id);
    const org = membership
      ? dataStore.organizations.find(o => o.id === membership.organizationId) || null
      : isPlatform
        ? dataStore.organizations[0] || null
        : null;

    return {
      success: true,
      data: {
        user,
        organization: org,
        membership,
        token: `mock-token-${user.id}-${Date.now()}`,
      },
    };
  },

  /**
   * End user session
   * TODO: Replace with POST /api/auth/logout
   */
  async logout(): Promise<ServiceResponse<null>> {
    if (isSupabaseConfigured()) {
      return supabaseLogout();
    }
    if (isHttpBackendConfigured()) {
      return apiPostJson<Record<string, never>, null>('/auth/logout', {});
    }
    await simulateDelay(100);
    return { success: true, data: null, message: 'Logged out' };
  },

  /**
   * Get current session (e.g., on page refresh)
   * TODO: Replace with GET /api/auth/session (validate JWT)
   */
  async getSession(token: string): Promise<ServiceResponse<AuthSession | null>> {
    if (isSupabaseConfigured()) {
      void token;
      return supabaseGetSession();
    }
    if (isHttpBackendConfigured()) {
      return apiGet<AuthSession | null>('/auth/session', { token });
    }

    await simulateDelay(100);

    // In mock mode, parse the user ID from the token
    const match = token.match(/mock-token-([\w-]+)-/);
    if (!match) {
      return { success: false, data: null, error: 'Invalid token' };
    }

    const userId = match[1];
    const user = dataStore.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, data: null, error: 'User not found' };
    }

    const membership = primaryMembershipForUser(user.id);
    const org = membership
      ? dataStore.organizations.find(o => o.id === membership.organizationId) || null
      : user.role === 'platform_admin' || user.role === 'platform_manager'
        ? dataStore.organizations[0] || null
        : null;

    return {
      success: true,
      data: { user, organization: org, membership, token },
    };
  },

  /**
   * Get all organizations a user belongs to
   * TODO: Replace with GET /api/users/:userId/organizations
   */
  async getUserOrganizations(userId: string): Promise<ServiceResponse<Organization[]>> {
    if (isSupabaseConfigured()) {
      return supabaseGetUserOrganizations(userId);
    }
    if (isHttpBackendConfigured()) {
      return apiGet<Organization[]>(`/users/${encodeURIComponent(userId)}/organizations`);
    }

    await simulateDelay();

    const membershipOrgIds = dataStore.organizationMembers
      .filter(m => m.userId === userId)
      .map(m => m.organizationId);

    const orgs = dataStore.organizations.filter(o => membershipOrgIds.includes(o.id));
    return { success: true, data: orgs };
  },

  /**
   * Get user's role in a specific organization
   * TODO: Replace with GET /api/organizations/:orgId/members/:userId
   */
  async getUserRole(userId: string, organizationId: string): Promise<ServiceResponse<OrganizationMember | null>> {
    if (isSupabaseConfigured()) {
      return supabaseGetUserRole(userId, organizationId);
    }
    if (isHttpBackendConfigured()) {
      const q = `userId=${encodeURIComponent(userId)}`;
      return apiGet<OrganizationMember | null>(
        `/organizations/${encodeURIComponent(organizationId)}/membership?${q}`,
      );
    }

    await simulateDelay(50);

    const membership = dataStore.organizationMembers.find(
      m => m.userId === userId && m.organizationId === organizationId
    );

    return { success: true, data: membership || null };
  },

  /**
   * Check if user has specific permission
   */
  hasPermission(role: string | null, requiredLevel: 'read' | 'write' | 'admin'): boolean {
    if (!role) return false;
    const hierarchy: Record<string, number> = { owner: 4, admin: 3, viewer: 2, employee: 1 };
    const levels: Record<string, number> = { read: 1, write: 2, admin: 3 };
    return (hierarchy[role] || 0) >= (levels[requiredLevel] || 0);
  },

  /**
   * Determine redirect path based on user role
   */
  getRedirectPath(user: User): string {
    if (user.role === 'platform_admin' || user.role === 'platform_manager') {
      return '/platform';
    }
    const membership = primaryMembershipForUser(user.id);
    if (membership?.role === 'employee') {
      return '/employee';
    }
    return '/dashboard';
  },

  // ── Session Management (Phase 9C) ──────────────────────────────────────────

  /**
   * Get all active sessions for a user
   * TODO: Replace with GET /api/users/:userId/sessions
   */
  async getActiveSessions(userId: string): Promise<ServiceResponse<ActiveSession[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<ActiveSession[]>(`/users/${encodeURIComponent(userId)}/sessions`);
    }

    await simulateDelay();
    const sessions = dataStore.activeSessions.filter(s => s.userId === userId);
    return { success: true, data: sessions };
  },

  /**
   * End (revoke) a specific session
   * TODO: Replace with DELETE /api/sessions/:sessionId
   */
  async endSession(sessionId: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<null>(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.activeSessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return { success: false, data: null, error: 'Session not found' };

    const session = dataStore.activeSessions[idx];
    if (session.isCurrentSession) {
      return { success: false, data: null, error: 'Cannot end your current session' };
    }

    dataStore.activeSessions.splice(idx, 1);
    return { success: true, data: null, message: 'Session ended successfully' };
  },

  /**
   * End all sessions except the current one
   * TODO: Replace with DELETE /api/users/:userId/sessions?keepCurrent=true
   */
  async endAllOtherSessions(userId: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      return apiPostJson<Record<string, never>, null>(
        `/users/${encodeURIComponent(userId)}/sessions/end-others`,
        {},
      );
    }

    await simulateDelay(200);
    const before = dataStore.activeSessions.length;
    const kept = dataStore.activeSessions.filter(
      s => s.userId !== userId || s.isCurrentSession
    );
    dataStore.activeSessions.length = 0;
    dataStore.activeSessions.push(...kept);
    const ended = before - kept.length;
    return { success: true, data: null, message: `${ended} session(s) ended` };
  },
};