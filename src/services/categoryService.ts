/**
 * Category Service
 * =================
 * CRUD for transaction categories with pattern management.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { Category } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

const CAT = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/categories`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export type CategoryUsageStatRow = {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
  type: string;
};

export const categoryService = {
  async getAll(organizationId: string): Promise<ServiceResponse<Category[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Category[]>(organizationId);
      if (err) return err;
      return apiGet<Category[]>(CAT(organizationId));
    }

    await simulateDelay();
    const categories = dataStore.categories.filter(c => c.organizationId === organizationId);
    return { success: true, data: categories };
  },

  async getById(id: string, organizationId?: string): Promise<ServiceResponse<Category | null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${CAT(organizationId)}/${encodeURIComponent(id)}`
        : `/categories/${encodeURIComponent(id)}`;
      return apiGet<Category | null>(path);
    }

    await simulateDelay(80);
    const cat = dataStore.categories.find(c => c.id === id) || null;
    return { success: !!cat, data: cat };
  },

  async create(
    organizationId: string,
    data: Omit<Category, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<Category>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Category>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<Category, 'id' | 'organizationId'>, Category>(CAT(organizationId), data);
    }

    await simulateDelay(200);
    const newCat: Category = { ...data, id: generateId('cat'), organizationId };
    dataStore.categories.push(newCat);
    dataStore.notify('categories');
    return { success: true, data: newCat, message: 'Category created' };
  },

  async update(
    id: string,
    updates: Partial<Category>,
    organizationId?: string,
  ): Promise<ServiceResponse<Category>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${CAT(organizationId)}/${encodeURIComponent(id)}`
        : `/categories/${encodeURIComponent(id)}`;
      return apiRequest<Category>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.categories.findIndex(c => c.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Category not found' };
    dataStore.categories[idx] = { ...dataStore.categories[idx], ...updates };
    dataStore.notify('categories');
    return { success: true, data: dataStore.categories[idx] };
  },

  async delete(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${CAT(organizationId)}/${encodeURIComponent(id)}`
        : `/categories/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.categories.findIndex(c => c.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Category not found' };
    dataStore.categories.splice(idx, 1);
    dataStore.transactions.forEach(t => {
      if (t.categoryId === id) {
        t.categoryId = undefined;
        t.status = 'pending';
      }
    });
    dataStore.notify('categories');
    dataStore.notify('transactions');
    return { success: true, data: null, message: 'Category deleted' };
  },

  async addPattern(
    categoryId: string,
    pattern: string,
    organizationId?: string,
  ): Promise<ServiceResponse<Category>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${CAT(organizationId)}/${encodeURIComponent(categoryId)}/patterns`
        : `/categories/${encodeURIComponent(categoryId)}/patterns`;
      return apiPostJson<{ pattern: string }, Category>(path, { pattern });
    }

    await simulateDelay(100);
    const idx = dataStore.categories.findIndex(c => c.id === categoryId);
    if (idx === -1) return { success: false, data: null as any, error: 'Category not found' };

    if (!dataStore.categories[idx].patterns.includes(pattern)) {
      dataStore.categories[idx].patterns.push(pattern);
    }
    dataStore.notify('categories');
    return { success: true, data: dataStore.categories[idx] };
  },

  async removePattern(
    categoryId: string,
    pattern: string,
    organizationId?: string,
  ): Promise<ServiceResponse<Category>> {
    if (isHttpBackendConfigured()) {
      const base = organizationId
        ? `${CAT(organizationId)}/${encodeURIComponent(categoryId)}/patterns`
        : `/categories/${encodeURIComponent(categoryId)}/patterns`;
      const qs = new URLSearchParams({ pattern });
      return apiRequest<Category>(`${base}?${qs.toString()}`, { method: 'DELETE' });
    }

    await simulateDelay(100);
    const idx = dataStore.categories.findIndex(c => c.id === categoryId);
    if (idx === -1) return { success: false, data: null as any, error: 'Category not found' };

    dataStore.categories[idx].patterns = dataStore.categories[idx].patterns.filter(p => p !== pattern);
    dataStore.notify('categories');
    return { success: true, data: dataStore.categories[idx] };
  },

  async getUsageStats(organizationId: string): Promise<ServiceResponse<CategoryUsageStatRow[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<CategoryUsageStatRow[]>(organizationId);
      if (err) return err;
      return apiGet<CategoryUsageStatRow[]>(`${CAT(organizationId)}/usage-stats`);
    }

    await simulateDelay();
    const categories = dataStore.categories.filter(c => c.organizationId === organizationId);
    const orgTxns = dataStore.transactions.filter(t => t.organizationId === organizationId);

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

    return { success: true, data: stats };
  },
};
