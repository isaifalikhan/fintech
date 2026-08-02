# Project memory — Finance OS

**MARQ module letters (A–G):** Product surfaces by module are in `02_product_map.md`. Task backlog and statuses: `04_tasks.md` (Module A–F, **G** = org phased rollout). **G** details: `architecture/org-phase-plan.md`. **Org phases:** linear “next gap” vs parallel **P16**/**P22** (etc.) are summarized in the **`04_tasks.md` status snapshot** and the **Alignment (Module G ↔ Module B)** note under Module G — keep **FE-02x** and **ORG-P** rows matched per `primary_file`.

### Multi-phase alignment (sync with `04_tasks.md`)

- **Employee track:** Module C + **FEAT-001** — All implementation rows, release sign-off (FEAT1-008), and WS-4 matrix checks are completed and verified **Pass**.
- **Org track:** All 23 phases (`ORG-P01`–`ORG-P23`) and corresponding Module B view smoke tasks are completed and verified.
- **Auth / docs:** Fully completed and verified.
- **Persistence:** **BUG-004** persistence enhancements verified and completed.

## Architecture notes
- Frontend: React + Vite + TypeScript; routing in `src/app/App.tsx`
- Services: `src/services/*` — async methods returning `ServiceResponse<T>`; designed to swap `dataStore` for API later
- **REST rollout (W1–W6):** route inventory, waves, and coverage checklist — [`architecture/api-backend-rollout.md`](architecture/api-backend-rollout.md). **Task IDs** in [`04_tasks.md`](04_tasks.md) **Module H:** `API-000`–`API-019`. **HTTP when `VITE_API_BASE_URL` set:** [`apiClient`](src/lib/apiClient.ts); **`authService`** (API-001); **`platformService`** (API-002); **`organizationService`** (API-003); **`transactionService`** (API-004) `/organizations/:orgId/transactions/*` (`bulkCategorize` / `bulkDelete` take `organizationId` first); **`accountService`** (API-005) `/organizations/:orgId/accounts/*`, `bank-accounts`, `reports/balance-sheet` (optional `organizationId` on single-resource methods for org-scoped URLs); **`categoryService`** (API-006) `/organizations/:orgId/categories/*`, `patterns` POST / `patterns?pattern=` DELETE, `usage-stats`; **`departmentService`** (API-007) `/organizations/:orgId/departments/*`, `profitability`; **`projectService`** (API-008) `/organizations/:orgId/projects/*`, `profitability`, `projects/:projectId/transactions`; **`recurringTransactionService`** (API-009) `/organizations/:orgId/recurring-transactions/*`, `toggle` POST; **`assetService`** (API-010) `/organizations/:orgId/assets/*`, `dispose`, `depreciation-schedule`, `depreciation` POST, `summary`, plus `GET .../assets/depreciation-schedules` for org-wide schedule list; **`inventoryService`** (API-011) `/organizations/:orgId/inventory/items/*`, `inventory/transactions` POST + `GET` (all-org tx list), per-item `transactions`, `low-stock`, `valuation`; **`budgetService`** (API-012) `/organizations/:orgId/budgets/*`, `variance`, `alerts`; **`reportService`** (API-013) `/organizations/:orgId/reports/*` (`dashboard`, `profit-loss` + `dateFrom`/`dateTo`, `cash-flow` + `months`, `expense-breakdown`, `revenue-breakdown`, `forecast` + `monthsAhead`); **`classificationService`** (API-014) `/organizations/:orgId/classification/*` (`classify`, `batch`, `learn`, `rules`, `stats`); **`patternEngineService`** `POST .../patterns/suggest` and `.../patterns/learn` when HTTP, else delegates to `classificationService`; **`notificationService`** (API-015) `/users/:userId/organizations/:orgId/notifications` (+ `unread-count`, `read-all` POST), `/notifications/:id/read` PATCH, `/notifications/:id` DELETE; **`importService`** (API-016) `/organizations/:orgId/imports/preview` (multipart), `execute`, `history`, plus `POST .../imports/commit-parsed` for client-parsed CSV (SETTLE-001); **`auditService`** (API-017) `GET /organizations/:orgId/audit-logs` with optional `severity`, `action`, `search` query params; **`employeeService`** (API-018) `/organizations/:orgId/me/*` (expenses, payslips, timesheets, `employee-dashboard`), `team-directory`, `announcements`; `submitExpense` / `submitTimesheet` take `organizationId` for org-scoped URLs. **`aiSettingsService`** (API-019) `GET` / `PATCH /organizations/:orgId/ai-settings` when HTTP; else `localStorage`; UI uses **`fetchOrgAiSettings`** + async save/clear. **`useOrgServices`** passes `orgId` into `importService.previewFile` and other import helpers; passes `userId` + `orgId` into notification list/count/create/read-all; **`MyExpenses`** / **`MyTimesheet`** pass `orgId` into submit helpers. **`OrgSettings`** passes `orgId` into `departmentService.delete` when removing a department. Otherwise mock/`dataStore`. **URL steps:** [`.env.example`](.env.example).
- Data: `src/services/dataStore.ts` + seeds from `src/data/mockDatabase.ts` (and related patterns in repo)
- **Future local SQL DB:** specialist prompt **`.cursor/agents/database-agent.md`** (SQLite file or Postgres in Docker; schema/migrations/repositories). Not implemented until a backlog task explicitly cuts over from `dataStore`; coordinate with **Architect** for stack choice.
- **Local Express + SQLite (implemented):** `server/index.ts` — **`GET/PUT /api/bundle`** persists the full `dataStore` JSON in **`data/finance-os.db`**. **`/api/v1`** implements **auth + session list/mutate** against that bundle (same rules as in-app `authService` demo mode). Enable with **`VITE_API_BASE_URL=/api/v1`**; for one source of truth add **`VITE_USE_LOCAL_DB=true`** and **`npm run dev:full`**. Broader REST (Module H / `api-backend-rollout.md`) is additive — not all routes exist on this process yet.
- **Persistence (local deploy):** `localStorage` key `finance_os_data_v1`, schema version in bundle. Writes are debounced by default; **`dataStore.notify(collection, persistImmediately?)`** with `persistImmediately === true` skips debounce and writes the full bundle synchronously (employee **expenses** and **timesheets**). **`beforeunload`** flushes any remaining debounced write (**BUG-004**).

## API patterns
- Current: in-memory / local patterns; TODO markers in services for future REST/Supabase
- Hooks: `useService` / `useMutation` expect full `ServiceResponse`; do not strip `.success` before hooks
- `employeeService`: trims `orgId` / `userId`; shared `requireOrgAndUser` / `requireOrg` guards. Employee-scoped list methods return `success: false` with empty `data` (and `error`) when org/user is missing — not a silent empty list. `getDashboardSummary` uses the same guard and returns a zeroed summary shape on failure so `ServiceResponse<T>` stays consistent.
- `useMutation`: `execute` is stable (`useCallback` with `[]`); the latest `mutationFn` is read from a ref so inline service lambdas do not churn the callback identity
- `useService(fn, deps, subscribeToCollections?)`: optional third arg lists `dataStore` collection names (`expenses`, `timesheets`, etc.); when `dataStore.notify(collection)` (or `notify(..., true)`) runs, the hook refetches via the service (employee dashboard, My Expenses, My Timesheet use this — no direct UI → `dataStore` reads)
- Auth: `authService` resolves **primary membership** with **employee membership preferred** when a user has multiple org memberships (login, `getSession`, `getRedirectPath`)

## UI rules
- Calm, low-pressure UX; 3-click target for core tasks
- Layman labels over accounting jargon in user-facing copy
- AI: show confidence + short “why” when suggesting actions
- **Recharts:** pass `data` to the chart root (`LineChart`, `AreaChart`, …). Decorative full-bleed layers over charts use `pointer-events-none` so controls stay clickable. Avoid extremely faint `CartesianGrid` stroke alpha on dark backgrounds (lines look “missing”).

## Collaboration / tooling
- **Local-first:** work happens on disk in this repo; **no GitHub (or other remote) is assumed**. Backlog and status live in **`04_tasks.md`**; deeper plans in **`architecture/`**. Use zip/USB/cloud backup of the folder if you want history off-machine — optional `git init` locally is fine, but remote hosting is out of scope unless you add it later.

## Constraints
- Protect flows in `flow_verification.md` before refactors
- One task at a time in MARQ workflow; minimal diffs per change
- Organization workspace rollout: 23 phases (`ORG-P01`–`ORG-P23`) in `04_tasks.md` Module G; checklists in `architecture/org-phase-plan.md`. **Linear next gap:** follow **`04_tasks.md` Multi-phase alignment** (import **ORG-P10** / **FE-028** + **SETTLE-001**). **Parallel work:** **`ORG-P22`**/**`FE-041`** (and other **`qa`** org rows) may sit ahead of linear gaps — keep **Module B** status aligned with **Module G** for the same file; QA still signs each phase checklist when ready
- Employee expense V1 breakdown: **`FEAT-001`** / **`FEAT1-001`–`FEAT1-008`** in `04_tasks.md`; formal sign-off **`FEAT1-008`** pending

