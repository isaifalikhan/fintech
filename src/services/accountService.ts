/**
 * Account (Chart of Accounts) Service
 * =====================================
 * CRUD for chart of accounts and bank accounts.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes; otherwise `dataStore`.
 */

import { Account, BankAccount } from '@/services/types';
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, generateId, simulateDelay } from './dataStore';
import type { ServiceResponse, BalanceSheetReport } from './types';

const ACC = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/accounts`;

const BANK = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/bank-accounts`;

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export const accountService = {
  async getAll(organizationId: string): Promise<ServiceResponse<Account[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Account[]>(organizationId);
      if (err) return err;
      return apiGet<Account[]>(ACC(organizationId));
    }

    await simulateDelay();
    const accounts = dataStore.accounts.filter(a => a.organizationId === organizationId);
    return { success: true, data: accounts };
  },

  async getById(id: string, organizationId?: string): Promise<ServiceResponse<Account | null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${ACC(organizationId)}/${encodeURIComponent(id)}`
        : `/accounts/${encodeURIComponent(id)}`;
      return apiGet<Account | null>(path);
    }

    await simulateDelay(80);
    const account = dataStore.accounts.find(a => a.id === id) || null;
    return { success: !!account, data: account };
  },

  async create(
    organizationId: string,
    data: Omit<Account, 'id' | 'organizationId' | 'createdAt'>,
  ): Promise<ServiceResponse<Account>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<Account>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<Account, 'id' | 'organizationId' | 'createdAt'>, Account>(
        ACC(organizationId),
        data,
      );
    }

    await simulateDelay(200);
    const newAcc: Account = {
      ...data,
      id: generateId('acc'),
      organizationId,
      createdAt: new Date().toISOString(),
    };
    dataStore.accounts.push(newAcc);
    dataStore.notify('accounts');
    return { success: true, data: newAcc, message: 'Account created' };
  },

  async update(
    id: string,
    updates: Partial<Account>,
    organizationId?: string,
  ): Promise<ServiceResponse<Account>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${ACC(organizationId)}/${encodeURIComponent(id)}`
        : `/accounts/${encodeURIComponent(id)}`;
      return apiRequest<Account>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.accounts.findIndex(a => a.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Account not found' };
    dataStore.accounts[idx] = { ...dataStore.accounts[idx], ...updates };
    dataStore.notify('accounts');
    return { success: true, data: dataStore.accounts[idx] };
  },

  async delete(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${ACC(organizationId)}/${encodeURIComponent(id)}`
        : `/accounts/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.accounts.findIndex(a => a.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Account not found' };
    dataStore.accounts.splice(idx, 1);
    dataStore.notify('accounts');
    return { success: true, data: null, message: 'Account deleted' };
  },

  async getAccountTree(organizationId: string): Promise<ServiceResponse<{
    assets: Account[];
    liabilities: Account[];
    equity: Account[];
    income: Account[];
    expenses: Account[];
  }>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<{
        assets: Account[];
        liabilities: Account[];
        equity: Account[];
        income: Account[];
        expenses: Account[];
      }>(organizationId);
      if (err) return err;
      return apiGet(`${ACC(organizationId)}/tree`);
    }

    await simulateDelay();
    const accounts = dataStore.accounts.filter(a => a.organizationId === organizationId);

    return {
      success: true,
      data: {
        assets: accounts.filter(a => a.type === 'asset'),
        liabilities: accounts.filter(a => a.type === 'liability'),
        equity: accounts.filter(a => a.type === 'equity'),
        income: accounts.filter(a => a.type === 'income'),
        expenses: accounts.filter(a => a.type === 'expense'),
      },
    };
  },

  async getBankAccounts(organizationId: string): Promise<ServiceResponse<BankAccount[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<BankAccount[]>(organizationId);
      if (err) return err;
      return apiGet<BankAccount[]>(BANK(organizationId));
    }

    await simulateDelay();
    const accounts = dataStore.bankAccounts.filter(b => b.organizationId === organizationId);
    return { success: true, data: accounts };
  },

  async createBankAccount(
    organizationId: string,
    data: Omit<BankAccount, 'id' | 'organizationId'>,
  ): Promise<ServiceResponse<BankAccount>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<BankAccount>(organizationId);
      if (err) return err;
      return apiPostJson<Omit<BankAccount, 'id' | 'organizationId'>, BankAccount>(
        BANK(organizationId),
        data,
      );
    }

    await simulateDelay(200);
    const newBank: BankAccount = { ...data, id: generateId('bank'), organizationId };
    dataStore.bankAccounts.push(newBank);
    dataStore.notify('bankAccounts');
    return { success: true, data: newBank, message: 'Bank account added' };
  },

  async updateBankAccount(
    id: string,
    updates: Partial<BankAccount>,
    organizationId?: string,
  ): Promise<ServiceResponse<BankAccount>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${BANK(organizationId)}/${encodeURIComponent(id)}`
        : `/bank-accounts/${encodeURIComponent(id)}`;
      return apiRequest<BankAccount>(path, { method: 'PATCH', body: JSON.stringify(updates) });
    }

    await simulateDelay(150);
    const idx = dataStore.bankAccounts.findIndex(b => b.id === id);
    if (idx === -1) return { success: false, data: null as any, error: 'Bank account not found' };
    dataStore.bankAccounts[idx] = { ...dataStore.bankAccounts[idx], ...updates };
    dataStore.notify('bankAccounts');
    return { success: true, data: dataStore.bankAccounts[idx] };
  },

  async deleteBankAccount(id: string, organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const path = organizationId
        ? `${BANK(organizationId)}/${encodeURIComponent(id)}`
        : `/bank-accounts/${encodeURIComponent(id)}`;
      return apiRequest<null>(path, { method: 'DELETE' });
    }

    await simulateDelay(150);
    const idx = dataStore.bankAccounts.findIndex(b => b.id === id);
    if (idx === -1) return { success: false, data: null, error: 'Bank account not found' };
    dataStore.bankAccounts.splice(idx, 1);
    dataStore.notify('bankAccounts');
    return { success: true, data: null, message: 'Payment method removed' };
  },

  async getBalanceSheet(organizationId: string, asOfDate?: string): Promise<ServiceResponse<BalanceSheetReport>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<BalanceSheetReport>(organizationId);
      if (err) return err;
      const q = new URLSearchParams();
      if (asOfDate) q.set('asOfDate', asOfDate);
      const qs = q.toString();
      return apiGet<BalanceSheetReport>(
        `/organizations/${encodeURIComponent(organizationId)}/reports/balance-sheet${qs ? `?${qs}` : ''}`,
      );
    }

    await simulateDelay(200);

    const accounts = dataStore.accounts.filter(a => a.organizationId === organizationId && a.isActive);
    const assets = accounts.filter(a => a.type === 'asset');
    const liabilities = accounts.filter(a => a.type === 'liability');
    const equity = accounts.filter(a => a.type === 'equity');

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0);

    return {
      success: true,
      data: {
        asOfDate: asOfDate || new Date().toISOString().split('T')[0],
        assets: assets.map(a => ({ accountId: a.id, name: a.name, balance: a.balance, type: a.subtype })),
        liabilities: liabilities.map(a => ({ accountId: a.id, name: a.name, balance: a.balance, type: a.subtype })),
        equity: equity.map(a => ({ accountId: a.id, name: a.name, balance: a.balance, type: a.subtype })),
        totalAssets,
        totalLiabilities,
        totalEquity,
      },
    };
  },
};
