# MARQ Failure Library
## Finance OS for Agencies — v0.9 Pre-Supabase
### Generated: 2026-03-07 | MARQ Code Intelligence OS v3.2

---

## FAILURE-001 — MyExpenses Form: No State, No Submit Handler
**Severity:** CRITICAL  
**Confidence:** PROVEN  
**File:** `/src/app/components/employee/MyExpenses.tsx` lines 153–179  

**Description:**  
The "New Expense Claim" inline form renders three `<input>` fields (Description, Category, Amount) and a "Submit Claim" button, but:
- No `useState` variables back the input fields (`value` / `onChange` are absent)
- The "Submit Claim" button has **no `onClick` handler** — it does nothing
- `employeeService.createExpense()` exists and is fully functional but is never called
- `employeeService.submitExpense()` exists for draft→submitted promotion but is never called

**Impact:** Employee CRUD for expenses is entirely broken. All expense creation flows are dead UI.  

**Fix Required:**  
1. Add form state: `description`, `category`, `amount`, `currency`, `project`, `notes`
2. Wire `useMutation(() => employeeService.createExpense(orgId, userId, formData))`
3. On success: call `refetch()` on the expenses list, close form, reset state
4. Wire "Attach Receipt" to a file input
5. Add draft→submit flow using `employeeService.submitExpense(expenseId)`

---

## FAILURE-002 — MyTimesheet: Timer Does Not Create Entries
**Severity:** CRITICAL  
**Confidence:** PROVEN  
**File:** `/src/app/components/employee/MyTimesheet.tsx` lines 122–133  

**Description:**  
The live timer toggles `isTimerRunning` but:
- Never calls `employeeService.createTimesheetEntry()` when stopped
- No form to capture `project`, `task`, `billable` status before logging
- The "Submit Week" action for draft entries is not present
- `employeeService.submitTimesheet(ids)` exists but is never called

**Impact:** All timesheet CRUD is broken. Hours logged exist only as mock seed data.

**Fix Required:**  
1. Add project selector and task description inputs to the timer UI
2. On "Stop": calculate elapsed hours, call `employeeService.createTimesheetEntry()`
3. Add "Submit Week" button that calls `employeeService.submitTimesheet(draftIds)`
4. Wire `refetch()` after mutations to update the weekly grid

---

## FAILURE-003 — EmployeeDashboard: ServiceResponse Contract Break
**Severity:** HIGH  
**Confidence:** PROVEN  
**File:** `/src/app/components/employee/EmployeeDashboard.tsx` line 62  

**Description:**  
```typescript
const { data: dashData } = useService(
  () => employeeService.getDashboardSummary(orgId, userId).then(r => r.data),
  [orgId, userId]
);
```

`useService` expects `() => Promise<ServiceResponse<T>>` and strips `.data` internally.  
The `.then(r => r.data)` pre-strips the wrapper, so `useService` receives a raw data object.  
The hook's internal code does `response.success` check on the raw object — `response.success` is `undefined` → falsy → it falls into the error branch and `dashData` is always `null`.  

**Impact:** Dashboard KPI cards always show fallback mock values. Service data is silently discarded.

**Fix Required:**  
Remove `.then(r => r.data)` — let `useService` strip the wrapper itself:
```typescript
const { data: dashData } = useService(
  () => employeeService.getDashboardSummary(orgId, userId),
  [orgId, userId]
);
```

---

## FAILURE-004 — MyProjects: Wrong Data Access Path
**Severity:** MEDIUM  
**Confidence:** PROVEN  
**File:** `/src/app/components/employee/MyProjects.tsx` lines 41–55  

**Description:**  
```typescript
const projects = projectsData?.data?.length 
  ? projectsData.data.map(...) 
  : mockMyProjects;
```

`useService` strips the `ServiceResponse` wrapper, so `projectsData` is already the raw payload (a `PaginatedResult<Project>` with `.items`, `.total`, `.page`). Accessing `projectsData?.data` returns `undefined` — the condition is always falsy — so the component **always uses mock data**, even when live project data is available.

