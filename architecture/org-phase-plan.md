# Organization workspace — 23-phase rollout plan

**Purpose:** One phase per sidebar view (`OrganizationLayout` → `OrganizationWorkspace`). Each phase lists **surfaces** (layout regions), **interaction checks** (not pixel-level), and **suggested agents** for Builder chats.

**Rules**
- One **Builder** chat = one `task_id` row from `04_tasks.md` (Module G: `ORG-P01`–`ORG-P23`) unless a sub-bullet says otherwise.
- **Charts / CTAs:** Recharts expects `data` on the chart root (`LineChart`, `AreaChart`, …), not on each `Line`/`Area`. Decorative layers over charts should use `pointer-events-none` so toggles and buttons stay clickable. If grid lines look “missing,” raise `CartesianGrid` stroke opacity (very low alpha hides them on dark backgrounds).
- **Orchestrator / Master orchestrator** sequences phases; **QA** signs off each phase using the checklist below.
- Must-not-break flows (`flow_verification.md` FLOW-001/002/003) stay green while working through org phases.
- **Do not** duplicate “every pixel”; verify **behaviors** and **critical interactions** only.

**Related:** `04_tasks.md` → Module G. Module B (**FE-021**–**FE-048**) overlaps the same files — **keep the same `status` on both** for a given `primary_file` (e.g. `ORG-P22` ↔ `FE-041`). Phases can be built **out of order**; QA still signs each phase checklist. When a phase is truly done, mark both the `ORG-P**` row and the matching `FE-**` row `done`. **Sequential “next gap”** for the default walk order: first **`pending`** row in Module G — **`ORG-P10`** / Import Statements (**`SETTLE-001`** for CSV gate) unless already advanced.

**Note on naming:** Sidebar label **Finance OS** maps to view id `finance-os` and renders **`OrgDashboard`**. Sidebar **Dashboard** maps to `dashboard` and renders **`FinanceOSView`**.

---

## Phase 0 — Gate (prerequisite)

| Item | Check |
|------|--------|
| FLOW-001 | Auth, session refresh, redirects — `flow_verification.md` |
| FLOW-002 | Employee expenses — matrix |
| FLOW-003 | Employee timesheet — matrix |
| WS-4 | Persistence spot-checks as documented |

**Agents:** QA (verification), Integration/Data/Service/Frontend only if gate failures.

---

## Phase 1 — Finance OS (`finance-os`)

| Field | Value |
|--------|--------|
| **Component** | `OrgDashboard.tsx` |
| **Backlog** | `ORG-P01`, overlaps `FE-021` |
| **Lead agent** | Frontend |

**Surfaces:** Top header / KPI row; main scroll content; any cards/charts; “View all” or secondary actions.

**Interaction checklist**

- [ ] Selecting **Finance OS** in the sidebar shows this view without a runtime error overlay.
- [ ] **Loading:** If services are slow, UI does not assume non-null arrays (uses `useService` / `useServiceArray` patterns).
- [ ] **Empty / no accounts:** KPI or account region degrades gracefully (no crash on `.length` / `.map`).
- [ ] **Primary path:** User can scroll the page and interact with at least one visible CTA without an unhandled exception.
- [ ] **Refresh:** Reloading the browser while on org dashboard does not lose session; view renders again.

**Suggested Builder split:** (1) Frontend — fix regressions vs checklist; (2) QA — record Pass/Fail for Phase 1.

---

## Phase 2 — Dashboard (`dashboard`)

| Field | Value |
|--------|--------|
| **Component** | `FinanceOSView.tsx` |
| **Backlog** | `ORG-P02`, overlaps `FE-022` |
| **Lead agent** | Frontend |

**Surfaces:** Header; main dashboard widgets; navigation within view if any.

**Interaction checklist**

- [ ] Sidebar **Dashboard** mounts `FinanceOSView` without error.
- [ ] No blank screen when data is empty.
- [ ] At least one widget or section renders with real or fallback data without throwing.
- [ ] Refresh preserves org context.

---

## Phase 3 — Profit Intelligence (`profit-intelligence`)

| Field | Value |
|--------|--------|
| **Component** | `ProfitIntelligenceView.tsx` |
| **Backlog** | `ORG-P03`, overlaps `FE-031`, `FE-046` |
| **Lead agent** | Frontend |

**Surfaces:** Chart area; filters/period controls; summary cards.

**Interaction checklist**

- [ ] View loads under org layout.
- [ ] Changing a visible filter or period (if present) updates or fails gracefully (no crash).
- [ ] Empty data: charts/tables do not throw.

---

## Phase 4 — AI Assistant (`ai-assistant`)

| Field | Value |
|--------|--------|
| **Component** | `AIFinancialAssistant.tsx` |
| **Backlog** | `ORG-P04`, overlaps `FE-030` |
| **Lead agent** | Frontend |

