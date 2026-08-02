# Product map — Finance OS

Source of truth for **modules** (product areas) and **features** (screens/capabilities). Implementation lives under `src/app/` and `src/services/`.

---

## Module A — Auth & session

| Feature | Notes |
|---------|--------|
| Landing | `/` — entry when logged out |
| Logins | `/login`, `/login/admin`, `/login/platform`, `/login/employee`, `/login/bing` |
| Session + redirect | Restore session; `getRedirectPath()` sends users to the right area |

**Depends on:** `authService`, `AuthContext`, `App.tsx` routes.

---

## Module B — Organization workspace

Shell: **`OrganizationWorkspace`** (in-layout navigation). Primary URL: `/dashboard` or `/organization/workspace` (also `/organization` for legacy dashboard).

| View key | Feature (user-facing) |
|----------|------------------------|
| finance-os | Org dashboard (“home”) |
| dashboard | Finance OS view |
| quick-add | Quick add |
| transactions | Transactions ledger |
| recurring | Recurring transactions |
| accounts | Accounts & wallets |
| payment-methods | Payment methods |
| import | Statement import (CSV first; PDF later; auto-match to expenses + wallet reconciliation — see **`04_tasks.md`** **SETTLE-***) |
| logic | Logic / learning |
| ai-assistant | Org AI financial assistant |
| profit-intelligence | Profit intelligence (in-layout) |
| budgets | Budget planning |
| forecast | Cash flow forecast |
| projects | Project profitability |
| simulator | What-if simulator |
| costing | Costing & pricing |
| reports | Reports |
| loans | Loans |
| assets | Assets & depreciation |
| inventory | Inventory |
| team | Team & permissions |
| settings | Org settings |
| integrations | Integrations |
| active-sessions | Active sessions |
| audit-log | Audit log |

**Standalone routes (same org roles, separate pages):**

| Route | Feature |
|-------|---------|
| `/profit-intelligence` | Profit intelligence page |
| `/financial-reports` | Financial reports |
| `/ai-classification` | AI classification engine |

**Depends on:** org-related services, `dataStore` (in-memory + `localStorage` bundle for local deploy; see `flow_verification.md` / `03_project_memory.md`), org context/layout components.

**Rollout alignment:** Build order and phase statuses — **`04_tasks.md`** Module **G** (`ORG-P01`–`ORG-P23`). Checklists — **`architecture/org-phase-plan.md`**. Module **B** smoke tasks (**FE-021**–**FE-048**) should use the **same status** as the matching **Module G** row for the same primary file. Phases may ship **out of order** (e.g. budgets or team before payment methods); keep both tables in sync.

---

## Module C — Employee workspace

Shell: **`EmployeeWorkspace`**. Route: **`/employee`**.

| View | Feature |
|------|---------|
| dashboard | Employee dashboard |
| expenses | My expenses |
| timesheet | My timesheet |
| projects | My projects |
| payslips | My payslips |
| team | Team directory |
| announcements | Company announcements |
| help | Help |
| settings | Employee settings |

**Depends on:** `employeeService`, employee layout/components.

**Implementation notes (shipped):** Expenses and timesheet use `useService` / `useMutation` against `employeeService` only (no direct `dataStore` in those screens). Pass an optional **third argument** to `useService` (e.g. `['expenses']`, `['timesheets']`, or multiple collections on the dashboard) so the hook refetches when `dataStore.notify` runs after mutations—lists and KPIs stay aligned without relying only on view remounts. `employeeService` normalizes `orgId` / `userId` and returns `ServiceResponse` failures when required ids are missing (employee lists and dashboard summary are fail-closed, not silent empty). Other employee views (payslips, directory, announcements) use the same service guards. POST-QA hardening includes stable `useMutation.execute`, action locks on timesheet mutations, auth-scoped `userId`, and patterns in `03_project_memory.md`.

---

## Module D — Platform console

| Feature | Notes |
|---------|--------|
| Platform dashboard | `/platform` — platform admin / manager only |

**Depends on:** `platformService`, `PlatformRoute` in `App.tsx`.

---

## Module E — AI & global assistants

| Feature | Notes |
|---------|--------|
| Global AI assistant | Floating `AIAssistantChat` (app-wide) |
| Org AI assistant | In-layout `AIFinancialAssistant` |
| Classification | `/ai-classification` + logic learning where present |

**Depends on:** classification / assistant components and related services.

---

## Module F — Data layer

| Feature | Notes |
|---------|--------|
| In-memory store | `dataStore` + seeds (`mockDatabase` / data modules) |
| Service API | Async `ServiceResponse<T>` pattern across services |

**Depends on:** stable service contracts; future swap to real API.

---

## Cross-module dependencies

1. **Auth** gates org, employee, and platform areas.
2. **UI → services → dataStore** (or future API); hooks must respect full `ServiceResponse`.
3. **Employee** data must stay consistent with a single store path for employee entities (see `03_project_memory.md`).
