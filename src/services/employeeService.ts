/**
 * Employee Service
 * =================
 * Employee-facing features: expenses, payslips, timesheets, directory, announcements.
 * When `VITE_API_BASE_URL` is set, uses org-scoped `/me/*` REST routes (§18); otherwise `dataStore`.
 */

import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import { dataStore, simulateDelay, generateId } from './dataStore';
import type {
  ServiceResponse,
  EmployeeExpense,
  EmployeePayslip,
  TimesheetEntry,
  EmployeeTeamMember,
  CompanyAnnouncement,
  UserRole,
} from './types';

export type Expense = EmployeeExpense;
export type Payslip = EmployeePayslip;
export type { TimesheetEntry };
export type TeamMember = EmployeeTeamMember;
export type Announcement = CompanyAnnouncement;

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
  return [
    e.date.trim(),
    String(e.amount),
    e.category.trim().toLowerCase(),
    e.description.trim().toLowerCase(),
    e.status,
    e.currency.trim().toUpperCase(),
  ].join('\u0001');
}

function hasDuplicateExpense(
  organizationId: string,
  userId: string,
  candidate: Pick<EmployeeExpense, 'date' | 'amount' | 'category' | 'description' | 'status' | 'currency'>,
): boolean {
  const fp = expenseCreateFingerprint(candidate);
  return dataStore.expenses.some(
    row =>
      row.organizationId === organizationId &&
      row.userId === userId &&
      expenseCreateFingerprint(row) === fp,
  );
}

/** Trims and requires non-empty org + user for employee-scoped calls. */
function requireOrgAndUser(
  orgId: string,
  userId: string,
): { ok: true; orgId: string; userId: string } | { ok: false; error: string } {
  const o = orgId?.trim() ?? '';
  const u = userId?.trim() ?? '';
  if (!o || !u) {
    return { ok: false, error: 'Organization and user are required' };
  }
  return { ok: true, orgId: o, userId: u };
}

/** Trims and requires non-empty org for org-scoped calls. */
function requireOrg(orgId: string): { ok: true; orgId: string } | { ok: false; error: string } {
  const o = orgId?.trim() ?? '';
  if (!o) {
    return { ok: false, error: 'Organization is required' };
  }
  return { ok: true, orgId: o };
}

/**
 * dataStore-mode-only guard for payroll mutations: the HTTP backend already enforces owner/admin
 * server-side (requireOrgRole); dataStore mode has no per-request auth, so callers pass the
 * caller's already-resolved `userRole` (from `useAuth()`, which AuthContext derives correctly for
 * both mock and Supabase sessions — including mapping platform_admin/manager to 'owner'/'admin').
 * A dataStore lookup by `user.id` doesn't work here: in Supabase mode `user.id` is the real Auth
 * UUID, not the mock `user-NNN` id that `dataStore.users`/`organizationMembers` are keyed by.
 */
