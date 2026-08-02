/**
 * Audit Log Service
 * ==================
 * Read-only access to audit trail entries.
 *
 * When `VITE_API_BASE_URL` is set, uses `GET /organizations/:orgId/audit-logs`; otherwise in-memory seed.
 */

import { isHttpBackendConfigured, apiGet } from '@/lib/apiClient';
import { simulateDelay } from './dataStore';
import type { ServiceResponse } from './types';

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

const seedLogs: AuditLogEntry[] = [];

const AUDIT = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/audit-logs`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

function auditLogsQuery(filters?: { severity?: string; action?: string; search?: string }): string {
  if (!filters) return '';
  const q = new URLSearchParams();
  if (filters.severity) q.set('severity', filters.severity);
  if (filters.action) q.set('action', filters.action);
  if (filters.search) q.set('search', filters.search);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const auditService = {
  async getAll(
    organizationId: string,
    filters?: { severity?: string; action?: string; search?: string },
  ): Promise<ServiceResponse<AuditLogEntry[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<AuditLogEntry[]>(organizationId);
      if (err) return err;
      return apiGet<AuditLogEntry[]>(`${AUDIT(organizationId)}${auditLogsQuery(filters)}`);
    }

    await simulateDelay();
    let logs = seedLogs.filter(l => l.organizationId === organizationId);
    if (filters?.severity) logs = logs.filter(l => l.severity === filters.severity);
    if (filters?.action) logs = logs.filter(l => l.action === filters.action);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(l => l.details.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q));
    }
    return { success: true, data: logs };
  },
};
