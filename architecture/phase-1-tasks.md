# Phase 1 Task Board (Elite 0.1)

## Objective
Complete Phase 1 with deploy-ready local persistence and passing must-not-break flows.

## Definition of Done (Phase 1)
- FLOW-001, FLOW-002, FLOW-003 pass from `flow_verification.md`.
- Employee data is stored in one shared store and persists across refresh/re-login.
- No critical employee flow relies on inline mock fallback data.
- `npm run dev` works with no blocking runtime errors.

## Workstreams

### WS-1 Data Layer Unification (Highest Priority)
- [x] Add employee collections to shared store (`expenses`, `timesheets`, `payslips`, `teamMembers`, `announcements`).
- [x] Seed employee collections in the same source as other domains.
- [x] Refactor `employeeService` to read/write only from shared store.
- [x] Ensure mutation methods notify listeners after writes.
- [x] Remove isolated module-level `seed*` arrays from `employeeService`.

**Files to touch**
- `src/services/dataStore.ts`
- `src/services/employeeService.ts`
- `src/services/types.ts` (only if collection typing changes)

### WS-2 Local Persistence (Deploy-Ready Local Backend)
- [x] Hydrate shared store from `localStorage` on app boot.
- [x] Persist store on changes (debounced write).
- [x] Add schema version key for future safe migrations.
- [x] Add reset/migration guards for malformed local data.

**Files to touch**
- `src/services/dataStore.ts`
- `src/app/App.tsx` (only if initialization hook is needed)

### WS-3 Employee UI Flow Reliability
- [x] Remove fallback-to-inline-mock for:
  - `MyExpenses`
  - `MyTimesheet`
  - `EmployeeDashboard`
  - `MyProjects`
  - `TeamDirectory`
  - `CompanyAnnouncements`
- [x] Replace fallback usage with loading + empty states.
- [x] Ensure post-mutation UI updates via refetch/store notifications.

**Files to touch**
- `src/app/components/employee/MyExpenses.tsx`
- `src/app/components/employee/MyTimesheet.tsx`
- `src/app/components/employee/EmployeeDashboard.tsx`
- `src/app/components/employee/MyProjects.tsx`
- `src/app/components/employee/TeamDirectory.tsx`
- `src/app/components/employee/CompanyAnnouncements.tsx`

### WS-4 Verification + QA Gate
- [ ] Execute FLOW-001/002/003 checklist manually (see `flow_verification.md` → WS-4 Phase 1 gate).
- [ ] Verify with at least 2 employee demo accounts _(seed data covers all four employees)_.
- [ ] Record pass/fail notes and fixes (use the table in `flow_verification.md` or your tracker).
- [ ] Freeze release candidate only when all three flows pass.

**Reference**
- `flow_verification.md`

## Suggested Team Split
- Engineer A: WS-1 + WS-2
- Engineer B: WS-3 (Expenses + Timesheet first)
- Engineer C/QA: WS-4 verification and bug triage

## Sequence (Recommended)
1. WS-1
2. WS-2
3. WS-3
4. WS-4

## Acceptance Metrics for Phase 1
- 100% pass for must-not-break flows.
- 0 data drift between employee screens after refresh.
- 0 critical regressions in login/redirect and employee submit flows.
