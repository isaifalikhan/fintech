# CLAUDE.md — Finance OS

Operating guide for Claude Code in this repo. Read this before touching code.

> Companion docs: [`docs/architecture.md`](docs/architecture.md) ·
> [`docs/gotchas.md`](docs/gotchas.md) · [`docs/data-sources.md`](docs/data-sources.md) ·
> [`docs/qa-log.md`](docs/qa-log.md)
> Pre-existing workflow docs (Cursor-era): `AGENTS.md`, `01_scope.md`–`06_decisions.md`,
> `memory/failure_library.md`.

---

## 1. What this is

Multi-tenant financial-ops prototype ("Finance OS") for agencies/software houses.
Vite + React 18 + TypeScript SPA, Tailwind v4, with an optional Express + SQLite backend and
optional Supabase.

Three user surfaces, each with its own layout, router view-set and login page:

| Surface | Route | Layout | Roles |
|---|---|---|---|
| Organization workspace | `/dashboard?view=<OrgView>` | `organization/OrganizationLayout.tsx` | `owner`, `admin`, `viewer` |
| Employee portal | `/employee` | `employee/EmployeeLayout.tsx` | `employee` |
| Platform console | `/platform` | `platform/PlatformLayout.tsx` | `platform_admin`, `platform_manager` |

Org navigation is **`?view=` query-param driven**, not nested routes. The canonical list of views
is the `OrgView` union in `organization/OrganizationWorkspace.tsx`; `renderView()` maps each to a
component. To deep-link, use `/dashboard?view=import`.

---

## 2. Commands

**Use `pnpm`. `npm` is not installed on this machine** (`pnpm-lock.yaml` is the source of truth).

```bash
pnpm run dev:full
```

| Command | What it does |
|---|---|
| `pnpm run dev:full` | Vite + Express together (`VITE_USE_LOCAL_DB=true`). **Default for day-to-day work.** |
| `pnpm run dev` | Frontend only (localStorage or Supabase persistence) |
| `pnpm run dev:server` | Express API only, port 3001 |
| `pnpm run build` | Production build |
| `pnpm run db:push` / `db:studio` / `db:seed` | Drizzle schema push / studio / seed |

App runs at `http://localhost:5173` (Vite picks 5174+ if 5173 is taken — check the terminal).

**Demo logins** — one click, no password (`DEMO_AUTH_PASSWORD = 'demo'`):
`/login/owner` → John Doe (owner) · `/login/employee` → Alex Chen · `/login/platform` → admin@financeos.com

---

## 3. The three data backends (read this before debugging data)

The same service layer resolves to one of three backends. **Which one is active changes behavior
completely** — most "data isn't saving/showing" bugs trace back to assuming the wrong one.

| Mode | Gate | Storage |
|---|---|---|
| Mock / local | neither flag set | `dataStore` singleton + `localStorage` |
| Local HTTP | `VITE_API_BASE_URL` set (and not Supabase) | Express + SQLite (`data/finance-os.db`) |
| Supabase | `VITE_USE_SUPABASE_DATA=true` | Supabase Auth + a **single JSON-blob row** |

Every service method follows this shape:

```ts
async getThing(orgId: string) {
  if (isHttpBackendConfigured()) return apiGet(...);   // Express path
  await simulateDelay();
  return { success: true, data: dataStore.things.filter(...) };  // dataStore path
}
```

`isHttpBackendConfigured()` returns **false** whenever Supabase mode is on — the two auth sessions
can't be mixed per-request, so Supabase mode always uses the (Supabase-synced) `dataStore` branch.

### Supabase is used two ways at once — don't conflate them
1. **Real relational tables** — `organizations`, `organization_members`, `profiles`, with RLS.
   Used for auth/session/identity only.
2. **`finance_os_app_bundle`** — one row holding the entire `dataStore` as JSON. This is the actual
   source of truth for transactions, accounts, budgets, everything else.

Writing to one does **not** update the other. Org settings edits need an explicit sync to the real
table — see `syncOrganizationToSupabaseTable()` in `services/organizationService.ts`.

---

## 4. Architecture rules

**Never call a service directly from a component.** Go through the hooks:

