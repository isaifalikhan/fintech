/**
 * §10 — Assets & depreciation. Mounted at `/organizations/:organizationId/assets` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Asset, DepreciationSchedule } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';

function calculateMonthlyDepreciation(asset: Asset): number {
  if (asset.status !== 'active') return 0;
  switch (asset.depreciationMethod) {
    case 'straight_line': {
      const depreciableAmount = asset.purchasePrice - asset.salvageValue;
      return depreciableAmount / (asset.usefulLifeYears * 12);
    }
    case 'declining_balance': {
      const rate = 2 / asset.usefulLifeYears;
      return (asset.currentValue * rate) / 12;
    }
    default:
      return 0;
  }
}

export function createAssetsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/summary', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const assets = store.assets.filter(a => a.organizationId === orgId);
    const byCategory = new Map<string, { count: number; value: number }>();
    for (const asset of assets) {
      const existing = byCategory.get(asset.category) || { count: 0, value: 0 };
      byCategory.set(asset.category, { count: existing.count + 1, value: existing.value + asset.currentValue });
    }
    ok(res, {
      totalAssets: assets.length,
      totalCurrentValue: assets.reduce((s, a) => s + a.currentValue, 0),
      totalPurchaseValue: assets.reduce((s, a) => s + a.purchasePrice, 0),
      totalDepreciation: assets.reduce((s, a) => s + a.accumulatedDepreciation, 0),
      byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({ category, ...data })),
    });
  });

  r.get('/depreciation-schedules', (req: Request, res: Response) => {
    ok(res, store.depreciationSchedules.filter(d => d.organizationId === req.params.organizationId));
  });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.assets.filter(a => a.organizationId === req.params.organizationId));
  });

  r.get('/:id/depreciation-schedule', (req: Request, res: Response) => {
    ok(res, store.depreciationSchedules.filter(d => d.assetId === req.params.id));
  });

  r.post('/:id/dispose', (req: Request, res: Response) => {
    const idx = store.assets.findIndex(a => a.id === req.params.id);
    if (idx === -1) return notFound(res, 'Asset');
    const { disposalDate, disposalAmount } = req.body as { disposalDate: string; disposalAmount: number };
    store.assets[idx] = { ...store.assets[idx], status: 'disposed', disposalDate, disposalAmount };
    store.persist();
    ok(res, store.assets[idx], 'Asset disposed');
  });

  r.post('/:id/depreciation', (req: Request, res: Response) => {
    const assetId = req.params.id;
    const { period } = req.body as { period: string };
    const asset = store.assets.find(a => a.id === assetId);
    if (!asset) return notFound(res, 'Asset');

    const monthlyDepr = calculateMonthlyDepreciation(asset);
    const closingValue = Math.max(asset.salvageValue, asset.currentValue - monthlyDepr);
    const actualDepr = asset.currentValue - closingValue;

    const schedule: DepreciationSchedule = {
      id: store.generateId('depr'),
      assetId,
      organizationId: asset.organizationId,
      period,
      openingValue: asset.currentValue,
      depreciationAmount: Math.round(actualDepr * 100) / 100,
      closingValue: Math.round(closingValue * 100) / 100,
      status: 'posted',
    };
    store.depreciationSchedules.push(schedule);

    const assetIdx = store.assets.findIndex(a => a.id === assetId);
    store.assets[assetIdx].currentValue = closingValue;
    store.assets[assetIdx].accumulatedDepreciation += actualDepr;
    if (closingValue <= asset.salvageValue) {
      store.assets[assetIdx].status = 'fully_depreciated';
    }
    store.persist();
    created(res, schedule, 'Depreciation posted');
  });

  r.get('/:id', (req: Request, res: Response) => {
    const asset = store.assets.find(a => a.id === req.params.id) || null;
    if (!asset) return notFound(res, 'Asset');
    ok(res, asset);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<Asset, 'id' | 'organizationId'>;
    const newAsset: Asset = { ...data, id: store.generateId('asset'), organizationId: orgId };
    store.assets.push(newAsset);
    store.persist();
    created(res, newAsset, 'Asset created');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.assets.findIndex(a => a.id === req.params.id);
    if (idx === -1) return notFound(res, 'Asset');
    store.assets[idx] = { ...store.assets[idx], ...(req.body as Partial<Asset>) };
    store.persist();
    ok(res, store.assets[idx]);
  });

  return r;
}
