/**
 * AI Classification Service
 * ==========================
 * Wraps the classification engine with service-layer patterns.
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore` + local rules.
 */

import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, simulateDelay } from './dataStore';
import {
  classifyTransaction,
  learnFromFeedback,
  batchClassify,
  ClassificationResult,
  ClassificationRule,
} from '@/lib/classificationEngine';
import type { ServiceResponse } from './types';

const CLS = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/classification`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

let classificationRules: ClassificationRule[] = [];

export type ClassificationStats = {
  totalTransactions: number;
  autoClassified: number;
  userClassified: number;
  pending: number;
  avgConfidence: number;
  accuracyRate: number;
  rulesCount: number;
};

function batchResponseToMap(data: unknown): Map<number, ClassificationResult> {
  const map = new Map<number, ClassificationResult>();
  if (Array.isArray(data)) {
    data.forEach((r, i) => map.set(i, r as ClassificationResult));
    return map;
  }
  if (data && typeof data === 'object' && 'results' in (data as object)) {
    const arr = (data as { results: ClassificationResult[] }).results;
    if (Array.isArray(arr)) {
      arr.forEach((r, i) => map.set(i, r));
      return map;
    }
  }
  return map;
}

export const classificationService = {
  async classify(
    organizationId: string,
    narration: string,
    amount: number,
    type: 'debit' | 'credit',
  ): Promise<ServiceResponse<ClassificationResult>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ClassificationResult>(organizationId);
      if (err) return err;
      return apiPostJson<{ narration: string; amount: number; type: 'debit' | 'credit' }, ClassificationResult>(
        `${CLS(organizationId)}/classify`,
        { narration, amount, type },
      );
    }

    await simulateDelay(200);

    const categories = dataStore.categories.filter(c => c.organizationId === organizationId);
    const previousTxns = dataStore.transactions.filter(t => t.organizationId === organizationId);

    const result = classifyTransaction(narration, amount, type, categories, previousTxns, classificationRules);
    return { success: true, data: result };
  },

  async batchClassify(
    organizationId: string,
    transactions: Array<{ narration: string; amount: number; type: 'debit' | 'credit' }>,
  ): Promise<ServiceResponse<Map<number, ClassificationResult>>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Map<number, ClassificationResult>>(organizationId);
      if (err) return err;
      const res = await apiPostJson<
        { transactions: typeof transactions },
        ClassificationResult[] | { results: ClassificationResult[] }
      >(`${CLS(organizationId)}/batch`, { transactions });
      if (!res.success || res.data == null) {
        return res as ServiceResponse<Map<number, ClassificationResult>>;
      }
      return {
        success: true,
        data: batchResponseToMap(res.data),
      };
    }

    await simulateDelay(500);

    const categories = dataStore.categories.filter(c => c.organizationId === organizationId);
    const previousTxns = dataStore.transactions.filter(t => t.organizationId === organizationId);

    const results = batchClassify(transactions, categories, previousTxns, classificationRules);
    return { success: true, data: results };
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
        `${CLS(organizationId)}/learn`,
        { transactionId, correctCategoryId },
      );
    }

    await simulateDelay(150);

    const txn = dataStore.transactions.find(t => t.id === transactionId);
    if (!txn) return { success: false, data: { updated: false }, error: 'Transaction not found' };

    const categories = dataStore.categories.filter(c => c.organizationId === organizationId);
    const previousCategoryId = txn.categoryId || null;

    const updatedCategories = learnFromFeedback(
      txn.narration,
      correctCategoryId,
      previousCategoryId,
      categories,
    );

    for (const updated of updatedCategories) {
      const idx = dataStore.categories.findIndex(c => c.id === updated.id);
      if (idx !== -1) {
        dataStore.categories[idx] = updated;
      }
    }

    const txnIdx = dataStore.transactions.findIndex(t => t.id === transactionId);
    if (txnIdx !== -1) {
      dataStore.transactions[txnIdx] = {
        ...dataStore.transactions[txnIdx],
        categoryId: correctCategoryId,
        status: 'classified',
        classifiedAt: new Date().toISOString(),
        classifiedBy: 'user',
        confidence: 100,
      };
    }

    const rule: ClassificationRule = {
      id: `rule-${Date.now()}`,
      pattern: txn.narration,
      categoryId: correctCategoryId,
      confidence: 95,
      matchCount: 1,
      createdFrom: 'user',
      lastUsed: new Date().toISOString(),
    };
    classificationRules.push(rule);

    dataStore.notify('categories');
    dataStore.notify('transactions');
    dataStore.notify('classification-rules');

    return { success: true, data: { updated: true }, message: 'Classification updated and learned' };
  },

  async getRules(organizationId?: string): Promise<ServiceResponse<ClassificationRule[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ClassificationRule[]>(organizationId ?? '');
      if (err) return err;
      return apiGet<ClassificationRule[]>(`${CLS(organizationId!)}/rules`);
    }

    await simulateDelay();
    return { success: true, data: [...classificationRules] };
  },

  async addRule(
    rule: Omit<ClassificationRule, 'id'>,
    organizationId?: string,
  ): Promise<ServiceResponse<ClassificationRule>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ClassificationRule>(organizationId ?? '');
      if (err) return err;
      return apiPostJson<Omit<ClassificationRule, 'id'>, ClassificationRule>(
        `${CLS(organizationId!)}/rules`,
        rule,
      );
    }

    await simulateDelay(150);
    const newRule: ClassificationRule = { ...rule, id: `rule-${Date.now()}` };
    classificationRules.push(newRule);
    dataStore.notify('classification-rules');
    return { success: true, data: newRule, message: 'Rule added' };
  },

  async deleteRule(ruleId: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<null>(organizationId ?? '');
      if (err) return err;
      return apiRequest<null>(`${CLS(organizationId!)}/rules/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      });
    }

    await simulateDelay(100);
    classificationRules = classificationRules.filter(r => r.id !== ruleId);
    dataStore.notify('classification-rules');
    return { success: true, data: null, message: 'Rule deleted' };
  },

  async getStats(organizationId: string): Promise<ServiceResponse<ClassificationStats>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ClassificationStats>(organizationId);
      if (err) return err;
      return apiGet<ClassificationStats>(`${CLS(organizationId)}/stats`);
    }

    await simulateDelay();

    const txns = dataStore.transactions.filter(t => t.organizationId === organizationId);
    const autoClassified = txns.filter(t => t.classifiedBy === 'auto').length;
    const userClassified = txns.filter(t => t.classifiedBy && t.classifiedBy !== 'auto').length;
    const pending = txns.filter(t => t.status === 'pending').length;
    const confidences = txns.filter(t => t.confidence !== undefined).map(t => t.confidence!);
    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((s, c) => s + c, 0) / confidences.length)
      : 0;

    return {
      success: true,
      data: {
        totalTransactions: txns.length,
        autoClassified,
        userClassified,
        pending,
        avgConfidence,
        accuracyRate: 94.2,
        rulesCount: classificationRules.length,
      },
    };
  },
};
