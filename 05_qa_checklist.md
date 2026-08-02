# QA checklist — Finance OS

## Functional
- [x] Login succeeds for demo accounts per `flow_verification.md`
- [x] Session restores after refresh (`finance_os_token` behavior)
- [x] Protected routes redirect when logged out
- [x] Employee: create expense (draft + submit) if in scope
- [x] Employee: timesheet timer/manual + submit week if in scope

## UI
- [x] No broken layouts on primary routes (desktop)
- [x] Primary actions visible; no aggressive CTA spam
- [x] Loading and empty states where data can be empty

## API / services (mock layer)
- [x] Service methods return `ServiceResponse` shape consistently
- [x] Hooks receive full response (no accidental `.data` strip before `useService`)

## Edge cases
- [x] Invalid login shows error without crash
- [x] Rapid navigation does not leave stale auth state
- [x] Org switch (if used) updates role/data

## Duplicate actions
- [x] Double-click submit does not duplicate writes unexpectedly
- [x] Buttons disabled or idempotent where needed

## Performance basics
- [x] Initial load acceptable on dev machine
- [x] No obvious infinite re-render loops on main screens
