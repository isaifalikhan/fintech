/**
 * Project Service
 * ================
 * CRUD for client projects with profitability calculations.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { Project, Transaction } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse, ProjectProfitability } from './types';

const PROJ = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/projects`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export const projectService = {
  async getAll(organizationId: string): Promise<ServiceResponse<Project[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Project[]>(organizationId);
      if (err) return err;
      return apiGet<Project[]>(PROJ(organizationId));
    }

    await simulateDelay();
    const projects = dataStore.projects.filter(p => p.organizationId === organizationId);
    return { success: true, data: projects };
  },

  async getById(id: string, organizationId?: string): Promise<ServiceResponse<Project | null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${PROJ(organizationId)}/${encodeURIComponent(id)}`
        : `/projects/${encodeURIComponent(id)}`;
      return apiGet<Project | null>(path);
    }

    await simulateDelay(80);
    const project = dataStore.projects.find(p => p.id === id) || null;
    return { success: !!project, data: project };
  },

  async create(
    organizationId: string,
    data: Omit<Project, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<Project>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Project>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<Project, 'id' | 'organizationId'>, Project>(PROJ(organizationId), data);
    }

    await simulateDelay(200);
    const newProject: Project = { ...data, id: generateId('proj'), organizationId };
    dataStore.projects.push(newProject);
    dataStore.notify('projects');
    return { success: true, data: newProject, message: 'Project created' };
  },

  async update(
    id: string,
    updates: Partial<Project>,
    organizationId?: string,
  ): Promise<ServiceResponse<Project>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${PROJ(organizationId)}/${encodeURIComponent(id)}`
        : `/projects/${encodeURIComponent(id)}`;
      return apiRequest<Project>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.projects.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Project not found' };
    dataStore.projects[idx] = { ...dataStore.projects[idx], ...updates };
    dataStore.notify('projects');
    return { success: true, data: dataStore.projects[idx] };
  },

  async delete(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${PROJ(organizationId)}/${encodeURIComponent(id)}`
        : `/projects/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.projects.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Project not found' };
    dataStore.projects.splice(idx, 1);
    dataStore.notify('projects');
    return { success: true, data: null, message: 'Project deleted' };
  },

  async getProfitability(organizationId: string): Promise<ServiceResponse<ProjectProfitability[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ProjectProfitability[]>(organizationId);
      if (err) return err;
      return apiGet<ProjectProfitability[]>(`${PROJ(organizationId)}/profitability`);
    }

    await simulateDelay();

    const projects = dataStore.projects.filter(p => p.organizationId === organizationId);
    const profitability: ProjectProfitability[] = projects.map(proj => {
      const profit = proj.quotedAmount - proj.actualCost;
      const profitMargin = proj.quotedAmount > 0 ? (profit / proj.quotedAmount) * 100 : 0;
      const budgetVariance = proj.quotedAmount > 0
        ? ((proj.actualCost - proj.quotedAmount) / proj.quotedAmount) * 100
        : 0;

      return {
        projectId: proj.id,
        projectName: proj.name,
        clientName: proj.clientName,
        quotedAmount: proj.quotedAmount,
        actualCost: proj.actualCost,
        profit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        status: proj.status,
        budgetVariance: Math.round(budgetVariance * 10) / 10,
      };
    });

    return { success: true, data: profitability };
  },

  async getProjectTransactions(
    projectId: string,
    organizationId?: string,
  ): Promise<ServiceResponse<Transaction[]>> {
    if (isHttpBackendConfigured()) {
      if (organizationId) {
        return apiGet<Transaction[]>(
          `${PROJ(organizationId)}/${encodeURIComponent(projectId)}/transactions`,
        );
      }
      return apiGet<Transaction[]>(`/projects/${encodeURIComponent(projectId)}/transactions`);
    }

    await simulateDelay();
    const txns = dataStore.transactions.filter(t => t.projectId === projectId);
    return { success: true, data: txns };
  },
};
