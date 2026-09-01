/**
 * Platform Service
 * =================
 * Consolidated platform-level metadata for the Platform Admin views.
 * Aggregates SaaS KPIs, plan definitions, per-org billing/status metadata,
 * and billing summary stats into a single service.
 *
 * PHASE 8: Eliminates inline platform data scattered across PlatformHome,
 * OrganizationsView, and PlansView.
 *
 * MIGRATION: Replace method bodies with API calls to /api/platform/*.
 * The service signatures stay the same.
 */

import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse, User } from './types';

// ── Platform Types ──────────────────────────────────────────────────────────

export interface PlatformStats {
  mrr: number;
  arr: number;
  activeOrgs: number;
  trialOrgs: number;
  suspendedOrgs: number;
  churnRiskOrgs: number;
  totalUsers: number;
  newUsersThisMonth: number;
  statementsProcessed: number;
  platformProfit: number;
  platformCost: number;
  storageUsed: number;   // MB
  storageLimit: number;  // MB
  revenueGrowth: { month: string; revenue: number }[];
}

export interface PlatformPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    users: number;
    statements: number;
    currencies: number;
    storage: number; // MB
  };
  active: boolean;
}

export interface PlatformOrgMeta {
  plan: string;
  status: 'active' | 'trial' | 'suspended' | 'churn_risk';
  limits: {
    users: number; usersUsed: number;
    statements: number; statementsUsed: number;
    currencies: number; currenciesUsed: number;
  };
  billing: { amount: number };
}

export interface BillingStats {
  totalMonthlyRevenue: number;
  revenueGrowthPct: number;
  activeSubscriptions: number;
  overdueInvoices: number;
}

/**
 * Platform-wide config edited from PlatformSettingsView. Field shape mirrors that page's
 * controls exactly (currency codes, retention labels, backup selects, feature-flag names).
 */
export interface PlatformSettings {
  /**
   * Keyed by currency code. Starts with the 8 defaults below (PKR, USD, EUR, GBP, AED, CAD,
   * AUD, SGD), but the set is open-ended — PlatformSettingsView's "+ Add Currency" dialog
   * inserts any additional code from `SUPPORTED_CURRENCIES` (src/lib/currencies.ts) that
   * isn't already a key here.
   */
  enabledCurrencies: Record<string, boolean>;
  dataRetention: {
    transactionDataRetentionDays: number;
    auditLogRetentionDays: number;
    statementFilesRetentionDays: number;
    deletedOrgDataRetentionDays: number;
    autoDeleteExpiredData: boolean;
  };
  backup: {
    fullBackupFrequency: 'Daily' | 'Weekly' | 'Monthly';
    incrementalBackupFrequency: 'Hourly' | 'Every 6 hours' | 'Every 12 hours';
    backupRetentionDays: number;
  };
  /** Keyed by the exact flag name shown on the page. */
  featureFlags: Record<string, boolean>;
}

/** One manual-backup download event, recorded by "Trigger Manual Backup". */
export interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  sizeBytes: number;
}

// ── Seed Data (replaces inline constants in 3 components) ───────────────────

/**
 * Fallback used only when `dataStore.platformPlans` is empty (e.g. a persisted bundle from
 * before this collection existed). Normal reads/writes go through `dataStore.platformPlans`,
 * seeded from this same data in `src/services/initialBundle.ts`'s `PLATFORM_PLANS_SEED` —
 * kept in sync with `DEFAULT_PLATFORM_PLANS` in server/lib/store.ts.
 */
export const DEFAULT_PLATFORM_PLANS: PlatformPlan[] = [
  {
    id: 'plan-1',
    name: 'Basic',
    price: 0,
    currency: 'PKR',
    features: ['statement_import'],
    limits: { users: 5, statements: 100, currencies: 2, storage: 2048 },
    active: true,
  },
  {
    id: 'plan-2',
    name: 'Professional',
    price: 49900,
    currency: 'PKR',
    features: ['personal_finance', 'statement_import', 'profit_intelligence', 'team_management', 'costing_engine'],
    limits: { users: 10, statements: 500, currencies: 5, storage: 10240 },
    active: true,
  },
  {
    id: 'plan-3',
    name: 'Enterprise',
    price: 99900,
    currency: 'PKR',
    features: ['personal_finance', 'statement_import', 'profit_intelligence', 'team_management', 'costing_engine', 'api_access', 'white_label'],
    limits: { users: 50, statements: 2000, currencies: 10, storage: 51200 },
    active: true,
  },
];

