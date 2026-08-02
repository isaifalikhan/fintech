/**
 * §6 — Categories. Mounted at `/organizations/:organizationId/categories` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Category } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, notFound } from '../lib/http.js';

export function createCategoriesRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/usage-stats', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const categories = store.categories.filter(c => c.organizationId === orgId);
    const orgTxns = store.transactions.filter(t => t.organizationId === orgId);
    const stats = categories.map(cat => {
      const catTxns = orgTxns.filter(t => t.categoryId === cat.id);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        transactionCount: catTxns.length,
        totalAmount: catTxns.reduce((s, t) => s + Math.abs(t.amount), 0),
        type: cat.type,
      };
    });
    ok(res, stats);
  });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.categories.filter(c => c.organizationId === req.params.organizationId));
  });

  r.get('/:id', (req: Request, res: Response) => {
    const cat = store.categories.find(c => c.id === req.params.id) || null;
    if (!cat) return notFound(res, 'Category');
    ok(res, cat);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<Category, 'id' | 'organizationId'>;
    const newCat: Category = { ...data, id: store.generateId('cat'), organizationId: orgId };
    store.categories.push(newCat);
    store.persist();
    created(res, newCat, 'Category created');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return notFound(res, 'Category');
    store.categories[idx] = { ...store.categories[idx], ...(req.body as Partial<Category>) };
    store.persist();
    ok(res, store.categories[idx]);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return notFound(res, 'Category');
    store.categories.splice(idx, 1);
    store.transactions.forEach(t => {
      if (t.categoryId === req.params.id) {
        t.categoryId = undefined;
        t.status = 'pending';
      }
    });
    store.persist();
    ok(res, null, 'Category deleted');
  });

  r.post('/:id/patterns', (req: Request, res: Response) => {
    const idx = store.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return notFound(res, 'Category');
    const { pattern } = req.body as { pattern: string };
    if (!store.categories[idx].patterns.includes(pattern)) {
      store.categories[idx].patterns.push(pattern);
    }
    store.persist();
    ok(res, store.categories[idx]);
  });

  r.delete('/:id/patterns', (req: Request, res: Response) => {
    const idx = store.categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) return notFound(res, 'Category');
    const pattern = String(req.query.pattern ?? '');
    store.categories[idx].patterns = store.categories[idx].patterns.filter(p => p !== pattern);
    store.persist();
    ok(res, store.categories[idx]);
  });

  return r;
}