**Surfaces:** Chat panel; input; send/action buttons.

**Interaction checklist**

- [ ] View loads; input focus does not error.
- [ ] Send (or primary action) does not cause unhandled exception (mock/API errors handled in UI).
- [ ] Optional: empty thread state is readable.

---

## Phase 5 — Quick Add (`quick-add`)

| Field | Value |
|--------|--------|
| **Component** | `QuickAdd.tsx` |
| **Backlog** | `ORG-P05`, overlaps `FE-023` |
| **Lead agent** | Frontend; **Service** if submit pipeline wrong |

**Surfaces:** Form fields; account selector; submit; validation messages.

**Interaction checklist**

- [ ] Form renders; accounts list uses safe array handling (`useServiceArray`).
- [ ] Validation: invalid submit shows feedback without crash.
- [ ] Successful submit (or mock success) updates data or shows confirmation per design.

---

## Phase 6 — Transactions (`transactions`)

| Field | Value |
|--------|--------|
| **Component** | `TransactionsLedger.tsx` |
| **Backlog** | `ORG-P06`, overlaps `FE-024` |
| **Lead agent** | Frontend; **Data** if category/txn shape issues |

**Surfaces:** Toolbar/filters; table/list; row actions; export if present.

**Interaction checklist**

- [ ] List loads; empty state when no transactions.
- [ ] Filter change does not crash on empty set.
- [ ] One row action (e.g. open edit) or export path completes without uncaught error.

---

## Phase 7 — Recurring (`recurring`)

| Field | Value |
|--------|--------|
| **Component** | `RecurringTransactions.tsx` |
| **Backlog** | `ORG-P07`, overlaps `FE-025` |
| **Lead agent** | Frontend; **Service** for recurring API |

**Surfaces:** List; create/edit modal or panel.

**Interaction checklist**

- [ ] List loads; empty state OK.
- [ ] Create or edit path does not corrupt `dataStore` / shows service error in UI.

---

## Phase 8 — Accounts & Wallets (`accounts`)

| Field | Value |
|--------|--------|
| **Component** | `AccountsWallets.tsx` |
| **Backlog** | `ORG-P08`, overlaps `FE-026` |
| **Lead agent** | Frontend; **Data** for account balances |

**Surfaces:** Account cards/list; filters; add/edit.

**Interaction checklist**

- [ ] Accounts list uses `useServiceArray` or equivalent; no null `.map`.
- [ ] Totals/summary rows handle empty accounts.

---

## Phase 9 — Payment Methods (`payment-methods`)

| Field | Value |
|--------|--------|
| **Component** | `PaymentMethods.tsx` |
| **Backlog** | `ORG-P09`, overlaps `FE-027` |
| **Lead agent** | Frontend |

**Surfaces:** Cards list; bank list; add/delete actions.

**Interaction checklist**

- [x] Page loads without error.
- [x] At least one destructive or add action is safe or disabled with clear UX (no silent crash).

**Status (2026-03-28):** Signed off in `04_tasks.md` — **ORG-P09** / **FE-027** → **`done`**. Next: **Phase 10** (**ORG-P10** / **FE-028**).

---

## Phase 10 — Import Statements (`import`)

| Field | Value |
|--------|--------|
| **Component** | `EnhancedStatementImport.tsx` |
| **Backlog** | `ORG-P10`, overlaps `FE-028` |
| **Lead agent** | Frontend; **Service** for import pipeline |

**Surfaces:** Upload zone; mapping; review table; submit.

**Interaction checklist**

- [ ] Upload or sample flow runs without runtime error.
- [ ] Duplicate detection path does not assume non-null txn lists.

---

## Phase 11 — Logic & Learning (`logic`)

| Field | Value |
|--------|--------|
| **Component** | `EnhancedLogicLearning.tsx` |
| **Backlog** | `ORG-P11`, overlaps `FE-029` |
| **Lead agent** | Frontend; **Service** for rules API |

**Surfaces:** Tabs/views; rules list; test classifier input.

**Interaction checklist**

- [ ] Categories load via `useServiceArray` where applicable.
- [ ] Save or test action returns `ServiceResponse` and UI shows success/error.

---

## Phase 12 — Integrations (`integrations`)

| Field | Value |
|--------|--------|
| **Component** | `IntegrationsSettings.tsx` |
| **Backlog** | `ORG-P12`, overlaps `FE-043` |
| **Lead agent** | Frontend; **Integration** for env/feature flags |

**Surfaces:** Provider cards; toggles; save.

**Interaction checklist**

- [ ] Toggles and fields render.
- [ ] Save or dismiss does not crash; failures are visible or no-op per design.

---

## Phase 13 — Budget Planning (`budgets`)

