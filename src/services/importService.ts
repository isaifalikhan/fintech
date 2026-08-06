/**
 * Statement Import Service
 * =========================
 * Handles multi-currency bank statement imports with format detection,
 * column mapping, duplicate detection, and auto-classification.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { Transaction } from '@/services/types';
import type { ImportedTransaction } from '@/lib/importUtils';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import { classificationService } from './classificationService';
import type { ServiceResponse, ImportPreview, ImportResult, ImportHistoryRecord } from './types';

const IMP = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/imports`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export const importService = {
  /**
   * Parse and preview a bank statement file (multipart upload when HTTP).
   */
  async previewFile(organizationId: string, file: File): Promise<ServiceResponse<ImportPreview>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ImportPreview>(organizationId);
      if (err) return err;
      const form = new FormData();
      form.append('file', file);
      return apiRequest<ImportPreview>(`${IMP(organizationId)}/preview`, {
        method: 'POST',
        body: form,
      });
    }

    await simulateDelay(800);

    const fileName = file.name;
    const isCSV = fileName.endsWith('.csv');

    return {
      success: true,
      data: {
        uploadId: generateId('upload'),
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
      },
    };
  },

  async executeImport(
    organizationId: string,
    uploadId: string,
    bankAccountId: string,
    columnMapping: Record<string, string>,
    options: {
      skipDuplicates?: boolean;
      autoClassify?: boolean;
      currency?: string;
    } = {},
  ): Promise<ServiceResponse<ImportResult>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ImportResult>(organizationId);
      if (err) return err;
      return apiPostJson<
        {
          uploadId: string;
          bankAccountId: string;
          columnMapping: Record<string, string>;
          skipDuplicates?: boolean;
          autoClassify?: boolean;
          currency?: string;
        },
        ImportResult
      >(`${IMP(organizationId)}/execute`, {
        uploadId,
        bankAccountId,
        columnMapping,
        skipDuplicates: options.skipDuplicates,
        autoClassify: options.autoClassify,
        currency: options.currency,
      });
    }

    await simulateDelay(2000);

    const { skipDuplicates = true, autoClassify = true, currency = 'USD' } = options;

    const mockImportedTxns: Omit<Transaction, 'id' | 'organizationId' | 'createdAt'>[] = [
      {
        bankAccountId,
        date: '2026-01-14',
        description: 'DEPOSIT - NEW CLIENT ONBOARDING',
        narration: 'Onboarding fee from new client StartupXYZ',
        amount: 8500,
        currency,
        type: 'credit',
        status: 'pending',
        tags: ['imported'],
        attachments: [],
      },
      {
        bankAccountId,
        date: '2026-01-14',
        description: 'SLACK TECHNOLOGIES',
        narration: 'Monthly Slack Business+ subscription',
        amount: -12.50,
        currency,
        type: 'debit',
        status: 'pending',
        tags: ['imported'],
        attachments: [],
      },
      {
        bankAccountId,
        date: '2026-01-13',
        description: 'UBER FOR BUSINESS',
        narration: 'Team transportation for client meeting',
        amount: -45.80,
        currency,
        type: 'debit',
        status: 'pending',
        tags: ['imported'],
        attachments: [],
      },
    ];

    let autoClassified = 0;
    let needsReview = 0;

    if (autoClassify) {
      for (const txn of mockImportedTxns) {
        const classResult = await classificationService.classify(
          organizationId,
          txn.narration,
          txn.amount,
          txn.type,
        );
        if (classResult.success && classResult.data.confidence >= 60) {
          txn.categoryId = classResult.data.categoryId;
          txn.status = 'classified';
          txn.confidence = classResult.data.confidence;
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
      const newTxn: Transaction = {
        ...txn,
        id: generateId('txn'),
        organizationId,
        createdAt: new Date().toISOString(),
      };
      dataStore.transactions.unshift(newTxn);
      imported.push(newTxn);
    }

    dataStore.notify('transactions');

    const totalIncome = imported.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = imported.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);

    return {
      success: true,
      data: {
        imported: imported.length,
        skipped: skipDuplicates ? 3 : 0,
        duplicates: 3,
        errors: [],
        summary: {
          totalIncome,
          totalExpenses,
          netAmount: totalIncome - totalExpenses,
          autoClassified,
          needsReview,
        },
      },
      message: `${imported.length} transactions imported successfully`,
    };
  },

  /**
   * Commit rows parsed client-side (CSV mapping/review) into the ledger.
   * HTTP: `POST .../imports/commit-parsed` (not in §16 table; aligns SETTLE-001 with a backend).
   */
  async commitParsedImport(
    organizationId: string,
    bankAccountId: string,
    currency: string,
    fileName: string,
    rows: ImportedTransaction[],
    options: { skipDuplicates?: boolean; autoClassify?: boolean } = {},
  ): Promise<ServiceResponse<ImportResult>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ImportResult>(organizationId);
      if (err) return err;
      return apiPostJson<
        {
          bankAccountId: string;
          currency: string;
          fileName: string;
          rows: ImportedTransaction[];
          skipDuplicates?: boolean;
          autoClassify?: boolean;
        },
        ImportResult
      >(`${IMP(organizationId)}/commit-parsed`, {
        bankAccountId,
        currency,
        fileName,
        rows,
        skipDuplicates: options.skipDuplicates,
        autoClassify: options.autoClassify,
      });
    }

    await simulateDelay(200);

    const { skipDuplicates = true, autoClassify = true } = options;
    const safeName = fileName.slice(0, 80) || 'statement.csv';
    const tagFile = `import:${safeName}`;

    const toImport = rows.filter(r => !(skipDuplicates && r.isDuplicate));

    if (toImport.length === 0) {
      return {
        success: false,
        data: {
          imported: 0,
          skipped: rows.length,
          duplicates: rows.filter(r => r.isDuplicate).length,
          errors: [],
          summary: {
            totalIncome: 0,
            totalExpenses: 0,
            netAmount: 0,
            autoClassified: 0,
            needsReview: 0,
          },
        },
        error: 'No rows to import. Try turning off “Hide duplicates” or fix your column mapping.',
      };
    }

    let autoClassified = 0;
    let needsReview = 0;
    const imported: Transaction[] = [];

    for (const row of toImport) {
      const signedAmount = row.type === 'credit' ? row.amount : -row.amount;
      const tags = ['imported', tagFile] as string[];
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
        const classResult = await classificationService.classify(
          organizationId,
          row.narration,
          row.amount,
          row.type,
        );
        if (classResult.success && classResult.data.confidence >= 60) {
          base.categoryId = classResult.data.categoryId;
          base.status = 'classified';
          base.confidence = classResult.data.confidence;
          base.classifiedBy = 'auto';
          base.classifiedAt = new Date().toISOString();
          autoClassified++;
        } else {
          needsReview++;
        }
      } else {
        needsReview++;
      }

      const newTxn: Transaction = {
        ...base,
        id: generateId('txn'),
        organizationId,
        createdAt: new Date().toISOString(),
      };
      dataStore.transactions.unshift(newTxn);
      imported.push(newTxn);
    }

    dataStore.notify('transactions');

    // "Update balance from a statement" (AccountsWallets.tsx) sends users here specifically to
    // reconcile the account balance — importing must actually move it, in the account's own
    // currency, or that promise is broken. Cross-currency imports (override at mapping step)
    // are left alone since there's no FX conversion in this app.
    const bankAccount = dataStore.bankAccounts.find(a => a.id === bankAccountId);
    if (bankAccount && bankAccount.currency === currency) {
      const netDelta = imported.reduce((s, t) => s + t.amount, 0);
      bankAccount.balance += netDelta;
      dataStore.notify('bankAccounts');
    }

    const totalIncome = imported.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = imported
      .filter(t => t.type === 'debit')
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const dupCount = rows.filter(r => r.isDuplicate).length;

    return {
      success: true,
      data: {
        imported: imported.length,
        skipped: rows.length - toImport.length,
        duplicates: dupCount,
        errors: [],
        summary: {
          totalIncome,
          totalExpenses,
          netAmount: totalIncome - totalExpenses,
          autoClassified,
          needsReview,
        },
      },
      message: `${imported.length} transactions imported`,
    };
  },

  async getHistory(organizationId: string): Promise<ServiceResponse<ImportHistoryRecord[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ImportHistoryRecord[]>(organizationId);
      if (err) return err;
      return apiGet<ImportHistoryRecord[]>(`${IMP(organizationId)}/history`);
    }

    await simulateDelay();

    const baseRecords: { id: string; fileName: string; importedAt: string; transactionCount: number; status: string; bankAccountId: string }[] = [
      { id: 'import-001', fileName: 'chase_jan_2026.csv', importedAt: '2026-01-13T08:00:00Z', transactionCount: 45, status: 'completed', bankAccountId: 'bank-001' },
      { id: 'import-002', fileName: 'amex_dec_2025.csv', importedAt: '2026-01-01T10:30:00Z', transactionCount: 32, status: 'completed', bankAccountId: 'bank-002' },
    ];

    const enriched: ImportHistoryRecord[] = baseRecords.map(rec => {
      const bankAccount = dataStore.bankAccounts.find(b => b.id === rec.bankAccountId);
      const accountName = bankAccount?.bankName
        ? `${bankAccount.bankName} (${bankAccount.currency || 'USD'})`
        : 'Unknown Account';

      const autoPlaced = Math.round(rec.transactionCount * 0.9);
      const needsReview = Math.round(rec.transactionCount * 0.08);
      const duplicatesFound = Math.max(0, rec.transactionCount - autoPlaced - needsReview);

      return {
        id: rec.id,
        fileName: rec.fileName,
        importedAt: rec.importedAt,
        transactionCount: rec.transactionCount,
        status: rec.status,
        accountName,
        autoPlaced,
        needsReview,
        duplicatesFound,
      };
    });

    return { success: true, data: enriched };
  },
};
