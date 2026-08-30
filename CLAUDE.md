# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Finance OS** (internal codename **Elite 0.1**) — a multi-tenant SaaS accounting/finance platform for
agencies and software houses, with AI-assisted transaction categorization ("logic-first" instead of
traditional accounting jargon), multi-currency accounts, department/project costing, and three distinct
workspaces: **Platform** (super admin), **Organization** (business owner/team), and **Employee**.

The README (`README.md`) describes an earlier mock-only prototype phase ("No backend required"). That
is now out of date: the repo has a real Express + SQLite backend and an optional Supabase backend layered
on top of the original frontend-only design. Prefer this file and `03_project_memory.md` /
`04_tasks.md` over `README.md` for current architecture.

## Commands

Package manager is **pnpm** (`pnpm-workspace.yaml`, `.npmrc` pin `better-sqlite3`/`esbuild`/`@tailwindcss/oxide`
builds). A `package-lock.json` also exists but pnpm is the intended tool — use `pnpm`, not `npm`.

```bash
pnpm dev          # Vite dev server only — browser localStorage persistence, no backend needed
pnpm dev:server   # Express API only (tsx watch server/index.ts), port 3001
pnpm dev:full     # Vite + Express together, VITE_USE_LOCAL_DB=true, SQLite as single source of truth
pnpm build        # vite build
pnpm db:push      # drizzle-kit push — sync server/db/schema.ts to data/finance-os.db
pnpm db:studio    # drizzle-kit studio — browse the SQLite DB
pnpm db:seed      # tsx server/seed.ts
pnpm check:api-001  # smoke-check that /auth/session and /auth/login respond (server must be running)
```

There is **no lint script, no test script, and no test framework configured** in this repo (no
`vitest`/`jest` config, no `*.test.*`/`*.spec.*` files). Don't invent one; verify changes by running the
app (`pnpm dev` or `pnpm dev:full`) and exercising the flow, per the "For UI or frontend changes" rule.

### Three data-backend modes (pick one via `.env.local`, copied from `.env.example`)

1. **Mock only** (default): `VITE_API_BASE_URL` unset — everything reads/writes the in-memory
   `dataStore`, persisted to browser `localStorage` under key `finance_os_data_v1`.
2. **Local Express + SQLite**: `VITE_API_BASE_URL=/api/v1` + `VITE_USE_LOCAL_DB=true`, run `pnpm dev:full`.
   Vite proxies `/api` → `http://localhost:3001` (`vite.config.ts`).
3. **Supabase**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (+ `VITE_USE_SUPABASE_DATA=true`) — bundle
   syncs to Supabase table `finance_os_app_bundle` (`supabase/schema.sql`) after Supabase Auth login.

Server-only env vars (`server/config/env.ts`, read via `dotenv`, never `VITE_`-prefixed): `JWT_SECRET`
(required when `NODE_ENV=production`; auto-generates an ephemeral dev secret otherwise — sessions won't
survive a restart until you set it), `JWT_EXPIRES_IN`, `CORS_ORIGIN` (exact match, no wildcard —
session cookie relies on it for CSRF via `SameSite=Lax`), `COOKIE_SECURE`, `COOKIE_DOMAIN`,
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (admin API only, optional — routes needing it 501 cleanly
if unset instead of failing server boot).

## Architecture

### Three workspaces, one router

Routing lives in `src/app/App.tsx`. Role-gated route wrappers (`ProtectedRoute`, `PlatformRoute`,
`EmployeeRoute`) redirect based on `useAuth()` from `AuthContext`:

- `/platform` — `platform_admin` / `platform_manager` only → `PlatformDashboard`
- `/dashboard`, `/organization`, `/organization/workspace` — `owner`/`admin`/`viewer` → `OrganizationWorkspace`
  (single shell, in-layout view switching — see `02_product_map.md` Module B for the full view-key list)
- `/employee` — `employee` role (platform admins/managers can also view it) → `EmployeeWorkspace`
- `/profit-intelligence`, `/financial-reports`, `/ai-classification` — standalone org-role pages outside
  the workspace shell
