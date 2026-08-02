/**
 * §4 — Transactions. Mounted at `/organizations/:organizationId/transactions` (mergeParams).
 * Mirrors `transactionService` (dataStore branch) exactly.
 */

import { Router, type Request, type Response } from 'express';
import type { Transaction } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';

function parseTags(q: unknown): string[] | undefined {
  if (q == null) return undefined;
  if (Array.isArray(q)) return q.map(String);
  return [String(q)];
}

export function createTransactionsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/stats', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
    let txns = store.transactions.filter(t => t.organizationId === orgId);
    if (dateFrom) txns = txns.filter(t => t.date >= dateFrom);
    if (dateTo) txns = txns.filter(t => t.date <= dateTo);

    const totalIncome = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const pendingCount = txns.filter(t => t.status === 'pending').length;
    const classifiedCount = txns.filter(t => t.status !== 'pending').length;
    const confidences = txns.filter(t => t.confidence !== undefined).map(t => t.confidence as number);
    const avgConfidence = confidences.length > 0 ? confidences.reduce((s, c) => s + c, 0) / confidences.length : 0;

    ok(res, {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: txns.length,
      pendingCount,
      classifiedCount,
      avgConfidence: Math.round(avgConfidence),
    });
  });

  r.post('/bulk-categorize', (req: Request, res: Response) => {
    const { ids, categoryId, classifiedBy = 'user' } = req.body as {
      ids: string[]; categoryId: string; classifiedBy?: string;
    };
    let succeeded = 0;
    const errors: { id: string; error: string }[] = [];
    for (const id of ids) {
      const idx = store.transactions.findIndex(t => t.id === id);
      if (idx === -1) {
        errors.push({ id, error: 'Not found' });
      } else {
        store.transactions[idx] = {
          ...store.transactions[idx],
          categoryId,
          status: 'classified',
          classifiedAt: new Date().toISOString(),
          classifiedBy,
        };
        succeeded++;
      }
    }
    store.persist();
    ok(res, { succeeded, failed: errors.length, errors }, `${succeeded} transactions categorized`);
  });

  r.post('/bulk-delete', (req: Request, res: Response) => {
    const { ids } = req.body as { ids: string[] };
    let succeeded = 0;
    const errors: { id: string; error: string }[] = [];
    for (const id of ids) {
      const idx = store.transactions.findIndex(t => t.id === id);
      if (idx === -1) {
        errors.push({ id, error: 'Not found' });
      } else {
        store.transactions.splice(idx, 1);
        succeeded++;
      }
    }
    store.persist();
    ok(res, { succeeded, failed: errors.length, errors }, `${succeeded} transactions deleted`);
  });

  r.get('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const q = req.query as Record<string, string | undefined>;
    const page = Number(q.page ?? 1) || 1;
    const pageSize = Number(q.pageSize ?? 20) || 20;
    const sortBy = q.sortBy || 'date';
    const sortOrder = (q.sortOrder as 'asc' | 'desc') || 'desc';

    let items = store.transactions.filter(t => t.organizationId === orgId);

    if (q.search) {
      const s = q.search.toLowerCase();
      items = items.filter(t =>
        t.description.toLowerCase().includes(s) ||
        t.narration.toLowerCase().includes(s) ||
        t.tags.some(tag => tag.toLowerCase().includes(s)));
    }
    if (q.categoryId) items = items.filter(t => t.categoryId === q.categoryId);
    if (q.departmentId) items = items.filter(t => t.departmentId === q.departmentId);
    if (q.projectId) items = items.filter(t => t.projectId === q.projectId);
    if (q.bankAccountId) items = items.filter(t => t.bankAccountId === q.bankAccountId);
    if (q.status) items = items.filter(t => t.status === q.status);
    if (q.type) items = items.filter(t => t.type === q.type);
    if (q.minAmount !== undefined) items = items.filter(t => Math.abs(t.amount) >= Number(q.minAmount));
    if (q.maxAmount !== undefined) items = items.filter(t => Math.abs(t.amount) <= Number(q.maxAmount));
    if (q.dateFrom) items = items.filter(t => t.date >= (q.dateFrom as string));
    if (q.dateTo) items = items.filter(t => t.date <= (q.dateTo as string));
    const tags = parseTags(req.query.tags);
    if (tags && tags.length > 0) items = items.filter(t => tags.some(tag => t.tags.includes(tag)));

    items.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy];
      const bVal = (b as unknown as Record<string, unknown>)[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const an = Number(aVal);
      const bn = Number(bVal);
      return sortOrder === 'asc' ? an - bn : bn - an;
    });

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    ok(res, { items: paginatedItems, total, page, pageSize, totalPages, hasMore: page < totalPages });
  });

  r.get('/:id', (req: Request, res: Response) => {
    const txn = store.transactions.find(t => t.id === req.params.id) || null;
    if (!txn) return notFound(res, 'Transaction');
    ok(res, txn);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<Transaction, 'id' | 'organizationId' | 'createdAt'>;
    const newTxn: Transaction = { ...data, id: store.generateId('txn'), organizationId: orgId, createdAt: new Date().toISOString() };
    store.transactions.unshift(newTxn);
    store.persist();
    created(res, newTxn, 'Transaction created');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.transactions.findIndex(t => t.id === req.params.id);
    if (idx === -1) return notFound(res, 'Transaction');
    store.transactions[idx] = { ...store.transactions[idx], ...(req.body as Partial<Transaction>) };
    store.persist();
    ok(res, store.transactions[idx], 'Transaction updated');
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.transactions.findIndex(t => t.id === req.params.id);
    if (idx === -1) return notFound(res, 'Transaction');
    store.transactions.splice(idx, 1);
    store.persist();
    ok(res, null, 'Transaction deleted');
  });

  return r;
}
