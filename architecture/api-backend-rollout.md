# API backend rollout — Finance OS

**Purpose:** Single checklist for REST routes (`/api/v1/...`) that replace or back each **existing service** in `src/services/`. **No endpoint omitted** from the list below.

**Local workflow:** This plan is for **implementation order and parity** with the app — not tied to GitHub issues or CI. **Track progress in [`04_tasks.md`](../04_tasks.md) → Module H** (`API-000`–`API-019`); no remote required.

**Conventions**

- **Response shape:** `ServiceResponse<T>` (or HTTP mapping: `200` + body aligned with `{ success, data, message?, error? }`; `4xx/5xx` with stable error codes).
- **Auth:** `POST /auth/login` sets session; subsequent calls use **cookie** or `Authorization` — mirror what `authService` expects when swapped.
- **Org scope:** Routes under `/organizations/:orgId/...` require membership + role checks (same rules as today’s client-side gates, enforced server-side).
- **Employee “me”:** Prefer `GET/PATCH .../organizations/:orgId/me/...` with **resolved user from session**; alternative `.../users/:userId/...` only with strict **userId === session user** (or admin) checks.

**Helpers (not necessarily separate HTTP routes)**

- `hasPermission`, `getRedirectPath`: stay **server-side** or derive from **session payload** (roles + org list) on the client — no new public routes required unless product wants explicit `GET /api/v1/auth/redirect-target`.

---

## Wave overview (build order)

| Wave | Sections | Services | Why |
|------|------------|----------|-----|
| **W1** | §1 Auth, §3 Org (read/update/members), §18 Employee | `authService`, `organizationService`, `employeeService` | FLOW-001/002/003, login, org context, must-not-break employee flows |
| **W2** | §4 Transactions, §5 Accounts & bank, §6 Categories | `transactionService`, `accountService`, `categoryService` | Core org money flows |
| **W3** | §13 Reports (dashboard subset first if needed), §9 Recurring, §16 Import | `reportService`, `recurringTransactionService`, `importService` | Dashboards + ingestion |
| **W4** | §7–§12 Departments, Projects, Budgets, Assets, Inventory | `departmentService`, `projectService`, `budgetService`, `assetService`, `inventoryService` | Feature parity |
| **W5** | §14 Classification + patterns, §15 Notifications, §17 Audit | `classificationService`, `patternEngineService`, `notificationService`, `auditService` | Automation & ops |
| **W6** | §2 Platform, §19 AI org settings | `platformService`, `aiSettingsService` (or merged org settings) | Platform role + AI prefs |

**Parallel work:** OpenAPI/spec generation and a thin **`apiClient`** wrapper can run alongside W1; UI migration is **per feature**, not all-at-once.

---

## §1 — Auth & sessions (`authService`)

**Login body (SaaS tenant):** `POST /auth/login` accepts JSON `{ "email", "password", "orgSlug?" }` (paths relative to `/api/v1` base). **`orgSlug`** is optional: when set, it must match the tenant (e.g. from `/login/employee/:orgSlug`); the server resolves the organization and membership before issuing a session. When omitted, behavior matches legacy primary-membership resolution (mock) or your backend’s default.

| Method | HTTP |
|--------|------|
| `login` | `POST /api/v1/auth/login` |
| `logout` | `POST /api/v1/auth/logout` |
| `getSession` | `GET /api/v1/auth/session` |
| `getUserOrganizations` | `GET /api/v1/users/:userId/organizations` |
| `getUserRole` | `GET /api/v1/organizations/:orgId/membership` *(or embed in session)* |
| `getActiveSessions` | `GET /api/v1/users/:userId/sessions` |
| `endSession` | `DELETE /api/v1/sessions/:sessionId` |
| `endAllOtherSessions` | `POST /api/v1/users/:userId/sessions/end-others` |

---

## §2 — Platform console (`platformService`) — platform role

| Method | HTTP |
|--------|------|
| `getStats` | `GET /api/v1/platform/stats` |
| `getPlans` | `GET /api/v1/platform/plans` |
| `getPlanById` | `GET /api/v1/platform/plans/:id` |
| `getOrgMeta` | `GET /api/v1/platform/organizations/:orgId/meta` |
| `getAllOrgMeta` | `GET /api/v1/platform/organizations/meta` |
| `getBillingStats` | `GET /api/v1/platform/billing/stats` |

---

## §3 — Organization admin (`organizationService`)

