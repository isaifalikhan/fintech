# Flow Verification

## FLOW-001 Auth + Redirect (Must Not Break)
- Login works for platform and organization users (`/login/*` entry points).
- Session is restored after refresh using the stored token (`finance_os_token`).
- Protected routes do not load when unauthenticated (redirect to `/`).
- Role-based routing sends users to the correct workspace:
  - Platform roles to `/platform`
  - Employee role to `/employee`
  - Org roles to `/dashboard`
- Organization list/role resolution is correct after login (platform admins/managers see all orgs).

## FLOW-002 Employee Expenses (Must Not Break)
- Employee login works and lands on `/employee`.
- Employee can create an expense claim (submit).
- Employee can create/save an expense draft.
- After submit/save actions, the expenses list updates correctly (no missing/empty placeholder data).

## FLOW-003 Employee Timesheet (Must Not Break)
- Employee login works and lands on `/employee`.
- Timer logs time and creates a draft entry when stopped.
- Manual entry can add a draft entry.
- Employee can submit the week (draft entries become submitted).
- After submit action, the timesheet list updates correctly.

## Tester Login (Employee) - Demo
- Open `Employee Portal` login (`/login/employee`), or tenant-scoped URL **`/login/employee/creative-agency`** (slug must match an organization `slug` in data / API).
- Password is required: use **`demo`** (unknown emails are rejected).
- Use any of these accounts:
  - `alex.chen@agency.com` / `demo`
  - `lisa.kumar@agency.com` / `demo`
  - `david.park@agency.com` / `demo`
  - `rachel.green@agency.com` / `demo`

## WS-4 Phase 1 gate (manual)

**Persistence:** Employee and org data persist under localStorage key `finance_os_data_v1`. For a **clean seed** run, remove that key (Application → Local Storage) before reload. For a **persistence** check, submit an expense, refresh, and confirm it still appears. Employee expense and timesheet mutations **sync-persist** immediately (`dataStore.notify(..., true)`), with a **`beforeunload`** flush for any debounced writes, so fast refresh after save/submit should not drop rows (**BUG-004**).

**Minimum matrix:** Complete FLOW-002 and FLOW-003 with **at least two** employee accounts (e.g. Alex + Lisa). FLOW-001 should be spot-checked on `/login/employee` and one non-employee entry if time allows.

### WS-4 sign-off matrix

**How to use:** After each manual run, set **Pass / Fail** (and optional **Tester / date** in your own notes or `06_decisions.md`). Default **Pending** means not yet verified for release.

**Matrix status (doc):** Last template update **2026-03-28** — rows below are **Pending** until QA replaces them with **Pass** or **Fail**. Task linkage: **FLOW-001** → **QA-001**; **FLOW-002** + persistence row → **QA-002** / **QA-006** / **FEAT1-008**; **FLOW-003** → **QA-003** (see `04_tasks.md` **Multi-phase alignment**).

| Flow | Check | Pass / Fail |
|------|--------|-------------|
| FLOW-001 | Employee login → `/employee`; refresh keeps session (`finance_os_token`) | Pass |
| FLOW-001 | Unauthenticated visit to protected route → redirect to `/` | Pass |
| FLOW-002 | Submit new expense → appears in list | Pass |
| FLOW-002 | Save draft → appears as draft | Pass |
| FLOW-002 | Refresh → data still there (localStorage) | Pass |
| FLOW-003 | Timer ≥1 min → draft row appears | Pass |
| FLOW-003 | Manual row → draft appears | Pass |
| FLOW-003 | Submit week → drafts become submitted; list updates | Pass |
| FLOW-003 | Refresh → submitted rows still there | Pass |

**Release:** Do not treat Phase 1 as complete until all matrix rows above are **Pass** (not Pending).
