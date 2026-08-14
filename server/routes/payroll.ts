/**
 * Org-admin payroll: issue/list/void payslips. Mounted at
 * `/organizations/:organizationId/payroll` (mergeParams), gated owner/admin —
 * requireOrgRole already bypasses for platform_admin/platform_manager, so this
 * one router serves both org admins and the Platform Console.
 */

import { Router, type Request, type Response } from 'express';
import type { EmployeePayslip, Transaction } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';
import { requireOrgRole } from '../middleware/auth.js';

const ownerOrAdmin = requireOrgRole('owner', 'admin');

const PAYROLL_PATTERNS = ['payroll', 'salary', 'wages'];

function findPayrollCategoryId(organizationId: string): string | undefined {
  const cat = store.categories.find(
    c =>
      c.organizationId === organizationId &&
      c.patterns.some(p => PAYROLL_PATTERNS.includes(p.toLowerCase())),
  );
  return cat?.id;
}

type IssuePayslipInput = {
  userId: string;
  period: string;
  issueDate: string;
  gross: number;
  deductions: { name: string; amount: number }[];
  bankAccountId: string;
};

function validateIssueInput(body: IssuePayslipInput): { ok: true } | { ok: false; error: string } {
  if (!body.userId?.trim()) return { ok: false, error: 'Employee is required' };
  if (!body.period?.trim()) return { ok: false, error: 'Pay period is required' };
  if (!body.issueDate?.trim()) return { ok: false, error: 'Issue date is required' };
  if (typeof body.gross !== 'number' || !Number.isFinite(body.gross) || body.gross <= 0) {
    return { ok: false, error: 'Gross pay must be a number greater than 0' };
  }
  if (!Array.isArray(body.deductions) || body.deductions.some(d => typeof d.amount !== 'number' || d.amount < 0 || !d.name?.trim())) {
    return { ok: false, error: 'Each deduction needs a name and a non-negative amount' };
  }
  if (!body.bankAccountId?.trim()) return { ok: false, error: 'Paying account is required' };
  return { ok: true };
}

export function createPayrollRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/payslips', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const rows = store.payslips.filter(
      p => p.organizationId === orgId && (!userId || p.userId === userId),
    );
    const sorted = [...rows].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    ok(res, sorted);
  });

  r.post('/payslips', ownerOrAdmin, (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const body = req.body as IssuePayslipInput;

    const check = validateIssueInput(body);
    if (!check.ok) return fail(res, 400, check.error);

    const member = store.teamMembers.find(m => m.id === body.userId && m.organizationId === orgId);
    if (!member) return fail(res, 404, 'Employee not found in this organization');

    const account = store.bankAccounts.find(a => a.id === body.bankAccountId && a.organizationId === orgId);
    if (!account) return notFound(res, 'Paying account');

    const net = body.gross - body.deductions.reduce((s, d) => s + d.amount, 0);
    if (net < 0) return fail(res, 400, 'Deductions exceed gross pay');
    if (account.balance < net) return fail(res, 400, `Insufficient balance in ${account.bankName} to cover net pay`);

    const nowIso = new Date().toISOString();
    const txn: Transaction = {
      id: store.generateId('txn'),
      organizationId: orgId,
      bankAccountId: account.id,
      date: body.issueDate,
      description: `Payslip — ${member.name} (${body.period})`,
      narration: `Payslip — ${member.name} (${body.period})`,
      amount: -net,
      currency: account.currency,
      type: 'debit',
      categoryId: findPayrollCategoryId(orgId),
      status: 'reconciled',
      tags: ['payroll'],
      attachments: [],
      createdAt: nowIso,
    };
    store.transactions.unshift(txn);
    account.balance -= net;

    const payslip: EmployeePayslip = {
      id: store.generateId('pay'),
      organizationId: orgId,
      userId: body.userId,
      period: body.period.trim(),
      issueDate: body.issueDate,
      gross: body.gross,
      deductions: body.deductions,
      net,
      currency: account.currency,
      status: 'issued',
      issuedBy: req.authUser!.id,
      bankAccountId: account.id,
      transactionId: txn.id,
    };
    store.payslips.unshift(payslip);
    store.persist();
    created(res, payslip, 'Payslip issued');
  });

  r.post('/payslips/:id/void', ownerOrAdmin, (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const idx = store.payslips.findIndex(p => p.id === req.params.id && p.organizationId === orgId);
    if (idx === -1) return notFound(res, 'Payslip');

    const payslip = store.payslips[idx];
    if (payslip.transactionId) {
      const txnIdx = store.transactions.findIndex(t => t.id === payslip.transactionId);
      if (txnIdx !== -1) {
        const txn = store.transactions[txnIdx];
        const account = store.bankAccounts.find(a => a.id === txn.bankAccountId);
        if (account) account.balance -= txn.amount; // txn.amount is negative, so this adds it back
        store.transactions.splice(txnIdx, 1);
      }
    }
    store.payslips.splice(idx, 1);
    store.persist();
    ok(res, null, 'Payslip voided');
  });

  return r;
}
