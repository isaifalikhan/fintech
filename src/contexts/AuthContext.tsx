import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Organization, UserRole } from '@/services/types';
import { authService, organizationService } from '@/services';
import type { AuthSession } from '@/services';
import { logUnexpectedError } from '@/lib/diagnostics';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { isHttpBackendConfigured } from '@/lib/apiClient';
import { hydrateDataStoreFromSupabase } from '@/services/dataStore';

// Mock-mode-only token storage key. When talking to the real HTTP backend, the session lives in
// an httpOnly cookie the server sets on login — it's never readable from JS, so nothing is
// stored here in that mode (see restoreSession/login/logout below).
const TOKEN_KEY = 'finance_os_token';

interface AuthContextType {
  user: User | null;
  currentOrganization: Organization | null;
  userRole: UserRole | null;
  organizations: Organization[];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Optional `orgSlug` matches tenant from URL (e.g. `/login/employee/creative-agency`). */
  login: (email: string, password: string, orgSlug?: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (organizationId: string) => void;
  /** After PATCH organization (e.g. settings save), keep session and org list in sync. */
  applyOrganizationUpdate: (org: Organization) => void;
  hasPermission: (permission: 'read' | 'write' | 'admin') => boolean;
  getRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // true for session restore check

  /**
   * Derive a UserRole from an AuthSession.
   * Platform-level users without org memberships get mapped to org-level equivalents.
   */
  const deriveUserRole = (session: AuthSession): UserRole => {
    if (session.membership) {
      return session.membership.role;
    }
    if (session.user.role === 'platform_admin') return 'owner';
    if (session.user.role === 'platform_manager') return 'admin';
    return 'viewer';
  };

  /**
   * Load the organizations list for a user.
   * Platform admins/managers see ALL orgs; regular users see only their memberships.
   */
  const loadOrganizations = async (sessionUser: User): Promise<Organization[]> => {
    if (sessionUser.role === 'platform_admin' || sessionUser.role === 'platform_manager') {
      const res = await organizationService.getAll({ page: 1, pageSize: 100 });
      return res.success ? res.data.items : [];
    }
    const res = await authService.getUserOrganizations(sessionUser.id);
    return res.success ? res.data : [];
  };

  /**
   * Apply a full AuthSession to component state.
   */
  const applySession = async (session: AuthSession) => {
    setUser(session.user);
    setCurrentOrganization(session.organization);
    setUserRole(deriveUserRole(session));

    const orgs = await loadOrganizations(session.user);
    setOrganizations(orgs);
  };

  // ── Session restore on mount ───────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      // Real backend (Supabase or the local HTTP API): the session lives server-side (Supabase
      // session / httpOnly cookie), so restore is just "ask the server who I am" — no token to
      // manage client-side at all.
      if (isSupabaseConfigured() || isHttpBackendConfigured()) {
        try {
          const response = await authService.getSession('');
          if (response.success && response.data) {
            await applySession(response.data);
          }
        } catch (e) {
          logUnexpectedError('AuthContext.restoreSession', e);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Mock mode only: no server to hold a session, so a token is kept in localStorage purely
      // to remember "who was logged in" across a page refresh in the browser-only demo.
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await authService.getSession(token);
        if (response.success && response.data) {
          await applySession(response.data);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (e) {
        logUnexpectedError('AuthContext.restoreSession', e);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ─────────────────────────────────────────────────

  const login = async (email: string, password: string, orgSlug?: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password, orgSlug });
      if (!response.success) {
        throw new Error(response.error || 'Login failed');
      }
      // Mock mode only — real backends never expose the session token to client JS (Supabase
      // manages its own storage; the local API sets an httpOnly cookie the browser can't read).
      if (!isSupabaseConfigured() && !isHttpBackendConfigured()) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
      }
      await applySession(response.data);
      await hydrateDataStoreFromSupabase();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Fire-and-forget the service call (keeps interface synchronous) — for the real backend this
    // deletes the server-side session and clears the httpOnly cookie.
    authService.logout();
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setCurrentOrganization(null);
    setUserRole(null);
    setOrganizations([]);
  };

  const switchOrganization = (organizationId: string) => {
    const org = organizations.find((o) => o.id === organizationId);
    if (org && user) {
      setCurrentOrganization(org);
      // Async role lookup — org switches instantly, role resolves ~50ms later
      authService.getUserRole(user.id, organizationId).then((response) => {
        if (response.success && response.data) {
          setUserRole(response.data.role);
        } else {
          setUserRole('viewer');
        }
      });
    }
  };

  const applyOrganizationUpdate = useCallback((org: Organization) => {
    setCurrentOrganization(org);
    setOrganizations((prev) => {
      const i = prev.findIndex((o) => o.id === org.id);
      if (i === -1) return [...prev, org];
      const next = [...prev];
      next[i] = org;
      return next;
    });
  }, []);

  const hasPermission = (permission: 'read' | 'write' | 'admin'): boolean => {
    return authService.hasPermission(userRole, permission);
  };

  const getRedirectPath = (): string => {
    if (!user) return '/';
    return authService.getRedirectPath(user);
  };

  const value: AuthContextType = {
    user,
    currentOrganization,
    userRole,
    organizations,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    switchOrganization,
    applyOrganizationUpdate,
    hasPermission,
    getRedirectPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};