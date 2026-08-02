/**
 * Budget Service
 * ===============
 * CRUD for budgets with tracking and variance analysis.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { Budget } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

const BUD = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/budgets`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export type BudgetVarianceRow = {
  budgetId: string;
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: string;
  isOverBudget: boolean;
};

export const budgetService = {
  async getAll(organizationId: string): Promise<ServiceResponse<Budget[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Budget[]>(organizationId);
      if (err) return err;
      return apiGet<Budget[]>(BUD(organizationId));
    }

    await simulateDelay();
    return { success: true, data: dataStore.budgets.filter(b => b.organizationId === organizationId) };
  },

  async getById(id: string, organizationId?: string): Promise<ServiceResponse<Budget | null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${BUD(organizationId)}/${encodeURIComponent(id)}`
        : `/budgets/${encodeURIComponent(id)}`;
      return apiGet<Budget | null>(path);
    }

    await simulateDelay(80);
    const budget = dataStore.budgets.find(b => b.id === id) || null;
    return { success: !!budget, data: budget };
  },

  async create(
    organizationId: string,
    data: Omit<Budget, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<Budget>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Budget>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<Budget, 'id' | 'organizationId'>, Budget>(BUD(organizationId), data);
    }

    await simulateDelay(200);
    const newBudget: Budget = { ...data, id: generateId('budget'), organizationId };
    dataStore.budgets.push(newBudget);
    dataStore.notify('budgets');
    return { success: true, data: newBudget, message: 'Budget created' };
  },

  async update(
    id: string,
    updates: Partial<Budget>,
    organizationId?: string,
  ): Promise<ServiceResponse<Budget>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${BUD(organizationId)}/${encodeURIComponent(id)}`
        : `/budgets/${encodeURIComponent(id)}`;
      return apiRequest<Budget>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.budgets.findIndex(b => b.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Budget not found' };
    dataStore.budgets[idx] = { ...dataStore.budgets[idx], ...updates };
    dataStore.notify('budgets');
    return { success: true, data: dataStore.budgets[idx] };
  },

  async delete(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${BUD(organizationId)}/${encodeURIComponent(id)}`
        : `/budgets/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.budgets.findIndex(b => b.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Budget not found' };
    dataStore.budgets.splice(idx, 1);
    dataStore.notify('budgets');
    return { success: true, data: null, message: 'Budget deleted' };
  },

  async getVarianceAnalysis(organizationId: string): Promise<ServiceResponse<BudgetVarianceRow[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<BudgetVarianceRow[]>(organizationId);
      if (err) return err;
      return apiGet<BudgetVarianceRow[]>(`${BUD(organizationId)}/variance`);
    }

    await simulateDelay();

    const budgets = dataStore.budgets.filter(b => b.organizationId === organizationId);
    const analysis = budgets.map(budget => {
      const variance = budget.budgetedAmount - budget.spentAmount;
      const variancePercent = budget.budgetedAmount > 0
        ? (variance / budget.budgetedAmount) * 100
        : 0;

      return {
        budgetId: budget.id,
        name: budget.name,
        budgeted: budget.budgetedAmount,
        actual: budget.spentAmount,
        variance,
        variancePercent: Math.round(variancePercent * 10) / 10,
        status: budget.status,
        isOverBudget: budget.spentAmount > budget.budgetedAmount,
      };
    });

    return { success: true, data: analysis };
  },

  async getAlerts(organizationId: string): Promise<ServiceResponse<Budget[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Budget[]>(organizationId);
      if (err) return err;
      return apiGet<Budget[]>(`${BUD(organizationId)}/alerts`);
    }

    await simulateDelay();
    const alerts = dataStore.budgets.filter(b => {
      if (b.organizationId !== organizationId) return false;
      const utilization = b.budgetedAmount > 0 ? (b.spentAmount / b.budgetedAmount) * 100 : 0;
      return utilization >= 80;
    });
    return { success: true, data: alerts };
  },
};