const ORG_META: Record<string, PlatformOrgMeta> = {
  'org-001': {
    plan: 'Professional',
    status: 'active',
    limits: { users: 10, usersUsed: 5, statements: 500, statementsUsed: 248, currencies: 5, currenciesUsed: 3 },
    billing: { amount: 49900 },
  },
  'org-002': {
    plan: 'Basic',
    status: 'trial',
    limits: { users: 5, usersUsed: 2, statements: 100, statementsUsed: 12, currencies: 2, currenciesUsed: 1 },
    billing: { amount: 0 },
  },
  'org-003': {
    plan: 'Enterprise',
    status: 'churn_risk',
    limits: { users: 50, usersUsed: 15, statements: 2000, statementsUsed: 234, currencies: 10, currenciesUsed: 4 },
    billing: { amount: 99900 },
  },
};

const DEFAULT_ORG_META: PlatformOrgMeta = {
  plan: 'Basic',
  status: 'active',
  limits: { users: 5, usersUsed: 1, statements: 100, statementsUsed: 0, currencies: 2, currenciesUsed: 1 },
  billing: { amount: 0 },
};

/** Defaults matching every control's initial state on PlatformSettingsView before any save. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  enabledCurrencies: {
    PKR: true, USD: true, EUR: true, GBP: true, AED: true, CAD: true, AUD: true, SGD: true,
  },
  dataRetention: {
    transactionDataRetentionDays: 730,
    auditLogRetentionDays: 365,
    statementFilesRetentionDays: 365,
    deletedOrgDataRetentionDays: 90,
    autoDeleteExpiredData: true,
  },
  backup: {
    fullBackupFrequency: 'Daily',
    incrementalBackupFrequency: 'Hourly',
    backupRetentionDays: 30,
  },
  featureFlags: {
    'AI-Powered Category Suggestions': true,
    'Advanced What-If Simulations': true,
    'API Access (Beta)': false,
    'White Label Mode': false,
    'Multi-Currency Auto-Convert': true,
    'Export to QuickBooks': false,
  },
};

function mergePlatformSettings(current: PlatformSettings, updates: Partial<PlatformSettings>): PlatformSettings {
  return {
    ...current,
    ...updates,
    enabledCurrencies: { ...current.enabledCurrencies, ...(updates.enabledCurrencies || {}) },
    dataRetention: { ...current.dataRetention, ...(updates.dataRetention || {}) },
    backup: { ...current.backup, ...(updates.backup || {}) },
    featureFlags: { ...current.featureFlags, ...(updates.featureFlags || {}) },
  };
}

function mergePlatformPlan(current: PlatformPlan, updates: Partial<PlatformPlan>): PlatformPlan {
  return {
    ...current,
    ...updates,
    limits: { ...current.limits, ...(updates.limits || {}) },
  };
}

/**
 * Validates + normalizes an `updatePlan` payload field-by-field (only the fields present).
 * Mirrors `sanitizePlanUpdates` in `server/routes/platform.ts` — the only current caller
 * (PlansView) already sends well-typed data, but this keeps the dataStore branch from silently
 * accepting a malformed shape (e.g. a non-array `features`) the way the HTTP branch would reject.
 */
