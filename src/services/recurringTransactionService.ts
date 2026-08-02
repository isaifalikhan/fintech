/**
 * Recurring Transaction Service
 * ==============================
 * CRUD for recurring/scheduled transactions.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { RecurringTransaction } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const REC = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/recurring-transactions`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

/** Returns an error message if next occurrence is before start, or null if valid. */
export function validateRecurringDateOrder(startDate: string, nextOccurrence: string): string | null {
  const s = startDate.trim().slice(0, 10);
  const n = nextOccurrence.trim().slice(0, 10);
  if (!ISO_DATE.test(s) || !ISO_DATE.test(n)) {
    return 'Use valid start and next dates.';
  }
  if (n < s) {
    return 'Next occurrence must be on or after the start date.';
  }
  return null;
}

export const recurringTransactionService = {
  async getAll(organizationId: string): Promise<ServiceResponse<RecurringTransaction[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<RecurringTransaction[]>(organizationId);
      if (err) return err;
      return apiGet<RecurringTransaction[]>(REC(organizationId));
    }

    await simulateDelay();
    return { success: true, data: dataStore.recurringTransactions.filter(r => r.organizationId === organizationId) };
  },

  async create(
    organizationId: string,
    data: Omit<RecurringTransaction, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<RecurringTransaction>> {
    const dateErr = validateRecurringDateOrder(data.startDate, data.nextOccurrence);
    if (dateErr) {
      return { success: false, data: null as any, error: dateErr };
    }

    if (isHttpBackendConfigured()) {
      const err = requireOrg<RecurringTransaction>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<RecurringTransaction, 'id' | 'organizationId'>, RecurringTransaction>(
        REC(organizationId),
        data,
      );
    }

    await simulateDelay(200);
    const item: RecurringTransaction = { ...data, id: generateId('rec'), organizationId };
    dataStore.recurringTransactions.push(item);
    dataStore.notify('recurringTransactions');
    return { success: true, data: item, message: 'Recurring transaction created' };
  },

  async update(
    id: string,
    updates: Partial<RecurringTransaction>,
    organizationId?: string,
  ): Promise<ServiceResponse<RecurringTransaction>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${REC(organizationId)}/${encodeURIComponent(id)}`
        : `/recurring-transactions/${encodeURIComponent(id)}`;
      return apiRequest<RecurringTransaction>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.recurringTransactions.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Not found' };
    const merged: RecurringTransaction = { ...dataStore.recurringTransactions[idx], ...updates };
    const dateErr = validateRecurringDateOrder(merged.startDate, merged.nextOccurrence);
    if (dateErr) {
      return { success: false, data: null as any, error: dateErr };
    }
    dataStore.recurringTransactions[idx] = merged;
    dataStore.notify('recurringTransactions');
    return { success: true, data: dataStore.recurringTransactions[idx] };
  },

  async delete(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${REC(organizationId)}/${encodeURIComponent(id)}`
        : `/recurring-transactions/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.recurringTransactions.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Not found' };
    dataStore.recurringTransactions.splice(idx, 1);
    dataStore.notify('recurringTransactions');
    return { success: true, data: null, message: 'Deleted' };
  },

  async toggle(id: string, organizationId?: string): Promise<ServiceResponse<RecurringTransaction>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${REC(organizationId)}/${encodeURIComponent(id)}/toggle`
        : `/recurring-transactions/${encodeURIComponent(id)}/toggle`;
      return apiRequest<RecurringTransaction>(path, { method: 'POST', body: '{}' });
    }

    await simulateDelay(100);
    const idx = dataStore.recurringTransactions.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Not found' };
    dataStore.recurringTransactions[idx].isActive = !dataStore.recurringTransactions[idx].isActive;
    dataStore.notify('recurringTransactions');
    return { success: true, data: dataStore.recurringTransactions[idx] };
  },
};