## Important assumptions
- Demo logins and mock data are acceptable for Elite 0.1 local deploy
- “Deploy-ready” may mean static hosting + local persistence until real backend exists

## Employee workspace (recent)
- `EmployeeDashboard` uses `useService(fn, deps, ['expenses','timesheets','payslips','announcements'])` so refetch runs on `dataStore.notify` for those collections (no direct `dataStore` import in the component).
- `employeeService.getDashboardSummary` picks the latest payslip by `issueDate` without mutating the store array (copy before sort).
- **FEAT-001 / FEAT1-002:** Service layer uses shared guards (`requireOrgAndUser`, `requireOrg`); breakdown rows **`FEAT1-001`–`FEAT1-007`** are **`qa`** pending formal **`FEAT1-008`** sign-off (`04_tasks.md`).
- If `useService` runs before `userId` is available (empty string), the service returns `success: false` and the hook shows `error` until deps refetch — expected; deferring fetch in UI is optional UX polish.
- Clean seed includes one issued payslip per FLOW demo employee (`flow_verification.md` emails) so the pay KPI is non-zero without manual setup.

## Organization workspace (recent)
- **`OrgDashboard` / `WhatIfSimulator`:** Recharts — `data` on chart root; merged `baselineProfit` for simulator; stronger `CartesianGrid` stroke; decorative blurs `pointer-events-none` (see `architecture/org-phase-plan.md` implementation log). **Linear next in Module G:** see **`04_tasks.md`** (**ORG-P10** / import track). **Team / Simulator** (and other phases) may still be in **`qa`** — see Module G **Alignment**.
- **`BudgetPlanning`:** `useServiceArray(() => svc.budgets.getAll(), [svc.orgId], ['budgets'])` so list refetches on `dataStore.notify('budgets')`; create/edit/delete/template check **`ServiceResponse`**; loading/empty/error states. “Use template” uses module-level `budgetTemplates` + `BudgetTemplate` (name + category percentage splits).
- **`TeamPermissions`:** `organizationService.getMembers()` returns `OrganizationMember & { user }`; the UI maps rows to flat `TeamMember` (name/email from `user`, `UserRole` → display role). Search uses null-safe strings. Requires `react` + `motion/react` imports for hooks and `<motion.*>`.
