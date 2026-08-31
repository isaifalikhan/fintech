/**
 * Per-organization AI integration settings.
 * When `VITE_API_BASE_URL` is set: `GET` / `PATCH` `/organizations/:orgId/ai-settings`.
 * Otherwise: browser `localStorage` (demo).
 */

import { isHttpBackendConfigured, apiGet, apiRequest } from '@/lib/apiClient';
import type { OrgAiIntegrationSettings, ServiceResponse } from './types';
import { simulateDelay } from './dataStore';

const STORAGE_KEY = 'finance_os_org_ai_settings_v1';

const AI_SETTINGS_PATH = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/ai-settings`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export function defaultOrgAiSettings(): OrgAiIntegrationSettings {
  return {
    useCustomKey: false,
    providerName: '',
    modelName: 'gpt-4o-mini',
    apiKey: '',
  };
}

function normalizeAiSettings(raw: unknown): OrgAiIntegrationSettings {
  if (!raw || typeof raw !== 'object') return defaultOrgAiSettings();
  const o = raw as Record<string, unknown>;
  return {
    useCustomKey: Boolean(o.useCustomKey),
    providerName: typeof o.providerName === 'string' ? o.providerName : '',
    modelName:
      typeof o.modelName === 'string' && o.modelName.trim()
        ? o.modelName
        : 'gpt-4o-mini',
    apiKey: typeof o.apiKey === 'string' ? o.apiKey : '',
  };
}

function readAll(): Record<string, OrgAiIntegrationSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, OrgAiIntegrationSettings>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, OrgAiIntegrationSettings>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function dispatchAiSettingsEvent(organizationId: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance-os-ai-settings', { detail: { organizationId } }));
  }
}

/**
 * Synchronous read from local demo storage only. When HTTP is configured, returns `null`
 * (use `fetchOrgAiSettings`).
 */
export function getOrgAiSettings(organizationId: string): OrgAiIntegrationSettings | null {
  if (!organizationId || isHttpBackendConfigured()) return null;
  const all = readAll();
  return all[organizationId] ?? null;
}

/**
 * Load AI settings for the org (HTTP or localStorage).
 */
export async function fetchOrgAiSettings(
  organizationId: string,
): Promise<ServiceResponse<OrgAiIntegrationSettings | null>> {
  const err = requireOrg<OrgAiIntegrationSettings | null>(organizationId);
  if (err) return err;

  if (isHttpBackendConfigured()) {
    const res = await apiGet<unknown>(AI_SETTINGS_PATH(organizationId));
    if (!res.success) return res as ServiceResponse<OrgAiIntegrationSettings | null>;
    if (res.data == null) return { success: true, data: null };
    return { success: true, data: normalizeAiSettings(res.data) };
  }

  await simulateDelay(50);
  const all = readAll();
  const raw = all[organizationId] ?? null;
  return { success: true, data: raw };
}

export function saveOrgAiSettings(
  organizationId: string,
  patch: Partial<OrgAiIntegrationSettings>,
): OrgAiIntegrationSettings {
  if (isHttpBackendConfigured()) {
    const mergedPrev = getOrgAiSettings(organizationId) ?? defaultOrgAiSettings();
    return { ...mergedPrev, ...patch };
  }
  if (!organizationId?.trim()) {
    return { ...defaultOrgAiSettings(), ...patch };
  }
  const all = readAll();
  const mergedPrev = all[organizationId] ?? defaultOrgAiSettings();
  const next: OrgAiIntegrationSettings = { ...mergedPrev, ...patch };
  all[organizationId] = next;
  writeAll(all);
  dispatchAiSettingsEvent(organizationId);
  return next;
}

/** Save with explicit success/failure for UI (storage quota, missing org, etc.). */
export async function saveOrgAiSettingsResponse(
  organizationId: string,
  patch: Partial<OrgAiIntegrationSettings>,
): Promise<ServiceResponse<OrgAiIntegrationSettings>> {
  if (!organizationId?.trim()) {
    return {
      success: false,
      data: { ...defaultOrgAiSettings(), ...patch },
      error: 'Select an organization before saving.',
    };
  }

  if (isHttpBackendConfigured()) {
    const ro = requireOrg<OrgAiIntegrationSettings>(organizationId);
    if (ro) return ro;
    const base = defaultOrgAiSettings();
    const merged: OrgAiIntegrationSettings = {
      ...base,
      ...patch,
      modelName: patch.modelName?.trim() || base.modelName,
    };
    const res = await apiRequest<OrgAiIntegrationSettings>(AI_SETTINGS_PATH(organizationId), {
      method: 'PATCH',
      body: JSON.stringify(merged),
    });
    if (res.success) {
      dispatchAiSettingsEvent(organizationId);
      const data = res.data != null ? normalizeAiSettings(res.data) : merged;
      return {
        success: true,
        data,
        message: 'AI connection settings saved.',
      };
    }
    return {
      success: false,
      data: defaultOrgAiSettings(),
      error: res.error ?? 'Could not save AI settings.',
    };
  }

  const all = readAll();
  const mergedPrev = all[organizationId] ?? defaultOrgAiSettings();
  const next: OrgAiIntegrationSettings = { ...mergedPrev, ...patch };
  all[organizationId] = next;
  const ok = writeAll(all);
  if (!ok) {
    return {
      success: false,
      data: mergedPrev,
      error: 'Could not save settings. Storage may be full or unavailable.',
    };
  }
  dispatchAiSettingsEvent(organizationId);
  return { success: true, data: next, message: 'AI connection settings saved.' };
}

export function clearOrgAiSettings(organizationId: string): void {
  if (!organizationId?.trim() || isHttpBackendConfigured()) return;
  const all = readAll();
  delete all[organizationId];
  writeAll(all);
  dispatchAiSettingsEvent(organizationId);
}

export async function clearOrgAiSettingsResponse(organizationId: string): Promise<ServiceResponse<null>> {
  if (!organizationId?.trim()) {
    return { success: false, data: null, error: 'Select an organization first.' };
  }

  if (isHttpBackendConfigured()) {
    const ro = requireOrg<null>(organizationId);
    if (ro) return ro;
    const cleared = defaultOrgAiSettings();
    const res = await apiRequest<OrgAiIntegrationSettings>(AI_SETTINGS_PATH(organizationId), {
      method: 'PATCH',
      body: JSON.stringify(cleared),
    });
    if (res.success) {
      dispatchAiSettingsEvent(organizationId);
      return { success: true, data: null, message: 'AI settings cleared.' };
    }
    return { success: false, data: null, error: res.error ?? 'Could not clear AI settings.' };
  }

  const all = readAll();
  delete all[organizationId];
  const ok = writeAll(all);
  if (!ok) {
    return { success: false, data: null, error: 'Could not clear settings. Try again.' };
  }
  dispatchAiSettingsEvent(organizationId);
  return { success: true, data: null, message: 'AI settings cleared.' };
}

/** Last 4 chars for display when masked */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return `••••••••${key.slice(-4)}`;
}
