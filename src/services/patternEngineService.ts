/**
 * Finance Pattern Engine (Elite 0.1)
 * ==================================
 * Local-first: delegates to `classificationService` when the HTTP API is off.
 * When `VITE_API_BASE_URL` is set, uses `/organizations/:orgId/patterns/*` per API rollout §14.
 */

import type { ServiceResponse } from './types';
import type { ClassificationResult } from '@/lib/classificationEngine';
import { isHttpBackendConfigured, apiPostJson } from '@/lib/apiClient';
import { classificationService } from './classificationService';

const PAT = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/patterns`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export const patternEngineService = {
  async suggestForNarration(
    organizationId: string,
    narration: string,
    amount: number,
    type: 'debit' | 'credit',
  ): Promise<ServiceResponse<ClassificationResult>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ClassificationResult>(organizationId);
      if (err) return err;
      return apiPostJson<{ narration: string; amount: number; type: 'debit' | 'credit' }, ClassificationResult>(
        `${PAT(organizationId)}/suggest`,
        { narration, amount, type },
      );
    }
    return classificationService.classify(organizationId, narration, amount, type);
  },

  async learnFromCorrection(
    organizationId: string,
    transactionId: string,
    correctCategoryId: string,
  ): Promise<ServiceResponse<{ updated: boolean }>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<{ updated: boolean }>(organizationId);
      if (err) return err;
      return apiPostJson<{ transactionId: string; correctCategoryId: string }, { updated: boolean }>(
        `${PAT(organizationId)}/learn`,
        { transactionId, correctCategoryId },
      );
    }
    return classificationService.learnFromCorrection(organizationId, transactionId, correctCategoryId);
  },
};