| Method | HTTP |
|--------|------|
| `get` / `getById` | `GET /api/v1/organizations/:orgId` |
| `update` | `PATCH /api/v1/organizations/:orgId` |
| `delete` | `DELETE /api/v1/organizations/:orgId` |
| `getMembers` | `GET /api/v1/organizations/:orgId/members` |
| `addMember` | `POST /api/v1/organizations/:orgId/members` |
| `updateMemberRole` | `PATCH /api/v1/organizations/:orgId/members/:userId` |
| `removeMember` | `DELETE /api/v1/organizations/:orgId/members/:userId` |

---

## §4 — Transactions (`transactionService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/transactions` |
| `getById` | `GET /api/v1/organizations/:orgId/transactions/:id` |
| `create` | `POST /api/v1/organizations/:orgId/transactions` |
| `update` | `PATCH /api/v1/organizations/:orgId/transactions/:id` |
| `delete` | `DELETE /api/v1/organizations/:orgId/transactions/:id` |
| `bulkCategorize` | `POST /api/v1/organizations/:orgId/transactions/bulk-categorize` |
| `bulkDelete` | `POST /api/v1/organizations/:orgId/transactions/bulk-delete` |
| `getStats` | `GET /api/v1/organizations/:orgId/transactions/stats` |

*Query:* filters + pagination on `getAll` / `getStats` as today’s service params.

---

## §5 — Accounts & bank (`accountService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/accounts` |
| `getById` | `GET /api/v1/organizations/:orgId/accounts/:id` |
| `create` | `POST /api/v1/organizations/:orgId/accounts` |
| `update` | `PATCH /api/v1/organizations/:orgId/accounts/:id` |
| `delete` | `DELETE /api/v1/organizations/:orgId/accounts/:id` |
| `getAccountTree` | `GET /api/v1/organizations/:orgId/accounts/tree` |
| `getBankAccounts` | `GET /api/v1/organizations/:orgId/bank-accounts` |
| `createBankAccount` | `POST /api/v1/organizations/:orgId/bank-accounts` |
| `updateBankAccount` | `PATCH /api/v1/organizations/:orgId/bank-accounts/:id` |
| `deleteBankAccount` | `DELETE /api/v1/organizations/:orgId/bank-accounts/:id` |
| `getBalanceSheet` | `GET /api/v1/organizations/:orgId/reports/balance-sheet` |

---

## §6 — Categories (`categoryService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/categories` |
| `getById` | `GET /api/v1/organizations/:orgId/categories/:id` |
| `create` | `POST /api/v1/organizations/:orgId/categories` |
| `update` | `PATCH /api/v1/organizations/:orgId/categories/:id` |
| `delete` | `DELETE /api/v1/organizations/:orgId/categories/:id` |
| `addPattern` | `POST /api/v1/organizations/:orgId/categories/:id/patterns` |
| `removePattern` | `DELETE /api/v1/organizations/:orgId/categories/:id/patterns` |
| `getUsageStats` | `GET /api/v1/organizations/:orgId/categories/usage-stats` |

*Note:* `removePattern` may be query/body for pattern string — align with existing service signature.

---

## §7 — Departments (`departmentService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/departments` |
| `getById` | `GET /api/v1/organizations/:orgId/departments/:id` |
| `create` | `POST /api/v1/organizations/:orgId/departments` |
| `update` | `PATCH /api/v1/organizations/:orgId/departments/:id` |
| `delete` | `DELETE /api/v1/organizations/:orgId/departments/:id` |
| `getProfitability` | `GET /api/v1/organizations/:orgId/departments/profitability` |

---

## §8 — Projects (`projectService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/projects` |
| `getById` | `GET /api/v1/organizations/:orgId/projects/:id` |
| `create` | `POST /api/v1/organizations/:orgId/projects` |
| `update` | `PATCH /api/v1/organizations/:orgId/projects/:id` |
| `delete` | `DELETE /api/v1/organizations/:orgId/projects/:id` |
| `getProfitability` | `GET /api/v1/organizations/:orgId/projects/profitability` |
| `getProjectTransactions` | `GET /api/v1/organizations/:orgId/projects/:projectId/transactions` |

---

