/**
 * Per-org mock integration connection state (browser localStorage).
 * Cards stay demo-only; state survives refresh for QA and org phase checklists.
 */

import type { ServiceResponse } from './types';

const STORAGE_KEY = 'finance_os_org_integration_states_v1';

export type IntegrationConnectionStatus = 'connected' | 'disconnected' | 'pending';

export interface IntegrationConnectionPersisted {
  status: IntegrationConnectionStatus;
  lastSync?: string;
}

type OrgMap = Record<string, Record<string, IntegrationConnectionPersisted>>;

function readAll(): OrgMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as OrgMap;
  } catch {
    return {};
  }
}

function writeAll(data: OrgMap): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function getOrgIntegrationStates(
  organizationId: string,
): Record<string, IntegrationConnectionPersisted> {
  if (!organizationId?.trim()) return {};
  return readAll()[organizationId] ?? {};
}

export function persistOrgIntegrationStates(
  organizationId: string,
  states: Record<string, IntegrationConnectionPersisted>,
): ServiceResponse<Record<string, IntegrationConnectionPersisted>> {
  if (!organizationId?.trim()) {
    return { success: false, data: states, error: 'Select an organization first.' };
  }
  const all = readAll();
  all[organizationId] = states;
  const ok = writeAll(all);
  if (!ok) {
    return {
      success: false,
      data: getOrgIntegrationStates(organizationId),
      error: 'Could not save connection state. Storage may be full or unavailable.',
    };
  }
  return { success: true, data: states };
}
