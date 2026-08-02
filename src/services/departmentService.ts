/**
 * Department Service
 * ===================
 * CRUD for departments with profitability and overhead allocation.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { Department } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse, DepartmentProfitability } from './types';

const DEPT = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/departments`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export const departmentService = {
  async getAll(organizationId: string): Promise<ServiceResponse<Department[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Department[]>(organizationId);
      if (err) return err;
      return apiGet<Department[]>(DEPT(organizationId));
    }

    await simulateDelay();
    const departments = dataStore.departments.filter(d => d.organizationId === organizationId);
    return { success: true, data: departments };
  },

  async getById(id: string, organizationId?: string): Promise<ServiceResponse<Department | null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${DEPT(organizationId)}/${encodeURIComponent(id)}`
        : `/departments/${encodeURIComponent(id)}`;
      return apiGet<Department | null>(path);
    }

    await simulateDelay(80);
    const dept = dataStore.departments.find(d => d.id === id) || null;
    return { success: !!dept, data: dept };
  },

  async create(
    organizationId: string,
    data: Omit<Department, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<Department>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Department>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<Department, 'id' | 'organizationId'>, Department>(DEPT(organizationId), data);
    }

    await simulateDelay(200);
    const newDept: Department = { ...data, id: generateId('dept'), organizationId };
    dataStore.departments.push(newDept);
    dataStore.notify('departments');
    return { success: true, data: newDept, message: 'Department created' };
  },

  async update(
    id: string,
    updates: Partial<Department>,
    organizationId?: string,
  ): Promise<ServiceResponse<Department>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${DEPT(organizationId)}/${encodeURIComponent(id)}`
        : `/departments/${encodeURIComponent(id)}`;
      return apiRequest<Department>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.departments.findIndex(d => d.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Department not found' };
    dataStore.departments[idx] = { ...dataStore.departments[idx], ...updates };
    dataStore.notify('departments');
    return { success: true, data: dataStore.departments[idx] };
  },

  async delete(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${DEPT(organizationId)}/${encodeURIComponent(id)}`
        : `/departments/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.departments.findIndex(d => d.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Department not found' };
    dataStore.departments.splice(idx, 1);
    dataStore.notify('departments');
    return { success: true, data: null, message: 'Department deleted' };
  },

  async getProfitability(organizationId: string): Promise<ServiceResponse<DepartmentProfitability[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<DepartmentProfitability[]>(organizationId);
      if (err) return err;
      return apiGet<DepartmentProfitability[]>(`${DEPT(organizationId)}/profitability`);
    }

    await simulateDelay();

    const departments = dataStore.departments.filter(d => d.organizationId === organizationId && d.isActive);
    const orgTxns = dataStore.transactions.filter(t => t.organizationId === organizationId);
    const members = dataStore.organizationMembers.filter(m => m.organizationId === organizationId);
    const allocations = dataStore.overheadAllocations.filter(a => a.organizationId === organizationId);

    const profitability: DepartmentProfitability[] = departments.map(dept => {
      const deptTxns = orgTxns.filter(t => t.departmentId === dept.id);
      const revenue = deptTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      const directCosts = deptTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);

      let allocatedOverhead = 0;
      for (const alloc of allocations) {
        const deptAlloc = alloc.departments.find(d => d.departmentId === dept.id);
        if (deptAlloc) {
          const totalOverhead = alloc.accountIds.reduce((sum, accId) => {
            const acc = dataStore.accounts.find(a => a.id === accId);
            return sum + (acc?.balance || 0);
          }, 0);
          allocatedOverhead += (totalOverhead * deptAlloc.percentage) / 100;
        }
      }

      const txnMatchedHeadcount = members.filter((m) =>
        orgTxns.some((t) => t.departmentId === dept.id && t.classifiedBy === m.userId),
      ).length;
      let headcount = txnMatchedHeadcount;
      if (headcount === 0) {
        let h = 0;
        for (let i = 0; i < dept.id.length; i++) h = (h * 31 + dept.id.charCodeAt(i)) | 0;
        headcount = 2 + (Math.abs(h) % 5);
      }

      const netProfit = revenue - directCosts - allocatedOverhead;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const totalHours = headcount * 160;

      const billableRatio = revenue > 0
        ? Math.min(0.85, Math.max(0.45, revenue / (revenue + directCosts + 1)))
        : 0.6;
      const billableHours = Math.round(totalHours * billableRatio);

      const utilization = totalHours > 0
        ? Math.round((billableHours / totalHours) * 1000) / 10
        : 0;

      const costPerHour = totalHours > 0
        ? Math.round(directCosts / totalHours)
        : dept.budget ? Math.round(dept.budget / 160) : 0;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        revenue,
        directCosts,
        allocatedOverhead: Math.round(allocatedOverhead),
        netProfit: Math.round(netProfit),
        profitMargin: Math.round(profitMargin * 10) / 10,
        headcount,
        revenuePerHead: headcount > 0 ? Math.round(revenue / headcount) : 0,
        totalHours,
        billableHours,
        utilization,
        costPerHour,
      };
    });

    return { success: true, data: profitability };
  },
};
