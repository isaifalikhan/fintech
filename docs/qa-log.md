# QA & fix log

Bugs found and fixed during the QA passes, with root causes. Kept because several were
non-obvious and are easy to reintroduce. Newest first.

Related: [`gotchas.md`](gotchas.md) · [`data-sources.md`](data-sources.md) ·
`memory/failure_library.md` (earlier, pre-Supabase audit).

---

## Data wiring

**"Monthly Profit" was actually lifetime cumulative profit.** `getDashboardSummary()`'s `netProfit`
summed every transaction the org had ever recorded, with no date filtering, and the "Monthly Profit"
KPI card displayed it directly. Added real `monthlyRevenue`/`monthlyExpenses`/`monthlyProfit` fields
scoped to the current calendar month; `netProfit`/`totalRevenue`/`totalExpenses` stay as lifetime
totals (other consumers — `WhatIfSimulator.tsx` — already treat them that way). Mirrored in
`server/routes/reports.ts` and applied to both live dashboards (`OrganizationDashboardModern.tsx`,
`organization/OrgDashboard.tsx`).

**KPI trend badges (12.5% / 8.2% / 15.7% / 9.3%) were hardcoded literals on every card, for every
org, regardless of actual performance.** `reportService`'s `revenueChange`/`expenseChange`/
`profitChange` were unused dead fields with fixed values; the dashboards' badges were separate
literal strings in JSX, not even reading those fields. Now `profitChange` is a real month-over-month
% (comparing the new `monthlyProfit` to the prior calendar month), wired to the "Monthly Profit"
card's badge. Total Balance, Cash in Hand and Net Worth are point-in-time balances with no stored
history to diff against, so fabricating a "% change" for them isn't possible without new snapshot
infrastructure — their badges were removed rather than invented (`ModernKPICard`'s `percentage`/
`trend` props are now optional; the badge renders only when both are present). The badge is also
omitted when the prior month has no transactions to compare against, since "% change from zero"
isn't a real number.

**Cash in Hand & Net Worth showed $0 despite $3.6M in the bank.**
`reportService.getDashboardSummary()` summed the **chart of accounts**, whose balances stay 0 unless
journalled, while real money lives on `bankAccounts`. Now derives cash from bank accounts (chart as
fallback). Mirrored in `server/routes/reports.ts`.

**Receivables/Payables always 0.** The summary looked for chart accounts *named*
"receivable"/"payable", which don't exist, so the Loans module was disconnected from the dashboard.
Now falls back to outstanding loan balances by direction.

**"Upcoming next 30 days" was entirely hardcoded** — `Client Payment - ABC Corp`, frozen January
dates, fake Rs 1.8M/1.4M totals. Now derived from active recurring transactions (`nextOccurrence`)
plus open loan due dates, filtered to a true rolling 30-day window.

**Dashboard revenue chart was a sine wave** (`2000000 + Math.sin(i*0.5)*500000`), identical for every
org, with a hardcoded `₨` axis. Now `reports.getCashFlow(12)`.

**`getCashFlow()` fabricated six months** whenever history was shorter than requested — injecting
invented revenue into any correctly-wired caller. Removed on both backends.

**Department chart hardcoded** → `departments.getProfitability()`, plus an empty-array guard for
`Math.max()`.

**Currency hardcoded to `'PKR'` in ~75 places**, so a USD org saw dollars labelled as rupees. Added
`useOrgCurrency()` and replaced every call site across 8 files.

**`EmployeeSettings` showed one person's identity to everyone** — `'+1 555-0105'` / `'Development'`
were literals. Now from `useAuth()` + `employeeService.getDashboardSummary()`.

**`MyTimesheet` logged hours against invented projects** (`Brand Refresh - TechCorp`, …). Now
`projects.getAll()`; also removed two `.find(...)!` assertions that crashed on an empty list.

**`PlatformHome` alerts contradicted its own KPIs** ("5 organizations at churn risk" hardcoded above
real counts). Now derived from `stats`.

**`mockCategories` was `[]`** — every transaction permanently "Uncategorised", classification-rules
dropdown empty, and no in-app way to add a category. Seeded 5 categories + backing chart accounts.

