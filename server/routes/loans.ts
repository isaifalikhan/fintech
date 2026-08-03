/**
 * §13 — Loans & liabilities. Mounted at `/organizations/:organizationId/loans` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Loan } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, notFound, fail } from '../lib/http.js';

function normalizeBalances(data: Omit<Loan, 'id' | 'organizationId'>): Omit<Loan, 'id' | 'organizationId'> {
  const principal = Number(data.principal);
  const paid = Math.max(0, Number(data.amountPaid ?? 0));
  const remaining = data.remainingBalance != null
    ? Number(data.remainingBalance)
    : Math.max(0, principal - paid);
  return {
    ...data,
    principal,
    amount: data.amount != null ? Number(data.amount) : principal,
    amountPaid: paid,
    remainingBalance: remaining,
  };
}

export function createLoansRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.loans.filter(l => l.organizationId === req.params.organizationId));
  });

  r.get('/:id', (req: Request, res: Response) => {
    const loan = store.loans.find(l => l.id === req.params.id) || null;
    if (!loan) return notFound(res, 'Loan');
    ok(res, loan);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<Loan, 'id' | 'organizationId'>;
    const party = (data.party || '').trim();
    if (!party) return fail(res, 400, 'Enter who this loan is with.');
    if (!data.principal || data.principal <= 0) return fail(res, 400, 'Principal must be greater than zero.');
    if (!data.dueDate?.trim()) return fail(res, 400, 'Due date is required.');

    const normalized = normalizeBalances(data);
    const newLoan: Loan = {
      ...normalized,
      id: store.generateId('loan'),
      organizationId: orgId,
      currency: normalized.currency || 'USD',
      description: (normalized.description || '').trim() || 'Loan',
    };
    store.loans.push(newLoan);
    store.persist();
    created(res, newLoan, 'Loan saved');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.loans.findIndex(l => l.id === req.params.id);
    if (idx === -1) return notFound(res, 'Loan');
    const updates = req.body as Partial<Loan>;
    const merged = { ...store.loans[idx], ...updates };
    if (updates.principal != null || updates.amountPaid != null || updates.remainingBalance != null) {
      const n = normalizeBalances(merged);
      store.loans[idx] = { ...merged, ...n };
    } else {
      store.loans[idx] = merged;
    }
    store.persist();
    ok(res, store.loans[idx]);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.loans.findIndex(l => l.id === req.params.id);
    if (idx === -1) return notFound(res, 'Loan');
    store.loans.splice(idx, 1);
    store.persist();
    ok(res, null, 'Loan removed');
  });

  return r;
}
