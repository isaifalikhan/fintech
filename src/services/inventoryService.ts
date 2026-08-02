/**
 * Inventory Service
 * ==================
 * CRUD for inventory items and inventory transactions.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { InventoryItem, InventoryTransaction } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

const INV = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/inventory`;

const ITEMS = (organizationId: string) => `${INV(organizationId)}/items`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export type InventoryValuation = {
  totalItems: number;
  totalValue: number;
  byCostingMethod: { method: string; count: number; value: number }[];
};

export const inventoryService = {
  async getAll(organizationId: string): Promise<ServiceResponse<InventoryItem[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<InventoryItem[]>(organizationId);
      if (err) return err;
      return apiGet<InventoryItem[]>(ITEMS(organizationId));
    }

    await simulateDelay();
    return { success: true, data: dataStore.inventoryItems.filter(i => i.organizationId === organizationId) };
  },

  async getById(id: string, organizationId?: string): Promise<ServiceResponse<InventoryItem | null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${ITEMS(organizationId)}/${encodeURIComponent(id)}`
        : `/inventory/items/${encodeURIComponent(id)}`;
      return apiGet<InventoryItem | null>(path);
    }

    await simulateDelay(80);
    const item = dataStore.inventoryItems.find(i => i.id === id) || null;
    return { success: !!item, data: item };
  },

  async create(
    organizationId: string,
    data: Omit<InventoryItem, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<InventoryItem>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<InventoryItem>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<InventoryItem, 'id' | 'organizationId'>, InventoryItem>(
        ITEMS(organizationId),
        data,
      );
    }

    await simulateDelay(200);
    const newItem: InventoryItem = { ...data, id: generateId('inv'), organizationId };
    dataStore.inventoryItems.push(newItem);
    dataStore.notify('inventoryItems');
    return { success: true, data: newItem, message: 'Inventory item created' };
  },

  async update(
    id: string,
    updates: Partial<InventoryItem>,
    organizationId?: string,
  ): Promise<ServiceResponse<InventoryItem>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${ITEMS(organizationId)}/${encodeURIComponent(id)}`
        : `/inventory/items/${encodeURIComponent(id)}`;
      return apiRequest<InventoryItem>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.inventoryItems.findIndex(i => i.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Item not found' };
    dataStore.inventoryItems[idx] = { ...dataStore.inventoryItems[idx], ...updates };
    dataStore.notify('inventoryItems');
    return { success: true, data: dataStore.inventoryItems[idx] };
  },

  async recordTransaction(
    organizationId: string,
    data: Omit<InventoryTransaction, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<InventoryTransaction>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<InventoryTransaction>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<InventoryTransaction, 'id' | 'organizationId'>, InventoryTransaction>(
        `${INV(organizationId)}/transactions`,
        data,
      );
    }

    await simulateDelay(200);

    const newTxn: InventoryTransaction = { ...data, id: generateId('invtxn'), organizationId };
    dataStore.inventoryTransactions.push(newTxn);

    const itemIdx = dataStore.inventoryItems.findIndex(i => i.id === data.inventoryItemId);
    if (itemIdx !== -1) {
      dataStore.inventoryItems[itemIdx].currentStock += data.quantity;

      if (data.type === 'purchase' && data.quantity > 0) {
        const item = dataStore.inventoryItems[itemIdx];
        const totalValue = (item.averageCost * (item.currentStock - data.quantity)) + data.totalAmount;
        item.averageCost = totalValue / item.currentStock;
        item.lastCost = data.unitCost;
      }
    }

    dataStore.notify('inventoryItems');
    dataStore.notify('inventoryTransactions');
    return { success: true, data: newTxn, message: 'Transaction recorded' };
  },

  async getTransactions(
    inventoryItemId: string,
    organizationId?: string,
  ): Promise<ServiceResponse<InventoryTransaction[]>> {
    if (isHttpBackendConfigured()) {
      if (organizationId) {
        return apiGet<InventoryTransaction[]>(
          `${ITEMS(organizationId)}/${encodeURIComponent(inventoryItemId)}/transactions`,
        );
      }
      return apiGet<InventoryTransaction[]>(
        `/inventory/items/${encodeURIComponent(inventoryItemId)}/transactions`,
      );
    }

    await simulateDelay();
    const txns = dataStore.inventoryTransactions.filter(t => t.inventoryItemId === inventoryItemId);
    return { success: true, data: txns };
  },

  /** All inventory transactions for the org (not in §11 table; uses `GET .../inventory/transactions`). */
  async getAllTransactions(organizationId: string): Promise<ServiceResponse<InventoryTransaction[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<InventoryTransaction[]>(organizationId);
      if (err) return err;
      return apiGet<InventoryTransaction[]>(`${INV(organizationId)}/transactions`);
    }

    await simulateDelay();
    const txns = dataStore.inventoryTransactions
      .filter(t => t.organizationId === organizationId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { success: true, data: txns };
  },

  async getLowStockAlerts(organizationId: string): Promise<ServiceResponse<InventoryItem[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<InventoryItem[]>(organizationId);
      if (err) return err;
      return apiGet<InventoryItem[]>(`${INV(organizationId)}/low-stock`);
    }

    await simulateDelay();
    const lowStock = dataStore.inventoryItems.filter(
      i => i.organizationId === organizationId && i.isActive && i.currentStock <= i.reorderLevel,
    );
    return { success: true, data: lowStock };
  },

  async getValuation(organizationId: string): Promise<ServiceResponse<InventoryValuation>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<InventoryValuation>(organizationId);
      if (err) return err;
      return apiGet<InventoryValuation>(`${INV(organizationId)}/valuation`);
    }

    await simulateDelay();
    const items = dataStore.inventoryItems.filter(i => i.organizationId === organizationId && i.isActive);

    const byMethod = new Map<string, { count: number; value: number }>();
    let totalValue = 0;

    for (const item of items) {
      const value = item.currentStock * item.averageCost;
      totalValue += value;
      const existing = byMethod.get(item.costingMethod) || { count: 0, value: 0 };
      byMethod.set(item.costingMethod, { count: existing.count + 1, value: existing.value + value });
    }

    return {
      success: true,
      data: {
        totalItems: items.length,
        totalValue: Math.round(totalValue * 100) / 100,
        byCostingMethod: Array.from(byMethod.entries()).map(([method, data]) => ({
          method,
          ...data,
          value: Math.round(data.value * 100) / 100,
        })),
      },
    };
  },
};
