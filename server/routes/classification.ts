/**
 * §14 — Classification & patterns. Mounted at `/organizations/:organizationId/classification`
 * and `/organizations/:organizationId/patterns` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import { store } from '../lib/store.js';
import { ok, created, notFound } from '../lib/http.js';
import {
  classifyTransaction,
  learnFromFeedback,
  batchClassify,
  type ClassificationRule,
} from '../../src/lib/classificationEngine.js';

/** In-memory only — parity with client `classificationService` module-level array (not persisted). */
let classificationRules: ClassificationRule[] = [];

export function createClassificationRouter(): Router {
  const r = Router({ mergeParams: true });

  r.post('/classify', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { narration, amount, type } = req.body as { narration: string; amount: number; type: 'debit' | 'credit' };
    const categories = store.categories.filter(c => c.organizationId === orgId);
    const previousTxns = store.transactions.filter(t => t.organizationId === orgId);
    const result = classifyTransaction(narration, amount, type, categories, previousTxns, classificationRules);
    ok(res, result);
  });

  r.post('/batch', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { transactions } = req.body as {
      transactions: Array<{ narration: string; amount: number; type: 'debit' | 'credit' }>;
    };
    const categories = store.categories.filter(c => c.organizationId === orgId);
    const previousTxns = store.transactions.filter(t => t.organizationId === orgId);
    const results = batchClassify(transactions, categories, previousTxns, classificationRules);
    ok(res, { results: Array.from(results.values()) });
  });

  r.post('/learn', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { transactionId, correctCategoryId } = req.body as { transactionId: string; correctCategoryId: string };
    const txn = store.transactions.find(t => t.id === transactionId);
    if (!txn) return notFound(res, 'Transaction');

    const categories = store.categories.filter(c => c.organizationId === orgId);
    const previousCategoryId = txn.categoryId || null;
    const updatedCategories = learnFromFeedback(txn.narration, correctCategoryId, previousCategoryId, categories);
    for (const updated of updatedCategories) {
      const idx = store.categories.findIndex(c => c.id === updated.id);
      if (idx !== -1) store.categories[idx] = updated;
    }

    const txnIdx = store.transactions.findIndex(t => t.id === transactionId);
    if (txnIdx !== -1) {
      store.transactions[txnIdx] = {
        ...store.transactions[txnIdx],
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
    store.persist();
    ok(res, { updated: true }, 'Classification updated and learned');
  });

  r.get('/rules', (_req: Request, res: Response) => {
    ok(res, [...classificationRules]);
  });

  r.post('/rules', (req: Request, res: Response) => {
    const rule: ClassificationRule = { ...(req.body as Omit<ClassificationRule, 'id'>), id: `rule-${Date.now()}` };
    classificationRules.push(rule);
    created(res, rule, 'Rule added');
  });

  r.patch('/rules/:ruleId', (req: Request, res: Response) => {
    const idx = classificationRules.findIndex(rule => rule.id === req.params.ruleId);
    if (idx === -1) return notFound(res, 'Rule');
    classificationRules[idx] = { ...classificationRules[idx], ...(req.body as Partial<ClassificationRule>) };
    ok(res, classificationRules[idx], 'Rule updated');
  });

  r.delete('/rules/:ruleId', (req: Request, res: Response) => {
    classificationRules = classificationRules.filter(rule => rule.id !== req.params.ruleId);
    ok(res, null, 'Rule deleted');
  });

  r.get('/stats', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const txns = store.transactions.filter(t => t.organizationId === orgId);
    const autoClassified = txns.filter(t => t.classifiedBy === 'auto').length;
    const userClassified = txns.filter(t => t.classifiedBy && t.classifiedBy !== 'auto').length;
    const pending = txns.filter(t => t.status === 'pending').length;
    const confidences = txns.filter(t => t.confidence !== undefined).map(t => t.confidence as number);
    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((s, c) => s + c, 0) / confidences.length)
      : 0;

    ok(res, {
      totalTransactions: txns.length,
      autoClassified,
      userClassified,
      pending,
      avgConfidence,
      accuracyRate: 94.2,
      rulesCount: classificationRules.length,
    });
  });

  return r;
}

/** §14 pattern-engine mirror — `/organizations/:organizationId/patterns/{suggest,learn}`. */
export function createPatternsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.post('/suggest', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { narration, amount, type } = req.body as { narration: string; amount: number; type: 'debit' | 'credit' };
    const categories = store.categories.filter(c => c.organizationId === orgId);
    const previousTxns = store.transactions.filter(t => t.organizationId === orgId);
    const result = classifyTransaction(narration, amount, type, categories, previousTxns, classificationRules);
    ok(res, result);
  });

  r.post('/learn', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { transactionId, correctCategoryId } = req.body as { transactionId: string; correctCategoryId: string };
    const txn = store.transactions.find(t => t.id === transactionId);
    if (!txn) return notFound(res, 'Transaction');

    const categories = store.categories.filter(c => c.organizationId === orgId);
    const previousCategoryId = txn.categoryId || null;
    const updatedCategories = learnFromFeedback(txn.narration, correctCategoryId, previousCategoryId, categories);
    for (const updated of updatedCategories) {
      const idx = store.categories.findIndex(c => c.id === updated.id);
      if (idx !== -1) store.categories[idx] = updated;
    }
    const txnIdx = store.transactions.findIndex(t => t.id === transactionId);
    if (txnIdx !== -1) {
      store.transactions[txnIdx] = {
        ...store.transactions[txnIdx],
        categoryId: correctCategoryId,
        status: 'classified',
        classifiedAt: new Date().toISOString(),
        classifiedBy: 'user',
        confidence: 100,
      };
    }
    classificationRules.push({
      id: `rule-${Date.now()}`,
      pattern: txn.narration,
      categoryId: correctCategoryId,
      confidence: 95,
      matchCount: 1,
      createdFrom: 'user',
      lastUsed: new Date().toISOString(),
    });
    store.persist();
    ok(res, { updated: true }, 'Classification updated and learned');
  });

  return r;
}