| Field | Value |
|--------|--------|
| **Component** | `BudgetPlanning.tsx` |
| **Backlog** | `ORG-P13`, overlaps `FE-032` |
| **Lead agent** | Frontend; **Service** (`budgetService`) |

**Surfaces:** Budget list; create/edit dialog; variance if shown.

**Interaction checklist**

- [x] `useServiceArray` for budgets; deps include `orgId` (subscribes to `budgets` so mutations refresh the list).
- [x] Create/edit saves and list refreshes or shows error.

---

## Phase 14 — Cash Flow Forecast (`forecast`)

| Field | Value |
|--------|--------|
| **Component** | `CashFlowForecast.tsx` |
| **Backlog** | `ORG-P14`, overlaps `FE-033` |
| **Lead agent** | Frontend; **Service** for forecast data |

**Surfaces:** Chart; horizon selector; assumptions.

**Interaction checklist**

- [ ] View loads; chart does not throw on empty series.
- [ ] Input change (if any) updates or fails gracefully.

---

## Phase 15 — Project Profitability (`projects`)

| Field | Value |
|--------|--------|
| **Component** | `ProjectProfitability.tsx` |
| **Backlog** | `ORG-P15`, overlaps `FE-034` |
| **Lead agent** | Frontend; **Data** for projects in store |

**Surfaces:** Project list/detail; metrics.

**Interaction checklist**

- [ ] Empty projects: empty state, no crash.
- [ ] Selecting a project (if applicable) does not error.

---

## Phase 16 — What-If Simulator (`simulator`)

| Field | Value |
|--------|--------|
| **Component** | `WhatIfSimulator.tsx` |
| **Backlog** | `ORG-P16`, overlaps `FE-035` |
| **Lead agent** | Frontend |

**Surfaces:** Sliders/inputs; results panel.

**Interaction checklist**

- [x] Adjusting inputs updates results without NaN/throw.
- [x] Edge inputs handled (zero, max).

---

## Phase 17 — Costing & Pricing (`costing`)

| Field | Value |
|--------|--------|
| **Component** | `CostingPricing.tsx` |
| **Backlog** | `ORG-P17`, overlaps `FE-036` |
| **Lead agent** | Frontend; **Service** if costing pulls reports |

**Surfaces:** Input grids; department/project selectors; output.

**Interaction checklist**

- [ ] View loads; primary calculation path runs or shows empty state.

---

## Phase 18 — Assets & Depreciation (`assets`)

| Field | Value |
|--------|--------|
| **Component** | `AssetsDepreciationView.tsx` |
| **Backlog** | `ORG-P18`, overlaps `FE-039` |
| **Lead agent** | Frontend; **Data** for assets/depreciation |

**Surfaces:** Register tab; depreciation tab; add asset.

**Interaction checklist**

- [ ] `useServiceArray` for assets and depreciation schedules where used.
- [ ] Tab switch does not crash on empty data.

---

## Phase 19 — Inventory Management (`inventory`)

| Field | Value |
|--------|--------|
| **Component** | `InventoryManagementView.tsx` |
| **Backlog** | `ORG-P19`, overlaps `FE-040` |
| **Lead agent** | Frontend; **Data** |

**Surfaces:** Items list; transactions subview; low-stock alerts if any.

**Interaction checklist**

- [ ] Inventory items load safely when empty.
- [ ] Secondary view switch does not throw.

---

## Phase 20 — Reports (`reports`)

| Field | Value |
|--------|--------|
| **Component** | `ReportsView.tsx` |
| **Backlog** | `ORG-P20`, overlaps `FE-037`, `FE-047` |
| **Lead agent** | Frontend; **Service** for report data |

**Surfaces:** Report picker; date range; export.

**Interaction checklist**

- [ ] At least one report type renders or shows empty state.
- [ ] Export/generate does not uncaught-reject.

---

## Phase 21 — Loans & Liabilities (`loans`)

| Field | Value |
|--------|--------|
| **Component** | `LoansView.tsx` |
| **Backlog** | `ORG-P21`, overlaps `FE-038` |
| **Lead agent** | Frontend; **Service** |

**Surfaces:** Loans list; add loan; payment schedule if any.

**Interaction checklist**

- [ ] List loads; empty state OK.
- [ ] Add or edit path respects `ServiceResponse`.

---

## Phase 22 — Team & Permissions (`team`)

| Field | Value |
|--------|--------|
| **Component** | `TeamPermissions.tsx` |
| **Backlog** | `ORG-P22`, overlaps `FE-041` |
| **Lead agent** | Frontend; **Service** for members; **Integration** if roles affect routing |

**Surfaces:** Member list; role controls; invite/save.

**Interaction checklist**

- [ ] Members load; `useService` nulls handled.
- [ ] Role change or save shows feedback and does not corrupt session.

---

