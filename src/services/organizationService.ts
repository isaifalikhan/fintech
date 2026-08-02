/**
 * Organization Service
 * =====================
 * CRUD for organizations, members, and org settings.
 *
 * MIGRATION: Replace method bodies with API calls. Signatures stay the same.
 */

import { Organization, OrganizationMember, User } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse, PaginatedResult, PaginationParams } from './types';

function paginationQuery(params: PaginationParams = {}): string {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const organizationService = {
  /**
   * Get all organizations (platform admin view)
   * TODO: Replace with GET /api/platform/organizations
   */
  async getAll(params: PaginationParams = {}): Promise<ServiceResponse<PaginatedResult<Organization>>> {
    if (isHttpBackendConfigured()) {
      return apiGet<PaginatedResult<Organization>>(`/organizations${paginationQuery(params)}`);
    }

    await simulateDelay();
    const { page = 1, pageSize = 20 } = params;
    const total = dataStore.organizations.length;
    const items = dataStore.organizations.slice((page - 1) * pageSize, page * pageSize);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    };
  },

  /**
   * Get organization by ID
   * TODO: Replace with GET /api/organizations/:id
   */
  async getById(id: string): Promise<ServiceResponse<Organization | null>> {
    if (isHttpBackendConfigured()) {
      return apiGet<Organization | null>(`/organizations/${encodeURIComponent(id)}`);
    }

    await simulateDelay(100);
    const org = dataStore.organizations.find(o => o.id === id) || null;
    return { success: !!org, data: org };
  },

  /**
   * Create a new organization
   * TODO: Replace with POST /api/organizations
   */
  async create(data: Omit<Organization, 'id' | 'createdAt'>): Promise<ServiceResponse<Organization>> {
    if (isHttpBackendConfigured()) {
      return apiPostJson<Omit<Organization, 'id' | 'createdAt'>, Organization>('/organizations', data);
    }

    await simulateDelay(250);
    const newOrg: Organization = {
      ...data,
      id: generateId('org'),
      createdAt: new Date().toISOString(),
    };
    dataStore.organizations.push(newOrg);
    dataStore.notify('organizations');
    return { success: true, data: newOrg, message: 'Organization created' };
  },

  /**
   * Update organization
   * TODO: Replace with PATCH /api/organizations/:id
   */
  async update(id: string, updates: Partial<Organization>): Promise<ServiceResponse<Organization>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<Organization>(`/organizations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    }

    await simulateDelay(200);
    const idx = dataStore.organizations.findIndex(o => o.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Organization not found' };

    dataStore.organizations[idx] = { ...dataStore.organizations[idx], ...updates };
    dataStore.notify('organizations');
    return { success: true, data: dataStore.organizations[idx], message: 'Organization updated' };
  },

  /**
   * Delete organization
   * TODO: Replace with DELETE /api/organizations/:id
   */
  async delete(id: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<null>(`/organizations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    await simulateDelay(200);
    const idx = dataStore.organizations.findIndex(o => o.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Organization not found' };

    dataStore.organizations.splice(idx, 1);
    // Cascade: remove members, transactions, etc. for this org
    dataStore.organizationMembers = dataStore.organizationMembers.filter(m => m.organizationId !== id);
    dataStore.transactions = dataStore.transactions.filter(t => t.organizationId !== id);
    dataStore.notify('organizations');
    return { success: true, data: null, message: 'Organization deleted' };
  },

  // ---- MEMBERS ----

  /**
   * Get organization members with user details
   * TODO: Replace with GET /api/organizations/:orgId/members
   */
  async getMembers(organizationId: string): Promise<ServiceResponse<(OrganizationMember & { user: User })[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<(OrganizationMember & { user: User })[]>(
        `/organizations/${encodeURIComponent(organizationId)}/members`,
      );
    }

    await simulateDelay();
    const members = dataStore.organizationMembers
      .filter(m => m.organizationId === organizationId)
      .map(m => {
        const user = dataStore.users.find(u => u.id === m.userId);
        return { ...m, user: user! };
      })
      .filter(m => m.user); // Only include if user exists

    return { success: true, data: members };
  },

  /**
   * Add member to organization
   * TODO: Replace with POST /api/organizations/:orgId/members
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationMember['role']
  ): Promise<ServiceResponse<OrganizationMember>> {
    if (isHttpBackendConfigured()) {
      return apiPostJson<{ userId: string; role: OrganizationMember['role'] }, OrganizationMember>(
        `/organizations/${encodeURIComponent(organizationId)}/members`,
        { userId, role },
      );
    }

    await simulateDelay(200);

    // Check if already a member
    const existing = dataStore.organizationMembers.find(
      m => m.userId === userId && m.organizationId === organizationId
    );
    if (existing) {
      return { success: false, data: existing, error: 'User is already a member' };
    }

    const member: OrganizationMember = {
      userId,
      organizationId,
      role,
      joinedAt: new Date().toISOString(),
    };
    dataStore.organizationMembers.push(member);
    dataStore.notify('organizationMembers');
    return { success: true, data: member, message: 'Member added' };
  },

  /**
   * Update member role
   * TODO: Replace with PATCH /api/organizations/:orgId/members/:userId
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: OrganizationMember['role']
  ): Promise<ServiceResponse<OrganizationMember>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<OrganizationMember>(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole }),
        },
      );
    }

    await simulateDelay(150);
    const idx = dataStore.organizationMembers.findIndex(
      m => m.userId === userId && m.organizationId === organizationId
    );
    if (idx === -1) return { success: false, data: null as any, error: 'Member not found' };

    dataStore.organizationMembers[idx] = { ...dataStore.organizationMembers[idx], role: newRole };
    dataStore.notify('organizationMembers');
    return { success: true, data: dataStore.organizationMembers[idx], message: 'Role updated' };
  },

  /**
   * Remove member from organization
   * TODO: Replace with DELETE /api/organizations/:orgId/members/:userId
   */
  async removeMember(organizationId: string, userId: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      return apiRequest<null>(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
      );
    }

    await simulateDelay(150);
    const idx = dataStore.organizationMembers.findIndex(
      m => m.userId === userId && m.organizationId === organizationId
    );
    if (idx === -1) return { success: false, data: null, error: 'Member not found' };

    dataStore.organizationMembers.splice(idx, 1);
    dataStore.notify('organizationMembers');
    return { success: true, data: null, message: 'Member removed' };
  },
};