/**
 * Transaction Service
 * ====================
 * Full CRUD + filtering, pagination, bulk ops for transactions.
 *
 * MIGRATION: When `VITE_API_BASE_URL` is set, calls org-scoped REST routes; otherwise `dataStore`.
 */

import { Transaction } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse, PaginatedResult, TransactionFilters, BulkOperationResult } from './types';

const TXN_BASE = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/transactions`;

/** Serialize filters to query string for GET list / stats. */
export function transactionFiltersQuery(filters: TransactionFilters = {}): string {
  const qs = new URLSearchParams();
  const {
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
    categoryId,
    departmentId,
    projectId,
    bankAccountId,
    status,
    type,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo,
    tags,
  } = filters;
  if (page != null) qs.set('page', String(page));
  if (pageSize != null) qs.set('pageSize', String(pageSize));
  if (sortBy) qs.set('sortBy', sortBy);
  if (sortOrder) qs.set('sortOrder', sortOrder);
  if (search) qs.set('search', search);
  if (categoryId) qs.set('categoryId', categoryId);
  if (departmentId) qs.set('departmentId', departmentId);
  if (projectId) qs.set('projectId', projectId);
  if (bankAccountId) qs.set('bankAccountId', bankAccountId);
  if (status) qs.set('status', status);
  if (type) qs.set('type', type);
  if (minAmount !== undefined) qs.set('minAmount', String(minAmount));
  if (maxAmount !== undefined) qs.set('maxAmount', String(maxAmount));
  if (dateFrom) qs.set('dateFrom', dateFrom);
  if (dateTo) qs.set('dateTo', dateTo);
  if (tags?.length) tags.forEach(t => qs.append('tags', t));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const transactionService = {
  /**
   * Get transactions with filtering and pagination
   */
  async getAll(
    organizationId: string,
    filters: TransactionFilters = {},
  ): Promise<ServiceResponse<PaginatedResult<Transaction>>> {
    if (isHttpBackendConfigured()) {
      if (!organizationId.trim()) {
        return {
          success: false,
          data: null as unknown as PaginatedResult<Transaction>,
          error: 'organizationId required',
        };
      }
      return apiGet<PaginatedResult<Transaction>>(
        `${TXN_BASE(organizationId)}${transactionFiltersQuery(filters)}`,
      );
    }

    await simulateDelay();

    const {
      page = 1, pageSize = 20, sortBy = 'date', sortOrder = 'desc',
      search, categoryId, departmentId, projectId, bankAccountId,
      status, type, minAmount, maxAmount, dateFrom, dateTo, tags,
    } = filters;

    let items = dataStore.transactions.filter(t => t.organizationId === organizationId);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.narration.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (categoryId) items = items.filter(t => t.categoryId === categoryId);
    if (departmentId) items = items.filter(t => t.departmentId === departmentId);
    if (projectId) items = items.filter(t => t.projectId === projectId);
    if (bankAccountId) items = items.filter(t => t.bankAccountId === bankAccountId);
    if (status) items = items.filter(t => t.status === status);
    if (type) items = items.filter(t => t.type === type);
    if (minAmount !== undefined) items = items.filter(t => Math.abs(t.amount) >= minAmount);
    if (maxAmount !== undefined) items = items.filter(t => Math.abs(t.amount) <= maxAmount);
    if (dateFrom) items = items.filter(t => t.date >= dateFrom);
    if (dateTo) items = items.filter(t => t.date <= dateTo);
    if (tags && tags.length > 0) {
      items = items.filter(t => tags.some(tag => t.tags.includes(tag)));
    }

    items.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
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

    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  },

  /**
   * Get single transaction by ID.
   * When using HTTP, pass `organizationId` for `GET .../organizations/:orgId/transactions/:id`.
   * If omitted, uses `GET /transactions/:id` (globally unique id).
   */
  async getById(id: string, organizationId?: string): Promise<ServiceResponse<Transaction | null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${TXN_BASE(organizationId)}/${encodeURIComponent(id)}`
        : `/transactions/${encodeURIComponent(id)}`;
      return apiGet<Transaction | null>(path);
    }

    await simulateDelay(100);
    const txn = dataStore.transactions.find(t => t.id === id) || null;
    return { success: !!txn, data: txn, error: txn ? undefined : 'Transaction not found' };
  },

  async create(
    organizationId: string,
    data: Omit<Transaction, 'id' | 'organizationId' | 'createdAt'>,
  ): Promise<ServiceResponse<Transaction>> {
    if (isHttpBackendConfigured()) {
      if (!organizationId.trim()) {
        return { success: false, data: null as unknown as Transaction, error: 'organizationId required' };
      }
      return apiPostJson<Omit<Transaction, 'id' | 'organizationId' | 'createdAt'>, Transaction>(
        TXN_BASE(organizationId),
        data,
      );
    }

    await simulateDelay(200);

    const newTxn: Transaction = {
      ...data,
      id: generateId('txn'),
      organizationId,
      createdAt: new Date().toISOString(),
    };

    dataStore.transactions.unshift(newTxn);
    dataStore.notify('transactions');

    return { success: true, data: newTxn, message: 'Transaction created' };
  },

  /**
   * PATCH transaction. Pass `organizationId` when using HTTP (org-scoped route).
   */
  async update(
    id: string,
    updates: Partial<Transaction>,
    organizationId?: string,
  ): Promise<ServiceResponse<Transaction>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${TXN_BASE(organizationId)}/${encodeURIComponent(id)}`
        : `/transactions/${encodeURIComponent(id)}`;
      return apiRequest<Transaction>(path, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    }

    await simulateDelay(150);

    const idx = dataStore.transactions.findIndex(t => t.id === id);
    if (idx === -1) {
      return { success: false, data: null as any, error: 'Transaction not found' };
    }

    dataStore.transactions[idx] = { ...dataStore.transactions[idx], ...updates };
    dataStore.notify('transactions');

    return { success: true, data: dataStore.transactions[idx], message: 'Transaction updated' };
  },

  async delete(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${TXN_BASE(organizationId)}/${encodeURIComponent(id)}`
        : `/transactions/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);

    const idx = dataStore.transactions.findIndex(t => t.id === id);
    if (idx === -1) {
      return { success: false, data: null, error: 'Transaction not found' };
    }

    dataStore.transactions.splice(idx, 1);
    dataStore.notify('transactions');

    return { success: true, data: null, message: 'Transaction deleted' };
  },

  async bulkCategorize(
    organizationId: string,
    ids: string[],
    categoryId: string,
    classifiedBy: string = 'user',
  ): Promise<ServiceResponse<BulkOperationResult>> {
    if (isHttpBackendConfigured()) {
      if (!organizationId.trim()) {
        return {
          success: false,
          data: { succeeded: 0, failed: ids.length, errors: [] },
          error: 'organizationId required',
        };
      }
      return apiPostJson<
        { ids: string[]; categoryId: string; classifiedBy: string },
        BulkOperationResult
      >(`${TXN_BASE(organizationId)}/bulk-categorize`, { ids, categoryId, classifiedBy });
    }

    await simulateDelay(300);

    let succeeded = 0;
    const errors: { id: string; error: string }[] = [];

    for (const id of ids) {
      const idx = dataStore.transactions.findIndex(t => t.id === id);
      if (idx === -1) {
        errors.push({ id, error: 'Not found' });
      } else {
        dataStore.transactions[idx] = {
          ...dataStore.transactions[idx],
          categoryId,
          status: 'classified',
          classifiedAt: new Date().toISOString(),
          classifiedBy,
        };
        succeeded++;
      }
    }

    dataStore.notify('transactions');

    return {
      success: true,
      data: { succeeded, failed: errors.length, errors },
      message: `${succeeded} transactions categorized`,
    };
  },

  async bulkDelete(organizationId: string, ids: string[]): Promise<ServiceResponse<BulkOperationResult>> {
    if (isHttpBackendConfigured()) {
      if (!organizationId.trim()) {
        return {
          success: false,
          data: { succeeded: 0, failed: ids.length, errors: [] },
          error: 'organizationId required',
        };
      }
      return apiPostJson<{ ids: string[] }, BulkOperationResult>(
        `${TXN_BASE(organizationId)}/bulk-delete`,
        { ids },
      );
    }

    await simulateDelay(250);

    let succeeded = 0;
    const errors: { id: string; error: string }[] = [];

    for (const id of ids) {
      const idx = dataStore.transactions.findIndex(t => t.id === id);
      if (idx === -1) {
        errors.push({ id, error: 'Not found' });
      } else {
        dataStore.transactions.splice(idx, 1);
        succeeded++;
      }
    }

    dataStore.notify('transactions');

    return {
      success: true,
      data: { succeeded, failed: errors.length, errors },
      message: `${succeeded} transactions deleted`,
    };
  },

  async getStats(organizationId: string, dateFrom?: string, dateTo?: string): Promise<ServiceResponse<{
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
    pendingCount: number;
    classifiedCount: number;
    avgConfidence: number;
  }>> {
    if (isHttpBackendConfigured()) {
      if (!organizationId.trim()) {
        return {
          success: false,
          data: null as unknown as {
            totalIncome: number;
            totalExpenses: number;
            netAmount: number;
            transactionCount: number;
            pendingCount: number;
            classifiedCount: number;
            avgConfidence: number;
          },
          error: 'organizationId required',
        };
      }
      const q = new URLSearchParams();
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      const qs = q.toString();
      return apiGet<{
        totalIncome: number;
        totalExpenses: number;
        netAmount: number;
        transactionCount: number;
        pendingCount: number;
        classifiedCount: number;
        avgConfidence: number;
      }>(`${TXN_BASE(organizationId)}/stats${qs ? `?${qs}` : ''}`);
    }

    await simulateDelay();

    let txns = dataStore.transactions.filter(t => t.organizationId === organizationId);
    if (dateFrom) txns = txns.filter(t => t.date >= dateFrom);
    if (dateTo) txns = txns.filter(t => t.date <= dateTo);

    const totalIncome = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const pendingCount = txns.filter(t => t.status === 'pending').length;
    const classifiedCount = txns.filter(t => t.status !== 'pending').length;
    const confidences = txns.filter(t => t.confidence !== undefined).map(t => t.confidence!);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((s, c) => s + c, 0) / confidences.length
      : 0;

    return {
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netAmount: totalIncome - totalExpenses,
        transactionCount: txns.length,
        pendingCount,
        classifiedCount,
        avgConfidence: Math.round(avgConfidence),
      },
    };
  },
};