function isOwnerOrAdminRole(role: UserRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

const ME = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/me`;
const PAYROLL = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/payroll`;

export type EmployeeDashboardSummary = ReturnType<typeof emptyEmployeeDashboardSummary>;

function emptyEmployeeDashboardSummary(): {
  hoursThisWeek: number;
  hoursTarget: number;
  pendingExpenses: number;
  pendingExpenseAmount: number;
  activeProjects: number;
  salary: { gross: number; net: number; currency: string };
  weeklyHours: { day: string; hours: number }[];
  recentActivity: {
    id: string;
    type: 'expense' | 'timesheet' | 'project' | 'payslip';
    text: string;
    time: string;
    status: string;
    amount?: number;
  }[];
  announcements: { id: string; title: string; date: string; urgent: boolean }[];
  completedTasks: number;
  totalTasks: number;
  department: string;
  position: string;
  lastPayPeriod: string;
} {
  return {
    hoursThisWeek: 0,
    hoursTarget: 40,
    pendingExpenses: 0,
    pendingExpenseAmount: 0,
    activeProjects: 0,
    salary: { gross: 0, net: 0, currency: 'USD' },
    weeklyHours: [],
    recentActivity: [],
    announcements: [],
    completedTasks: 0,
    totalTasks: 0,
    department: '',
    position: '',
    lastPayPeriod: '',
  };
}

export const employeeService = {
  async getExpenses(orgId: string, userId: string): Promise<ServiceResponse<EmployeeExpense[]>> {
    if (isHttpBackendConfigured()) {
      const ru = requireOrgAndUser(orgId, userId);
      if (!ru.ok) {
        return { success: false, data: [], error: ru.error };
      }
      return apiGet<EmployeeExpense[]>(`${ME(ru.orgId)}/expenses?userId=${encodeURIComponent(ru.userId)}`);
    }

    await simulateDelay();
    const ru = requireOrgAndUser(orgId, userId);
    if (!ru.ok) {
      return { success: false, data: [], error: ru.error };
    }
    const { orgId: o, userId: u } = ru;
    const rows = dataStore.expenses.filter(e => e.organizationId === o && e.userId === u);
    const sorted = [...rows].sort((a, b) => {
      const db = parseTs(b.submittedAt, b.date) - parseTs(a.submittedAt, a.date);
      if (db !== 0) return db;
      return b.id.localeCompare(a.id);
    });
    return { success: true, data: sorted };
  },

  async createExpense(
    orgId: string,
    userId: string,
    data: ExpenseCreateInput,
  ): Promise<ServiceResponse<EmployeeExpense>> {
    const fail = (error: string) =>
      ({ success: false, data: null as unknown as EmployeeExpense, error } as const);

    const ru = requireOrgAndUser(orgId, userId);
    if (!ru.ok) {
      return fail(ru.error);
    }
    const { orgId: o, userId: u } = ru;

    const check = validateExpenseInput(data);
    if (!check.ok) {
      return fail(check.error);
    }

    if (isHttpBackendConfigured()) {
      const currency = (data.currency?.trim() || 'USD').toUpperCase().slice(0, 8);
      const nowIso = new Date().toISOString();
      const submittedAt =
        data.status === 'submitted' ? (data.submittedAt?.trim() || nowIso) : undefined;
      const body = {
        userId: u,
        description: data.description.trim(),
        amount: data.amount,
        currency,
        category: data.category.trim(),
        date: data.date.trim(),
        status: data.status,
        ...(submittedAt !== undefined ? { submittedAt } : {}),
        ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
        ...(data.projectId?.trim() ? { projectId: data.projectId.trim() } : {}),
        ...(data.receiptUrl?.trim() ? { receiptUrl: data.receiptUrl.trim() } : {}),
      };
      return apiPostJson<typeof body, EmployeeExpense>(`${ME(o)}/expenses`, body);
    }

    await simulateDelay(200);

    const currency = (data.currency?.trim() || 'USD').toUpperCase().slice(0, 8);
    const nowIso = new Date().toISOString();
    const submittedAt =
      data.status === 'submitted' ? (data.submittedAt?.trim() || nowIso) : undefined;

    const notes = data.notes?.trim() || undefined;
    const projectId = data.projectId?.trim() || undefined;
    const receiptUrl = data.receiptUrl?.trim() || undefined;

    const candidate: Pick<
      EmployeeExpense,
      'date' | 'amount' | 'category' | 'description' | 'status' | 'currency'
    > = {
      date: data.date.trim(),
      description: data.description.trim(),
      amount: data.amount,
      currency,
      category: data.category.trim(),
      status: data.status,
    };

    if (hasDuplicateExpense(o, u, candidate)) {
      return fail('An expense with the same details already exists');
    }

    const exp: EmployeeExpense = {
      id: generateId('exp'),
      organizationId: o,
      userId: u,
      date: candidate.date,
      description: candidate.description,
      amount: candidate.amount,
      currency: candidate.currency,
      category: candidate.category,
      status: candidate.status,
      submittedAt,
      notes,
      projectId,
      receiptUrl,
    };

    dataStore.expenses.unshift(exp);
    dataStore.notify('expenses', true);
    return {
      success: true,
      data: exp,
      message: data.status === 'submitted' ? 'Expense submitted' : 'Expense created',
    };
  },

  async submitExpense(id: string, organizationId?: string): Promise<ServiceResponse<EmployeeExpense>> {
    const fail = (error: string) =>
      ({ success: false, data: null as unknown as EmployeeExpense, error } as const);

    const expId = id?.trim() ?? '';
    if (!expId) {
      return fail('Expense id is required');
    }

    if (isHttpBackendConfigured()) {
      const o = organizationId?.trim() ?? '';
      if (!o) return fail('organizationId required');
      return apiRequest<EmployeeExpense>(`${ME(o)}/expenses/${encodeURIComponent(expId)}/submit`, {
        method: 'POST',
        body: '{}',
      });
    }

    await simulateDelay(150);

    const exp = dataStore.expenses.find(e => e.id === expId);
    if (!exp) return fail('Expense not found');

    if (exp.status === 'submitted') {
      return { success: true, data: exp, message: 'Already submitted' };
    }
    if (exp.status !== 'draft') {
      return fail('Only draft expenses can be submitted for review');
    }

    exp.status = 'submitted';
    exp.submittedAt = new Date().toISOString();
    dataStore.notify('expenses', true);
    return { success: true, data: exp, message: 'Expense submitted for review' };
  },

  async getPayslips(orgId: string, userId: string): Promise<ServiceResponse<EmployeePayslip[]>> {
    if (isHttpBackendConfigured()) {
      const ru = requireOrgAndUser(orgId, userId);
      if (!ru.ok) {
        return { success: false, data: [], error: ru.error };
      }
      return apiGet<EmployeePayslip[]>(`${ME(ru.orgId)}/payslips?userId=${encodeURIComponent(ru.userId)}`);
    }

    await simulateDelay();
    const ru = requireOrgAndUser(orgId, userId);
    if (!ru.ok) {
      return { success: false, data: [], error: ru.error };
    }
    const { orgId: o, userId: u } = ru;
    const rows = dataStore.payslips.filter(p => p.organizationId === o && p.userId === u);
    return { success: true, data: rows };
  },

  async listOrgPayslips(
    orgId: string,
    actorRole: UserRole | null | undefined,
    userId?: string,
  ): Promise<ServiceResponse<EmployeePayslip[]>> {
    const ro = requireOrg(orgId);
    if (!ro.ok) {
      return { success: false, data: [], error: ro.error };
    }

    if (isHttpBackendConfigured()) {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return apiGet<EmployeePayslip[]>(`${PAYROLL(ro.orgId)}/payslips${qs}`);
    }

    await simulateDelay();

    if (!isOwnerOrAdminRole(actorRole)) {
      return { success: false, data: [], error: 'Insufficient role' };
    }

    const rows = dataStore.payslips.filter(
      p => p.organizationId === ro.orgId && (!userId || p.userId === userId),
    );
    const sorted = [...rows].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    return { success: true, data: sorted };
  },

  async issuePayslip(
    orgId: string,
    data: {
      userId: string;
      period: string;
      issueDate: string;
      gross: number;
      deductions: { name: string; amount: number }[];
      bankAccountId: string;
    },
    actorRole: UserRole | null | undefined,
  ): Promise<ServiceResponse<EmployeePayslip>> {
    const fail = (error: string) =>
      ({ success: false, data: null as unknown as EmployeePayslip, error } as const);

    const ro = requireOrg(orgId);
    if (!ro.ok) return fail(ro.error);

    if (!data.userId?.trim()) return fail('Employee is required');
    if (!data.period?.trim()) return fail('Pay period is required');
    if (!data.issueDate?.trim()) return fail('Issue date is required');
    if (typeof data.gross !== 'number' || !Number.isFinite(data.gross) || data.gross <= 0) {
      return fail('Gross pay must be a number greater than 0');
    }
    if (data.deductions.some(d => !d.name?.trim() || typeof d.amount !== 'number' || d.amount < 0)) {
      return fail('Each deduction needs a name and a non-negative amount');
    }
    if (!data.bankAccountId?.trim()) return fail('Paying account is required');

    if (isHttpBackendConfigured()) {
      return apiPostJson<typeof data, EmployeePayslip>(`${PAYROLL(ro.orgId)}/payslips`, data);
    }

    await simulateDelay(200);

    if (!isOwnerOrAdminRole(actorRole)) return fail('Insufficient role');

    const member = dataStore.teamMembers.find(m => m.id === data.userId && m.organizationId === ro.orgId);
    if (!member) return fail('Employee not found in this organization');

    const account = dataStore.bankAccounts.find(
      a => a.id === data.bankAccountId && a.organizationId === ro.orgId,
    );
    if (!account) return fail('Paying account not found');

    const rawNet = data.gross - data.deductions.reduce((s, d) => s + d.amount, 0);
    const net = Math.round(rawNet * 100) / 100;
    if (net <= 0) return fail('Net pay must be greater than 0');
    if (account.balance < net) return fail(`Insufficient balance in ${account.bankName} to cover net pay`);

    const payrollPatterns = ['payroll', 'salary', 'wages'];
    const payrollCategory = dataStore.categories.find(
      c =>
        c.organizationId === ro.orgId &&
        c.patterns.some(p => payrollPatterns.includes(p.toLowerCase())),
    );

    const nowIso = new Date().toISOString();
    const txn = {
      id: generateId('txn'),
      organizationId: ro.orgId,
      bankAccountId: account.id,
      date: data.issueDate,
      description: `Payslip — ${member.name} (${data.period})`,
      narration: `Payslip — ${member.name} (${data.period})`,
      amount: -net,
      currency: account.currency,
      type: 'debit' as const,
      categoryId: payrollCategory?.id,
      status: 'reconciled' as const,
      tags: ['payroll'],
      attachments: [] as string[],
      createdAt: nowIso,
    };
    dataStore.transactions.unshift(txn);
    account.balance -= net;
    dataStore.notify('transactions');
    dataStore.notify('bankAccounts');

    const payslip: EmployeePayslip = {
      id: generateId('pay'),
      organizationId: ro.orgId,
      userId: data.userId,
      period: data.period.trim(),
      issueDate: data.issueDate,
      gross: data.gross,
      deductions: data.deductions,
      net,
      currency: account.currency,
      status: 'issued',
      bankAccountId: account.id,
      transactionId: txn.id,
    };
    dataStore.payslips.unshift(payslip);
    dataStore.notify('payslips', true);

    return { success: true, data: payslip, message: 'Payslip issued' };
  },

  async voidPayslip(
    orgId: string,
    payslipId: string,
    actorRole: UserRole | null | undefined,
  ): Promise<ServiceResponse<null>> {
    const ro = requireOrg(orgId);
    if (!ro.ok) return { success: false, data: null, error: ro.error };

    if (isHttpBackendConfigured()) {
      return apiRequest<null>(`${PAYROLL(ro.orgId)}/payslips/${encodeURIComponent(payslipId)}/void`, {
        method: 'POST',
        body: '{}',
      });
    }

    await simulateDelay(150);

    if (!isOwnerOrAdminRole(actorRole)) {
      return { success: false, data: null, error: 'Insufficient role' };
    }

    const idx = dataStore.payslips.findIndex(p => p.id === payslipId && p.organizationId === ro.orgId);
    if (idx === -1) return { success: false, data: null, error: 'Payslip not found' };

    const payslip = dataStore.payslips[idx];
    if (payslip.transactionId) {
      const txnIdx = dataStore.transactions.findIndex(t => t.id === payslip.transactionId);
      if (txnIdx !== -1) {
        const txn = dataStore.transactions[txnIdx];
        const account = dataStore.bankAccounts.find(a => a.id === txn.bankAccountId);
        if (account) account.balance -= txn.amount;
        dataStore.transactions.splice(txnIdx, 1);
        dataStore.notify('transactions');
        dataStore.notify('bankAccounts');
      }
    }
    dataStore.payslips.splice(idx, 1);
    dataStore.notify('payslips', true);

    return { success: true, data: null, message: 'Payslip voided' };
  },

  async getTimesheets(orgId: string, userId: string): Promise<ServiceResponse<TimesheetEntry[]>> {
    if (isHttpBackendConfigured()) {
      const ru = requireOrgAndUser(orgId, userId);
      if (!ru.ok) {
        return { success: false, data: [], error: ru.error };
      }
      return apiGet<TimesheetEntry[]>(`${ME(ru.orgId)}/timesheets?userId=${encodeURIComponent(ru.userId)}`);
    }

    await simulateDelay();
    const ru = requireOrgAndUser(orgId, userId);
    if (!ru.ok) {
      return { success: false, data: [], error: ru.error };
    }
    const { orgId: o, userId: u } = ru;
    const rows = dataStore.timesheets.filter(t => t.organizationId === o && t.userId === u);
    return { success: true, data: rows };
  },

  async createTimesheetEntry(
    orgId: string,
    userId: string,
    data: Omit<TimesheetEntry, 'id' | 'organizationId' | 'userId'>,
  ): Promise<ServiceResponse<TimesheetEntry>> {
    const ru = requireOrgAndUser(orgId, userId);
    if (!ru.ok) {
      return { success: false, data: null as unknown as TimesheetEntry, error: ru.error };
    }
    const { orgId: o, userId: u } = ru;

    if (isHttpBackendConfigured()) {
      return apiPostJson<Omit<TimesheetEntry, 'id' | 'organizationId' | 'userId'> & { userId: string }, TimesheetEntry>(
        `${ME(o)}/timesheets`,
        { ...data, userId: u },
      );
    }

    await simulateDelay(200);

    const entry: TimesheetEntry = { ...data, id: generateId('ts'), organizationId: o, userId: u };
    dataStore.timesheets.unshift(entry);
    dataStore.notify('timesheets', true);
    return { success: true, data: entry };
  },

  async submitTimesheet(ids: string[], organizationId?: string): Promise<ServiceResponse<null>> {
    if (isHttpBackendConfigured()) {
      const o = organizationId?.trim() ?? '';
      if (!o) {
        return { success: false, data: null, error: 'organizationId required' };
      }
      return apiPostJson<{ ids: string[] }, null>(`${ME(o)}/timesheets/submit-week`, { ids });
    }

    await simulateDelay(200);
    let changed = false;
    ids.forEach(id => {
      const entry = dataStore.timesheets.find(t => t.id === id);
      if (entry && entry.status === 'draft') {
        entry.status = 'submitted';
        changed = true;
      }
    });
    if (changed) {
      dataStore.notify('timesheets', true);
    }
    return { success: true, data: null, message: 'Timesheet submitted' };
  },

  async getTeamDirectory(orgId: string): Promise<ServiceResponse<EmployeeTeamMember[]>> {
    if (isHttpBackendConfigured()) {
      const ro = requireOrg(orgId);
      if (!ro.ok) {
        return { success: false, data: [], error: ro.error };
      }
      return apiGet<EmployeeTeamMember[]>(`/organizations/${encodeURIComponent(ro.orgId)}/team-directory`);
    }

    await simulateDelay();
    const ro = requireOrg(orgId);
    if (!ro.ok) {
      return { success: false, data: [], error: ro.error };
    }
    const rows = dataStore.teamMembers.filter(m => m.organizationId === ro.orgId);
    return { success: true, data: rows };
  },

  async getAnnouncements(orgId: string): Promise<ServiceResponse<CompanyAnnouncement[]>> {
    if (isHttpBackendConfigured()) {
      const ro = requireOrg(orgId);
      if (!ro.ok) {
        return { success: false, data: [], error: ro.error };
      }
      return apiGet<CompanyAnnouncement[]>(`/organizations/${encodeURIComponent(ro.orgId)}/announcements`);
    }

    await simulateDelay();
    const ro = requireOrg(orgId);
    if (!ro.ok) {
      return { success: false, data: [], error: ro.error };
    }
    const rows = dataStore.announcements.filter(a => a.organizationId === ro.orgId);
    return { success: true, data: rows };
  },

  async getDashboardSummary(
    orgId: string,
    userId: string,
  ): Promise<ServiceResponse<EmployeeDashboardSummary>> {
    if (isHttpBackendConfigured()) {
      const ru = requireOrgAndUser(orgId, userId);
      if (!ru.ok) {
        return { success: false, data: emptyEmployeeDashboardSummary(), error: ru.error };
      }
      return apiGet<EmployeeDashboardSummary>(`${ME(ru.orgId)}/employee-dashboard?userId=${encodeURIComponent(ru.userId)}`);
    }

    await simulateDelay();
    const ru = requireOrgAndUser(orgId, userId);
    if (!ru.ok) {
      return { success: false, data: emptyEmployeeDashboardSummary(), error: ru.error };
    }
    const { orgId: o, userId: u } = ru;

    const expenses = dataStore.expenses.filter(e => e.userId === u && e.organizationId === o);
    const timesheets = dataStore.timesheets.filter(t => t.userId === u && t.organizationId === o);
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
    const thisWeekHours = timesheets
      .filter(t => t.date >= thisWeekStart && t.date <= thisWeekEnd)
      .reduce((s, t) => s + t.hours, 0);

    const userPayslips = dataStore.payslips.filter(p => p.userId === u && p.organizationId === o);
    const latestPay = [...userPayslips].sort((a, b) => parseTs(b.issueDate) - parseTs(a.issueDate))[0];
    const member = dataStore.teamMembers.find(m => m.id === u && m.organizationId === o);

    const activityRaw: {
      id: string;
      type: 'expense' | 'timesheet' | 'project' | 'payslip';
      text: string;
      ts: number;
      status: string;
      amount?: number;
    }[] = [];

    expenses.forEach(e => {
      activityRaw.push({
        id: `exp-${e.id}`,
        type: 'expense',
        text: e.description,
        ts: parseTs(e.submittedAt, e.date),
        status: e.status === 'submitted' ? 'pending' : e.status,
        amount: e.amount,
      });
    });
    timesheets.forEach(t => {
      activityRaw.push({
        id: `ts-${t.id}`,
        type: 'timesheet',
        text: `Logged ${t.hours}h on ${t.projectName}`,
        ts: parseTs(undefined, t.date),
        status: t.status,
      });
    });
    if (latestPay) {
      activityRaw.push({
        id: `pay-${latestPay.id}`,
        type: 'payslip',
        text: `${latestPay.period} payslip available`,
        ts: parseTs(undefined, latestPay.issueDate),
        status: 'info',
      });
    }

    activityRaw.sort((a, b) => b.ts - a.ts);
    const recentActivity = activityRaw.slice(0, 8).map(a => ({
      id: a.id,
      type: a.type,
      text: a.text,
      time: a.ts ? new Date(a.ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '',
      status: a.status,
      amount: a.amount,
    }));

    const ann = dataStore.announcements
      .filter(a => a.organizationId === o)
      .sort((a, b) => parseTs(b.createdAt) - parseTs(a.createdAt))
      .slice(0, 4)
      .map(a => ({
        id: a.id,
        title: a.title,
        date: new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        urgent: a.isPinned,
      }));

    return {
      success: true,
      data: {
        hoursThisWeek: thisWeekHours,
        hoursTarget: 40,
        pendingExpenses: pending.length,
        pendingExpenseAmount: pending.reduce((s, e) => s + e.amount, 0),
        activeProjects: new Set(timesheets.map(t => t.projectId)).size,
        salary: latestPay
          ? { gross: latestPay.gross, net: latestPay.net, currency: latestPay.currency }
          : { gross: 0, net: 0, currency: 'USD' },
        weeklyHours,
        recentActivity,
        announcements: ann,
        completedTasks: 0,
        totalTasks: 0,
        department: member?.department ?? 'Team',
        position: member?.role ?? 'Member',
        lastPayPeriod: latestPay?.period ?? '',
      },
    };
  },
};
