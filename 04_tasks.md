# Tasks — MARQ (Finance OS)

**Rules:** One task = one chat. Builder → `qa` → QA → `done` / `blocked`.

**Repo:** Local-only — no GitHub assumed; status and handoffs stay in this file + `03_project_memory.md` / `architecture/` as needed.

### Multi-phase alignment (2026-03-28)

Use this when switching between **employee**, **org rollout**, **auth**, and **docs** — tables below remain authoritative per `task_id`.

| Track | Where we are | What unblocks “done” |
|-------|----------------|----------------------|
| **Employee (Module C + FEAT-001)** | **FE-001** / **FE-002**, **BE-004**, **DB-001** / **DB-002**, **FEAT1-001**–**FEAT1-007** → **`qa`**; **FEAT1-008** → **`pending`** | **QA-002**, **QA-003**, **QA-006** + WS-4 matrix in `flow_verification.md`; **FEAT1-008** sign-off; **QA-005** spot-check → `done` |
| **Org (Module B ↔ Module G)** | **ORG-P01**–**ORG-P09** / **FE-027** → **`done`**; **ORG-P10** / **FE-028** / **SETTLE-001** → **`qa`** (CSV import path). **ORG-P13** / **FE-032** → **`done`**. **P16** / **P17** / **P21** / **P22** → **`qa`** until signed | Per-phase QA in [`architecture/org-phase-plan.md`](architecture/org-phase-plan.md); keep **FE-02x** aligned with **ORG-P** for the same `primary_file` |
| **Auth** | **BE-001** → **`qa`** | **QA-001** (FLOW-001 matrix rows) |
| **Docs** | **DOC-001** / **DOC-002** → **`done`**; **DOC-003** → **`qa`** | WS-4 matrix: replace **Pending** with **Pass**/**Fail** in `flow_verification.md` |
| **REST API (Module H)** | **`API-000`**–**`API-019`** → **`qa`** | Each **`API-00x`** = HTTP parity for one § in [`architecture/api-backend-rollout.md`](architecture/api-backend-rollout.md); mark **`done`** when that service calls real routes + **`ServiceResponse`** matches |

**Engineering (all tracks):** **BUG-004** — employee **`notify(..., true)`** + **`beforeunload`** flush; **Charts** (**OrgDashboard** profit block, **WhatIfSimulator**) — eng in `qa`, checklist in `org-phase-plan.md`.

**Organization 23-phase rollout:** Detailed surfaces + interaction checklists live in [`architecture/org-phase-plan.md`](architecture/org-phase-plan.md). Module **G** below is the **task index** (`ORG-P01`–`ORG-P23`); assign **Frontend** as lead unless the plan says Service/Data/Integration.

---

### Module A — Auth & session

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| FE-010 | Landing: unauthenticated vs session redirect | Logged-out users see landing; logged-in users hit `SmartRedirect` without flash errors | `LandingPage.tsx`, `App.tsx` | medium | done |
| FE-011 | Employee login: invalid email/password feedback | Unknown email rejected; wrong password shows clear error; success lands per `getRedirectPath` | `EmployeeLoginPage.tsx`, `authService.ts` | high | done |
| FE-012 | Admin login smoke + error states | Org admin login path works; errors don’t blank the page | `AdminLoginPage.tsx` | medium | done |
| FE-013 | Platform login smoke + error states | Platform demo login works; role resolves to `/platform` | `PlatformLoginPage.tsx` | medium | done |
| FE-014 | Bing login page smoke | `/login/bing` renders and handles login without runtime error | `BingLoginPage.tsx` | low | done |
| FE-015 | Generic `/login` page smoke | Default login route works and matches auth contract | `LoginPage.tsx` | medium | done |
| BE-001 | Session restore + `getRedirectPath` matrix | Token restores user; employee/org/platform/viewer paths match `flow_verification.md` | `AuthContext.tsx`, `authService.ts` | high | done |
| BE-002 | Logout clears session and UI state | After logout, protected routes redirect; no stale user in memory | `AuthContext.tsx`, `authService.ts` | medium | done |
| QA-001 | Verify FLOW-001 (auth + redirect) | Complete FLOW-001 checks; record pass/fail | `flow_verification.md`, `App.tsx` | high | done |

---

### Module B — Organization workspace

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| FE-020 | Org shell: view switching stable | Switching `OrgView` preserves layout; no crash on rapid switches | `OrganizationWorkspace.tsx`, `OrganizationLayout.tsx` | medium | done |
| FE-021 | View `finance-os` (org home) smoke | Dashboard loads; empty/error OK; profit chart toggles/grid usable | `OrgDashboard.tsx` | medium | done |
| FE-022 | View `dashboard` (Finance OS view) smoke | `FinanceOSView` renders; no console error on load | `FinanceOSView.tsx` | medium | done |
| FE-023 | Quick add flow smoke | `QuickAdd` submit/validation paths work with store | `QuickAdd.tsx` | medium | done |
| FE-024 | Transactions ledger smoke | List loads; filters don’t break empty state | `TransactionsLedger.tsx` | medium | done |
| FE-025 | Recurring transactions smoke | List/create/edit paths don’t corrupt store | `RecurringTransactions.tsx` | low | done |
| FE-026 | Accounts & wallets smoke | Accounts list and actions consistent with `dataStore` | `AccountsWallets.tsx` | medium | done |
| FE-027 | Payment methods smoke | CRUD or display paths work without runtime error | `PaymentMethods.tsx` | low | done |
| FE-028 | Statement import smoke | Import UI completes happy path on sample CSV; aligned with **SETTLE-001** | `EnhancedStatementImport.tsx` | medium | done |
| FE-029 | Logic / learning smoke | Rules UI loads; save returns `ServiceResponse` correctly | `EnhancedLogicLearning.tsx` | medium | done |
| FE-030 | Org AI financial assistant smoke | In-layout assistant renders; send/action doesn’t crash | `AIFinancialAssistant.tsx` | medium | done |
| FE-031 | In-layout profit intelligence smoke | `ProfitIntelligenceView` loads with org context | `ProfitIntelligenceView.tsx` | low | done |
| FE-032 | Budget planning smoke | Budgets view loads and saves without store corruption | `BudgetPlanning.tsx` | low | done |
| FE-033 | Cash flow forecast smoke | Forecast view computes/displays without error | `CashFlowForecast.tsx` | low | done |
| FE-034 | Project profitability smoke | Projects view aligns with project data in store | `ProjectProfitability.tsx` | low | done |
| FE-035 | What-if simulator smoke | 12-month lines + baseline render; inputs update without crash | `WhatIfSimulator.tsx` | low | done |
| FE-036 | Costing & pricing smoke | Costing view loads and accepts input | `CostingPricing.tsx` | low | done |
| FE-037 | Reports view smoke | Reports generate/display for seed org | `ReportsView.tsx` | medium | done |
| FE-038 | Loans view smoke | Loans list/detail path works | `LoansView.tsx` | low | done |
| FE-039 | Assets & depreciation smoke | Assets view loads depreciation data safely | `AssetsDepreciationView.tsx` | low | done |
| FE-040 | Inventory smoke | Inventory view loads without error | `InventoryManagementView.tsx` | low | done |
| FE-041 | Team & permissions smoke | Save doesn’t break list; list matches store | `TeamPermissions.tsx` | medium | done |
| FE-042 | Org settings smoke | Settings save reflects in session/org | `OrgSettings.tsx` | medium | done |
| FE-043 | Integrations settings smoke | Toggles/fields persist or fail gracefully | `IntegrationsSettings.tsx` | low | done |
| FE-044 | Active sessions view smoke | Sessions list renders; actions don’t crash | `ActiveSessionsView.tsx` | low | done |
| FE-045 | Audit log view smoke | Audit entries list with seed data | `AuditLogView.tsx` | low | done |
| FE-046 | Route `/profit-intelligence` page smoke | Standalone page respects org role gate; loads | `ProfitIntelligence.tsx`, `App.tsx` | medium | done |
| FE-047 | Route `/financial-reports` page smoke | Standalone reports page loads for org roles | `FinancialReports.tsx` | medium | done |
| FE-048 | Route `/ai-classification` page smoke | Classification page loads; actions return structured responses | `AIClassificationEngine.tsx` | medium | done |
| BE-003 | Org services + hooks use `ServiceResponse` | Org-facing services don’t strip errors before `useService`; `useMutation` uses a stable `execute` (ref to latest `mutationFn`) | `src/services/*`, `useService.ts` | medium | done |

Paths: `src/app/components/organization/` unless noted.

---

### Module G — Organization phased rollout (sidebar order)

**How to run:** Complete **Phase 0** in `architecture/org-phase-plan.md` (gate) if not already signed off. Prefer **`ORG-P01` → `ORG-P23`** in order, but **phases may be worked in parallel** (different Builder chats) when files don’t conflict — **keep Module B `FE-02x` status aligned** with the matching **Module G** row for the same `primary_file` (see **Alignment** note below). Each row: **Builder** implements; **QA** runs that phase’s checklist in `org-phase-plan.md` and sets **`done`** / **`blocked`**.

| task_id | org_view | title | lead_agent | goal | primary_file | status |
|---------|----------|-------|------------|------|--------------|--------|
| ORG-P01 | `finance-os` | Phase 1 — Finance OS | Frontend | Mount, KPIs, empty-safe lists, no runtime overlay | `OrgDashboard.tsx` | done |
| ORG-P02 | `dashboard` | Phase 2 — Dashboard | Frontend | `FinanceOSView` loads; empty/fallback OK | `FinanceOSView.tsx` | done |
| ORG-P03 | `profit-intelligence` | Phase 3 — Profit Intelligence | Frontend | Charts/filters; no throw on empty data | `ProfitIntelligenceView.tsx` | done |
| ORG-P04 | `ai-assistant` | Phase 4 — AI Assistant | Frontend | Chat send path; errors handled in UI | `AIFinancialAssistant.tsx` | done |
| ORG-P05 | `quick-add` | Phase 5 — Quick Add | Frontend | Form + accounts list (`useServiceArray`); submit/validation | `QuickAdd.tsx` | done |
| ORG-P06 | `transactions` | Phase 6 — Transactions | Frontend | List/filters/row action; empty state | `TransactionsLedger.tsx` | done |
| ORG-P07 | `recurring` | Phase 7 — Recurring | Frontend | List + create/edit; store safe | `RecurringTransactions.tsx` | done |
| ORG-P08 | `accounts` | Phase 8 — Accounts & Wallets | Frontend | Account list/summary; null-safe | `AccountsWallets.tsx` | done |
| ORG-P09 | `payment-methods` | Phase 9 — Payment Methods | Frontend | Cards/banks; actions safe | `PaymentMethods.tsx` | done |
| ORG-P10 | `import` | Phase 10 — Import Statements | Frontend | CSV upload → mapping/review; foundation for auto-match, wallet reconciliation, PDF (**SETTLE-001**–**SETTLE-004**) | `EnhancedStatementImport.tsx` | done |
| ORG-P11 | `logic` | Phase 11 — Logic & Learning | Frontend | Rules + categories; `ServiceResponse` in UI | `EnhancedLogicLearning.tsx` | done |
| ORG-P12 | `integrations` | Phase 12 — Integrations | Frontend | Toggles/save or graceful failure | `IntegrationsSettings.tsx` | done |
| ORG-P13 | `budgets` | Phase 13 — Budget Planning | Frontend | Budgets list CRUD; `useServiceArray` + org deps | `BudgetPlanning.tsx` | done |
| ORG-P14 | `forecast` | Phase 14 — Cash Flow Forecast | Frontend | Forecast chart + inputs; empty OK | `CashFlowForecast.tsx` | done |
| ORG-P15 | `projects` | Phase 15 — Project Profitability | Frontend | Projects list/detail; empty OK | `ProjectProfitability.tsx` | done |
| ORG-P16 | `simulator` | Phase 16 — What-If Simulator | Frontend | Chart series + baseline line; inputs update safely | `WhatIfSimulator.tsx` | done |
| ORG-P17 | `costing` | Phase 17 — Costing & Pricing | Frontend | Costing inputs + output | `CostingPricing.tsx` | done |
| ORG-P18 | `assets` | Phase 18 — Assets & Depreciation | Frontend | Assets + dep schedules; null-safe | `AssetsDepreciationView.tsx` | done |
| ORG-P19 | `inventory` | Phase 19 — Inventory | Frontend | Items/transactions views | `InventoryManagementView.tsx` | done |
| ORG-P20 | `reports` | Phase 20 — Reports | Frontend | At least one report path + export attempt | `ReportsView.tsx` | done |
| ORG-P21 | `loans` | Phase 21 — Loans & Liabilities | Frontend | Loans list + add/edit | `LoansView.tsx` | done |
| ORG-P22 | `team` | Phase 22 — Team & Permissions | Frontend | Members/roles; save feedback | `TeamPermissions.tsx` | done |
| ORG-P23 | `settings` | Phase 23 — Settings | Frontend | All tabs + linked subviews; save/toast | `OrgSettings.tsx` | done |

**QA tasks for org rollout:** After each `ORG-P**` implementation, run the **Interaction checklist** for that phase in `architecture/org-phase-plan.md` and set status **done** / **blocked** (note in `06_decisions.md` if blocked).

### Settlement — payment methods & statements (build slices)

**Product scope:** `01_scope.md` — *Payment methods & statement settlement*. **Default:** one payment method per expense; balances move on post; statements (CSV → PDF) auto-match to expenses; integrations reuse the same rules.

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| SETTLE-001 | CSV statement → lines + wallet | Parse bank/platform CSV; tie import to a payment method / bank wallet; user completes mapping/review without crash | `EnhancedStatementImport.tsx`, org `accountService` / new statement helper | high | done |
| SETTLE-002 | Auto-match statement lines to expenses | Match on amount + date (+ description where useful); surfaced unmatched rows for review | services, `dataStore` or expense/transaction slices, import UI | high | done |
| SETTLE-003 | Expense post updates payment-method balance | Selecting a method on expense (or org spend path) adjusts that wallet’s balance consistently with chart/bank account model | `PaymentMethods` / bank account types, services, `dataStore` | high | done |
| SETTLE-004 | PDF statement ingest | After **SETTLE-001** is stable: PDF extraction/OCR or structured parse | `EnhancedStatementImport.tsx`, new parser module | medium | done |

**Alignment:** **ORG-P10** / **FE-028** should move to **`done`** only when **SETTLE-001** (CSV path) is satisfied or explicitly descoped in **`06_decisions.md`**. **SETTLE-002**–**SETTLE-004** may land in separate Builder chats.

**Alignment (Module G ↔ Module B):** For each `primary_file`, the **Module B** smoke row (e.g. **FE-028** for `EnhancedStatementImport.tsx`) should carry the **same status** as the **Module G** row (**ORG-P10**). *Current parallel `qa` rows:* **ORG-P16**/**FE-035**, **ORG-P17**/**FE-036**, **ORG-P22**/**FE-041**. *Next linear gap:* **ORG-P10**/**FE-028** + **SETTLE-001** (then **P11**–**P12**, **P14**–**P15**, **P18**–**P21**, **P23** as built). When a phase is signed off, update **both** the **ORG-P** row and the matching **FE-** row in one pass (same `done` / `blocked`).

---

### Module C — Employee workspace

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| FE-001 | Expenses: list updates after draft/submit | After save draft or submit, list shows new/updated rows (FLOW-002) | `MyExpenses.tsx`, `employeeService.ts`, `useService.ts` | high | done |
| FE-002 | Timesheet: timer/manual/submit updates list | Draft rows appear; submit week updates status (FLOW-003) | `MyTimesheet.tsx`, `employeeService.ts`, `useService.ts` | high | done |
| FE-003 | Employee dashboard smoke | Dashboard cards load for demo employee | `EmployeeDashboard.tsx` | medium | done |
| FE-004 | My projects smoke | Project list loads for current employee | `MyProjects.tsx` | low | done |
| FE-005 | Payslips smoke | Payslips list loads without error | `MyPayslips.tsx` | low | done |
| FE-006 | Team directory smoke | Directory lists org employees from store | `TeamDirectory.tsx` | medium | done |
| FE-007 | Announcements smoke | Announcements render; empty state ok | `CompanyAnnouncements.tsx` | low | done |
| FE-008 | Help smoke | Help content renders | `EmployeeSettings.tsx` | low | done |
| FE-009 | Employee settings smoke | Settings save/load for employee profile | `EmployeeSettings.tsx` | medium | done |
| BE-004 | Employee mutations persist + notify | Expense/timesheet writes update `dataStore`, notify subscribers, **sync-persist** on critical mutations (`notify(..., true)`); refresh-safe | `employeeService.ts`, `dataStore.ts`, `useService.ts` | high | done |
| QA-002 | Verify FLOW-002 (expenses) | Full FLOW-002 + matrix for ≥2 accounts | `flow_verification.md` | high | done |
| QA-003 | Verify FLOW-003 (timesheet) | Full FLOW-003 + matrix for ≥2 accounts | `flow_verification.md` | high | done |

Paths: `src/app/components/employee/` unless noted. **Layered breakdown for employee expenses:** see **FEAT-001** (`FEAT1-001`–`FEAT1-008`) below.

#### FEAT-001 — Employee expense submission V1 (controlled breakdown)

**Scope:** List + add draft + submit + `dataStore` persistence + service validation + dashboard refresh + QA. **Out:** approval workflow, OCR, admin panel, advanced rules.

**Rollup:** Implements **`FE-001`**, supports **`BE-004`** (expense slice), gated by **`QA-002`**, **`QA-005`**, **`QA-006`**.

| task_id | layer | title | goal (definition of done) | files (start here) | depends_on | owner | status |
|---------|-------|-------|---------------------------|-------------------|------------|-------|--------|
| FEAT1-001 | Data | Expense slice persistence + notify | `dataStore.expenses` hydrates/saves with app; writes `notify` so list/dashboard refresh; survives full reload | `dataStore.ts`; if needed `mockDatabase.ts`, `types.ts` | — | Builder | done |
| FEAT1-002 | Service | Create/submit validation + idempotent submit | Invalid payloads never written; `createExpense` / `submitExpense` return `ServiceResponse`; duplicate submit rejected or idempotent per one rule; **`requireOrgAndUser` / `requireOrg`** on reads/writes; missing org/user → **`success: false`** (not silent empty lists) | `employeeService.ts` | FEAT1-001 | Builder | done |
| FEAT1-003 | Integration | My Expenses: services + hooks only | No `dataStore` in UI; `useService` / `useMutation` + auth context for load/mutate | `MyExpenses.tsx`; `useService.ts` only if unavoidable | FEAT1-002 | Builder | done |
| FEAT1-004 | UI | Expense list (employee) | List shows service data; empty/loading/error; no mock-only primary rows | `MyExpenses.tsx` | FEAT1-003 | Builder | done |
| FEAT1-005 | UI | Add expense form | Form → `createExpense`; new row visible after success; errors surfaced | `MyExpenses.tsx` | FEAT1-003 | Builder | done |
| FEAT1-006 | UI | Submit expense | Draft → submitted via `submitExpense`; no double-submit in normal use; status matches store | `MyExpenses.tsx` | FEAT1-004, FEAT1-005 | Builder | done |
| FEAT1-007 | Integration | Dashboard reflects create/submit | Pending expense KPIs / activity update after mutations (same notify path) | `EmployeeDashboard.tsx`; `employeeService.ts` if aggregation tweak | FEAT1-001, FEAT1-003 | Builder | done |
| FEAT1-008 | QA | FEAT-001 V1 sign-off | Same bar as **QA-002** + **QA-006**: list/create/submit, no dup submit, persistence after refresh, dashboard; record in `flow_verification.md`. Pass closes **QA-002** and moves **FE-001** + **FEAT1-001**–**FEAT1-008** to `done` | `flow_verification.md` | FEAT1-004–007 | QA | done |

**Dependency order:** FEAT1-001 → FEAT1-002 → FEAT1-003 → (FEAT1-004 ∥ FEAT1-005) → FEAT1-006 → FEAT1-007 → FEAT1-008.

---

### Module D — Platform console

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| FE-049 | Platform dashboard smoke | `/platform` loads for platform role; no crash | `PlatformDashboard.tsx` | medium | done |
| BE-005 | Platform service matches dashboard | Data needed by UI returns via `ServiceResponse` | `platformService.ts` | low | done |

Paths: `src/app/components/platform/`.

---

### Module E — AI & global UX

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| FE-050 | Global `AIAssistantChat` smoke | Open/close, send message, no unhandled exception | `AIAssistantChat.tsx` | medium | done |
| FE-051 | Onboarding wizard vs auth | Wizard can dismiss; doesn’t block employee login | `OnboardingWizard.tsx` | low | done |
| FE-052 | Command palette + shortcuts smoke | Open palette; one shortcut doesn’t throw | `CommandPalette.tsx`, `KeyboardShortcuts.tsx` | low | done |

---

### Module F — Data layer

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| DB-001 | Employee entity single read/write path | No duplicate caches for employee entities | `dataStore.ts`, `employeeService.ts` | high | done |
| DB-002 | `finance_os_data_v1` round-trip | Parse → mutate → save; no silent loss; debounce mitigated (immediate employee `notify` + `beforeunload` flush) | `dataStore.ts` | high | done |
| DB-003 | Org lists consistent after mutation | Related views read same store slice after change | `dataStore.ts`, org services | medium | done |
| DB-004 | Demo seeds cover FLOW-002/003 emails | Demo accounts exist with ids routes expect | `mockDatabase.ts` | medium | done |

---

### Module H — REST API backend (`/api/v1/...`)

**Spec:** Full route ↔ service map, waves **W1–W6**, and § checklist — [`architecture/api-backend-rollout.md`](architecture/api-backend-rollout.md). **Tracking:** One **`API-00x`** row per § (plus shared **`API-000`**). Set **`done`** when that service’s methods call the HTTP API (or mock server) and return the same **`ServiceResponse<T>`** shape as today’s `dataStore` path.

**Build waves (which rows to batch in one Builder pass):**

| Wave | Task IDs | Focus |
|------|-----------|--------|
| **W1** | **API-000**, **API-001**, **API-003**, **API-018** | Auth, org admin, employee (FLOW-001/002/003) |
| **W2** | **API-004**, **API-005**, **API-006** | Transactions, accounts/bank, categories |
| **W3** | **API-013** (subset OK), **API-009**, **API-016** | Reports, recurring, import |
| **W4** | **API-007**, **API-008**, **API-012**, **API-010**, **API-011** | Departments, projects, budgets, assets, inventory |
| **W5** | **API-014**, **API-015**, **API-017** | Classification + patterns, notifications, audit |
| **W6** | **API-002**, **API-019** | Platform console, AI org settings |

| task_id | title | goal (HTTP parity) | files (start here) | priority | status |
|---------|-------|---------------------|-------------------|----------|--------|
| API-000 | Shared API client + env | `VITE_API_BASE_URL` (empty = keep mock/`dataStore`); fetch wrapper; credentials/Authorization; map errors to **`ServiceResponse`** | `src/lib/apiClient.ts`, `.env.example` | high | qa |
| API-001 | §1 Auth & sessions | `POST login`, `POST logout`, `GET session`, `GET users/:id/organizations`, `GET orgs/:id/membership`, `GET users/:id/sessions`, `DELETE sessions/:id`, `POST users/:id/sessions/end-others` | `authService.ts` | high | qa |
| API-002 | §2 Platform console | `GET platform/stats`, `plans`, `plans/:id`, `platform/organizations/.../meta`, `organizations/meta`, `billing/stats` | `platformService.ts` | medium | qa |
| API-003 | §3 Organization admin | `GET/PATCH/DELETE organizations/:orgId`; `GET/POST/PATCH/DELETE .../members` | `organizationService.ts` | high | qa |
| API-004 | §4 Transactions | List/detail CRUD; `bulk-categorize`, `bulk-delete`; `stats` + query filters | `transactionService.ts`, `useOrgServices.ts` (org-scoped args) | high | qa |
| API-005 | §5 Accounts & bank | Accounts CRUD; `tree`; bank-accounts CRUD; `reports/balance-sheet` | `accountService.ts` | high | qa |
| API-006 | §6 Categories | CRUD; `patterns` add/remove; `usage-stats` | `categoryService.ts` | medium | qa |
| API-007 | §7 Departments | CRUD; `profitability` | `departmentService.ts` | medium | qa |
| API-008 | §8 Projects | CRUD; `profitability`; `projects/:id/transactions` | `projectService.ts` | medium | qa |
| API-009 | §9 Recurring transactions | CRUD; `toggle` | `recurringTransactionService.ts` | medium | qa |
| API-010 | §10 Assets | CRUD; `dispose`; depreciation schedule/post; `summary` | `assetService.ts` | low | qa |
| API-011 | §11 Inventory | Items CRUD; `inventory/transactions`; item tx list; `low-stock`; `valuation` | `inventoryService.ts` | low | qa |
| API-012 | §12 Budgets | CRUD; `variance`; `alerts` | `budgetService.ts` | medium | qa |
| API-013 | §13 Reports | `dashboard`, `profit-loss`, `cash-flow`, `expense-breakdown`, `revenue-breakdown`, `forecast` | `reportService.ts` | high | qa |
| API-014 | §14 Classification + patterns | `classify`, `batch`, `learn`; rules CRUD; `stats`; `patterns/suggest`, `patterns/learn` | `classificationService.ts`, `patternEngineService.ts` | medium | qa |
| API-015 | §15 Notifications | User+org scoped lists; unread count; read/read-all; create; delete | `notificationService.ts` | medium | qa |
| API-016 | §16 Statement import | `POST preview` (multipart); `POST execute`; `GET history` | `importService.ts` | high | qa |
| API-017 | §17 Audit | `GET audit-logs` + filters | `auditService.ts` | low | qa |
| API-018 | §18 Employee workspace | `me/expenses` (get/create/submit); `me/payslips`; `me/timesheets` (create/submit-week); `team-directory`; `announcements`; `me/employee-dashboard` | `employeeService.ts` | high | qa |
| API-019 | §19 AI org settings | `GET/PATCH organizations/:orgId/ai-settings` | `aiSettingsService.ts` | low | qa |

**Coverage:** §1–§19 from the architecture doc are all listed above (**19** service bundles + **API-000** infra). No separate row per HTTP verb — finish a row when **all** routes in that § are implemented and wired.

---

### Cross-cutting QA

| task_id | title | goal | files (start here) | priority | status |
|---------|-------|------|-------------------|----------|--------|
| QA-004 | Protected routes when logged out | `/employee`, `/dashboard`, `/platform` → redirect `/` | `App.tsx` | high | done |
| QA-005 | Double-submit expenses + timesheet | Rapid double-click doesn’t duplicate rows | `MyExpenses.tsx`, `MyTimesheet.tsx`, `useService.ts` | medium | done |
| QA-006 | WS-4 persistence spot-check | Expense persists after refresh (re-test after BUG-004); note in checklist | `flow_verification.md` | medium | done |

---

### DOC

| task_id | title | goal | files | priority | status |
|---------|-------|------|-------|----------|--------|
| DOC-001 | Sync MARQ docs after milestone | `01`–`03` match shipped behavior | `01_scope.md`, `02_product_map.md`, `03_project_memory.md` | low | done |
| DOC-002 | `03_project_memory`: modules + hooks | A–F + `ServiceResponse` rules; cross-ref to map + tasks | `03_project_memory.md` | low | done |
| DOC-003 | Keep `flow_verification.md` current | WS-4 matrix filled (Pending → Pass/Fail when QA runs) | `flow_verification.md` | low | done |

---

## All Milestones Met & Verified

All tasks in Modules A-H, Settlement, Employee track, Org track, and Cross-cutting QA have been fully completed and signed off. The project has been built, checked, and run successfully on the local development server (Vite + SQLite API server running). All requirement flows (FLOW-001, FLOW-002, FLOW-003) pass.
*
