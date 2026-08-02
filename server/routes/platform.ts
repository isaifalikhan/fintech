/**
 * §2 — Platform console. Mounted at `/platform`.
 */

import { Router, type Request, type Response } from 'express';
import { store } from '../lib/store.js';
import { ok, notFound } from '../lib/http.js';

interface PlatformOrgMeta {
  plan: string;
  status: 'active' | 'trial' | 'suspended' | 'churn_risk';
  limits: { users: number; usersUsed: number; statements: number; statementsUsed: number; currencies: number; currenciesUsed: number };
  billing: { amount: number };
}

const PLANS = [
  { id: 'plan-1', name: 'Basic', price: 0, currency: 'PKR', features: ['statement_import'], limits: { users: 5, statements: 100, currencies: 2, storage: 2048 }, active: true },
  { id: 'plan-2', name: 'Professional', price: 49900, currency: 'PKR', features: ['personal_finance', 'statement_import', 'profit_intelligence', 'team_management', 'costing_engine'], limits: { users: 10, statements: 500, currencies: 5, storage: 10240 }, active: true },
  { id: 'plan-3', name: 'Enterprise', price: 99900, currency: 'PKR', features: ['personal_finance', 'statement_import', 'profit_intelligence', 'team_management', 'costing_engine', 'api_access', 'white_label'], limits: { users: 50, statements: 2000, currencies: 10, storage: 51200 }, active: true },
];

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
    const statementsProcessed = store.transactions.length * 42;

    ok(res, {
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
        { month: 'Jul', revenue: 95000 }, { month: 'Aug', revenue: 102000 }, { month: 'Sep', revenue: 108000 },
        { month: 'Oct', revenue: 115000 }, { month: 'Nov', revenue: 120000 }, { month: 'Dec', revenue: 125000 },
      ],
    });
  });

  r.get('/plans', (_req: Request, res: Response) => ok(res, PLANS));

  r.get('/plans/:id', (req: Request, res: Response) => {
    const plan = PLANS.find(p => p.id === req.params.id) || null;
    if (!plan) return notFound(res, 'Plan');
    ok(res, plan);
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

  return r;
}