function sanitizePlanUpdates(
  updates: Partial<PlatformPlan>,
): { ok: true; updates: Partial<PlatformPlan> } | { ok: false; error: string } {
  const clean: Partial<PlatformPlan> = {};

  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || !updates.name.trim()) {
      return { ok: false, error: 'Plan name cannot be empty' };
    }
    clean.name = updates.name.trim();
  }
  if (updates.price !== undefined) {
    if (typeof updates.price !== 'number' || Number.isNaN(updates.price) || updates.price < 0) {
      return { ok: false, error: 'Price must be a non-negative number' };
    }
    clean.price = updates.price;
  }
  if (updates.currency !== undefined) {
    if (typeof updates.currency !== 'string' || !updates.currency.trim()) {
      return { ok: false, error: 'Currency must be a non-empty string' };
    }
    clean.currency = updates.currency.trim().toUpperCase();
  }
  if (updates.features !== undefined) {
    if (!Array.isArray(updates.features) || !updates.features.every((f) => typeof f === 'string')) {
      return { ok: false, error: 'Features must be an array of strings' };
    }
    clean.features = updates.features;
  }
  if (updates.limits !== undefined) {
    const l = updates.limits as Partial<PlatformPlan['limits']> | null;
    if (!l || typeof l !== 'object') {
      return { ok: false, error: 'Limits must be an object' };
    }
    const keys: (keyof PlatformPlan['limits'])[] = ['users', 'statements', 'currencies', 'storage'];
    const limits: Partial<PlatformPlan['limits']> = {};
    for (const key of keys) {
      const v = l[key];
      if (v === undefined) continue;
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
        return { ok: false, error: `limits.${key} must be a non-negative number` };
      }
      limits[key] = v;
    }
    clean.limits = limits as PlatformPlan['limits'];
  }
  if (updates.active !== undefined) {
    if (typeof updates.active !== 'boolean') {
      return { ok: false, error: 'active must be a boolean' };
    }
    clean.active = updates.active;
  }

  return { ok: true, updates: clean };
}

// ── Service ─────────────────────────────────────────────────────────────────

