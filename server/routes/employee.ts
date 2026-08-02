/**
 * §18 — Employee workspace `/me/*`. Mounted at `/organizations/:organizationId/me` (mergeParams).
 * Mirrors `employeeService` (dataStore branch) exactly, including validation + dedupe rules.
 */

import { Router, type Request, type Response } from 'express';
import type { EmployeeExpense, TimesheetEntry } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail } from '../lib/http.js';

function mondayOfWeek(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTs(iso?: string, fallback?: string): number {
  const s = iso || fallback || '';
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function expenseDateValid(dateRaw: string): boolean {
  const s = dateRaw?.trim() ?? '';
  if (!s) return false;
  const normalized = s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s;
  const t = Date.parse(normalized);
  return !Number.isNaN(t);
}

type ExpenseCreateInput = Omit<EmployeeExpense, 'id' | 'organizationId' | 'userId'>;

function validateExpenseInput(data: ExpenseCreateInput): { ok: true } | { ok: false; error: string } {
  const description = data.description?.trim() ?? '';
  if (!description) return { ok: false, error: 'Description is required' };
  const amount = data.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be a number greater than 0' };
  }
  const category = data.category?.trim() ?? '';
  if (!category) return { ok: false, error: 'Category is required' };
  const dateStr = data.date?.trim() ?? '';
  if (!dateStr) return { ok: false, error: 'Date is required' };
  if (!expenseDateValid(dateStr)) return { ok: false, error: 'Invalid date' };
  if (data.status !== 'draft' && data.status !== 'submitted') {
    return { ok: false, error: 'New expenses must be saved as draft or submitted' };
  }
  return { ok: true };
}

function expenseCreateFingerprint(
  e: Pick<EmployeeExpense, 'date' | 'amount' | 'category' | 'description' | 'status' | 'currency'>,
): string {
  return [e.date.trim(), String(e.amount), e.category.trim().toLowerCase(), e.description.trim().toLowerCase(), e.status, e.currency.trim().toUpperCase()].join('');
}

function hasDuplicateExpense(
  organizationId: string,
  userId: string,
  candidate: Pick<EmployeeExpense, 'date' | 'amount' | 'category' | 'description' | 'status' | 'currency'>,
): boolean {
  const fp = expenseCreateFingerprint(candidate);
  return store.expenses.some(row =>
    row.organizationId === organizationId && row.userId === userId && expenseCreateFingerprint(row) === fp);
}

export function createEmployeeMeRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/expenses', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const userId = String(req.query.userId ?? '');
    if (!userId) return fail(res, 400, 'userId query required');
    const rows = store.expenses.filter(e => e.organizationId === orgId && e.userId === userId);
    const sorted = [...rows].sort((a, b) => {
      const db = parseTs(b.submittedAt, b.date) - parseTs(a.submittedAt, a.date);
      if (db !== 0) return db;
      return b.id.localeCompare(a.id);
    });
    ok(res, sorted);
  });

  r.post('/expenses', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const body = req.body as ExpenseCreateInput & { userId: string };
    const userId = body.userId;
    if (!userId) return fail(res, 400, 'userId required');

    const check = validateExpenseInput(body);
    if (!check.ok) return fail(res, 400, check.error);

    const currency = (body.currency?.trim() || 'USD').toUpperCase().slice(0, 8);
    const nowIso = new Date().toISOString();
    const submittedAt = body.status === 'submitted' ? (body.submittedAt?.trim() || nowIso) : undefined;
    const notes = body.notes?.trim() || undefined;
    const projectId = body.projectId?.trim() || undefined;
    const receiptUrl = body.receiptUrl?.trim() || undefined;

    const candidate = {
      date: body.date.trim(),
      description: body.description.trim(),
      amount: body.amount,
      currency,
      category: body.category.trim(),
      status: body.status,
    };

    if (hasDuplicateExpense(orgId, userId, candidate)) {
      return fail(res, 409, 'An expense with the same details already exists');
    }

    const exp: EmployeeExpense = {
      id: store.generateId('exp'),
      organizationId: orgId,
      userId,
      ...candidate,
      submittedAt,
      notes,
      projectId,
      receiptUrl,
    };
    store.expenses.unshift(exp);
    store.persist();
    created(res, exp, body.status === 'submitted' ? 'Expense submitted' : 'Expense created');
  });

  r.post('/expenses/:id/submit', (req: Request, res: Response) => {
    const exp = store.expenses.find(e => e.id === req.params.id);
    if (!exp) return fail(res, 404, 'Expense not found');
    if (exp.status === 'submitted') return ok(res, exp, 'Already submitted');
    if (exp.status !== 'draft') return fail(res, 400, 'Only draft expenses can be submitted for review');
    exp.status = 'submitted';
    exp.submittedAt = new Date().toISOString();
    store.persist();
    ok(res, exp, 'Expense submitted for review');
  });

  r.get('/payslips', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const userId = String(req.query.userId ?? '');
    if (!userId) return fail(res, 400, 'userId query required');
    ok(res, store.payslips.filter(p => p.organizationId === orgId && p.userId === userId));
  });

  r.get('/timesheets', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const userId = String(req.query.userId ?? '');
    if (!userId) return fail(res, 400, 'userId query required');
    ok(res, store.timesheets.filter(t => t.organizationId === orgId && t.userId === userId));
  });

  r.post('/timesheets', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const body = req.body as Omit<TimesheetEntry, 'id' | 'organizationId' | 'userId'> & { userId: string };
    if (!body.userId) return fail(res, 400, 'userId required');
    const entry: TimesheetEntry = { ...body, id: store.generateId('ts'), organizationId: orgId, userId: body.userId };
    store.timesheets.unshift(entry);
    store.persist();
    created(res, entry);
  });

  r.post('/timesheets/submit-week', (req: Request, res: Response) => {
    const { ids } = req.body as { ids: string[] };
    let changed = false;
    ids.forEach(id => {
      const entry = store.timesheets.find(t => t.id === id);
      if (entry && entry.status === 'draft') {
        entry.status = 'submitted';
        changed = true;
      }
    });
    if (changed) store.persist();
    ok(res, null, 'Timesheet submitted');
  });

  r.get('/employee-dashboard', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const userId = String(req.query.userId ?? '');
    if (!userId) return fail(res, 400, 'userId query required');

    const expenses = store.expenses.filter(e => e.userId === userId && e.organizationId === orgId);
    const timesheets = store.timesheets.filter(t => t.userId === userId && t.organizationId === orgId);
    const pending = expenses.filter(e => e.status === 'draft' || e.status === 'submitted');

    const mon = mondayOfWeek(new Date());
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyHours = dayLabels.map((day, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const ds = ymd(d);
      const hours = timesheets.filter(t => t.date === ds).reduce((s, t) => s + t.hours, 0);
      return { day, hours };
    });

    const thisWeekStart = ymd(mon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const thisWeekEnd = ymd(sun);
    const thisWeekHours = timesheets.filter(t => t.date >= thisWeekStart && t.date <= thisWeekEnd).reduce((s, t) => s + t.hours, 0);

    const userPayslips = store.payslips.filter(p => p.userId === userId && p.organizationId === orgId);
    const latestPay = [...userPayslips].sort((a, b) => parseTs(b.issueDate) - parseTs(a.issueDate))[0];
    const member = store.teamMembers.find(m => m.id === userId && m.organizationId === orgId);

    const activityRaw: { id: string; type: 'expense' | 'timesheet' | 'project' | 'payslip'; text: string; ts: number; status: string; amount?: number }[] = [];
    expenses.forEach(e => {
      activityRaw.push({
        id: `exp-${e.id}`, type: 'expense', text: e.description,
        ts: parseTs(e.submittedAt, e.date), status: e.status === 'submitted' ? 'pending' : e.status, amount: e.amount,
      });
    });
    timesheets.forEach(t => {
      activityRaw.push({ id: `ts-${t.id}`, type: 'timesheet', text: `Logged ${t.hours}h on ${t.projectName}`, ts: parseTs(undefined, t.date), status: t.status });
    });
    if (latestPay) {
      activityRaw.push({ id: `pay-${latestPay.id}`, type: 'payslip', text: `${latestPay.period} payslip available`, ts: parseTs(undefined, latestPay.issueDate), status: 'info' });
    }
    activityRaw.sort((a, b) => b.ts - a.ts);
    const recentActivity = activityRaw.slice(0, 8).map(a => ({
      id: a.id, type: a.type, text: a.text,
      time: a.ts ? new Date(a.ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '',
      status: a.status, amount: a.amount,
    }));

    const ann = store.announcements
      .filter(a => a.organizationId === orgId)
      .sort((a, b) => parseTs(b.createdAt) - parseTs(a.createdAt))
      .slice(0, 4)
      .map(a => ({
        id: a.id, title: a.title,
        date: new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        urgent: a.isPinned,
      }));

    ok(res, {
      hoursThisWeek: thisWeekHours,
      hoursTarget: 40,
      pendingExpenses: pending.length,
      pendingExpenseAmount: pending.reduce((s, e) => s + e.amount, 0),
      activeProjects: new Set(timesheets.map(t => t.projectId)).size,
      salary: latestPay ? { gross: latestPay.gross, net: latestPay.net, currency: latestPay.currency } : { gross: 0, net: 0, currency: 'USD' },
      weeklyHours,
      recentActivity,
      announcements: ann,
      completedTasks: 0,
      totalTasks: 0,
      department: member?.department ?? 'Team',
      position: member?.role ?? 'Member',
      lastPayPeriod: latestPay?.period ?? '',
    });
  });

  return r;
}