---

## Broken / dead UI

**`TeamDirectory` crashed the whole page** — `loading`/`error` used in JSX but never destructured from
`useService`. `ReferenceError: loading is not defined` for every employee.

**Import wizard dead-ended on 0 parsed rows** — advanced to Review showing `Total 0` with a *success*
toast ("Parsed 0 rows"). Now stays on Column Mapping and explains why.

**Inventory "Add Item" and "New Purchase" had no `onClick`** — pure decoration. Both dialogs built
against existing `inventory.create` / `recordTransaction`. Verified: units 5→15, value $150→$350,
weighted-average costing, transaction row logged.

**Statement import never updated account balances.** "Update balance from a statement" pointed users
at the importer, but `commitParsedImport` only wrote transaction rows. Now moves the balance
(same-currency only; no FX conversion exists).

**Onboarding tour "Choose File" was decorative** — no handler. Now opens a real picker, parses the CSV
with the same pipeline as the real importer, and shows *your* rows in step 4.

**Tour redirected anonymous visitors through login.** The tour mounts globally, outside auth; the fix
assumed a session and navigated to an auth-gated route. Now requires `!isLoading && user`.

**Dead buttons wired** — CommandPalette (10 nav/action items that silently landed on Dashboard),
NotificationCenter actions, AccountsWallets "View transactions", IntegrationsSettings "Manual",
Logic & Learning "Edit rule" (added `updateRule` service + route), TeamPermissions "Settings".

**Platform Console** — "Create Organization" form had uncontrolled inputs and a submit button with no
handler; "View Details"/"Manage" were dead. All wired, with a real save round-trip verified.

**Invite Member was fake** (`toast.success('Invite sent')`). Built a real invite flow plus a
server-side Supabase Admin endpoint (`server/lib/supabaseAdmin.ts`) that creates the auth user and
syncs `organization_members`. Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` server-side and
local-HTTP mode; falls back to a local-only add with an honest message otherwise.

---

## Calculations

- **Loan remaining balance** — `loan.remainingBalance || loan.amount` showed the full original amount
  for fully-paid loans (`0` is falsy). → `??` in 6 places.
- **Net Worth duplicated Total Balance** in two dashboards, ignoring receivables/payables.
- **What-If Simulator** used demo constants instead of real org data in 5 places.
- **Costing margin** — `cost * 1.25` is a 25% *markup*, not margin. → `cost / 0.75`.
- **Burn rate** divided by a hardcoded 6 months → now the actual span of transaction history
  (floored at 1), on both backends.
- **Division-by-zero** guards in budget % and asset-category %.

---

## Rendering / layout

- **React `0`-render bug** in 10 places (see gotchas).
- **Org-switcher dropdown rendered under the page** — app header `z-30` vs `PageHeader` `sticky z-50`.
  Headers raised to `z-[60]` in all three layouts.
- **AI Assistant scrolled the whole page** on every message — `scrollIntoView()` walks all ancestors.
- **`PlatformLayout` / `EmployeeLayout` had no responsive handling** — fixed `h-20`/`px-8`, no wrap, no
  truncation, no mobile nav; title and user panel overlapped at medium widths. Ported the working
  pattern from `OrganizationLayout` (flex-wrap, `min-w-0` + truncate, hamburger + slide-in drawer).
- **Onboarding modal** couldn't scroll on short screens and its 3-button footer didn't wrap.
- **AI chat panel** — missing `flex flex-col` meant `flex-1` never bounded the message list, so it
  could not scroll; fixed `h-[700px]` also pushed the close button off-screen on short windows.

---

## Environment

- **`pdfjs-dist` broke the Vite dep optimizer**, killing the entire app (see gotchas).
- **1GB upload limits** set on `MyExpenses`, multer, and `express.json()` at explicit user request —
  note the architectural risk: receipts are base64-embedded into a JSON blob that syncs whole.
- **Supabase `organizations` had no UPDATE policy** (SELECT only), so org edits silently failed →
  `supabase/fix_org_update_policy.sql`.
- **`.gitignore`** — added `*.zip` after a 112MB file blocked pushes (history purged with
  `git filter-branch`).
