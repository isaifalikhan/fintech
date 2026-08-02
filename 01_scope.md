# Scope — Finance OS (Elite 0.1)

## Project name
**Finance OS** — internal codename **Elite 0.1**.

## Goal
Ship a **deployable** single-page app with **local/demo persistence**, **AI-assisted** money workflows, and a **calm, 3-click** experience for people who are not accountants.

**Definition of done (Elite 0.1):** app builds, critical flows in `flow_verification.md` pass, and data changes behave predictably with the current service + store layer.

**Verification:** WS-4 Phase 1 gate uses the **sign-off matrix** in `flow_verification.md` (FLOW-001–003). Replace matrix **Pending** cells with **Pass** / **Fail** only after manual runs; scope and shipped behavior stay aligned via `02_product_map.md`, `03_project_memory.md`, and `04_tasks.md`.

## Target users
| User | What they use |
|------|----------------|
| Org owner / admin / viewer | Organization workspace + org-level routes |
| Employee | Employee workspace (`/employee`) |
| Platform admin / manager | Platform console (`/platform`) |

## In scope (product)
- **Auth:** multiple login entry points, session restore, role-based redirect (`AuthContext`, `authService`).
- **Organization workspace:** single-shell app with in-layout views (ledger, imports, logic, reports, team, settings, etc.) — see `02_product_map.md`.
- **Standalone org routes:** profit intelligence, financial reports, AI classification (see map).
- **Employee workspace:** expenses, timesheet, projects, payslips, team, announcements, help, settings.
- **Platform console:** platform dashboard (demo scope).
- **Global UX:** landing, onboarding wizard, command palette, keyboard shortcuts, global AI assistant widget (non-blocking).
- **Data:** mock/seed data + `dataStore` + services written for a future API swap. Local deploy persists a bundled snapshot (`finance_os_data_v1`); employee expense and timesheet mutations use synchronous persist so fast refresh is unlikely to drop those rows (see `03_project_memory.md`, `flow_verification.md` WS-4).

### Payment methods & statement settlement (roadmap — Elite follow-on)

Ship in **slices** (see **`04_tasks.md`** — **SETTLE-001**–**SETTLE-004**; aligns with **ORG-P10** / **FE-028**).

- **Manual-first payments:** Most real-world payments happen outside the app; users record spend and choose **one** payment method per expense (company card, personal/business bank, online wallet, etc.). Splitting one expense across two accounts is **out of scope for v1** except rare edge cases.
- **Wallet balances:** Each registered payment method has a **balance the product understands** (from postings + imported history). When an expense is posted against a method, that wallet’s balance moves accordingly so the UI reflects “what’s left” relative to prior statements and activity.
- **Statements:** Users upload **CSV** (first) and **PDF** (later) from bank or payment-platform exports. On import or refresh, the system **auto-matches** statement lines to existing expenses (amount, date, and text fields as available) and reconciles so totals align with the statement.
- **Integrations:** When a provider is connected under Integration settings, feeds **complement or replace** manual uploads; matching and wallet rules stay the same.
- **AI:** Helps interpret file formats and highlight mismatches; it does **not** replace choosing the payment method on expense entry for the default path.

## Constraints (non-negotiable)
- Do not break **FLOW-001 / FLOW-002 / FLOW-003** (`flow_verification.md`).
- Minimal, backwards-compatible changes unless a task explicitly widens scope.
- Plain language in primary UI; no aggressive CTAs.
- Stack: **React + Vite + TypeScript** and existing patterns unless approved.

## Out of scope (unless re-scoped)
- Production billing (Stripe/Paddle) and real plan enforcement.
- Real email/SMS verification and password recovery.
- Multi-tenant production backend, SSO, and multi-region ops.
- Native mobile apps.
