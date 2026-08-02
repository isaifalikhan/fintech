/**
 * §9 — Recurring transactions. Mounted at `/organizations/:organizationId/recurring-transactions`.
 */

import { Router, type Request, type Response } from 'express';
import type { RecurringTransaction } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateRecurringDateOrder(startDate: string, nextOccurrence: string): string | null {
  const s = startDate.trim().slice(0, 10);
  const n = nextOccurrence.trim().slice(0, 10);
  if (!ISO_DATE.test(s) || !ISO_DATE.test(n)) return 'Use valid start and next dates.';
  if (n < s) return 'Next occurrence must be on or after the start date.';
  return null;
}

export function createRecurringRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.recurringTransactions.filter(rt => rt.organizationId === req.params.organizationId));
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<RecurringTransaction, 'id' | 'organizationId'>;
    const dateErr = validateRecurringDateOrder(data.startDate, data.nextOccurrence);
    if (dateErr) return fail(res, 400, dateErr);
    const item: RecurringTransaction = { ...data, id: store.generateId('rec'), organizationId: orgId };
    store.recurringTransactions.push(item);
    store.persist();
    created(res, item, 'Recurring transaction created');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.recurringTransactions.findIndex(rt => rt.id === req.params.id);
    if (idx === -1) return notFound(res);
    const merged: RecurringTransaction = { ...store.recurringTransactions[idx], ...(req.body as Partial<RecurringTransaction>) };
    const dateErr = validateRecurringDateOrder(merged.startDate, merged.nextOccurrence);
    if (dateErr) return fail(res, 400, dateErr);
    store.recurringTransactions[idx] = merged;
    store.persist();
    ok(res, store.recurringTransactions[idx]);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.recurringTransactions.findIndex(rt => rt.id === req.params.id);
    if (idx === -1) return notFound(res);
    store.recurringTransactions.splice(idx, 1);
    store.persist();
    ok(res, null, 'Deleted');
  });

  r.post('/:id/toggle', (req: Request, res: Response) => {
    const idx = store.recurringTransactions.findIndex(rt => rt.id === req.params.id);
    if (idx === -1) return notFound(res);
    store.recurringTransactions[idx].isActive = !store.recurringTransactions[idx].isActive;
    store.persist();
    ok(res, store.recurringTransactions[idx]);
  });

  return r;
}