export const platformService = {
  /**
   * Aggregate SaaS KPIs for the Platform Dashboard.
   * When `VITE_API_BASE_URL` is set: `GET /platform/stats`.
   */
  async getStats(): Promise<ServiceResponse<PlatformStats>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PlatformStats>('/platform/stats');
    }

    await simulateDelay();

    // Derive org counts from dataStore + meta overlay
    const allOrgs = dataStore.organizations;
    const metaValues = Object.values(ORG_META);
    const activeOrgs  = metaValues.filter(m => m.status === 'active').length
                      + (allOrgs.length - Object.keys(ORG_META).length); // untracked default to active
    const trialOrgs   = metaValues.filter(m => m.status === 'trial').length;
    const suspendedOrgs = metaValues.filter(m => m.status === 'suspended').length;
    const churnRiskOrgs = metaValues.filter(m => m.status === 'churn_risk').length;

    // Derive user count from dataStore
    const totalUsers = dataStore.users.length;

    // Derive this-month signup count from dataStore
    const now = new Date();
    const newUsersThisMonth = dataStore.users.filter(u => {
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    // Derive statement count from transactions as proxy
    const statementsProcessed = dataStore.transactions.length * 42; // scale factor for demo

    return {
      success: true,
      data: {
        mrr: 125000,
        arr: 1500000,
        activeOrgs,
        trialOrgs,
        suspendedOrgs,
        churnRiskOrgs,
        totalUsers,
        newUsersThisMonth,
        statementsProcessed,
        platformProfit: 980000,
        platformCost: 520000,
        storageUsed: 45000,
        storageLimit: 102400,
        revenueGrowth: [
          { month: 'Jul', revenue: 95000 },
          { month: 'Aug', revenue: 102000 },
          { month: 'Sep', revenue: 108000 },
          { month: 'Oct', revenue: 115000 },
          { month: 'Nov', revenue: 120000 },
          { month: 'Dec', revenue: 125000 },
        ],
      },
    };
  },

  /**
   * Get all subscription plans.
   * When `VITE_API_BASE_URL` is set: `GET /platform/plans`.
   */
  async getPlans(): Promise<ServiceResponse<PlatformPlan[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PlatformPlan[]>('/platform/plans');
    }
    await simulateDelay(100);
    const plans = dataStore.platformPlans.length > 0 ? dataStore.platformPlans : DEFAULT_PLATFORM_PLANS;
    return { success: true, data: [...plans] };
  },

  /**
   * Get a single plan by ID.
   * When `VITE_API_BASE_URL` is set: `GET /platform/plans/:id`.
   */
  async getPlanById(id: string): Promise<ServiceResponse<PlatformPlan | null>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PlatformPlan | null>(`/platform/plans/${encodeURIComponent(id)}`);
    }
    await simulateDelay(80);
    const plans = dataStore.platformPlans.length > 0 ? dataStore.platformPlans : DEFAULT_PLATFORM_PLANS;
    const plan = plans.find(p => p.id === id) || null;
    return { success: !!plan, data: plan };
  },

  /**
   * Create a new subscription plan. Wired to the "Create Plan" button on PlansView.
   * When `VITE_API_BASE_URL` is set: `POST /platform/plans`.
   */
  async createPlan(plan: Omit<PlatformPlan, 'id'>): Promise<ServiceResponse<PlatformPlan>> {
    if (isHttpBackendConfigured()) {
      return apiPostJson<Omit<PlatformPlan, 'id'>, PlatformPlan>('/platform/plans', plan);
    }
    await simulateDelay(200);
    const newPlan: PlatformPlan = { ...plan, id: generateId('plan') };
    dataStore.platformPlans.push(newPlan);
    dataStore.notify('platformPlans');
    return { success: true, data: newPlan, message: 'Plan created' };
  },

  /**
   * Partial update of an existing plan. Wired to the "Edit Plan" button on PlansView.
   * When `VITE_API_BASE_URL` is set: `PATCH /platform/plans/:id`.
   */
  async updatePlan(id: string, updates: Partial<PlatformPlan>): Promise<ServiceResponse<PlatformPlan>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<PlatformPlan>(`/platform/plans/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    }
    const check = sanitizePlanUpdates(updates);
    if (!check.ok) return { success: false, data: null as unknown as PlatformPlan, error: check.error };
    await simulateDelay(150);
    // getPlans()/getPlanById() fall back to DEFAULT_PLATFORM_PLANS for reads when this collection
    // is empty (e.g. a persisted bundle from before it existed) — seed it here too, so an edit to
    // a plan the UI just displayed via that fallback doesn't fail with "Plan not found".
    if (dataStore.platformPlans.length === 0) {
      dataStore.platformPlans = DEFAULT_PLATFORM_PLANS.map(p => ({ ...p, limits: { ...p.limits }, features: [...p.features] }));
    }
    const idx = dataStore.platformPlans.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, data: null as unknown as PlatformPlan, error: 'Plan not found' };
    const merged = mergePlatformPlan(dataStore.platformPlans[idx], check.updates);
    dataStore.platformPlans[idx] = merged;
    dataStore.notify('platformPlans');
    return { success: true, data: merged, message: 'Plan updated' };
  },

  /**
   * Get platform-level metadata for a specific org.
   * TODO: Replace with GET /api/platform/organizations/:orgId/meta
   */
  async getOrgMeta(orgId: string): Promise<ServiceResponse<PlatformOrgMeta>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PlatformOrgMeta>(`/platform/organizations/${encodeURIComponent(orgId)}/meta`);
    }
    await simulateDelay(80);
    return { success: true, data: ORG_META[orgId] || DEFAULT_ORG_META };
  },

  /**
   * Get platform-level metadata for ALL orgs (keyed by org ID).
   * Used by OrganizationsView to enrich the org list.
   * TODO: Replace with GET /api/platform/organizations/meta
   */
  async getAllOrgMeta(): Promise<ServiceResponse<Record<string, PlatformOrgMeta>>> {
    if (isHttpBackendConfigured()) {
      return apiGet<Record<string, PlatformOrgMeta>>('/platform/organizations/meta');
    }
    await simulateDelay();
    return { success: true, data: { ...ORG_META } };
  },

  /**
   * Get the default metadata applied to orgs without explicit overrides.
   */
  getDefaultOrgMeta(): PlatformOrgMeta {
    return { ...DEFAULT_ORG_META };
  },

  /**
   * Billing summary stats for the Plans & Billing page.
   * TODO: Replace with GET /api/platform/billing/stats
   */
  async getBillingStats(): Promise<ServiceResponse<BillingStats>> {
    if (isHttpBackendConfigured()) {
      return apiGet<BillingStats>('/platform/billing/stats');
    }

    await simulateDelay(100);

    // Derive from plans + org meta
    const totalMonthlyRevenue = Object.values(ORG_META)
      .reduce((sum, m) => sum + m.billing.amount, 0);

    return {
      success: true,
      data: {
        totalMonthlyRevenue: totalMonthlyRevenue || 125000, // fallback for demo
        revenueGrowthPct: 12,
        activeSubscriptions: dataStore.organizations.length,
        overdueInvoices: 3,
      },
    };
  },

  /**
   * Platform-wide settings (currencies, data retention, backup policy, feature flags).
   * When `VITE_API_BASE_URL` is set: `GET /platform/settings`.
   */
  async getSettings(): Promise<ServiceResponse<PlatformSettings>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PlatformSettings>('/platform/settings');
    }
    await simulateDelay(80);
    const existing = dataStore.platformSettings[0];
    return { success: true, data: existing ? { ...existing } : { ...DEFAULT_PLATFORM_SETTINGS } };
  },

  /**
   * Partial update of platform-wide settings (upserts the singleton row).
   * When `VITE_API_BASE_URL` is set: `PATCH /platform/settings`.
   */
  async updateSettings(updates: Partial<PlatformSettings>): Promise<ServiceResponse<PlatformSettings>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<PlatformSettings>('/platform/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    }
    await simulateDelay(150);
    const current = dataStore.platformSettings[0] || { ...DEFAULT_PLATFORM_SETTINGS };
    const merged = mergePlatformSettings(current, updates);
    dataStore.platformSettings[0] = merged;
    dataStore.notify('platformSettings');
    return { success: true, data: merged, message: 'Settings saved' };
  },

  /**
   * Record a manual-backup download event. Session-only history (not persisted across reloads),
   * mirroring `auditService.create` / `dataStore.auditLogs`.
   * When `VITE_API_BASE_URL` is set: `POST /platform/backup-history`.
   */
  async recordBackup(sizeBytes: number): Promise<ServiceResponse<BackupHistoryEntry>> {
    if (isHttpBackendConfigured()) {
      return apiPostJson<{ sizeBytes: number }, BackupHistoryEntry>('/platform/backup-history', { sizeBytes });
    }
    await simulateDelay();
    const entry: BackupHistoryEntry = {
      id: `backup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      sizeBytes,
    };
    dataStore.backupHistory.unshift(entry);
    dataStore.notify('backupHistory');
    return { success: true, data: entry };
  },

  /**
   * List manual-backup history, newest first.
   * When `VITE_API_BASE_URL` is set: `GET /platform/backup-history`.
   */
  async getBackupHistory(): Promise<ServiceResponse<BackupHistoryEntry[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<BackupHistoryEntry[]>('/platform/backup-history');
    }
    await simulateDelay();
    return { success: true, data: [...dataStore.backupHistory] };
  },

  /**
   * List all platform staff (platform_admin + platform_manager users).
   * When `VITE_API_BASE_URL` is set: `GET /platform/staff`.
   */
  async getStaff(): Promise<ServiceResponse<User[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<User[]>('/platform/staff');
    }
    await simulateDelay();
    return {
      success: true,
      data: dataStore.users.filter(u => u.role === 'platform_admin' || u.role === 'platform_manager'),
    };
  },

  /**
   * Invite a new platform admin/manager by email — find-or-create by email, mirroring
   * organizationService.inviteMember. This method does NOT check the caller's own role; the
   * server enforces (authoritatively) that a platform_manager can only invite platform_manager.
   * The mock branch below has no such check either, matching every other mock-branch method in
   * this codebase (mock mode has no real auth boundary — see organizationService.inviteMember).
   * When `VITE_API_BASE_URL` is set: `POST /platform/staff/invite`.
   */
  async inviteStaff(
    email: string,
    role: 'platform_admin' | 'platform_manager',
    name?: string,
  ): Promise<ServiceResponse<User>> {
    if (isHttpBackendConfigured()) {
      return apiPostJson<{ email: string; name?: string; role: 'platform_admin' | 'platform_manager' }, User>(
        '/platform/staff/invite',
        { email, name, role },
      );
    }
    await simulateDelay(200);
    const trimmedEmail = email.trim().toLowerCase();
    let user = dataStore.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (user && (user.role === 'platform_admin' || user.role === 'platform_manager')) {
      return { success: false, data: user, error: 'Already platform staff' };
    }
    const wasExistingUser = !!user;
    if (!user) {
      user = {
        id: generateId('user'),
        email: trimmedEmail,
        name: name?.trim() || trimmedEmail,
        role,
        createdAt: new Date().toISOString(),
        platformStatus: 'pending',
      };
      dataStore.users.push(user);
    } else {
      user.role = role;
      user.platformStatus = 'pending';
    }
    dataStore.notify('users');
    const roleLabel = role === 'platform_admin' ? 'Platform Admin' : 'Platform Manager';
    return {
      success: true,
      data: user,
      message: wasExistingUser
        ? `Converted existing account ${trimmedEmail} to ${roleLabel}.`
        : 'Staff added (no HTTP backend configured, so no invite email was sent)',
    };
  },
};
