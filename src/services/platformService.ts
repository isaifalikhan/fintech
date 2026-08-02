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

import { isHttpBackendConfigured, apiGet } from '@/lib/apiClient';
import { dataStore, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

// ── Platform Types ──────────────────────────────────────────────────────────

export interface PlatformStats {
  mrr: number;
  arr: number;
  activeOrgs: number;
  trialOrgs: number;
  suspendedOrgs: number;
  churnRiskOrgs: number;
  totalUsers: number;
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

// ── Seed Data (replaces inline constants in 3 components) ───────────────────

const PLANS: PlatformPlan[] = [
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
   * TODO: Replace with GET /api/platform/plans
   */
  async getPlans(): Promise<ServiceResponse<PlatformPlan[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PlatformPlan[]>('/platform/plans');
    }
    await simulateDelay(100);
    return { success: true, data: [...PLANS] };
  },

  /**
   * Get a single plan by ID.
   * TODO: Replace with GET /api/platform/plans/:id
   */
  async getPlanById(id: string): Promise<ServiceResponse<PlatformPlan | null>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PlatformPlan | null>(`/platform/plans/${encodeURIComponent(id)}`);
    }
    await simulateDelay(80);
    const plan = PLANS.find(p => p.id === id) || null;
    return { success: !!plan, data: plan };
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
};
