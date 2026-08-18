# Admin-issued payslips — design

Approved 2026-08-14. Companion: [`../../../CLAUDE.md`](../../../CLAUDE.md), [`../../data-sources.md`](../../data-sources.md) (this closes the "Payroll" gap listed there).

## Problem

Admins cannot issue payslips. `employeeService` only has `getPayslips()` (read-only); all payslip data is seeded. Employees have no way to receive a real payslip from their org.

## Decisions

- **Actor:** org owner/admin (primary, in the org workspace) AND platform_admin/platform_manager (secondary, from the Platform Console, scoped to a chosen org). One route serves both — `requireOrgRole('owner','admin')` already bypasses for platform staff (see `server/middleware/auth.ts`), so no separate platform route is needed.
- **Salary source:** manual entry per payslip (gross + deduction line items). No schema change to `EmployeeTeamMember` — no stored base salary.
- **Ledger effect:** issuing a payslip posts a real `debit` transaction (net pay) against an admin-chosen bank account and decrements that account's balance, same pattern as `importService.commitParsedImport`'s balance update. Currency must match the paying account's currency (no FX in this app). Blocks if it would overdraw the account.
- **Category:** auto-assign if the org has a category matching `payroll`/`salary`/`wages` patterns; otherwise leave uncategorized (don't invent one).
- **Lifecycle:** issue goes straight to `status: 'issued'`. A **void** action reverses the transaction (restores balance) and deletes the payslip, for correcting mistakes. No draft workflow, no recurring/scheduled payroll, no PDF generation (existing `.txt` download in `MyPayslips.tsx` stays as-is).

## Data model changes

`src/services/types.ts` — extend `EmployeePayslip` (all new fields optional, backward-compatible with seeded rows):

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
  issuedBy?: string;       // NEW: admin user id who issued it
  bankAccountId?: string;  // NEW: paying account
  transactionId?: string;  // NEW: linked ledger transaction, for void
}
```

## Server routes

New router, mounted at `/organizations/:organizationId/payroll`, gated `requireOrgMembership` + `requireOrgRole('owner','admin')`:

- `GET /payroll/payslips` — all payslips for the org (optionally `?userId=`)
- `POST /payroll/payslips` — body `{ userId, period, issueDate, gross, deductions: {name,amount}[], bankAccountId }`. Server computes `net = gross - sum(deductions)`, validates, posts the transaction, decrements balance, persists.
- `POST /payroll/payslips/:id/void` — deletes the payslip; if it has a `transactionId`, deletes that transaction and restores the balance.

Mirror the same logic in `server/lib/store.ts` (in-memory store) and in `employeeService.ts`'s `dataStore` branch — both backends must agree per [CLAUDE.md](CLAUDE.md) §4.

## Service layer (`src/services/employeeService.ts`)

Add three methods next to the existing `getPayslips`:

- `issuePayslip(orgId, data): Promise<ServiceResponse<EmployeePayslip>>`
- `listOrgPayslips(orgId, userId?): Promise<ServiceResponse<EmployeePayslip[]>>`
- `voidPayslip(orgId, payslipId): Promise<ServiceResponse<null>>`

Same `isHttpBackendConfigured()` branch shape as every other method in the file. Add `'payslips'` as a tracked `dataStore` collection (it isn't one today) so `useServiceArray`/`useService` subscribers refresh after issue/void.

## UI

- **New org workspace view**, `OrgView = 'payroll'`, nav label "Payroll", owner/admin visible. Component: `src/app/components/organization/PayrollView.tsx`. Shows: employee picker (from `employeeService.getTeamDirectory`), issue-payslip form (period, issue date, gross, deduction rows, paying account from `accountService.getBankAccounts`), and a table of the org's issued payslips with a Void button per row.
- **Platform Console**: in `src/app/components/platform/OrganizationsView.tsx`, add a "Payroll" action in the org detail/manage panel that renders the same `PayrollView` component, passing that org's id explicitly instead of reading it from `useAuth().currentOrganization`.
- `MyPayslips.tsx` (employee-facing) needs no changes — it already reads `getPayslips()`.

## Out of scope (YAGNI)

Recurring/scheduled payroll runs, PDF generation, draft→issued→paid workflow, stored base salary on employees.

## Verification

No test suite. Verify in-browser per task: issue a payslip as the org owner, confirm it appears in the employee's `MyPayslips`, confirm the paying account balance dropped by net pay, confirm a transaction row exists in `TransactionsLedger`, then void it and confirm both reverse. Repeat once from the Platform Console for a different org.
