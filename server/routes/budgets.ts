/**
 * §12 — Budgets. Mounted at `/organizations/:organizationId/budgets` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Budget } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, notFound } from '../lib/http.js';

export function createBudgetsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/variance', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const budgets = store.budgets.filter(b => b.organizationId === orgId);
    const analysis = budgets.map(budget => {
      const variance = budget.budgetedAmount - budget.spentAmount;
      const variancePercent = budget.budgetedAmount > 0 ? (variance / budget.budgetedAmount) * 100 : 0;
      return {
        budgetId: budget.id,
        name: budget.name,
        budgeted: budget.budgetedAmount,
        actual: budget.spentAmount,
        variance,
        variancePercent: Math.round(variancePercent * 10) / 10,
        status: budget.status,
        isOverBudget: budget.spentAmount > budget.budgetedAmount,
      };
    });
    ok(res, analysis);
  });

  r.get('/alerts', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const alerts = store.budgets.filter(b => {
      if (b.organizationId !== orgId) return false;
      const utilization = b.budgetedAmount > 0 ? (b.spentAmount / b.budgetedAmount) * 100 : 0;
      return utilization >= 80;
    });
    ok(res, alerts);
  });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.budgets.filter(b => b.organizationId === req.params.organizationId));
  });

  r.get('/:id', (req: Request, res: Response) => {
    const budget = store.budgets.find(b => b.id === req.params.id) || null;
    if (!budget) return notFound(res, 'Budget');
    ok(res, budget);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<Budget, 'id' | 'organizationId'>;
    const newBudget: Budget = { ...data, id: store.generateId('budget'), organizationId: orgId };
    store.budgets.push(newBudget);
    store.persist();
    created(res, newBudget, 'Budget created');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.budgets.findIndex(b => b.id === req.params.id);
    if (idx === -1) return notFound(res, 'Budget');
    store.budgets[idx] = { ...store.budgets[idx], ...(req.body as Partial<Budget>) };
    store.persist();
    ok(res, store.budgets[idx]);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.budgets.findIndex(b => b.id === req.params.id);
    if (idx === -1) return notFound(res, 'Budget');
    store.budgets.splice(idx, 1);
    store.persist();
    ok(res, null, 'Budget deleted');
  });

  return r;
}