- Login entry points: `/login`, `/login/admin`, `/login/platform`, `/login/employee[/:orgSlug]`, `/login/bing`

Nearly every workspace/overlay component is `React.lazy`-loaded; wrap new heavy views the same way and
keep them inside the existing `ErrorBoundary` / `SilentErrorBoundary` pattern (overlays like
`MagneticCursor`, `CommandPalette`, `AIAssistantChat` fail silently so a crash there can't blank the app).

**Dead-code trap:** `src/app/components/OrganizationDashboard.tsx` and `OrganizationDashboardTest.tsx`
still exist alongside `OrganizationDashboardModern.tsx`, but only `OrganizationDashboardModern.tsx` is
imported in `App.tsx` (as `OrganizationDashboard`, for the `/organization` route). Check `App.tsx`'s
imports before editing anything named `OrganizationDashboard*` — the other two are unrouted.

### Service layer is the swap boundary — never bypass it

```
React components → src/services/*.ts (async, return ServiceResponse<T>) → dataStore | HTTP API | Supabase
```

This indirection (see the diagram atop `src/services/index.ts`) exists so the **data backend can change
without touching UI code**. Rules that follow from this:

- Components must never import `dataStore` directly to read/write app data — always go through a service.
  (Exception: components read `dataStore` collections indirectly by naming them in a hook's
  `subscribeToCollections` argument, not by importing the store.)
- Every service method returns `ServiceResponse<T>` (`{ success, data, error? }`). Hooks (`useService`,
  `useServiceArray`, `useMutation` in `src/hooks/useService.ts`) expect the *full* response — never strip
  `.success` before passing it through.
- `isHttpBackendConfigured()` (`src/lib/apiClient.ts`) decides per-call whether a service uses HTTP
  (`apiRequest`/`apiGet`/`apiPostJson`) or falls through to `dataStore`. It's always `false` when Supabase
  data mode is active, even if a local API URL is also set — a service can't straddle two auth sessions.
- REST parity for each service is tracked section-by-section in `architecture/api-backend-rollout.md`
  (waves W1–W6) and task-by-task as `API-000`–`API-019` in `04_tasks.md` Module H. Check there before
  assuming a service is or isn't wired to the real API yet — most still run through `dataStore`.

### `dataStore` (`src/services/dataStore.ts`)

Single in-memory source of truth (plain arrays keyed by collection: `transactions`, `accounts`,
`expenses`, `timesheets`, etc. — see `SERIALIZABLE_KEYS`). Seeded from `src/services/initialBundle.ts` /
`src/data/mockDatabase.ts`. Persists to `localStorage` (`finance_os_data_v1`), debounced 400ms by default;
`dataStore.notify(collection, persistImmediately?)` with `persistImmediately === true` forces a synchronous
flush — used for flows that must survive a fast refresh (employee expense/timesheet submits). A
`beforeunload` handler flushes any pending debounced write. Schema-versioned; `isValidPersistedBundle`
rejects stale-shaped bundles on load rather than half-hydrating.

Components subscribe to store changes by passing a collection-name array as the third argument to
`useService`/`useServiceArray`, not by talking to `dataStore` directly:

```ts
const { data, loading, error, refetch } = useServiceArray(
  () => transactionService.getAll(orgId),
  [orgId],
  ['transactions'],  // refetch when dataStore.notify('transactions') fires anywhere
);
```

### Local Express API (`server/`)

`server/index.ts` mounts `createApiV1Router()` (`server/routes/apiV1.ts`) at `/api/v1`, implementing the
full REST surface described in `architecture/api-backend-rollout.md`. It's backed by `server/lib/store.ts`
(a server-side mirror of the same JSON-bundle shape as the browser `dataStore`), persisted via Drizzle
(`server/db/schema.ts`) to `data/finance-os.db` (SQLite). `GET/PUT /api/bundle` is a legacy whole-bundle
sync path restricted to platform staff (`requireAuth` + `requirePlatformRole`) — it can read/replace every
org's data at once, so it must never be reachable by an org-scoped or employee user. Auth/session routes
mirror the same rules as the in-app mock `authService` (see `server/middleware/auth.ts`, `server/lib/jwt.ts`).

### Auth & roles

`AuthContext` (`src/contexts/AuthContext.tsx`) wraps `authService` (`src/services/authService.ts`), storing
a token under `finance_os_token`. Role model: `platform_admin` / `platform_manager` (platform console),
`owner` / `admin` / `viewer` (org workspace), `employee` (employee workspace). A user can hold multiple org
memberships; `authService` resolves a **primary membership with employee membership preferred** when both
exist. `getRedirectPath()` is the single source of truth for "where does this user land" — reuse it rather
than re-deriving role → route logic elsewhere.

### Must-not-break flows (`flow_verification.md`)

FLOW-001 (auth + role redirect), FLOW-002 (employee expenses), FLOW-003 (employee timesheet) are the
release gate. Before any change touching auth, routing, or the employee expense/timesheet paths, re-check
these; don't reduce their coverage. Demo login credentials and the WS-4 sign-off matrix live in that file.

## Conventions

- **Stack:** React 18 + Vite + TypeScript (strict), Tailwind v4, Radix UI primitives, Recharts, Motion
  (Framer Motion), React Router v7 (`react-router`, not `react-router-dom`). Path alias `@/*` → `src/*`.
- **Minimal, backwards-compatible diffs.** This repo follows a "one task, one focused change" workflow
  (see `AGENTS.md` / MARQ workflow below) — avoid large uncontrolled refactors, keep service method
  signatures stable and change internals first.
- **Plain language over accounting jargon** in user-facing copy; calm, low-pressure UX; primary workflows
  target 3 clicks or fewer; AI suggestions show a confidence score + short "why", never a bare action.
- **Recharts:** always pass `data` to the chart root component (`LineChart`, `AreaChart`, …), not to a
  child. Decorative full-bleed overlay layers need `pointer-events-none` or controls beneath become
  unclickable. Avoid very low-alpha `CartesianGrid` stroke on dark backgrounds — grid lines disappear.
- **Employee-scoped service methods fail closed:** when a required `orgId`/`userId` is missing,
  `employeeService` (and the shared `requireOrgAndUser`/`requireOrg` guards it uses) return
  `success: false` with an explicit `error`, never a silently-empty list — preserve that pattern in new
  service methods.
- New Express routes under `server/routes/` follow the `/organizations/:orgId/...` scoping convention and
  must enforce membership/role checks server-side (not just trust the client), per
  `architecture/api-backend-rollout.md`.

## Repo docs — read before larger changes

This repo runs a **MARQ** (plan → build → QA → docs) workflow with its state tracked in-repo rather than
in issues/PRs (`AGENTS.md`, `.cursor/rules/marq-system.md` — still relevant even though this environment
does use git/GitHub). Key files, roughly in the order you'd want them:

| File | What it's for |
|------|----------------|
| `01_scope.md` | Product goal, in/out of scope, non-negotiable constraints |
| `02_product_map.md` | Every module/view and which service/component owns it |
| `03_project_memory.md` | Living architecture notes, API/hook patterns, current phase status — **check this before assuming how something works** |
| `04_tasks.md` | Task backlog by module, with status (`done`/`qa`/`blocked`/`pending`) |
| `flow_verification.md` | Must-not-break flow checklists + demo credentials |
| `architecture/api-backend-rollout.md` | REST endpoint spec per service, by rollout wave |
| `architecture/org-phase-plan.md` | Org workspace's 23-phase rollout checklist detail |
| `06_decisions.md` | Dated decision log |
| `memory/failure_library.md`, `memory/regression_cases.md`, `memory/pattern_violations.json` | Historical MARQ audit (2026-03-07) of concrete bugs found pre-Supabase (e.g. pre-stripping `ServiceResponse` before `useService`, services bypassing the `dataStore` singleton). All listed issues are since fixed per `03_project_memory.md`, but the patterns are worth not reintroducing |

`.cursor/rules/*.mdc` mirror the same constraints for Cursor (`elite-core.mdc`: protect must-not-break
flows, 3-click UX, minimal changes; `elite-frontend-ux.mdc` / `elite-services-data.mdc`: scoped to
`src/app/components/**` and `src/services/**` respectively).