## §9 — Recurring transactions (`recurringTransactionService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/recurring-transactions` |
| `create` | `POST /api/v1/organizations/:orgId/recurring-transactions` |
| `update` | `PATCH /api/v1/organizations/:orgId/recurring-transactions/:id` |
| `delete` | `DELETE /api/v1/organizations/:orgId/recurring-transactions/:id` |
| `toggle` | `POST /api/v1/organizations/:orgId/recurring-transactions/:id/toggle` |

---

## §10 — Assets (`assetService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/assets` |
| `getById` | `GET /api/v1/organizations/:orgId/assets/:id` |
| `create` | `POST /api/v1/organizations/:orgId/assets` |
| `update` | `PATCH /api/v1/organizations/:orgId/assets/:id` |
| `dispose` | `POST /api/v1/organizations/:orgId/assets/:id/dispose` |
| `getDepreciationSchedule` | `GET /api/v1/organizations/:orgId/assets/:assetId/depreciation-schedule` |
| `postDepreciation` | `POST /api/v1/organizations/:orgId/assets/:assetId/depreciation` |
| `getSummary` | `GET /api/v1/organizations/:orgId/assets/summary` |

---

## §11 — Inventory (`inventoryService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/inventory/items` |
| `getById` | `GET /api/v1/organizations/:orgId/inventory/items/:id` |
| `create` | `POST /api/v1/organizations/:orgId/inventory/items` |
| `update` | `PATCH /api/v1/organizations/:orgId/inventory/items/:id` |
| `recordTransaction` | `POST /api/v1/organizations/:orgId/inventory/transactions` |
| `getTransactions` | `GET /api/v1/organizations/:orgId/inventory/items/:itemId/transactions` |
| `getLowStockAlerts` | `GET /api/v1/organizations/:orgId/inventory/low-stock` |
| `getValuation` | `GET /api/v1/organizations/:orgId/inventory/valuation` |

---

## §12 — Budgets (`budgetService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/budgets` |
| `getById` | `GET /api/v1/organizations/:orgId/budgets/:id` |
| `create` | `POST /api/v1/organizations/:orgId/budgets` |
| `update` | `PATCH /api/v1/organizations/:orgId/budgets/:id` |
| `delete` | `DELETE /api/v1/organizations/:orgId/budgets/:id` |
| `getVarianceAnalysis` | `GET /api/v1/organizations/:orgId/budgets/variance` |
| `getAlerts` | `GET /api/v1/organizations/:orgId/budgets/alerts` |

---

## §13 — Reports (`reportService`)

| Method | HTTP |
|--------|------|
| `getDashboardSummary` | `GET /api/v1/organizations/:orgId/reports/dashboard` |
| `getProfitLoss` | `GET /api/v1/organizations/:orgId/reports/profit-loss` |
| `getCashFlow` | `GET /api/v1/organizations/:orgId/reports/cash-flow` |
| `getExpenseBreakdown` | `GET /api/v1/organizations/:orgId/reports/expense-breakdown` |
| `getRevenueBreakdown` | `GET /api/v1/organizations/:orgId/reports/revenue-breakdown` |
| `getForecast` | `GET /api/v1/organizations/:orgId/reports/forecast` |

*W3 tip:* Implement **dashboard** + **profit-loss** first if UI needs a thin slice; rest in same wave or immediately after.

---

## §14 — Classification & patterns (`classificationService`, `patternEngineService`)

| Method | HTTP |
|--------|------|
| `classify` | `POST /api/v1/organizations/:orgId/classification/classify` |
| `batchClassify` | `POST /api/v1/organizations/:orgId/classification/batch` |
| `learnFromCorrection` | `POST /api/v1/organizations/:orgId/classification/learn` |
| `getRules` | `GET /api/v1/organizations/:orgId/classification/rules` |
| `addRule` | `POST /api/v1/organizations/:orgId/classification/rules` |
| `deleteRule` | `DELETE /api/v1/organizations/:orgId/classification/rules/:ruleId` |
| `getStats` | `GET /api/v1/organizations/:orgId/classification/stats` |
| `patternEngineService.suggestForNarration` | `POST /api/v1/organizations/:orgId/patterns/suggest` |
| `patternEngineService.learnFromCorrection` | `POST /api/v1/organizations/:orgId/patterns/learn` |

---

## §15 — Notifications (`notificationService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/users/:userId/organizations/:orgId/notifications` |
| `getUnreadCount` | `GET /api/v1/users/:userId/organizations/:orgId/notifications/unread-count` |
| `markAsRead` | `PATCH /api/v1/notifications/:id/read` |
| `markAllAsRead` | `POST /api/v1/users/:userId/organizations/:orgId/notifications/read-all` |
| `create` | `POST /api/v1/users/:userId/organizations/:orgId/notifications` |
| `delete` | `DELETE /api/v1/notifications/:id` |

