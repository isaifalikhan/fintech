/**
 * §13 — Reports (+ balance-sheet from §5). Mounted at `/organizations/:organizationId/reports`.
 */

import { Router, type Request, type Response } from 'express';
import { store } from '../lib/store.js';
import { ok } from '../lib/http.js';

export function createReportsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/dashboard', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const txns = store.transactions.filter(t => t.organizationId === orgId);
    const accounts = store.accounts.filter(a => a.organizationId === orgId);

    const totalRevenue = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Mirrors src/services/reportService.ts — real cash sits on bank accounts/wallets, not on the
    // chart-of-accounts mirror (whose balances stay 0 unless journalled), and receivables/payables
    // fall back to the Loans module when no AR/AP chart account exists.
    const orgBankAccounts = store.bankAccounts.filter(b => b.organizationId === orgId && b.isActive);
    const cashAccounts = accounts.filter(a => a.subtype === 'bank_account' || a.subtype === 'current_asset');
    const cashOnHand = orgBankAccounts.length > 0
      ? orgBankAccounts.reduce((s, b) => s + (Number(b.balance) || 0), 0)
      : cashAccounts.reduce((s, a) => s + a.balance, 0);
    const arAccount = accounts.find(a => a.name.toLowerCase().includes('receivable'));
    const apAccount = accounts.find(a => a.name.toLowerCase().includes('payable'));
    const openLoans = store.loans.filter(
      l => l.organizationId === orgId && l.status !== 'closed' && l.status !== 'written_off',
    );
    const outstanding = (direction: 'to_receive' | 'to_pay') =>
      openLoans
        .filter(l => l.type === direction)
        .reduce((s, l) => s + Math.abs(Number(l.remainingBalance ?? l.amount) || 0), 0);
    const accountsReceivable = arAccount ? arAccount.balance : outstanding('to_receive');
    const accountsPayable = apAccount ? apAccount.balance : outstanding('to_pay');
    const pendingTransactions = txns.filter(t => t.status === 'pending').length;

    ok(res, {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      cashOnHand,
      accountsReceivable,
      accountsPayable,
      pendingTransactions,
      revenueChange: 12.7,
      expenseChange: 8.3,
      profitChange: 16.7,
    });
  });

  r.get('/profit-loss', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
    const accounts = store.accounts.filter(a => a.organizationId === orgId && a.isActive);
    const incomeAccounts = accounts.filter(a => a.type === 'income');
    const cogsAccounts = accounts.filter(a => a.subtype === 'cogs');
    const opexAccounts = accounts.filter(a => a.type === 'expense' && a.subtype !== 'cogs');

    const totalRevenue = incomeAccounts.reduce((s, a) => s + a.balance, 0);
    const totalCOGS = cogsAccounts.reduce((s, a) => s + a.balance, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const totalOpex = opexAccounts.reduce((s, a) => s + a.balance, 0);
    const operatingIncome = grossProfit - totalOpex;

    ok(res, {
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
    });
  });

  r.get('/cash-flow', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const months = Number(req.query.months ?? 6) || 6;
    const txns = store.transactions.filter(t => t.organizationId === orgId);
    const monthMap = new Map<string, { inflow: number; outflow: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const txn of txns) {
      const date = new Date(txn.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key) || { inflow: 0, outflow: 0 };
      if (txn.type === 'credit') existing.inflow += txn.amount; else existing.outflow += Math.abs(txn.amount);
      monthMap.set(key, existing);
    }

    const result = Array.from(monthMap.entries())
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

    // Mirrors src/services/reportService.ts — only real months, never padded with invented
    // figures when the org has less history than requested.
    ok(res, result);
  });

  r.get('/expense-breakdown', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const txns = store.transactions.filter(t => t.organizationId === orgId && t.type === 'debit');
    const categories = store.categories.filter(c => c.organizationId === orgId);
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

    ok(res, breakdown);
  });

  r.get('/revenue-breakdown', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const txns = store.transactions.filter(t => t.organizationId === orgId && t.type === 'credit');
    const projects = store.projects.filter(p => p.organizationId === orgId);
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

    ok(res, breakdown);
  });

  r.get('/forecast', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const monthsAhead = Number(req.query.monthsAhead ?? 3) || 3;
    const cashForecasts = store.cashFlowForecasts.filter(f => f.organizationId === orgId);
    const accounts = store.accounts.filter(a => a.organizationId === orgId);
    const cashAccounts = accounts.filter(a => a.subtype === 'bank_account' || a.subtype === 'current_asset');
    const currentCash = cashAccounts.reduce((s, a) => s + a.balance, 0);

    const txns = store.transactions.filter(t => t.organizationId === orgId);
    const debitTxns = txns.filter(t => t.type === 'debit');
    const totalDebits = debitTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    // Average over the actual span of transaction history, not a hardcoded 6 months — mirrors the
    // client-side mock calc in src/services/reportService.ts (must stay in sync with it).
    const debitDates = debitTxns.map(t => new Date(t.date).getTime()).filter(t => !Number.isNaN(t));
    const monthsOfHistory = debitDates.length === 0
      ? 1
      : Math.max(1, Math.round((Math.max(...debitDates) - Math.min(...debitDates)) / (1000 * 60 * 60 * 24 * 30.44)));
    const monthlyExpenses = totalDebits / monthsOfHistory;
    const burnRate = Math.round(monthlyExpenses);
    const runway = burnRate > 0 ? Math.round((currentCash / burnRate) * 10) / 10 : Infinity;

    const forecasts = cashForecasts.slice(0, monthsAhead).map(f => ({
      date: f.date, income: f.forecastedIncome, expenses: f.forecastedExpenses, net: f.netCashFlow, confidence: f.confidence,
    }));
    const projectedCash = currentCash + forecasts.reduce((s, f) => s + f.net, 0);

    ok(res, { forecasts, currentCash, projectedCash: Math.round(projectedCash), burnRate, runway });
  });

  r.get('/balance-sheet', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const asOfDate = req.query.asOfDate as string | undefined;
    const accounts = store.accounts.filter(a => a.organizationId === orgId && a.isActive);
    const assets = accounts.filter(a => a.type === 'asset');
    const liabilities = accounts.filter(a => a.type === 'liability');
    const equity = accounts.filter(a => a.type === 'equity');

    ok(res, {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      assets: assets.map(a => ({ accountId: a.id, name: a.name, balance: a.balance, type: a.subtype })),
      liabilities: liabilities.map(a => ({ accountId: a.id, name: a.name, balance: a.balance, type: a.subtype })),
      equity: equity.map(a => ({ accountId: a.id, name: a.name, balance: a.balance, type: a.subtype })),
      totalAssets: assets.reduce((s, a) => s + a.balance, 0),
      totalLiabilities: liabilities.reduce((s, a) => s + a.balance, 0),
      totalEquity: equity.reduce((s, a) => s + a.balance, 0),
    });
  });

  return r;
}
