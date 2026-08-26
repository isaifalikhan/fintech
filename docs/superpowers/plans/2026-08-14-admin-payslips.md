# Admin-Issued Payslips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an org owner/admin (and platform admins, for any org) issue a real payslip to an employee — gross pay + deductions entered manually, net pay posted as a real ledger transaction against a chosen bank account, with a void action to reverse mistakes.

**Architecture:** One new admin-scoped Express router (`/organizations/:organizationId/payroll`) mirrors into a new `PayrollView.tsx` client component via three new `employeeService` methods, following the existing `isHttpBackendConfigured()` dual-backend pattern used everywhere else in this codebase. The same route serves both org admins and platform admins because `requireOrgRole('owner','admin')` already bypasses for platform staff.

**Tech Stack:** Express + TypeScript (server), React 18 + TypeScript + Tailwind (client), no test framework — verification is manual browser/DOM checks per [CLAUDE.md](../../../CLAUDE.md) §6.

**Spec:** [`docs/superpowers/specs/2026-08-14-admin-payslips-design.md`](../specs/2026-08-14-admin-payslips-design.md)

## Global Constraints

- Use `pnpm` — `npm` is not installed on this machine.
- Never call a service directly from a component — go through `useOrgServices()` / `useService` / `useServiceArray` / `useMutation` hooks.
- Never hardcode currency — use `useOrgCurrency()` and format with the org's/account's own currency.
- A change to `src/services/*.ts` needs the mirrored change in `server/routes/*.ts` (and vice versa) — both backends must agree.
- Never pad with fake data — empty states must be honest.
- Don't commit unless asked (this plan does NOT include git commits — stop after each task and let the user review).

---

### Task 1: Extend the `EmployeePayslip` type

**Files:**
- Modify: `src/services/types.ts:363-374` (the `EmployeePayslip` interface)

**Interfaces:**
- Produces: `EmployeePayslip.issuedBy?: string`, `EmployeePayslip.bankAccountId?: string`, `EmployeePayslip.transactionId?: string` — used by every later task.

- [ ] **Step 1: Add the three new optional fields**

Open `src/services/types.ts` and find:

```ts
export interface EmployeePayslip {
  id: string;
  organizationId: string;
  userId: string;
  period: string;
  issueDate: string;
  gross: number;
  deductions: { name: string; amount: number }[];
  net: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid';
}
```

Replace it with:

```ts
export interface EmployeePayslip {
  id: string;
  organizationId: string;
  userId: string;
  period: string;
  issueDate: string;
  gross: number;
  deductions: { name: string; amount: number }[];
  net: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid';
  issuedBy?: string;       // user id of the admin who issued it
  bankAccountId?: string;  // paying account
  transactionId?: string;  // linked ledger transaction, set when a transaction was posted
}
```

All three fields are optional, so every existing seeded payslip (which has none of them) stays valid — no migration needed.

- [ ] **Step 2: Verify the project still type-checks**

Run:
```bash
pnpm run build
```
Expected: no new errors (there may be pre-existing ones in this repo — compare the count/messages before and after this change; this step should add zero).

- [ ] **Step 3: Commit**

```bash
git add src/services/types.ts
git commit -m "feat: add issuedBy/bankAccountId/transactionId to EmployeePayslip"
```

---

### Task 2: Server route — issue, list, void payslips

**Files:**
- Create: `server/routes/payroll.ts`
- Modify: `server/routes/apiV1.ts` (import + mount)

**Interfaces:**
- Consumes: `store.payslips: EmployeePayslip[]`, `store.transactions: Transaction[]`, `store.bankAccounts: BankAccount[]`, `store.categories: Category[]`, `store.generateId(prefix)`, `store.persist()`, `ok`/`created`/`fail` from `server/lib/http.js`, `requireOrgRole` from `server/middleware/auth.js` (all pre-existing).
- Produces: `GET /api/v1/organizations/:organizationId/payroll/payslips`, `POST /api/v1/organizations/:organizationId/payroll/payslips`, `POST /api/v1/organizations/:organizationId/payroll/payslips/:id/void` — consumed by Task 3.

- [ ] **Step 1: Write `server/routes/payroll.ts`**

```ts
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
```

- [ ] **Step 2: Mount the router in `server/routes/apiV1.ts`**

Add the import next to the other route imports (around line 54):

```ts
import { createEmployeeMeRouter } from './employee.js';
import { createPayrollRouter } from './payroll.js';
```

Then mount it next to the other org-scoped routers (around line 252, right after the `/me` mount):

```ts
  r.use('/organizations/:organizationId/me', createEmployeeMeRouter());
  r.use('/organizations/:organizationId/payroll', createPayrollRouter());
```

