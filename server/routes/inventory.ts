/**
 * §11 — Inventory. Mounted at `/organizations/:organizationId/inventory` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { InventoryItem, InventoryTransaction } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, notFound } from '../lib/http.js';

export function createInventoryRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/low-stock', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    ok(res, store.inventoryItems.filter(i => i.organizationId === orgId && i.isActive && i.currentStock <= i.reorderLevel));
  });

  r.get('/valuation', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const items = store.inventoryItems.filter(i => i.organizationId === orgId && i.isActive);
    const byMethod = new Map<string, { count: number; value: number }>();
    let totalValue = 0;
    for (const item of items) {
      const value = item.currentStock * item.averageCost;
      totalValue += value;
      const existing = byMethod.get(item.costingMethod) || { count: 0, value: 0 };
      byMethod.set(item.costingMethod, { count: existing.count + 1, value: existing.value + value });
    }
    ok(res, {
      totalItems: items.length,
      totalValue: Math.round(totalValue * 100) / 100,
      byCostingMethod: Array.from(byMethod.entries()).map(([method, data]) => ({
        method, ...data, value: Math.round(data.value * 100) / 100,
      })),
    });
  });

  r.get('/transactions', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const txns = store.inventoryTransactions
      .filter(t => t.organizationId === orgId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    ok(res, txns);
  });

  r.post('/transactions', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<InventoryTransaction, 'id' | 'organizationId'>;
    const newTxn: InventoryTransaction = { ...data, id: store.generateId('invtxn'), organizationId: orgId };
    store.inventoryTransactions.push(newTxn);

    const itemIdx = store.inventoryItems.findIndex(i => i.id === data.inventoryItemId);
    if (itemIdx !== -1) {
      store.inventoryItems[itemIdx].currentStock += data.quantity;
      if (data.type === 'purchase' && data.quantity > 0) {
        const item = store.inventoryItems[itemIdx];
        const totalValue = (item.averageCost * (item.currentStock - data.quantity)) + data.totalAmount;
        item.averageCost = totalValue / item.currentStock;
        item.lastCost = data.unitCost;
      }
    }
    store.persist();
    created(res, newTxn, 'Transaction recorded');
  });

  r.get('/items/:itemId/transactions', (req: Request, res: Response) => {
    ok(res, store.inventoryTransactions.filter(t => t.inventoryItemId === req.params.itemId));
  });

  r.get('/items/:id', (req: Request, res: Response) => {
    const item = store.inventoryItems.find(i => i.id === req.params.id) || null;
    if (!item) return notFound(res, 'Inventory item');
    ok(res, item);
  });

  r.get('/items', (req: Request, res: Response) => {
    ok(res, store.inventoryItems.filter(i => i.organizationId === req.params.organizationId));
  });

  r.post('/items', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<InventoryItem, 'id' | 'organizationId'>;
    const newItem: InventoryItem = { ...data, id: store.generateId('inv'), organizationId: orgId };
    store.inventoryItems.push(newItem);
    store.persist();
    created(res, newItem, 'Inventory item created');
  });

  r.patch('/items/:id', (req: Request, res: Response) => {
    const idx = store.inventoryItems.findIndex(i => i.id === req.params.id);
    if (idx === -1) return notFound(res, 'Item');
    store.inventoryItems[idx] = { ...store.inventoryItems[idx], ...(req.body as Partial<InventoryItem>) };
    store.persist();
    ok(res, store.inventoryItems[idx]);
  });

  return r;
}