*Security:* `userId` must match session user for user-scoped routes.

---

## §16 — Statement import (`importService`)

| Method | HTTP |
|--------|------|
| `previewFile` | `POST /api/v1/organizations/:orgId/imports/preview` *(multipart)* |
| `executeImport` | `POST /api/v1/organizations/:orgId/imports/execute` |
| `getHistory` | `GET /api/v1/organizations/:orgId/imports/history` |

---

## §17 — Audit (`auditService`)

| Method | HTTP |
|--------|------|
| `getAll` | `GET /api/v1/organizations/:orgId/audit-logs` |

---

## §18 — Employee workspace (`employeeService`) — must-not-break

| Method | HTTP |
|--------|------|
| `getExpenses` | `GET /api/v1/organizations/:orgId/me/expenses` |
| `createExpense` | `POST /api/v1/organizations/:orgId/me/expenses` |
| `submitExpense` | `POST /api/v1/organizations/:orgId/me/expenses/:id/submit` |
| `getPayslips` | `GET /api/v1/organizations/:orgId/me/payslips` |
| `getTimesheets` | `GET /api/v1/organizations/:orgId/me/timesheets` |
| `createTimesheetEntry` | `POST /api/v1/organizations/:orgId/me/timesheets` |
| `submitTimesheet` | `POST /api/v1/organizations/:orgId/me/timesheets/submit-week` |
| `getTeamDirectory` | `GET /api/v1/organizations/:orgId/team-directory` |
| `getAnnouncements` | `GET /api/v1/organizations/:orgId/announcements` |
| `getDashboardSummary` | `GET /api/v1/organizations/:orgId/me/employee-dashboard` |

*Alternative:* `/users/:userId/...` with strict auth parity to current `employeeService` guards.

---

## §19 — AI org settings (`aiSettingsService` / localStorage today)

| Purpose | HTTP |
|---------|------|
| Replace `getOrgAiSettings` | `GET /api/v1/organizations/:orgId/ai-settings` |
| Replace `saveOrgAiSettings` | `PATCH /api/v1/organizations/:orgId/ai-settings` |

---

## Coverage checklist (all sections)

Use this when closing a wave — every box should map to a merged route + integration test or manual FLOW row.

- [ ] **§1** Auth (8 + session strategy)
- [ ] **§2** Platform (6)
- [ ] **§3** Org (8)
- [ ] **§4** Transactions (8)
- [ ] **§5** Accounts & bank + balance sheet (11)
- [ ] **§6** Categories (8)
- [ ] **§7** Departments (6)
- [ ] **§8** Projects (7)
- [ ] **§9** Recurring (5)
- [ ] **§10** Assets (8)
- [ ] **§11** Inventory (8)
- [ ] **§12** Budgets (7)
- [ ] **§13** Reports (6)
- [ ] **§14** Classification + patterns (9)
- [ ] **§15** Notifications (6)
- [ ] **§16** Import (3)
- [ ] **§17** Audit (1)
- [ ] **§18** Employee (10)
- [ ] **§19** AI settings (2)

**Endpoint count (rough):** 8+6+8+8+11+8+6+7+5+8+8+7+6+9+6+3+1+10+2 = **127** mapped operations (some DELETE pattern routes are two lines in §6 — adjust OpenAPI to single canonical path per verb).

---

## Suggested execution per wave

1. **Spec first:** OpenAPI 3.1 (or Zod) for W1 routes; reuse DTOs from `src/services/types.ts`.
2. **Adapter pattern:** Keep `*Service` method names; swap internals from `dataStore` to `fetch(apiClient...)`.
3. **W1 gate:** FLOW-001/002/003 pass with real or mocked server; employee expenses/timesheet unchanged from UX perspective.
4. **W2+:** Enable feature flags per org or global `VITE_API_BASE_URL` empty = mock, non-empty = HTTP.

---

## Related docs

- Must-not-break flows: `flow_verification.md`
- Org UI phases (parallel concern): `architecture/org-phase-plan.md`
- Tasks backlog: `04_tasks.md`

*Last updated: 2026-03-28 — phased API plan aligned with service layer inventory.*