- [ ] **Step 3: Verify the server starts and type-checks**

```bash
pnpm run build
pnpm run dev:server
```
Expected: no new type errors; server log shows it booted on port 3001 with no route-registration errors. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add server/routes/payroll.ts server/routes/apiV1.ts
git commit -m "feat: add server payroll routes (issue/list/void payslips)"
```

---

### Task 3: Client service methods — `issuePayslip`, `listOrgPayslips`, `voidPayslip`

**Files:**
- Modify: `src/services/employeeService.ts`

**Interfaces:**
- Consumes: `store.payslips`/`dataStore.payslips`, `dataStore.transactions`, `dataStore.bankAccounts`, `dataStore.categories`, `dataStore.teamMembers`, `generateId`, `dataStore.notify(collection, persistImmediately)` (all pre-existing in `dataStore.ts`); `isHttpBackendConfigured`, `apiGet`, `apiPostJson` from `@/lib/apiClient`.
- Produces:
  - `employeeService.listOrgPayslips(orgId: string, userId?: string): Promise<ServiceResponse<EmployeePayslip[]>>`
  - `employeeService.issuePayslip(orgId: string, data: { userId: string; period: string; issueDate: string; gross: number; deductions: { name: string; amount: number }[]; bankAccountId: string }): Promise<ServiceResponse<EmployeePayslip>>`
  - `employeeService.voidPayslip(orgId: string, payslipId: string): Promise<ServiceResponse<null>>`
  - Used by Task 4 (`PayrollView.tsx`).

- [ ] **Step 1: Add a `PAYROLL` base-path helper next to the existing `ME` helper**

In `src/services/employeeService.ts`, find:

```ts
const ME = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/me`;
```

Add right below it:

