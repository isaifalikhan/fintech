# Add Platform Admin/Manager — design

Approved 2026-08-30. Companion: [`../../../CLAUDE.md`](../../../CLAUDE.md)

## Problem

The user reported no way to add organizations, employees, or platform admins. Investigation found
organization creation and employee invites already exist and are fully wired end-to-end (Platform
Console → Organizations → "Create Organization"; Org workspace → Team & Permissions → "Invite
Member") — a discoverability gap, not a missing feature. Separately, organization creation had a
real bug: the "Admin Email" field was captured and validated but never sent to
`organizationService.create()`, so new orgs got no owner and nobody could log into them. That bug
was fixed directly in `OrganizationsView.tsx` (wired to `organizationService.inviteMember(orgId,
email, 'owner')` after creation) — a small bounded fix, not part of this spec.

Platform admin/manager creation, however, genuinely does not exist anywhere in the stack: no UI (no
slot in the `PlatformView` union), no service method (`platformService.ts` has no user/admin CRUD),
no backend route (`server/routes/platform.ts` is read-only), no non-seed write path. Platform staff
today exist only via hardcoded `mockUsers` entries in `src/data/mockDatabase.ts`, materialized by
`pnpm run db:seed`. This spec designs the first runtime way to add one.

## Decisions

- **Who can invite:** both `platform_admin` and `platform_manager` can invite new platform staff
  (not admin-only).
- **Escalation guard:** a `platform_manager` may only invite new `platform_manager` accounts. Only a
  `platform_admin` may invite a new `platform_admin`. Enforced server-side (authoritative) and
  mirrored client-side (UX convenience only — hides the disallowed option, not a security boundary).
  **Caveat (added post-implementation, final review finding):** the server-side check only binds
  when the Express/SQLite backend is active (`isHttpBackendConfigured()` returning true). This
  repo's own `.env` sets `VITE_USE_SUPABASE_DATA=true`, which makes `isHttpBackendConfigured()`
  return `false` unconditionally regardless of `VITE_API_BASE_URL` — so in the app's actual default
  running mode, `inviteStaff` never reaches the server route at all, and the hidden `<option>` is
  the *only* thing standing between a manager and creating a `platform_admin` row. This is not a bug
  to fix here: mock/Supabase-data mode writes the whole `dataStore` from the browser, so any
  client-side check would be trivially bypassable and would create false confidence rather than real
  security. Treat this guard as a real, load-bearing control only when the app is actually running
  against the Express backend — not as a property of the feature in general.
- **Creation flow:** email invite, mirroring `organizationService.inviteMember` / Team & Permissions
  exactly — find-or-create the `User` by email, mark pending, send a real invite email via
  `sb.auth.admin.inviteUserByEmail` when Supabase admin is configured, otherwise a silent local mock
  add (same fallback message pattern already used: "no HTTP backend configured, so no invite email
  was sent").
- **Data model:** platform staff are just `User` rows with `role: 'platform_admin' |
  'platform_manager'` — no org membership involved. One new optional field, `platformStatus?:
  'pending' | 'active'`, following the exact convention `OrganizationMember.status` already uses
  (undefined = active, so existing seeded staff need no migration/backfill).
- **Scope (this pass):** list existing platform staff + invite new ones. Explicitly **not** in this
  pass: removing/deactivating staff, or changing an existing staff member's role after creation.
  Both would reuse the same list view and can follow as a fast-follow.

## Server

### `src/services/types.ts`

Add `platformStatus?: 'pending' | 'active';` to the `User` interface, next to the existing
`passwordHash` field, with the same optionality reasoning as `OrganizationMember.status`: undefined
means active, so existing seed/mock rows without it still type-check and render as active.

### New routes in `server/routes/platform.ts`

Both inherit the existing `requireAuth, requirePlatformRole('platform_admin', 'platform_manager')`
gate already applied at the `/platform` mount point in `apiV1.ts` — no new middleware needed for
entry. The escalation rule is an in-handler check, not a route-level gate.

- **`GET /platform/staff`** — returns all `store.users` where `role` is `platform_admin` or
  `platform_manager`, passed through `toPublicUser`/`toPublicUsers` (never leak `passwordHash`,
  matching the convention already used for every other `User`-returning route).
- **`POST /platform/staff/invite`** — body `{ email, name?, role: 'platform_admin' |
  'platform_manager' }`.
  - If `req.authUser!.role === 'platform_manager' && role === 'platform_admin'` →
    `fail(res, 403, 'Managers can only invite platform managers')`.
  - Find-or-create `User` by trimmed/lowercased email, same shape as `organizations.ts`'s
    `members/invite` handler. If found and already `platform_admin` or `platform_manager`,
    `fail(res, 409, 'Already platform staff')`.
  - Otherwise set `role` to the requested value and `platformStatus: 'pending'` on the user record.
  - When `isSupabaseAdminConfigured()`, call `sb.auth.admin.inviteUserByEmail(email, { data: {
    legacy_id: user.id, name: user.name, platform_role: role } })` — `platform_role` is the exact
    metadata key `supabaseAuth.ts:12-23` already reads back on login, so an accepted invite resolves
    to the right role with no further wiring. There is no platform-level equivalent of the
    `organization_members` real table, so nothing further needs writing to Supabase on success.
  - `store.persist()`; respond `created(res, user, ...)`, message text mirroring the existing
    pattern in `organizations.ts:152-158` (invite-sent vs. no-backend-configured vs.
    send-failed variants).

## Client

### `src/services/platformService.ts`

- `getStaff(): Promise<ServiceResponse<User[]>>` — HTTP branch: `apiGet('/platform/staff')`. Mock
  branch: `dataStore.users.filter(u => u.role === 'platform_admin' || u.role ===
  'platform_manager')`.
- `inviteStaff(email: string, role: 'platform_admin' | 'platform_manager', name?: string):
  Promise<ServiceResponse<User>>` — HTTP branch: `apiPostJson('/platform/staff/invite', { email,
  name, role })`. Mock branch: find-or-create in `dataStore.users` (mirrors
  `organizationService.inviteMember`'s mock body almost line for line), reject with `'Already
  platform staff'` if the found user already has a platform role, otherwise set `role` +
  `platformStatus: 'pending'`, `dataStore.notify('users')`.

### `src/app/components/platform/PlatformDashboard.tsx`

Add `'team'` to the `PlatformView` union and `ALL_PLATFORM_VIEWS`; add a `case 'team': return
<PlatformTeamView />;` branch in `renderView()`.

### `src/app/components/platform/PlatformLayout.tsx`

Add `{ id: 'team', label: 'Platform Team', icon: Shield }` to `navItems` (`Shield` is already
imported and currently unused).

### New `src/app/components/platform/PlatformTeamView.tsx`

Structurally a trimmed `TeamPermissions.tsx`:

- `useService(() => platformService.getStaff(), [])` for the list; render name, email, a role badge
  (Admin/Manager), and a pending/active badge from `platformStatus`.
- "Invite Platform Staff" button opens a dialog: name, email, role `<select>`. The role `<select>`
  offers only "Platform Manager" when `useAuth().user!.role === 'platform_manager'`; offers both
  options when the caller is `platform_admin`.
- Submit calls `platformService.inviteStaff(email, role, name)`; success/error toasts mirror
  `TeamPermissions.handleInvite`'s pattern; refetch the list on success.

## Error / empty states

| Condition | Behavior |
|---|---|
| Manager tries to invite an admin (bypassing the hidden UI option, e.g. a direct API/service call) | Server returns 403 "Managers can only invite platform managers"; toast shows the error. |
| Email already belongs to platform staff | Server/mock returns 409 "Already platform staff"; toast shows the error. |
| Supabase admin not configured | Staff record still created/pending locally; toast says no invite email was sent (mirrors the existing org-invite message). |
| No staff yet beyond seed data | List simply shows the seeded admins/managers — never an artificial empty state, since seed data always exists. |

## Testing / verification

No test suite in this repo (per `CLAUDE.md` §6) — verify in-browser, using a dev server on a port
confirmed to be this repo (not a port squatted by an unrelated process — check via `fetch()`ing a
known source file and comparing to disk before trusting the session):

1. Log in as `platform.manager@financeos.com` → Platform Team → confirm the role dropdown offers
   only "Platform Manager".
2. Invite a new manager by email → confirm it appears in the list with a pending badge, and
   `dataStore.users` gained the row with the right `role`/`platformStatus`.
3. Attempt (via a direct service/API call, bypassing the UI) to have that same manager invite a
   `platform_admin` → confirm 403.
4. Log in as `admin@financeos.com` → confirm the dropdown offers both roles, and inviting an admin
   succeeds.
5. Attempt to invite an email that's already platform staff → confirm the 409 path and its toast.
6. Crash-sweep per `CLAUDE.md` §6 across the new Platform Team view.
