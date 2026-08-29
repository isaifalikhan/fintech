# Architecture

How Finance OS is put together. Companion to [`../CLAUDE.md`](../CLAUDE.md).

---

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 6, `@vitejs/plugin-react` |
| UI | React 18 + TypeScript, Tailwind v4 (`@tailwindcss/vite`), Radix primitives, `motion/react`, Recharts, lucide-react |
| Routing | `react-router` `BrowserRouter` (SPA — needs a rewrite rule when hosted; see `vercel.json`) |
| Server (optional) | Express + better-sqlite3 + Drizzle, `tsx watch` |
| Cloud (optional) | Supabase (Auth + Postgres + RLS) |
| Package manager | pnpm |

## Directory map

```
src/
  app/
    App.tsx                    # BrowserRouter, providers, route guards
    components/
      organization/            # org workspace views + OrganizationLayout
      employee/                # employee portal views + EmployeeLayout
      platform/                # platform console views + PlatformLayout
      onboarding/              # first-run tour (mounted globally, outside auth)
      ai-assistant/, charts/, notifications/, ui/  # shared
    pages/                     # ⚠ largely UNROUTED legacy — verify before editing
  contexts/                    # AuthContext, ThemeContext, NotificationContext, OnboardingContext
  hooks/                       # useOrgServices, useService, useOrgCurrency
  services/                    # one module per domain + dataStore singleton
  lib/                         # apiClient, supabaseClient, importUtils, classificationEngine, formatters
  data/mockDatabase.ts         # seed data
server/
  index.ts                     # Express bootstrap
  routes/                      # REST mirror of the client services
  lib/store.ts                 # in-memory store persisted to data/finance-os.db
  config/env.ts                # fail-loud env resolution
supabase/                      # schema.sql + RLS policy fixes
```

> `src/app/pages/` contains files that are **not wired into any route** (`Transactions.tsx`,
> `ComponentShowcase.tsx`, …). Confirm reachability from `App.tsx` / `renderView()` before spending
> time there.

---

## Request flow

```
Component
  └─ useOrgServices() ......... org-scoped namespaces, memoized per orgId/user
       └─ services/*.ts ....... branches on backend mode
            ├─ apiGet/apiPostJson → Express → server/lib/store.ts → SQLite
            └─ dataStore ....... in-memory singleton
                                   ├─ localStorage (default)
                                   └─ finance_os_app_bundle (Supabase mode)
```

### dataStore

Singleton holding every collection (`transactions`, `accounts`, `bankAccounts`, `categories`,
`organizations`, `organizationMembers`, `loans`, `budgets`, `assets`, `inventoryItems`, …).

- `notify(collection)` → fires subscribers **and** schedules a debounced persist.
- `notify(collection, true)` → persists synchronously (use for critical writes).
- Persistence target depends on mode: localStorage · `PUT /api/bundle` · Supabase JSON row.
- `hydrateFromSupabaseIfEnabled()` runs after a Supabase session is available (called from
  `AuthContext.restoreSession`).

Because Supabase mode stores the whole store as one JSON blob, **anything not in that blob doesn't
persist**, and the real relational tables drift unless explicitly synced.

---

## Auth & roles

`AuthContext` exposes `user`, `currentOrganization`, `organizations`, `userRole`, `isLoading`,
`login`, `logout`, `switchOrganization`.

- **Platform roles** (`User.role`): `platform_admin`, `platform_manager`, `organization_user`.
- **Org roles** (`OrganizationMember.role`): `owner`, `admin`, `employee`, `viewer`.

Redirect logic lives in `getRedirectPath()`: platform roles → `/platform`, `employee` → `/employee`,
otherwise `/dashboard`. Route guards are `ProtectedRoute` / `EmployeeRoute` in `App.tsx`.

`isLoading` matters: during session restore `user` is briefly `null`. Anything that branches on
auth must check `!isLoading && user`, or it will treat a logged-in user as anonymous. This caused a
real redirect bug in the onboarding tour.

In Supabase mode, a mock id (`user-emp-001`) is mapped to the real Auth UUID via
`user_metadata.legacy_id`. The browser can't resolve that mapping (needs the service-role key), so
admin operations that need it live server-side in `server/lib/supabaseAdmin.ts`.

---

## Org navigation

`OrganizationWorkspace.tsx` owns `currentView` and keeps it in sync with `?view=`:

- `OrgView` union = the canonical view list.
- `applyView(view)` sets state **and** the query param (bookmarkable, survives context gaps).
- `useOrgWorkspaceNav()` gives child components `goToOrgView('import')`.
- Deep links from outside the workspace pass `location.state.orgView`.

---

## Statement import pipeline

`organization/EnhancedStatementImport.tsx` (also embedded as a modal from the dashboard via the
`embedded` prop):

```
file → parseCSVFile / parsePdfFileToGrid   (lib/importUtils, lib/pdfStatementImport)
     → autoDetectColumnMapping             (header-name heuristics)
     → processCSVData                      (→ ImportedTransaction[])
     → findDuplicates
     → classification.batchClassify        (lib/classificationEngine)
     → review/edit
     → imports.commitParsedImport          (writes txns + updates account balance)
```

CSV and PDF only — **no Excel**. `classifyTransaction` matches `category.patterns` and learned rules;
confidence ≥ 60 counts as auto-classified.

---

## Server

`server/routes/*.ts` mirrors the client services under `/api/v1`. `server/lib/store.ts` is the
in-memory twin of `dataStore`, persisted to SQLite after each mutation via `store.persist()`.

**Any behavioral change to `src/services/*.ts` needs the same change in `server/routes/*.ts`**, or
the two backends silently disagree.

Server-only env (never `VITE_`-prefixed): `JWT_SECRET`, `CORS_ORIGIN`, `COOKIE_SECURE`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## Supabase

- `supabase/schema.sql` — tables + blanket `is_org_member()` RLS policies for tenant tables.
- `supabase/fix_org_update_policy.sql` — adds the missing UPDATE policy on `organizations`
  (it originally had SELECT only, so org edits silently failed).
- `organization_members` has a SELECT policy but no INSERT/UPDATE policy. No anon-key code path
  writes to it; the server uses the service-role key, which bypasses RLS.
