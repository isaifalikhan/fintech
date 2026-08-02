/**
 * Loan Service — org-scoped loans & liabilities (receivable / payable).
 * MIGRATION: Replace method bodies with API calls.
 */

import type { Loan } from '@/services/types';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

function normalizeBalances(data: Omit<Loan, 'id' | 'organizationId'>): Omit<Loan, 'id' | 'organizationId'> {
  const principal = Number(data.principal);
  const paid = Math.max(0, Number(data.amountPaid ?? 0));
  const remaining = data.remainingBalance != null
    ? Number(data.remainingBalance)
    : Math.max(0, principal - paid);
  return {
    ...data,
    principal,
    amount: data.amount != null ? Number(data.amount) : principal,
    amountPaid: paid,
    remainingBalance: remaining,
  };
}

export const loanService = {
  async getAll(organizationId: string): Promise<ServiceResponse<Loan[]>> {
    await simulateDelay();
    const list = dataStore.loans.filter(l => l.organizationId === organizationId);
    return { success: true, data: list };
  },

  async getById(id: string): Promise<ServiceResponse<Loan | null>> {
    await simulateDelay(80);
    const loan = dataStore.loans.find(l => l.id === id) ?? null;
    return { success: !!loan, data: loan };
  },

  async create(
    organizationId: string,
    data: Omit<Loan, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<Loan>> {
    await simulateDelay(200);
    const party = (data.party || '').trim();
    if (!party) {
      return { success: false, data: null as any, error: 'Enter who this loan is with.' };
    }
    if (!data.principal || data.principal <= 0) {
      return { success: false, data: null as any, error: 'Principal must be greater than zero.' };
    }
    if (!data.dueDate?.trim()) {
      return { success: false, data: null as any, error: 'Due date is required.' };
    }
    const normalized = normalizeBalances(data);
    const newLoan: Loan = {
      ...normalized,
      id: generateId('loan'),
      organizationId,
      currency: normalized.currency || 'USD',
      description: (normalized.description || '').trim() || 'Loan',
    };
    dataStore.loans.push(newLoan);
    dataStore.notify('loans');
    return { success: true, data: newLoan, message: 'Loan saved' };
  },

  async update(id: string, updates: Partial<Loan>): Promise<ServiceResponse<Loan>> {
    await simulateDelay(150);
    const idx = dataStore.loans.findIndex(l => l.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Loan not found' };
    const merged = { ...dataStore.loans[idx], ...updates };
    if (updates.principal != null || updates.amountPaid != null || updates.remainingBalance != null) {
      const n = normalizeBalances(merged);
      dataStore.loans[idx] = { ...merged, ...n };
    } else {
      dataStore.loans[idx] = merged;
    }
    dataStore.notify('loans');
    return { success: true, data: dataStore.loans[idx] };
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    await simulateDelay(150);
    const idx = dataStore.loans.findIndex(l => l.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Loan not found' };
    dataStore.loans.splice(idx, 1);
    dataStore.notify('loans');
    return { success: true, data: null, message: 'Loan removed' };
  },
};
