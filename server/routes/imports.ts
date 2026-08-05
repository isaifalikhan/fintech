/**
 * §16 — Statement import. Mounted at `/organizations/:organizationId/imports` (mergeParams).
 * `preview` accepts multipart (multer); `commit-parsed` is the path the shipped UI
 * (`EnhancedStatementImport.tsx` / SETTLE-001) actually calls.
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import type { Transaction } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, fail } from '../lib/http.js';
import { classifyTransaction, type ClassificationRule } from '../../src/lib/classificationEngine.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } });

interface ImportedRow {
  date: string;
  narration: string;
  amount: number;
  type: 'debit' | 'credit';
  usage?: 'personal' | 'business';
  importCategoryId?: string;
  isDuplicate?: boolean;
}

function classifyLocal(orgId: string, narration: string, amount: number, type: 'debit' | 'credit', rules: ClassificationRule[]) {
  const categories = store.categories.filter(c => c.organizationId === orgId);
  const previousTxns = store.transactions.filter(t => t.organizationId === orgId);
  return classifyTransaction(narration, amount, type, categories, previousTxns, rules);
}

export function createImportsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.post('/preview', upload.single('file'), (req: Request, res: Response) => {
    const fileName = req.file?.originalname ?? 'statement.csv';
    const isCSV = fileName.toLowerCase().endsWith('.csv');
    ok(res, {
      uploadId: store.generateId('upload'),
      fileName,
      totalRows: 247,
      columns: isCSV
        ? [
            { name: 'Date', type: 'date', sampleValues: ['2026-01-13', '2026-01-12', '2026-01-11'] },
            { name: 'Description', type: 'string', sampleValues: ['ACH CREDIT ACME CORP', 'ADOBE CREATIVE CLOUD', 'GOOGLE ADS'] },
            { name: 'Debit', type: 'number', sampleValues: ['', '79.99', '2850.00'] },
            { name: 'Credit', type: 'number', sampleValues: ['15000.00', '', ''] },
            { name: 'Balance', type: 'number', sampleValues: ['85000.00', '84920.01', '82070.01'] },
          ]
        : [
            { name: 'Transaction Date', type: 'date', sampleValues: ['13/01/2026', '12/01/2026'] },
            { name: 'Narration', type: 'string', sampleValues: ['Payment received', 'Monthly subscription'] },
            { name: 'Amount', type: 'number', sampleValues: ['15000.00', '-79.99'] },
          ],
      suggestedMapping: isCSV
        ? { date: 'Date', description: 'Description', amountOut: 'Debit', amountIn: 'Credit', balance: 'Balance' }
        : { date: 'Transaction Date', description: 'Narration', amount: 'Amount' },
      duplicatesDetected: 3,
    });
  });

  r.post('/execute', async (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { bankAccountId, skipDuplicates = true, autoClassify = true, currency = 'USD' } = req.body as {
      bankAccountId: string; skipDuplicates?: boolean; autoClassify?: boolean; currency?: string;
    };

    const mockImportedTxns: Omit<Transaction, 'id' | 'organizationId' | 'createdAt'>[] = [
      { bankAccountId, date: '2026-01-14', description: 'DEPOSIT - NEW CLIENT ONBOARDING', narration: 'Onboarding fee from new client StartupXYZ', amount: 8500, currency, type: 'credit', status: 'pending', tags: ['imported'], attachments: [] },
      { bankAccountId, date: '2026-01-14', description: 'SLACK TECHNOLOGIES', narration: 'Monthly Slack Business+ subscription', amount: -12.50, currency, type: 'debit', status: 'pending', tags: ['imported'], attachments: [] },
      { bankAccountId, date: '2026-01-13', description: 'UBER FOR BUSINESS', narration: 'Team transportation for client meeting', amount: -45.80, currency, type: 'debit', status: 'pending', tags: ['imported'], attachments: [] },
    ];

    let autoClassified = 0;
    let needsReview = 0;
    if (autoClassify) {
      for (const txn of mockImportedTxns) {
        const result = classifyLocal(orgId, txn.narration, txn.amount, txn.type, []);
        if (result.confidence >= 60) {
          txn.categoryId = result.categoryId;
          txn.status = 'classified';
          txn.confidence = result.confidence;
          txn.classifiedBy = 'auto';
          txn.classifiedAt = new Date().toISOString();
          autoClassified++;
        } else {
          needsReview++;
        }
      }
    } else {
      needsReview = mockImportedTxns.length;
    }

    const imported: Transaction[] = [];
    for (const txn of mockImportedTxns) {
      const newTxn: Transaction = { ...txn, id: store.generateId('txn'), organizationId: orgId, createdAt: new Date().toISOString() };
      store.transactions.unshift(newTxn);
      imported.push(newTxn);
    }
    store.persist();

    const totalIncome = imported.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = imported.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);

    ok(res, {
      imported: imported.length,
      skipped: skipDuplicates ? 3 : 0,
      duplicates: 3,
      errors: [],
      summary: { totalIncome, totalExpenses, netAmount: totalIncome - totalExpenses, autoClassified, needsReview },
    }, `${imported.length} transactions imported successfully`);
  });

  r.post('/commit-parsed', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const {
      bankAccountId, currency, fileName, rows, skipDuplicates = true, autoClassify = true,
    } = req.body as {
      bankAccountId: string; currency: string; fileName: string; rows: ImportedRow[];
      skipDuplicates?: boolean; autoClassify?: boolean;
    };

    const safeName = (fileName || '').slice(0, 80) || 'statement.csv';
    const tagFile = `import:${safeName}`;
    const toImport = rows.filter(row => !(skipDuplicates && row.isDuplicate));

    if (toImport.length === 0) {
      return fail(res, 400, 'No rows to import. Try turning off “Hide duplicates” or fix your column mapping.');
    }

    let autoClassified = 0;
    let needsReview = 0;
    const imported: Transaction[] = [];

    for (const row of toImport) {
      const signedAmount = row.type === 'credit' ? row.amount : -row.amount;
      const tags = ['imported', tagFile];
      if (row.usage === 'personal') tags.push('personal');
      if (row.usage === 'business') tags.push('business');

      const base: Omit<Transaction, 'id' | 'organizationId' | 'createdAt'> = {
        bankAccountId,
        date: row.date,
        description: (row.narration || 'Imported').slice(0, 120),
        narration: row.narration || 'Imported',
        amount: signedAmount,
        currency,
        type: row.type,
        status: 'pending',
        tags,
        attachments: [],
      };

      if (row.importCategoryId) {
        base.categoryId = row.importCategoryId;
        base.status = 'classified';
        base.classifiedBy = 'user';
        base.classifiedAt = new Date().toISOString();
        autoClassified++;
      } else if (autoClassify) {
        const result = classifyLocal(orgId, row.narration, row.amount, row.type, []);
        if (result.confidence >= 60) {
          base.categoryId = result.categoryId;
          base.status = 'classified';
          base.confidence = result.confidence;
          base.classifiedBy = 'auto';
          base.classifiedAt = new Date().toISOString();
          autoClassified++;
        } else {
          needsReview++;
        }
      } else {
        needsReview++;
      }

      const newTxn: Transaction = { ...base, id: store.generateId('txn'), organizationId: orgId, createdAt: new Date().toISOString() };
      store.transactions.unshift(newTxn);
      imported.push(newTxn);
    }
    store.persist();

    const totalIncome = imported.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = imported.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const dupCount = rows.filter(row => row.isDuplicate).length;

    ok(res, {
      imported: imported.length,
      skipped: rows.length - toImport.length,
      duplicates: dupCount,
      errors: [],
      summary: { totalIncome, totalExpenses, netAmount: totalIncome - totalExpenses, autoClassified, needsReview },
    }, `${imported.length} transactions imported`);
  });

  r.get('/history', (req: Request, res: Response) => {
    const baseRecords = [
      { id: 'import-001', fileName: 'chase_jan_2026.csv', importedAt: '2026-01-13T08:00:00Z', transactionCount: 45, status: 'completed', bankAccountId: 'bank-001' },
      { id: 'import-002', fileName: 'amex_dec_2025.csv', importedAt: '2026-01-01T10:30:00Z', transactionCount: 32, status: 'completed', bankAccountId: 'bank-002' },
    ];
    const enriched = baseRecords.map(rec => {
      const bankAccount = store.bankAccounts.find(b => b.id === rec.bankAccountId);
      const accountName = bankAccount?.bankName ? `${bankAccount.bankName} (${bankAccount.currency || 'USD'})` : 'Unknown Account';
      const autoPlaced = Math.round(rec.transactionCount * 0.9);
      const needsReview = Math.round(rec.transactionCount * 0.08);
      const duplicatesFound = Math.max(0, rec.transactionCount - autoPlaced - needsReview);
      return {
        id: rec.id, fileName: rec.fileName, importedAt: rec.importedAt, transactionCount: rec.transactionCount,
        status: rec.status, accountName, autoPlaced, needsReview, duplicatesFound,
      };
    });
    ok(res, enriched);
  });

  return r;
}
