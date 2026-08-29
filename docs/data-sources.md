# Data sources: real vs. mock

This prototype shipped a lot of hardcoded business data rendered as if it were real. This file
tracks what is genuinely service-backed and what is still fabricated, so nobody trusts (or
re-reports) a number that was invented.

**Rule:** if no service exists for something, say so — do not add a plausible-looking constant.

Last verified: 2026-08-29.

---

## ✅ Wired to real services

| Area | Source |
|---|---|
| Finance OS KPIs (Total Balance, Cash in Hand, Monthly Profit, Net Worth) | `reports.getDashboardSummary()` + `accounts.getBankAccounts()` |
| Dashboard "Revenue & Profit Analysis" chart | `reports.getCashFlow(12)` |
| "Upcoming — next 30 days" panel | `recurring.getAll()` (next occurrence) + `loans.getAll()` (due dates) |
| Finance OS department chart | `departments.getProfitability()` |
| Transactions / Recurring / Accounts / Budgets / Loans / Assets | their respective services |
| Inventory items, purchases, low-stock alerts | `inventory.getAll` / `create` / `recordTransaction` |
| Statement import (CSV/PDF) end-to-end | `importUtils` + `classification` + `imports.commitParsedImport` |
| Onboarding tour step 4 (Review Categorizations) | parses the CSV you actually pick |
| Team & Permissions members / roles / invites | `organizationService` (+ server-side Supabase admin) |
| Platform Organizations list, View Details, Manage | `organizationService` + `platformService` meta |
| Platform "Attention Required" alerts | derived from `platformService.getStats()` counts |
| Employee expenses, timesheets, projects, announcements, payslips (read) | `employeeService` |
| Employee Settings identity (name, email, department, position) | `useAuth()` + `employeeService.getDashboardSummary()` |
| Employee timesheet project list | `projects.getAll()` |
| Currency labels across ~75 call sites | `useOrgCurrency()` |

---

## ❌ Still fabricated — do not treat as real

### High impact

**`ReportsView.tsx`** — the worst offender. Module-scope mock objects (`profitLossData`,
`balanceSheetData`, `cashFlowData`, `departmentData`, `monthlyTrendData`) drive most of the page.
The **Overview**, **Balance Sheet** and **Cash Flow** tabs make *no service call at all*; totals like
`totalAssets` / `netWorth` / `operatingCashFlow` are arithmetic over invented numbers presented as
financial statements. `accounts.getBalanceSheet()` and `reports.getCashFlow()` exist and are unused.
Also fabricated deltas ("+12.5% from last month").

**`ProfitIntelligenceView.tsx`** — Departments tab is genuinely wired; **Projects / Clients /
Business-vs-Personal / Per-Sq-Ft** tabs render mock arrays with invented clients ("TechCorp Ltd",
"StartupXYZ"). `projects.getProfitability()` exists and is unused for those tabs.

**`CashFlowForecast.tsx`** — `syntheticSeries` is an invented daily model (`baseIncome = 150000`,
day-of-week bumps, deterministic jitter) used as the **primary chart whenever the org has no forecast
rows** — indistinguishable from a real projection. `cashCrunchThreshold = 500000` is a PKR-scaled
constant applied regardless of currency.

**`platformService.getStats()`** — fake at the *service* layer (`mrr: 125000`, hardcoded
`revenueGrowth` series), so the whole Platform dashboard is invented at the source.

### Medium

- **`WhatIfSimulator.tsx`** — `currentTeam`, `avgSalary`, `avgProjectValue`, `utilizationRate`,
  `billableRate` have no service behind them and stay fabricated, mixing into "real" projections.
  Growth constants (2%/month compound) presented as forecast.
- **`CostingPricing.tsx`** — `savedCommissions` invents two business partners ("Dubai Tech Partners",
  "USA Software Co") with exchange rates; overhead settings hardcode `Rs 45,000 / 35,000 / 25,000`.
- **`OrganizationDashboardModern.tsx`** — `departmentData` (12-month sine wave) and
  `expenseCategoryData` (hardcoded donut). `reports.getExpenseBreakdown()` exists and is unused.
  **Monthly Goals** rings (75% / 60%) are literals with no goals feature behind them.
- **AI Assistant** — replies come from `SAMPLE_RESPONSES` keyword matching, not an LLM. Labelled as a
  demo in the UI.
- **`PlatformSettingsView.tsx` / `PlansView.tsx`** — no persistence layer exists; toggles and
  "Save"/"Create Plan"/"Edit Plan" have nowhere to write.
- **Onboarding tour** — steps 1/2/5 are static marketing copy (intentional). Step 4 uses your real CSV
  when you pick one, otherwise clearly-labelled sample rows.

---

## Seed data

`src/data/mockDatabase.ts` seeds identity + org structure. Most collections start **empty on
purpose** — each has a create path in the UI, so empty is a legitimate new-org state.

Two historical exceptions that were *not* legitimate, now fixed:

- `mockCategories` was `[]`, so every transaction was permanently "Uncategorised" and the
  classification-rules dropdown was empty, with **no in-app way to add a category**. Now seeded with 5
  categories + matching chart-of-accounts entries.
- `getCashFlow()` substituted six invented months whenever history was shorter than requested. Removed
  on both client and server — it now returns only real months.

Known gap: the Express `server/lib/store.ts` still starts with zero accounts/categories (arguably an
intentional blank slate for that mode).

---

## Missing features (not bugs)

- **Payroll.** Admins cannot add a salary or issue a payslip. Salary is derived from the latest
  payslip; `employeeService` has only `getPayslips()` — no create/update, and the server exposes only
  `GET /payslips`. All payslip data is seeded. Needs: service + route + admin UI, and a decision on
  whether issuing a payslip posts a ledger transaction.
- **Accounts Receivable / Payable.** No invoicing feature exists. The dashboard now falls back to
  outstanding loan balances by direction, since no AR/AP chart accounts exist.
- **Goals.** Monthly Goals rings have no backing model.
