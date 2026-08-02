/**
 * §5 (bank accounts half). Mounted at `/organizations/:organizationId/bank-accounts` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { BankAccount } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, notFound } from '../lib/http.js';

export function createBankAccountsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.bankAccounts.filter(b => b.organizationId === req.params.organizationId));
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<BankAccount, 'id' | 'organizationId'>;
    const newBank: BankAccount = { ...data, id: store.generateId('bank'), organizationId: orgId };
    store.bankAccounts.push(newBank);
    store.persist();
    created(res, newBank, 'Bank account added');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.bankAccounts.findIndex(b => b.id === req.params.id);
    if (idx === -1) return notFound(res, 'Bank account');
    store.bankAccounts[idx] = { ...store.bankAccounts[idx], ...(req.body as Partial<BankAccount>) };
    store.persist();
    ok(res, store.bankAccounts[idx]);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.bankAccounts.findIndex(b => b.id === req.params.id);
    if (idx === -1) return notFound(res, 'Bank account');
    store.bankAccounts.splice(idx, 1);
    store.persist();
    ok(res, null, 'Payment method removed');
  });

  return r;
}