```ts
const svc = useOrgServices();                       // org-scoped namespaces
const { data, loading, error, refetch } = useServiceArray(
  () => svc.transactions.getAll(),
  [svc.orgId],
  ['transactions'],        // dataStore collections that trigger refetch
);
```

- `useOrgServices()` — namespaced, org-bound API: `transactions`, `accounts`, `categories`,
  `departments`, `projects`, `assets`, `inventory`, `budgets`, `loans`, `reports`, `classification`,
  `notifications`, `imports`, `org`, `recurring`.
- `useServiceArray` — always returns an array (never null), so `.map()` is safe.
- `useService` — single object; **may be null**, guard it.
- `useMutation` — write path with `loading` / `execute()`.
- Third arg = dataStore collection keys to subscribe to; `dataStore.notify('transactions')` after a
  write refreshes every subscriber.

**Currency: never hardcode.** Use `useOrgCurrency()`. Hardcoded `'PKR'` caused a USD org to render
real dollar amounts as rupees across ~75 call sites.

```ts
const orgCurrency = useOrgCurrency();
formatCurrency(amount, orgCurrency, { compact: true })
```

Per-account / per-transaction rows correctly use their **own** `row.currency` — that's multi-currency,
not a bug.

---

## 5. Non-obvious traps (each of these has bitten this repo)

**supabase-js builders are lazy thenables.** `void sb.from('x').update(...).eq(...)` **never sends
the request**. You must `.then()` or `await`.

**React renders `0` as text.** `{count && <X/>}` prints a stray "0" when count is 0. Use `{!!count && …}`
or `{count != null && …}`. Fixed in 10 places; easy to reintroduce.

**`pdfjs-dist` breaks Vite's dep optimizer** → app-wide "Failed to fetch dynamically imported module".
`vite.config.ts` has `optimizeDeps: { exclude: ['pdfjs-dist'] }`. If the whole app 404s on a chunk,
delete `node_modules/.vite` and restart.

**Header z-index.** App headers are `z-[60]`; in-page `PageHeader` is `sticky z-50`. They're siblings
in one stacking context — a header below 50 puts dropdowns *under* the page.

**`scrollIntoView()` scrolls every scrollable ancestor**, dragging the whole page. To scroll a chat/log
pane only, set `el.scrollTop` directly. Use `focus({ preventScroll: true })` for autofocus.

**`AuthContext` is Fast-Refresh incompatible** ("useAuth export is incompatible"). After editing it you
may see stale `useAuth must be used within an AuthProvider` errors — do a hard reload before believing them.

**Console errors can be stale.** Mid-edit HMR states persist in the buffer. Confirm against a fresh
reload and the rendered DOM before chasing a "bug".

---

## 6. Verifying UI work

There's **no test suite**. Verify in the browser via the preview tools, and prefer DOM assertions
over screenshots (the preview pane has a devicePixelRatio scaling glitch at mobile/tablet presets —
tiny/garbled screenshots there are a tooling artifact, not a layout bug).

```js
// crash sweep across org views
const t = document.body.innerText;
t.includes('Something went wrong') || /is not defined/.test(t)
```

Beware: `/NaN/i` matches "**nan**" inside "Fi**nan**ce" — use `\bNaN\b`.

Hit-test for z-index/overlap issues rather than eyeballing:

```js
const r = el.getBoundingClientRect();
const top = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
el.contains(top) || el === top   // false ⇒ something is painting over it
```

---

## 7. Working style for this repo

- **Wire to real services; don't invent data.** Large amounts of hardcoded business data were shipped
  as if real (fake clients, invented forecasts). If no service exists, say so — don't fabricate a
  plausible-looking constant. See `docs/data-sources.md` for what's real vs. still mock.
- **Buttons must do something.** Many were pure decoration (no `onClick`). If you can't wire it, mark
  it `disabled` with a `title` explaining why, rather than leaving a fake affordance.
- **Fix both backends.** A change in `src/services/*.ts` usually needs the mirror in `server/routes/*.ts`.
- **Never pad with fake data.** Empty is honest; show an empty/insufficient-data state. A trend chart
  needs ≥2 points — one point renders as disconnected dots and reads as "broken".
- **Don't commit or push unless asked.**