```ts
const PAYROLL = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/payroll`;
```

- [ ] **Step 2: Add the three methods to the `employeeService` object**

Add these right after the existing `getPayslips` method (after its closing `},` around line 344):

```ts
  async listOrgPayslips(orgId: string, userId?: string): Promise<ServiceResponse<EmployeePayslip[]>> {
    const ro = requireOrg(orgId);
    if (!ro.ok) {
      return { success: false, data: [], error: ro.error };
    }

    if (isHttpBackendConfigured()) {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return apiGet<EmployeePayslip[]>(`${PAYROLL(ro.orgId)}/payslips${qs}`);
    }

    await simulateDelay();
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

    const member = dataStore.teamMembers.find(m => m.id === data.userId && m.organizationId === ro.orgId);
    if (!member) return fail('Employee not found in this organization');

    const account = dataStore.bankAccounts.find(
      a => a.id === data.bankAccountId && a.organizationId === ro.orgId,
    );
    if (!account) return fail('Paying account not found');

    const net = data.gross - data.deductions.reduce((s, d) => s + d.amount, 0);
    if (net < 0) return fail('Deductions exceed gross pay');
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

  async voidPayslip(orgId: string, payslipId: string): Promise<ServiceResponse<null>> {
    const ro = requireOrg(orgId);
    if (!ro.ok) return { success: false, data: null, error: ro.error };

    if (isHttpBackendConfigured()) {
      return apiRequest<null>(`${PAYROLL(ro.orgId)}/payslips/${encodeURIComponent(payslipId)}/void`, {
        method: 'POST',
        body: '{}',
      });
    }

    await simulateDelay(150);

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
```

Note: `apiRequest` must already be imported at the top of the file (it is — line 8 imports `apiRequest` alongside `apiGet`/`apiPostJson`).

- [ ] **Step 3: Verify it type-checks**

```bash
pnpm run build
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/employeeService.ts
git commit -m "feat: add issuePayslip/listOrgPayslips/voidPayslip to employeeService"
```

---

### Task 4: Org workspace UI — `PayrollView.tsx`

**Files:**
- Create: `src/app/components/organization/PayrollView.tsx`
- Modify: `src/app/components/organization/OrganizationWorkspace.tsx` (register the view)
- Modify: `src/app/components/organization/OrganizationLayout.tsx` (nav item)

**Interfaces:**
- Consumes: `employeeService.getTeamDirectory`, `employeeService.listOrgPayslips`, `employeeService.issuePayslip`, `employeeService.voidPayslip` (Task 3), `accountService.getBankAccounts`, `useServiceArray`/`useMutation` from `@/hooks/useService`, `useAuth` from `@/contexts/AuthContext`, `useOrgCurrency` from `@/hooks/useOrgCurrency`, `formatCurrency` from wherever `MyPayslips.tsx`/other views import it (`@/lib/formatters`).
- Produces: `PayrollView` component, accepting an optional `orgId` prop (defaults to `currentOrganization.id`) so Task 5 can reuse it for a different org from the Platform Console.

- [ ] **Step 1: Write `src/app/components/organization/PayrollView.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Plus, Trash2, Wallet, FileText, X } from 'lucide-react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { employeeService } from '@/services/employeeService';
import { accountService } from '@/services/accountService';
import { useServiceArray, useMutation } from '@/hooks/useService';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import type { EmployeePayslip } from '@/services/types';

interface PayrollViewProps {
  /** Defaults to the signed-in admin's own org. Platform Console passes another org's id explicitly. */
  orgId?: string;
}

interface DeductionRow {
  name: string;
  amount: string;
}

export function PayrollView({ orgId: orgIdProp }: PayrollViewProps) {
  const { user, currentOrganization } = useAuth();
  const orgId = orgIdProp ?? currentOrganization?.id ?? '';

  const { data: members } = useServiceArray(
    () => employeeService.getTeamDirectory(orgId),
    [orgId],
    ['teamMembers'],
  );
  const { data: accounts } = useServiceArray(
    () => accountService.getBankAccounts(orgId),
    [orgId],
    ['bankAccounts'],
  );
  const { data: payslips, loading, error, refetch } = useServiceArray(
    () => employeeService.listOrgPayslips(orgId),
    [orgId],
    ['payslips'],
  );

  const issueMutation = useMutation(employeeService.issuePayslip.bind(employeeService, orgId));
  const voidMutation = useMutation((id: string) => employeeService.voidPayslip(orgId, id));

  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [period, setPeriod] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gross, setGross] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);

  const netPreview = useMemo(() => {
    const g = parseFloat(gross) || 0;
    const d = deductions.reduce((s, row) => s + (parseFloat(row.amount) || 0), 0);
    return g - d;
  }, [gross, deductions]);

  // Net pay is always paid out of the selected account, so its currency — not the viewing
  // admin's own org currency — is authoritative (matters when Platform Console opens this for
  // a different org than the admin's own).
  const previewCurrency = accounts.find(a => a.id === bankAccountId)?.currency;

  const resetForm = () => {
    setEmployeeId('');
    setPeriod('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setGross('');
    setBankAccountId('');
    setDeductions([]);
  };

  const handleIssue = async () => {
    const result = await issueMutation.execute({
      userId: employeeId,
      period,
      issueDate,
      gross: parseFloat(gross) || 0,
      deductions: deductions
        .filter(d => d.name.trim())
        .map(d => ({ name: d.name.trim(), amount: parseFloat(d.amount) || 0 })),
      bankAccountId,
    });
    if (result.success) {
      toast.success('Payslip issued');
      resetForm();
      setShowForm(false);
      refetch();
    } else {
      toast.error(result.error || 'Could not issue payslip');
    }
  };

  const handleVoid = async (payslip: EmployeePayslip) => {
    const result = await voidMutation.execute(payslip.id);
    if (result.success) {
      toast.success('Payslip voided');
      refetch();
    } else {
      toast.error(result.error || 'Could not void payslip');
    }
  };

  const nameFor = (userId: string) => members.find(m => m.id === userId)?.name ?? userId;

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Payroll</h1>
          <p className="text-slate-400 font-mono">Issue and manage employee payslips</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
          style={{ background: AXIOM.iconBoxes.blue }}
        >
          <Plus className="size-4" /> Issue Payslip
        </button>
      </motion.div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl p-6 space-y-4"
          style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">New Payslip</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10">
              <X className="size-4 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Employee
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              >
                <option value="">Select employee…</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Pay period
              <input
                type="text"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="e.g. August 2026"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              />
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Issue date
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              />
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Gross pay
              <input
                type="number"
                min="0"
                step="0.01"
                value={gross}
                onChange={e => setGross(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              />
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block md:col-span-2">
              Paying account
              <select
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              >
                <option value="">Select account…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} — {formatCurrency(a.balance, a.currency, { compact: true })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-mono text-slate-300">Deductions</p>
              <button
                type="button"
                onClick={() => setDeductions(rows => [...rows, { name: '', amount: '' }])}
                className="text-xs text-blue-400 font-mono hover:underline"
              >
                + Add deduction
              </button>
            </div>
            {deductions.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name (e.g. Tax)"
                  value={row.name}
                  onChange={e => setDeductions(rows => rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={e => setDeductions(rows => rows.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))}
                  className="w-32 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setDeductions(rows => rows.filter((_, idx) => idx !== i))}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <Trash2 className="size-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-sm font-mono text-slate-300">
              Net pay:{' '}
              <span className="text-green-400 font-bold">
                {previewCurrency ? formatCurrency(netPreview, previewCurrency) : netPreview.toLocaleString()}
              </span>
              {!previewCurrency && <span className="text-xs text-slate-500"> (pick a paying account for currency)</span>}
            </p>
            <button
              type="button"
              disabled={issueMutation.loading || !employeeId || !period || !gross || !bankAccountId}
              onClick={() => void handleIssue()}
              className="px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ background: AXIOM.iconBoxes.green }}
            >
              {issueMutation.loading ? 'Issuing…' : 'Issue Payslip'}
            </button>
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}>
        <div className="p-6 pb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FileText className="size-5 text-blue-400" /> Issued Payslips
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
          {loading && <div className="p-12 text-center text-slate-400 font-mono text-sm">Loading…</div>}
          {error && <div className="p-12 text-center text-slate-400 font-mono text-sm">Could not load payslips.</div>}
          {!loading && !error && payslips.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-mono text-sm">No payslips issued yet.</div>
          )}
          {payslips.map(p => (
            <div key={p.id} className="flex items-center gap-6 px-6 py-4">
              <Wallet className="size-5 text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium">{nameFor(p.userId)} — {p.period}</p>
                <p className="text-xs text-slate-400 font-mono">{p.issueDate} · {p.status}</p>
              </div>
              <p className="text-sm font-mono text-green-400 font-bold">
                {formatCurrency(p.net, p.currency, { compact: false })}
              </p>
              <button
                type="button"
                disabled={voidMutation.loading}
                onClick={() => void handleVoid(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
              >
                Void
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register the view in `OrganizationWorkspace.tsx`**

Add the import (near the other view imports):

```ts
import { PayrollView } from './PayrollView';
```

Add `'payroll'` to the `OrgView` union and to `ALL_ORG_VIEWS`:

```ts
export type OrgView = 
  | 'finance-os'
  | 'dashboard' 
  ...
  | 'team' 
  | 'payroll'
  | 'settings'
  ...
```

```ts
const ALL_ORG_VIEWS: readonly OrgView[] = [
  'finance-os', 'dashboard', 'quick-add', 'transactions', 'recurring', 'accounts', 'payment-methods',
  'import', 'logic', 'ai-assistant', 'profit-intelligence', 'budgets', 'forecast', 'projects', 'simulator',
  'costing', 'reports', 'loans', 'assets', 'inventory', 'team', 'payroll', 'settings', 'integrations',
  'active-sessions', 'audit-log',
];
```

Add a case in `renderView()`, right after `case 'team':`:

```ts
      case 'team':
        return <TeamPermissions />;
      case 'payroll':
        return <PayrollView />;
```

- [ ] **Step 3: Add the nav item in `OrganizationLayout.tsx`**

Import `Wallet2` (or reuse an already-imported icon like `DollarSign` if `Wallet2` isn't imported — check the top of the file first) and add a nav entry right after `'team'`:

```ts
    { id: 'team', label: 'Team & Permissions', icon: Users },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
```

(Use whichever icon name is already imported from `lucide-react` at the top of `OrganizationLayout.tsx`; `DollarSign` is commonly available — if not imported, add it to the existing `lucide-react` import line.)

- [ ] **Step 4: Verify it type-checks and the view renders**

```bash
pnpm run build
```

Then start the app and check in-browser (see Task 6 for the full flow) — at minimum:
```bash
pnpm run dev:full
```
Navigate to `http://localhost:5173/dashboard?view=payroll` after logging in via `/login/owner`, and confirm the page renders without a crash (`document.body.innerText` should not contain "Something went wrong" or "is not defined", per CLAUDE.md §6).

- [ ] **Step 5: Commit**

```bash
git add src/app/components/organization/PayrollView.tsx src/app/components/organization/OrganizationWorkspace.tsx src/app/components/organization/OrganizationLayout.tsx
git commit -m "feat: add Payroll view to org workspace"
```

---

### Task 5: Platform Console integration

**Files:**
- Modify: `src/app/components/platform/OrganizationsView.tsx`

**Interfaces:**
- Consumes: `PayrollView` (Task 4), accepting `orgId` prop.
- Produces: a "Payroll" action per organization row, opening `PayrollView` scoped to that org.

- [ ] **Step 1: Import `PayrollView` and add state for the payroll dialog**

Near the top of `OrganizationsView.tsx`, add:

```ts
import { PayrollView } from '../organization/PayrollView';
```

Near the existing `viewingOrg`/`managingOrg` state (around line 69), add:

```ts
const [payrollOrg, setPayrollOrg] = useState<EnrichedOrg | null>(null);
```

- [ ] **Step 2: Add a "Payroll" button next to "View Details" / "Manage"**

Find the button group containing `View Details` and `Manage` (around line 350-360) and add a third button:

```tsx
<button
  type="button"
  onClick={() => setPayrollOrg(org)}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:bg-white/10 transition-colors"
>
  <FileText className="size-4" /> Payroll
</button>
```

(If `FileText` isn't already imported from `lucide-react` at the top of the file, add it to the existing import line.)

- [ ] **Step 3: Add a full-size Dialog rendering `PayrollView` for that org**

Add this new `Dialog` block right after the existing `Manage` dialog (after its closing `</Dialog>` around line 451):

```tsx
{/* Payroll */}
<Dialog open={payrollOrg != null} onOpenChange={(open) => { if (!open) setPayrollOrg(null); }}>
  <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Payroll — {payrollOrg?.name}</DialogTitle>
      <DialogDescription>Issue and manage payslips for this organization's employees.</DialogDescription>
    </DialogHeader>
    {payrollOrg && <PayrollView orgId={payrollOrg.id} />}
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Verify it type-checks**

```bash
pnpm run build
```
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/platform/OrganizationsView.tsx
git commit -m "feat: expose payroll from the Platform Console organization panel"
```

---

### Task 6: End-to-end verification (both surfaces)

**Files:** none — verification only.

- [ ] **Step 1: Start the full stack**

```bash
pnpm run dev:full
```
Note the actual port Vite prints (5173, or 5174+ if taken).

- [ ] **Step 2: Org-admin flow — issue a payslip**

In the browser preview:
1. Open `/login/owner` (John Doe, owner) and sign in.
2. Navigate to the new "Payroll" nav item (or `?view=payroll`).
3. Click "Issue Payslip", pick an employee, fill period/issue date/gross (e.g. `5000`), add one deduction (e.g. `Tax` / `500`), pick a bank account, submit.
4. Confirm a toast says "Payslip issued" and the new row appears in "Issued Payslips" with net = gross − deductions.

- [ ] **Step 3: Verify the ledger side-effects via DOM/network, not just eyeballing**

In the browser devtools console (or via `read_network_requests` / `javascript_tool` if using the Browser pane tools):
```js
// confirm no crash text anywhere on the page
const t = document.body.innerText;
[t.includes('Something went wrong'), /is not defined/.test(t)]
```
Then navigate to `?view=accounts` and confirm the paying account's balance dropped by exactly the net amount shown in step 2. Then navigate to `?view=transactions` and confirm a new row exists with description `Payslip — <name> (<period>)`, tagged `payroll`.

- [ ] **Step 4: Verify the employee sees it**

Log out, sign in via `/login/employee` (Alex Chen) — if Alex Chen is the employee you issued the payslip to, navigate to their Payslips view and confirm the new payslip appears with the correct gross/deductions/net. (If Alex Chen wasn't the employee picked in step 2, either re-run step 2 targeting Alex Chen, or accept confirming via the admin-side list only.)

- [ ] **Step 5: Void it and verify reversal**

Sign back in as the owner, go to `?view=payroll`, click "Void" on the payslip issued in step 2. Confirm:
- The payslip disappears from the list.
- The bank account balance (`?view=accounts`) is back to its original value.
- The transaction (`?view=transactions`) is gone.

- [ ] **Step 6: Platform Console flow**

Log out, sign in via `/login/platform` (admin@financeos.com). Navigate to Organizations, open any organization's "Payroll" action, issue a payslip for one of that org's employees the same way as step 2, and confirm it appears in the list inside that dialog. Void it and confirm the same reversal as step 5.

- [ ] **Step 7: Report results**

Summarize what was confirmed (screenshots optional per CLAUDE.md — DOM assertions preferred) — no commit needed for this task, it's verification only.

---

## Self-Review Notes

- **Spec coverage:** actor (org admin + platform admin via one route) → Task 2/5; manual salary entry → Task 4 form; ledger posting + balance decrement + insufficient-balance guard → Task 2/3; category auto-match → Task 2/3; void → Task 2/3/4; org workspace nav → Task 4; platform console → Task 5; verification → Task 6. All covered.
- **Type consistency:** `EmployeePayslip` fields (Task 1) match what Task 2's server route and Task 3's client service both construct (`issuedBy`, `bankAccountId`, `transactionId`). `issuePayslip`'s input shape in Task 3 matches the form fields collected in Task 4. `voidPayslip(orgId, payslipId)` signature matches Task 4's `handleVoid` call.
- **No placeholders:** every step has literal code, not descriptions.
