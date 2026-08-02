/**
 * §5 — Chart of accounts. Mounted at `/organizations/:organizationId/accounts` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Account } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, notFound } from '../lib/http.js';

export function createAccountsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/tree', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const accounts = store.accounts.filter(a => a.organizationId === orgId);
    ok(res, {
      assets: accounts.filter(a => a.type === 'asset'),
      liabilities: accounts.filter(a => a.type === 'liability'),
      equity: accounts.filter(a => a.type === 'equity'),
      income: accounts.filter(a => a.type === 'income'),
      expenses: accounts.filter(a => a.type === 'expense'),
    });
  });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.accounts.filter(a => a.organizationId === req.params.organizationId));
  });

  r.get('/:id', (req: Request, res: Response) => {
    const account = store.accounts.find(a => a.id === req.params.id) || null;
    if (!account) return notFound(res, 'Account');
    ok(res, account);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<Account, 'id' | 'organizationId' | 'createdAt'>;
    const newAcc: Account = { ...data, id: store.generateId('acc'), organizationId: orgId, createdAt: new Date().toISOString() };
    store.accounts.push(newAcc);
    store.persist();
    created(res, newAcc, 'Account created');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.accounts.findIndex(a => a.id === req.params.id);
    if (idx === -1) return notFound(res, 'Account');
    store.accounts[idx] = { ...store.accounts[idx], ...(req.body as Partial<Account>) };
    store.persist();
    ok(res, store.accounts[idx]);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.accounts.findIndex(a => a.id === req.params.id);
    if (idx === -1) return notFound(res, 'Account');
    store.accounts.splice(idx, 1);
    store.persist();
    ok(res, null, 'Account deleted');
  });

  return r;
}
