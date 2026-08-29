/**
 * §2 — Platform console. Mounted at `/platform`, under the shared
 * `requireAuth, requirePlatformRole('platform_admin', 'platform_manager')` gate applied at the
 * mount point in apiV1.ts (`r.use('/platform', ...)`) — no extra guard needed on routes here,
 * same convention as `server/routes/audit.ts`.
 */

import { Router, type Request, type Response } from 'express';
import { store, type PlatformSettings, type PlatformPlan } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';

interface PlatformOrgMeta {
  plan: string;
  status: 'active' | 'trial' | 'suspended' | 'churn_risk';
  limits: { users: number; usersUsed: number; statements: number; statementsUsed: number; currencies: number; currenciesUsed: number };
  billing: { amount: number };
}

const ORG_META: Record<string, PlatformOrgMeta> = {
  'org-001': { plan: 'Professional', status: 'active', limits: { users: 10, usersUsed: 5, statements: 500, statementsUsed: 248, currencies: 5, currenciesUsed: 3 }, billing: { amount: 49900 } },
  'org-002': { plan: 'Basic', status: 'trial', limits: { users: 5, usersUsed: 2, statements: 100, statementsUsed: 12, currencies: 2, currenciesUsed: 1 }, billing: { amount: 0 } },
  'org-003': { plan: 'Enterprise', status: 'churn_risk', limits: { users: 50, usersUsed: 15, statements: 2000, statementsUsed: 234, currencies: 10, currenciesUsed: 4 }, billing: { amount: 99900 } },
};

const DEFAULT_ORG_META: PlatformOrgMeta = {
  plan: 'Basic', status: 'active',
  limits: { users: 5, usersUsed: 1, statements: 100, statementsUsed: 0, currencies: 2, currenciesUsed: 1 },
  billing: { amount: 0 },
};

/** Mirrors client `DEFAULT_PLATFORM_SETTINGS` in src/services/platformService.ts. */
const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
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
 * In-memory backup-history log — session-only (grows as backups are triggered), NOT part of
 * `ServerStore`/SQLite persistence. Mirrors `server/routes/audit.ts`'s `auditLogs` array exactly.
 */
interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  sizeBytes: number;
}
const backupHistory: BackupHistoryEntry[] = [];

export function createPlatformRouter(): Router {
  const r = Router();

  r.get('/stats', (_req: Request, res: Response) => {
    const allOrgs = store.organizations;
    const metaValues = Object.values(ORG_META);
    const activeOrgs = metaValues.filter(m => m.status === 'active').length + (allOrgs.length - Object.keys(ORG_META).length);
    const trialOrgs = metaValues.filter(m => m.status === 'trial').length;
    const suspendedOrgs = metaValues.filter(m => m.status === 'suspended').length;
    const churnRiskOrgs = metaValues.filter(m => m.status === 'churn_risk').length;
    const totalUsers = store.users.length;
    const now = new Date();
    const newUsersThisMonth = store.users.filter(u => {
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const statementsProcessed = store.transactions.length * 42;

    ok(res, {
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
        { month: 'Jul', revenue: 95000 }, { month: 'Aug', revenue: 102000 }, { month: 'Sep', revenue: 108000 },
        { month: 'Oct', revenue: 115000 }, { month: 'Nov', revenue: 120000 }, { month: 'Dec', revenue: 125000 },
      ],
    });
  });

  r.get('/plans', (_req: Request, res: Response) => ok(res, store.platformPlans));

  r.get('/plans/:id', (req: Request, res: Response) => {
    const plan = store.platformPlans.find(p => p.id === req.params.id) || null;
    if (!plan) return notFound(res, 'Plan');
    ok(res, plan);
  });

  r.post('/plans', (req: Request, res: Response) => {
    const body = req.body as Partial<Omit<PlatformPlan, 'id'>>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return fail(res, 400, 'Plan name is required');
    if (typeof body.price !== 'number' || Number.isNaN(body.price) || body.price < 0) {
      return fail(res, 400, 'Price must be a non-negative number');
    }
    const newPlan: PlatformPlan = {
      id: store.generateId('plan'),
      name,
      price: body.price,
      currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : 'PKR',
      features: Array.isArray(body.features) ? body.features.filter((f): f is string => typeof f === 'string') : [],
      limits: {
        users: Number(body.limits?.users) || 0,
        statements: Number(body.limits?.statements) || 0,
        currencies: Number(body.limits?.currencies) || 0,
        storage: Number(body.limits?.storage) || 0,
      },
      active: body.active !== false,
    };
    store.platformPlans.push(newPlan);
    store.persist();
    created(res, newPlan, 'Plan created');
  });

  r.patch('/plans/:id', (req: Request, res: Response) => {
    const idx = store.platformPlans.findIndex(p => p.id === req.params.id);
    if (idx === -1) return notFound(res, 'Plan');
    const updates = req.body as Partial<PlatformPlan>;
    if (updates.name !== undefined && !updates.name.trim()) {
      return fail(res, 400, 'Plan name cannot be empty');
    }
    if (updates.price !== undefined && (typeof updates.price !== 'number' || Number.isNaN(updates.price) || updates.price < 0)) {
      return fail(res, 400, 'Price must be a non-negative number');
    }
    const merged = mergePlatformPlan(store.platformPlans[idx], updates);
    store.platformPlans[idx] = merged;
    store.persist();
    ok(res, merged, 'Plan updated');
  });

  r.get('/organizations/meta', (_req: Request, res: Response) => ok(res, { ...ORG_META }));

  r.get('/organizations/:orgId/meta', (req: Request, res: Response) => {
    ok(res, ORG_META[req.params.orgId] || DEFAULT_ORG_META);
  });

  r.get('/billing/stats', (_req: Request, res: Response) => {
    const totalMonthlyRevenue = Object.values(ORG_META).reduce((sum, m) => sum + m.billing.amount, 0);
    ok(res, {
      totalMonthlyRevenue: totalMonthlyRevenue || 125000,
      revenueGrowthPct: 12,
      activeSubscriptions: store.organizations.length,
      overdueInvoices: 3,
    });
  });

  r.get('/settings', (_req: Request, res: Response) => {
    ok(res, store.platformSettings[0] || DEFAULT_PLATFORM_SETTINGS);
  });

  r.patch('/settings', (req: Request, res: Response) => {
    const updates = req.body as Partial<PlatformSettings>;
    const current = store.platformSettings[0] || { ...DEFAULT_PLATFORM_SETTINGS };
    const merged = mergePlatformSettings(current, updates);
    store.platformSettings[0] = merged;
    store.persist();
    ok(res, merged);
  });

  r.get('/backup-history', (_req: Request, res: Response) => {
    ok(res, backupHistory);
  });

  r.post('/backup-history', (req: Request, res: Response) => {
    const { sizeBytes } = req.body as { sizeBytes?: unknown };
    const entry: BackupHistoryEntry = {
      id: `backup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : 0,
    };
    backupHistory.unshift(entry);
    ok(res, entry);
  });

  return r;
}