## Phase 23 — Settings (`settings`)

| Field | Value |
|--------|--------|
| **Component** | `OrgSettings.tsx` |
| **Backlog** | `ORG-P23`, overlaps `FE-042` |
| **Lead agent** | Frontend; **Service** (`organizationService`); **Integration** if auth/org sync |

**Surfaces:** Tabbed sections (general, financial, team, notifications, security, audit, data, billing).

**Interaction checklist**

- [ ] Each subview mounts without missing imports/runtime errors.
- [ ] Save actions toast or error consistently.
- [ ] Linked views (`ActiveSessionsView`, `AuditLogView`, `DataExportCenter`) open without crash when selected inside settings.

---

## Out of sidebar but in workspace (optional follow-ups)

| View id | Component | Note |
|---------|-----------|------|
| `active-sessions` | `ActiveSessionsView.tsx` | Reachable from Settings; task `FE-044` |
| `audit-log` | `AuditLogView.tsx` | Reachable from Settings; task `FE-045` |

Track as sub-checks under Phase 23 or separate tiny QA tasks.

---

## Agent quick reference

| Agent | Use for |
|-------|---------|
| **Frontend** | UI, loading/empty, `useService` / `useServiceArray` usage in components |
| **Service** | `ServiceResponse`, service methods, wrong unwrap before `useService` |
| **Data** | `dataStore`, seeds, schema version, org-scoped lists |
| **Integration** | Auth, redirects, org role gates, env |
| **QA** | Checklists above, `flow_verification.md`, marking tasks `done` / `blocked` |
| **Orchestrator** | Order of phases; unblocking; **do not** implement code unless asked |
| **Builder** | One task_id per chat; minimal diff |

---

## Mapping ORG-P** → legacy Module B ids

| Phase | ORG | FE- (Module B) |
|-------|-----|----------------|
| Shell (cross-cutting) | — | FE-020 |
| 1 | ORG-P01 | FE-021 |
| 2 | ORG-P02 | FE-022 |
| 3 | ORG-P03 | FE-031, FE-046 |
| 4 | ORG-P04 | FE-030 |
| 5 | ORG-P05 | FE-023 |
| 6 | ORG-P06 | FE-024 |
| 7 | ORG-P07 | FE-025 |
| 8 | ORG-P08 | FE-026 |
| 9 | ORG-P09 | FE-027 |
| 10 | ORG-P10 | FE-028 |
| 11 | ORG-P11 | FE-029 |
| 12 | ORG-P12 | FE-043 |
| 13 | ORG-P13 | FE-032 |
| 14 | ORG-P14 | FE-033 |
| 15 | ORG-P15 | FE-034 |
| 16 | ORG-P16 | FE-035 |
| 17 | ORG-P17 | FE-036 |
| 18 | ORG-P18 | FE-039 |
| 19 | ORG-P19 | FE-040 |
| 20 | ORG-P20 | FE-037, FE-047 |
| 21 | ORG-P21 | FE-038 |
| 22 | ORG-P22 | FE-041 |
| 23 | ORG-P23 | FE-042, FE-044, FE-045 |

---

## Implementation log (engineering)

| Date | Phase / area | Change |
|------|----------------|--------|
| 2026-03-28 | Global (`dataStore`) | **BUG-004:** `notify(collection, persistImmediately?)`; employee expense/timesheet mutations pass `true` for synchronous `localStorage` write; `beforeunload` flushes pending debounced saves. Reduces data loss on fast refresh across org + employee surfaces. |
| 2026-03-28 | Phase 1 (`OrgDashboard` profit block) | `CartesianGrid` stroke opacity increased for dark/light; decorative gradient orbs `pointer-events-none` so period/series controls receive clicks. |
| 2026-03-28 | Phase 16 (`WhatIfSimulator`) | `projectionChartData` merges scenario + `baselineProfit`; `<LineChart data={…}>` — Recharts lines do not use per-`Line` `data` props. |
| 2026-03-28 | Parallel phases (13, 16, 22) + task alignment | Budgets (**P13**), What-If (**P16**), Team (**P22**) advanced ahead of **P09**–**P12** / **P14**–**P15** / **P17**–**P21**; `04_tasks.md` Module G ↔ Module B statuses kept aligned per `primary_file`. |
| 2026-04-02 | Phase 13 — Budget Planning | **ORG-P13** / **FE-032** signed **`done`**: `useServiceArray(..., ['budgets'])`, loading/empty/error UI, `ServiceResponse` checks on create/update/delete/template. |
| 2026-03-28 | Phase 9 — Payment Methods | **ORG-P09** / **FE-027** marked **`done`** (bugs ORG-P09-001/002 + scope); linear org rollout **next** = **Phase 10** (**ORG-P10** / **FE-028** + **SETTLE-001**). |
