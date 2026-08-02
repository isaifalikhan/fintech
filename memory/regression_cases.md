# MARQ Regression Cases
## Finance OS for Agencies — v0.9 Pre-Supabase
### Generated: 2026-03-07 | MARQ Code Intelligence OS v3.2

---

These cases must pass after every code change. They are derived from known failures and existing working flows.

---

## RC-001 — Expense Form Submission Roundtrip
**Derived From:** FAILURE-001  
**Priority:** P0 — Blocks Employee CRUD milestone  

**Precondition:** User is authenticated as employee (`user-emp-001`), org `org-001`  

**Steps:**
1. Navigate to `/employee` → My Expenses
2. Click "New Expense"
3. Fill in: Description = "Test Expense", Category = "Software", Amount = 99.00
4. Click "Submit Claim"

**Expected Result:**
- `employeeService.createExpense()` called with correct orgId / userId / form data
- New expense appears at top of the list with status `draft` or `submitted`
- Summary cards update (Pending total increases by $99.00)
- Form closes / resets

**Failure Indicators:**
- Button click does nothing
- Console shows no service call
- Expense list unchanged

---

## RC-002 — Timesheet Timer → Entry Creation
**Derived From:** FAILURE-002  
**Priority:** P0 — Blocks Employee CRUD milestone  

**Precondition:** User authenticated as employee, timer shows 00:00:00  

**Steps:**
1. Select project from dropdown
2. Click "Start" — timer begins
3. Wait a few seconds, click "Stop"
4. Confirm or adjust hours in dialog

**Expected Result:**
- `employeeService.createTimesheetEntry()` called with project, task, hours
- New entry appears in "Time Entries" list with status `logged`
- Today's hours card updates
- Weekly grid bar updates

**Failure Indicators:**
- Stop button only toggles timer display
- No new entry in list
- Service method never called

---

## RC-003 — Timesheet Week Submission
**Derived From:** FAILURE-002  
**Priority:** P1  

**Precondition:** At least two `logged` entries exist  

**Steps:**
1. Navigate to My Timesheet
2. Click "Submit Week" (or per-entry submit)
3. Confirm

**Expected Result:**
- `employeeService.submitTimesheet(draftIds)` called
- Entries change from `logged` → `submitted`
- Status badges update in the list

---

## RC-004 — Employee Dashboard KPI Data Flow
**Derived From:** FAILURE-003  
**Priority:** P1  

**Steps:**
1. Login as employee
2. Navigate to `/employee` (EmployeeDashboard renders)
3. Inspect "Hours This Week" KPI card

**Expected Result:**
- `employeeService.getDashboardSummary()` is called
- KPI shows `hoursThisWeek` from service data (24h from seed timesheets: ts-001 6h + ts-002 2h + ts-003 8h + ts-004 4h + ts-005 4h = 24h)
- NOT the hardcoded fallback `34.5`

**Failure Indicators:**
- "Hours This Week" always shows `34.5h` (the fallback value)
- Network/service call error state is silent

---

## RC-005 — MyProjects Live Data Loading
**Derived From:** FAILURE-004  
**Priority:** P1  

**Steps:**
1. Login as employee, navigate to My Projects

**Expected Result:**
- `projectService.getAll(orgId)` is called
- If service returns data, project cards are populated from service (not mockMyProjects)
- Project names match the org's actual projects from dataStore

**Failure Indicators:**
- Always shows "Mobile App Development", "Website Redesign", "Internal Tools Migration" (hardcoded mock) regardless of current org

---

## RC-006 — Expense Claim Status Filter
**Priority:** P2  

**Steps:**
1. Navigate to My Expenses
2. Click "pending" filter button
3. Click "approved" filter button

**Expected Result:**
- Only expenses with matching status are shown
- Count label updates
- "all" shows full list

---

## RC-007 — Organization Switch Preserves Employee Data
**Derived From:** FAILURE-005  
**Priority:** P2  

**Precondition:** Employee data is seeded  

**Steps:**
1. Login as employee (org-001)
2. Create an expense via form
3. (Future) Switch to a different org

**Expected Result:**
- Expense data is scoped to org-001
- Switching org shows org-002's data, not org-001's

---

## RC-008 — Auth Session Restore
**Priority:** P0 — Core infrastructure  

**Steps:**
1. Login as any user
2. Refresh the page

**Expected Result:**
- Token found in localStorage
- `authService.getSession(token)` called
- User re-authenticated without login screen
- Redirected to correct portal

**Failure Indicators:**
- Login page shown on refresh
- `auth.ts` orphan import causes crash

---

## RC-009 — Protected Route Enforcement
**Priority:** P0  

**Steps:**
1. Navigate to `/dashboard` without being logged in
2. Navigate to `/platform` as an employee
3. Navigate to `/employee` as an org admin

**Expected Result:**
- Unauthenticated: redirect to `/`
- Employee on `/platform`: redirect to `/employee`
- Org admin on `/employee`: redirect to `/dashboard`

---

## RC-010 — Notification Read/Unread
**Priority:** P2  

**Steps:**
1. Login as any user
2. Open Notification Center
3. Click "Mark All Read"

**Expected Result:**
- `notificationService.markAllAsRead()` called
- Unread badge count drops to 0
- All notification items show as read

---

## RC-011 — Transaction Bulk Categorize
**Priority:** P2  

**Steps:**
1. Login as org admin
2. Navigate to Transactions
3. Select 3 transactions via checkboxes
4. Apply a category via bulk action

**Expected Result:**
- `transactionService.bulkCategorize(ids, categoryId)` called
- Transactions show updated category
- `dataStore.notify('transactions')` fires

---

## RC-012 — useService Refetch on Dependency Change
**Priority:** P1 — Core hook correctness  

**Steps:**
1. Render any component using `useService(() => svc.someMethod(), [svc.orgId])`
2. Switch organization

**Expected Result:**
- `useService` detects `orgId` dependency change
- Re-invokes the service function
- `loading` briefly becomes `true`
- `data` updates with new org's data

---