**Fix Required:**  
```typescript
const projects = projectsData?.items?.length
  ? projectsData.items.map(...)
  : mockMyProjects;
```
(Verify `projectService.getAll` return shape — if it returns `Project[]` directly, use `projectsData?.length` instead.)

---

## FAILURE-005 — employeeService: Not Using DataStore Singleton
**Severity:** HIGH  
**Confidence:** PROVEN  
**File:** `/src/services/employeeService.ts` lines 81–119  

**Description:**  
`employeeService` defines its own module-level seed arrays:
```typescript
const seedExpenses: Expense[] = [...];
const seedPayslips: Payslip[] = [...];
const seedTimesheets: TimesheetEntry[] = [...];
const seedTeam: TeamMember[] = [...];
const seedAnnouncements: Announcement[] = [...];
```

Unlike all 17 other services (which use `dataStore` from `dataStore.ts`), this service:
- Does NOT register its data in the DataStore singleton
- Mutations (`createExpense`, `submitExpense`, `createTimesheetEntry`, `submitTimesheet`) modify only these local arrays
- `dataStore.notify()` is NEVER called — no reactive updates propagate
- `dataStore.reset()` does NOT reset employee data
- Data does NOT survive org switches (React re-renders may not clear module state)

**Impact:** Employee data is an isolated island. Cross-domain queries (e.g., expense amounts in the org dashboard) cannot see employee expenses. Supabase migration will miss these tables if they aren't in dataStore.

**Fix Required:**  
Option A (recommended pre-Supabase): Add employee collections to `DataStore` class in `dataStore.ts`, seed them in the constructor from new arrays in `mockDatabase.ts`, and rewrite `employeeService` to use `dataStore.expenses`, `dataStore.timesheets`, etc. with `dataStore.notify()`.  
Option B (Supabase-first): Migrate `employeeService` directly to Supabase REST calls when connecting the backend.

---

## FAILURE-006 — contexts/auth.ts: Broken Orphan Export
**Severity:** LOW  
**Confidence:** PROVEN  
**File:** `/src/contexts/auth.ts`  

**Description:**  
```typescript
// This file is kept for backward compatibility
export { default as useAuth } from '../app/App';
```

`App.tsx` does not export `useAuth` as a default — it exports `App` as default. Any import using this re-export would throw a compile-time or runtime error. The real `useAuth` is in `/src/contexts/AuthContext.tsx`.

**Impact:** If any component imports `useAuth` from `@/contexts/auth` (vs `@/contexts/AuthContext`), it will get `undefined` or the App component itself, causing a runtime crash.

**Fix Required:** Delete `/src/contexts/auth.ts` or update it to:
```typescript
export { useAuth } from './AuthContext';
```

---

## FAILURE-007 — authService: Password Not Validated
**Severity:** MEDIUM (acceptable for demo, critical for production)  
**Confidence:** PROVEN  
**File:** `/src/services/authService.ts` lines 34–73  

**Description:**  
The login method finds a user by email only — `credentials.password` is destructured but never checked. Any password grants access to any account.

```typescript
const { email } = credentials; // password is ignored
```

**Impact:** Zero authentication security. Acceptable in demo mode. MUST be replaced before any real user data is stored.

**Fix Required:**  
Replace with `POST /api/auth/login` (or Supabase `signInWithPassword`) when connecting backend. The TODO comment is already present at line 29.

---

## FAILURE-008 — Mock Token in localStorage Is Forgeable
**Severity:** MEDIUM (acceptable for demo)  
**Confidence:** PROVEN  
**File:** `/src/services/authService.ts` lines 72, 89–112  

**Description:**  
Tokens are structured as `mock-token-{userId}-{timestamp}`. The `getSession` method parses this with a regex to recover the userId. Any user can forge a token by knowing a valid userId (which are predictable: `user-001`, `user-emp-001`, etc.).

**Impact:** Session hijacking trivial in demo mode. Not a concern until Supabase JWT is wired.

---
