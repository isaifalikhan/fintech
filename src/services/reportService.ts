/**
 * Financial Reporting Service
 * ============================
 * Generates P&L, balance sheet, cash flow, and agency-specific reports.
 *
 * When `VITE_API_BASE_URL` is set, uses org-scoped REST routes under `/reports`; otherwise `dataStore`.
 */

import { isHttpBackendConfigured, apiGet } from '@/lib/apiClient';
import { dataStore, simulateDelay } from './dataStore';
import type { ServiceResponse, ProfitLossReport, DashboardSummary, CashFlowSummary } from './types';

const REP = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/reports`;

/** Whole months between the earliest and latest of the given ISO dates, floored at 1 so a burn
 *  rate divisor never hits 0 (and never overstates burn for orgs with under a month of history). */
function monthsSpannedByDates(dates: string[]): number {
  const times = dates.map(d => new Date(d).getTime()).filter(t => !Number.isNaN(t));
  if (times.length === 0) return 1;
  const spanMs = Math.max(...times) - Math.min(...times);
  const months = spanMs / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(1, Math.round(months));
}

function requireOrg<T>(organizationId: string): ServiceResponse<T> | null {
  if (!organizationId.trim()) {
    return { success: false, data: null as unknown as T, error: 'organizationId required' };
  }
  return null;
}

export type ExpenseBreakdownRow = {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
  transactionCount: number;
};

export type RevenueBreakdownRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  revenue: number;
  percentage: number;
};

export type ForecastReport = {
  forecasts: { date: string; income: number; expenses: number; net: number; confidence: number }[];
  currentCash: number;
  projectedCash: number;
  burnRate: number;
  runway: number;
};

export const reportService = {
  async getDashboardSummary(organizationId: string): Promise<ServiceResponse<DashboardSummary>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<DashboardSummary>(organizationId);
      if (err) return err;
      return apiGet<DashboardSummary>(`${REP(organizationId)}/dashboard`);
    }

    await simulateDelay(200);

    const allTxns = dataStore.transactions.filter(t => t.organizationId === organizationId);
    const accounts = dataStore.accounts.filter(a => a.organizationId === organizationId);

    // Revenue/expense/profit are simple sums of Transaction.amount — there is no FX-conversion
    // capability anywhere in this app (QuickAdd's "PKR rate" field only decorates the narration
    // string and tags; it's never stored as a structured, reusable rate). Summing every
    // transaction regardless of its own `currency` and labelling the total with the org's default
    // currency silently overstated/understated it whenever a transaction was recorded in a
    // different currency (e.g. a PKR expense making a USD org's "Monthly Profit" read PKR-1000
    // lower while being displayed as if it were USD 1000 lower). Restrict these three totals to
    // transactions in the org's own currency, and report what was excluded so the UI can say so
    // instead of quietly being wrong.
    const org = dataStore.organizations.find(o => o.id === organizationId);
    const revenueExpenseCurrency = org?.currency || 'PKR';
    const txns = allTxns.filter(t => t.currency === revenueExpenseCurrency);
    const otherCurrencyTransactionCount = allTxns.length - txns.length;

    const totalRevenue = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // "Monthly Profit" needs an actual current-month figure — `netProfit` above is a lifetime sum
    // and was being displayed under that label, silently showing cumulative profit as if it were
    // this month's. Trend badges compare the monthly figure to the prior calendar month using the
    // same currency-scoped transactions; they're null (not 0%) when the prior month has nothing to
    // compare against, since a "% change from zero" isn't a real number.
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const currentMonthKey = monthKey(now);
    const previousMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const inMonth = (t: (typeof txns)[number], key: string) => monthKey(new Date(t.date)) === key;

    const currentMonthTxns = txns.filter(t => inMonth(t, currentMonthKey));
    const previousMonthTxns = txns.filter(t => inMonth(t, previousMonthKey));

    const sumCredits = (rows: typeof txns) => rows.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const sumDebits = (rows: typeof txns) => rows.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);

    const monthlyRevenue = sumCredits(currentMonthTxns);
    const monthlyExpenses = sumDebits(currentMonthTxns);
    const monthlyProfit = monthlyRevenue - monthlyExpenses;

    const prevMonthlyRevenue = sumCredits(previousMonthTxns);
    const prevMonthlyExpenses = sumDebits(previousMonthTxns);
    const prevMonthlyProfit = prevMonthlyRevenue - prevMonthlyExpenses;

    const pctChange = (curr: number, prev: number): number | null =>
      prev === 0 ? null : Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;

    const revenueChange = pctChange(monthlyRevenue, prevMonthlyRevenue);
    const expenseChange = pctChange(monthlyExpenses, prevMonthlyExpenses);
    const profitChange = pctChange(monthlyProfit, prevMonthlyProfit);

    // Real cash lives on the bank accounts/wallets the user actually maintains — the chart-of-
    // accounts mirror is not kept in step with them (its balances stay 0 unless journalled), which
    // made "Cash in Hand" and "Net Worth" read 0 while the dashboard's own Total Balance tile
    // showed the true figure. Prefer bank accounts; fall back to the chart only if none exist.
    const bankAccounts = dataStore.bankAccounts.filter(
      b => b.organizationId === organizationId && b.isActive,
    );
    const cashAccounts = accounts.filter(a => a.subtype === 'bank_account' || a.subtype === 'current_asset');
    const cashOnHand = bankAccounts.length > 0
      ? bankAccounts.reduce((s, b) => s + (Number(b.balance) || 0), 0)
      : cashAccounts.reduce((s, a) => s + a.balance, 0);

    // Receivables/payables: use the chart accounts when they exist, otherwise derive from the
    // Loans & Liabilities module, which is where this app actually tracks money owed either way.
    const arAccount = accounts.find(a => a.name.toLowerCase().includes('receivable'));
    const apAccount = accounts.find(a => a.name.toLowerCase().includes('payable'));
    const openLoans = dataStore.loans.filter(
      l => l.organizationId === organizationId && l.status !== 'closed' && l.status !== 'written_off',
    );
    const outstanding = (direction: 'to_receive' | 'to_pay') =>
      openLoans
        .filter(l => l.type === direction)
        .reduce((s, l) => s + Math.abs(Number(l.remainingBalance ?? l.amount) || 0), 0);
    const accountsReceivable = arAccount ? arAccount.balance : outstanding('to_receive');
    const accountsPayable = apAccount ? apAccount.balance : outstanding('to_pay');

    // Pending count is a review queue, not a money sum — keep it over every transaction
    // regardless of currency, unlike the revenue/expense totals above.
    const pendingTransactions = allTxns.filter(t => t.status === 'pending').length;

    return {
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        monthlyRevenue,
        monthlyExpenses,
        monthlyProfit,
        cashOnHand,
        accountsReceivable,
        accountsPayable,
        pendingTransactions,
        revenueChange,
        expenseChange,
        profitChange,
        revenueExpenseCurrency,
        otherCurrencyTransactionCount,
      },
    };
  },

  async getProfitLoss(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ServiceResponse<ProfitLossReport>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ProfitLossReport>(organizationId);
      if (err) return err;
      const q = new URLSearchParams();
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      const qs = q.toString();
      return apiGet<ProfitLossReport>(`${REP(organizationId)}/profit-loss${qs ? `?${qs}` : ''}`);
    }

    await simulateDelay(300);

    const accounts = dataStore.accounts.filter(a => a.organizationId === organizationId && a.isActive);
    const incomeAccounts = accounts.filter(a => a.type === 'income');
    const cogsAccounts = accounts.filter(a => a.subtype === 'cogs');
    const opexAccounts = accounts.filter(a => a.type === 'expense' && a.subtype !== 'cogs');

    const totalRevenue = incomeAccounts.reduce((s, a) => s + a.balance, 0);
    const totalCOGS = cogsAccounts.reduce((s, a) => s + a.balance, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const totalOpex = opexAccounts.reduce((s, a) => s + a.balance, 0);
    const operatingIncome = grossProfit - totalOpex;

    return {
      success: true,
      data: {
        period: `${dateFrom || 'FY Start'} to ${dateTo || 'Current'}`,
        revenue: incomeAccounts.map(a => ({ accountId: a.id, name: a.name, amount: a.balance })),
        cogs: cogsAccounts.map(a => ({ accountId: a.id, name: a.name, amount: a.balance })),
        operatingExpenses: opexAccounts.map(a => ({ accountId: a.id, name: a.name, amount: a.balance })),
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalOperatingExpenses: totalOpex,
        operatingIncome,
        netIncome: operatingIncome,
      },
    };
  },

  async getCashFlow(organizationId: string, months: number = 6): Promise<ServiceResponse<CashFlowSummary[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<CashFlowSummary[]>(organizationId);
      if (err) return err;
      const q = new URLSearchParams();
      q.set('months', String(months));
      return apiGet<CashFlowSummary[]>(`${REP(organizationId)}/cash-flow?${q.toString()}`);
    }

    await simulateDelay(200);

    const txns = dataStore.transactions.filter(t => t.organizationId === organizationId);

    const monthMap = new Map<string, { inflow: number; outflow: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const txn of txns) {
      const date = new Date(txn.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key) || { inflow: 0, outflow: 0 };

      if (txn.type === 'credit') {
        existing.inflow += txn.amount;
      } else {
        existing.outflow += Math.abs(txn.amount);
      }
      monthMap.set(key, existing);
    }

    const result: CashFlowSummary[] = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-months)
      .map(([key, data]) => {
        const monthIdx = parseInt(key.split('-')[1]) - 1;
        return {
          month: monthNames[monthIdx] || key,
          inflow: Math.round(data.inflow),
          outflow: Math.round(data.outflow),
          net: Math.round(data.inflow - data.outflow),
        };
      });

    // Return only the months the org actually has data for. This used to substitute a block of
    // invented figures (Jan–Jun, inflow 125000, …) whenever history was shorter than `months`,
    // which put fabricated revenue on the dashboard chart and cash-flow reports.
    return { success: true, data: result };
  },

  async getExpenseBreakdown(organizationId: string): Promise<ServiceResponse<ExpenseBreakdownRow[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ExpenseBreakdownRow[]>(organizationId);
      if (err) return err;
      return apiGet<ExpenseBreakdownRow[]>(`${REP(organizationId)}/expense-breakdown`);
    }

    await simulateDelay();

    const txns = dataStore.transactions.filter(
      t => t.organizationId === organizationId && t.type === 'debit',
    );
    const categories = dataStore.categories.filter(c => c.organizationId === organizationId);

    const totalExpenses = txns.reduce((s, t) => s + Math.abs(t.amount), 0);

    const breakdown = categories
      .filter(c => c.type === 'expense')
      .map(cat => {
        const catTxns = txns.filter(t => t.categoryId === cat.id);
        const amount = catTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          amount,
          percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0,
          color: cat.color,
          transactionCount: catTxns.length,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { success: true, data: breakdown };
  },

  async getRevenueBreakdown(organizationId: string): Promise<ServiceResponse<RevenueBreakdownRow[]>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<RevenueBreakdownRow[]>(organizationId);
      if (err) return err;
      return apiGet<RevenueBreakdownRow[]>(`${REP(organizationId)}/revenue-breakdown`);
    }

    await simulateDelay();

    const txns = dataStore.transactions.filter(
      t => t.organizationId === organizationId && t.type === 'credit',
    );
    const projects = dataStore.projects.filter(p => p.organizationId === organizationId);
    const totalRevenue = txns.reduce((s, t) => s + t.amount, 0);

    const breakdown = projects.map(proj => {
      const projTxns = txns.filter(t => t.projectId === proj.id);
      const revenue = projTxns.reduce((s, t) => s + t.amount, 0);
      return {
        projectId: proj.id,
        projectName: proj.name,
        clientName: proj.clientName,
        revenue,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return { success: true, data: breakdown };
  },

  async getForecast(organizationId: string, monthsAhead: number = 3): Promise<ServiceResponse<ForecastReport>> {
    if (isHttpBackendConfigured()) {
      const err = requireOrg<ForecastReport>(organizationId);
      if (err) return err;
      const q = new URLSearchParams();
      q.set('monthsAhead', String(monthsAhead));
      return apiGet<ForecastReport>(`${REP(organizationId)}/forecast?${q.toString()}`);
    }

    await simulateDelay(300);

    const cashForecasts = dataStore.cashFlowForecasts.filter(f => f.organizationId === organizationId);
    const accounts = dataStore.accounts.filter(a => a.organizationId === organizationId);
    const cashAccounts = accounts.filter(a => a.subtype === 'bank_account' || a.subtype === 'current_asset');
    const currentCash = cashAccounts.reduce((s, a) => s + a.balance, 0);

    const txns = dataStore.transactions.filter(t => t.organizationId === organizationId);
    const debitTxns = txns.filter(t => t.type === 'debit');
    const totalDebits = debitTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    // Average over the actual span of transaction history, not a hardcoded 6 months — dividing by
    // a fixed window overstates burn rate for orgs with less history and understates it (masking a
    // real cash crunch) for orgs with more.
    const monthsOfHistory = monthsSpannedByDates(debitTxns.map(t => t.date));
    const monthlyExpenses = totalDebits / monthsOfHistory;
    const burnRate = Math.round(monthlyExpenses);
    const runway = burnRate > 0 ? Math.round((currentCash / burnRate) * 10) / 10 : Infinity;

    const forecasts = cashForecasts.slice(0, monthsAhead).map(f => ({
      date: f.date,
      income: f.forecastedIncome,
      expenses: f.forecastedExpenses,
      net: f.netCashFlow,
      confidence: f.confidence,
    }));

    const projectedCash = currentCash + forecasts.reduce((s, f) => s + f.net, 0);

    return {
      success: true,
      data: {
        forecasts,
        currentCash,
        projectedCash: Math.round(projectedCash),
        burnRate,
        runway,
      },
    };
  },
};
