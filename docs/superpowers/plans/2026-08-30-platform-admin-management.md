# Add Platform Admin/Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a `platform_admin` or `platform_manager` invite new platform staff (platform admins/managers) at runtime — today this only exists via hardcoded seed data.

**Architecture:** Platform staff are `User` rows with `role: 'platform_admin' | 'platform_manager'` — no org membership involved. Mirrors the existing `organizationService.inviteMember` / Team & Permissions invite pattern almost exactly (find-or-create by email, mark pending, real Supabase invite email when configured). Built bottom-up: backend routes → client service → UI.

**Tech Stack:** Express + `better-sqlite3` (server), React 18 + Vite + TypeScript (client), `dataStore` singleton for mock/local persistence, `sonner` for toasts, `lucide-react` for icons, Tailwind for styling via this repo's `AXIOM` token object.

**Spec:** [`../specs/2026-08-30-platform-admin-management-design.md`](../specs/2026-08-30-platform-admin-management-design.md)

## Global Constraints

- Only `platform_admin` can invite a new `platform_admin`. `platform_manager` can only invite `platform_manager`. Enforced server-side (authoritative); the client only hides the disallowed dropdown option.
- New optional `User` field `platformStatus?: 'active' | 'pending'` — undefined means active (no backfill needed for existing seeded staff).
- No org membership, no `OrganizationMember` row, no Supabase `organization_members` mirror — platform staff live purely on the `User` record.
- Removing/deactivating staff and changing an existing staff member's role are explicitly out of scope for this plan.
- No test framework exists in this repo (`CLAUDE.md` §6) — every task's "test" steps are real curl calls or real browser checks against a running server, never a mocked/stubbed unit test.
- Never touch the shared `data/finance-os.db` for verification — use an isolated `DATABASE_PATH` + `PORT` for any backend testing so other sessions' dev servers are undisturbed.
- Before trusting any browser-based dev server in verification, confirm it's actually serving this repo: `fetch()` a known source file from the page and compare against disk content. A stale/unrelated process can be squatting on a common port (this bit a previous session in this repo — see chat history).

---

### Task 1: Backend — platform staff routes

**Files:**
- Modify: `src/services/types.ts:58` (add `platformStatus` field to `User`)
- Modify: `server/routes/platform.ts` (imports + two new routes)

**Interfaces:**
- Consumes: `store` (`server/lib/store.ts`), `ok`/`created`/`fail` (`server/lib/http.ts`), `toPublicUser`/`toPublicUsers` (`server/lib/serialize.ts`), `isSupabaseAdminConfigured`/`getSupabaseAdminClient` (`server/lib/supabaseAdmin.ts`), `req.authUser: User` (ambient, from `server/middleware/auth.ts`).
- Produces: `GET /api/v1/platform/staff` → `200 { success: true, data: PublicUser[] }`. `POST /api/v1/platform/staff/invite` body `{ email: string, name?: string, role: 'platform_admin' | 'platform_manager' }` → `201 { success: true, data: PublicUser, message: string }` on success, `400`/`403`/`409` `{ success: false, error: string }` on failure. Both routes already sit under the `/platform` mount's existing `requireAuth, requirePlatformRole('platform_admin','platform_manager')` gate (`server/routes/apiV1.ts:273`) — no new middleware needed.

- [ ] **Step 1: Add `platformStatus` to the `User` type**

In `src/services/types.ts`, the `User` interface currently ends like this (lines 45-59):

```ts
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: PlatformRole; // Platform-level role
  createdAt: string;
  /**
   * Server-only bcrypt hash. Must NEVER reach the client — every response that includes a User
   * strips this via `server/lib/serialize.ts`'s `toPublicUser`/`toPublicUsers`. Optional so mock
   * data and any code constructing a `User` without a hash still compiles; the server backfills
   * it once via `server/lib/seedPasswords.ts`.
   */
  passwordHash?: string;
}
```

Change it to:

```ts
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: PlatformRole; // Platform-level role
  createdAt: string;
  /**
   * Server-only bcrypt hash. Must NEVER reach the client — every response that includes a User
   * strips this via `server/lib/serialize.ts`'s `toPublicUser`/`toPublicUsers`. Optional so mock
   * data and any code constructing a `User` without a hash still compiles; the server backfills
   * it once via `server/lib/seedPasswords.ts`.
   */
  passwordHash?: string;
  /**
   * Set when this user is platform staff (`platform_admin`/`platform_manager`) invited but not
   * yet logged in. Undefined means active — mirrors `OrganizationMember.status`'s convention so
   * existing seeded platform staff need no backfill.
   */
  platformStatus?: 'active' | 'pending';
}
```

- [ ] **Step 2: Add the new imports to `server/routes/platform.ts`**

Current top of file:

```ts
import { Router, type Request, type Response } from 'express';
import { store, type PlatformSettings, type PlatformPlan } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';
```

Change to:

```ts
import { Router, type Request, type Response } from 'express';
import { store, type PlatformSettings, type PlatformPlan } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';
import type { User } from '../../src/services/types.js';
import { toPublicUser, toPublicUsers } from '../lib/serialize.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../lib/supabaseAdmin.js';
```

- [ ] **Step 3: Add the two routes**

In `server/routes/platform.ts`, the router currently ends with the backup-history routes right before `return r;`:

```ts
  r.post('/backup-history', (req: Request, res: Response) => {
    const { sizeBytes } = req.body as { sizeBytes?: unknown };
    const entry: BackupHistoryEntry = {
      id: `backup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : 0,
    };
    backupHistory.unshift(entry);
    ok(res, entry);
  });

  return r;
}
```

Insert the new routes between the `backup-history` POST route and `return r;`:

```ts
  r.post('/backup-history', (req: Request, res: Response) => {
    const { sizeBytes } = req.body as { sizeBytes?: unknown };
    const entry: BackupHistoryEntry = {
      id: `backup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : 0,
    };
    backupHistory.unshift(entry);
    ok(res, entry);
  });

  // ---- Platform staff (platform_admin / platform_manager accounts) ----

  r.get('/staff', (_req: Request, res: Response) => {
    const staff = store.users.filter(u => u.role === 'platform_admin' || u.role === 'platform_manager');
    ok(res, toPublicUsers(staff));
  });

  r.post('/staff/invite', async (req: Request, res: Response) => {
    const { email, name, role } = req.body as { email?: string; name?: string; role?: 'platform_admin' | 'platform_manager' };
    const trimmedEmail = email?.trim().toLowerCase();
    if (!trimmedEmail) return fail(res, 400, 'Email is required');
    if (role !== 'platform_admin' && role !== 'platform_manager') {
      return fail(res, 400, 'Role must be platform_admin or platform_manager');
    }
    if (req.authUser!.role === 'platform_manager' && role === 'platform_admin') {
      return fail(res, 403, 'Managers can only invite platform managers');
    }

    let user = store.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (user && (user.role === 'platform_admin' || user.role === 'platform_manager')) {
      return fail(res, 409, 'Already platform staff');
    }

    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        email: trimmedEmail,
        name: name?.trim() || trimmedEmail,
        role,
        createdAt: new Date().toISOString(),
        platformStatus: 'pending',
      } as User;
      store.users.push(user);
    } else {
      user.role = role;
      user.platformStatus = 'pending';
    }
    store.persist();

    let inviteEmailSent = false;
    if (isSupabaseAdminConfigured()) {
      try {
        const sb = getSupabaseAdminClient()!;
        const { data, error } = await sb.auth.admin.inviteUserByEmail(trimmedEmail, {
          data: { legacy_id: user.id, name: user.name, platform_role: role },
        });
        if (error) {
          console.error('[platform staff] Supabase inviteUserByEmail failed', error);
        } else if (data.user) {
          inviteEmailSent = true;
        }
      } catch (e) {
        console.error('[platform staff] Supabase admin invite threw', e);
      }
    }

    created(
      res,
      toPublicUser(user),
      inviteEmailSent
        ? `Invite email sent to ${trimmedEmail}`
        : `Staff added. ${isSupabaseAdminConfigured() ? 'Invite email could not be sent — check server logs.' : 'Supabase admin invite is not configured on this server, so no email was sent.'}`,
    );
  });

  return r;
}
```

- [ ] **Step 4: Seed an isolated test database**

Run (from the repo root):

```bash
DATABASE_PATH=data/test-platform-staff.db pnpm exec tsx server/seed.ts
```

Expected: prints `[finance-os] Seeded data/finance-os.db from mocks.` (the message is a static string in `seed.ts` — ignore the filename in the log text, `data/test-platform-staff.db` is what actually got written, confirm with the next step).

- [ ] **Step 5: Confirm the isolated file was created and is separate from the shared DB**

```bash
ls -la "data/test-platform-staff.db" "data/finance-os.db"
```

Expected: both files exist with different sizes/timestamps — proves the seed wrote to the isolated file, not the shared one.

- [ ] **Step 6: Start an isolated test server in the background**

```bash
DATABASE_PATH=data/test-platform-staff.db PORT=3099 pnpm exec tsx server/index.ts
```

Run this with a background-capable shell call. Wait for the log line `[finance-os] API http://localhost:3099`.

- [ ] **Step 7: Log in as the seeded platform manager, save its session cookie**

```bash
curl -s -c data/test-cookies-manager.txt -X POST http://localhost:3099/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"platform.manager@financeos.com","password":"demo"}'
```

Expected: JSON with `"success":true` and `"data":{"user":{"role":"platform_manager", ...}}`.

- [ ] **Step 8: List platform staff as the manager**

```bash
curl -s -b data/test-cookies-manager.txt http://localhost:3099/api/v1/platform/staff
```

Expected: `"success":true`, `"data"` is an array containing the seeded `admin@financeos.com`, `support@financeos.com` (`platform_admin`) and `platform.manager@financeos.com`, `ops.manager@financeos.com` (`platform_manager`).

Then confirm no password hash leaked into the response:

```bash
curl -s -b data/test-cookies-manager.txt http://localhost:3099/api/v1/platform/staff | grep -c passwordHash
```

Expected: `0`.

- [ ] **Step 9: Manager invites a new manager — should succeed**

```bash
curl -s -b data/test-cookies-manager.txt -X POST http://localhost:3099/api/v1/platform/staff/invite \
  -H "Content-Type: application/json" \
  -d '{"email":"newmanager@test.com","name":"New Manager","role":"platform_manager"}'
```

Expected: HTTP 201, `"success":true`, `"data":{"email":"newmanager@test.com","role":"platform_manager","platformStatus":"pending", ...}`.

- [ ] **Step 10: Manager attempts to invite an admin — should be rejected**

```bash
curl -s -b data/test-cookies-manager.txt -X POST http://localhost:3099/api/v1/platform/staff/invite \
  -H "Content-Type: application/json" \
  -d '{"email":"sneaky-admin@test.com","name":"Sneaky","role":"platform_admin"}'
```

Expected: `"success":false`, `"error":"Managers can only invite platform managers"`. Confirm via a second call that `sneaky-admin@test.com` was NOT added:

```bash
curl -s -b data/test-cookies-manager.txt http://localhost:3099/api/v1/platform/staff | grep -c "sneaky-admin@test.com"
```

Expected: `0`.

- [ ] **Step 11: Log in as the seeded platform admin, save its session cookie**

```bash
curl -s -c data/test-cookies-admin.txt -X POST http://localhost:3099/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@financeos.com","password":"demo"}'
```

Expected: `"success":true`, `"data":{"user":{"role":"platform_admin", ...}}`.

- [ ] **Step 12: Admin invites a new admin — should succeed**

```bash
curl -s -b data/test-cookies-admin.txt -X POST http://localhost:3099/api/v1/platform/staff/invite \
  -H "Content-Type: application/json" \
  -d '{"email":"newadmin@test.com","name":"New Admin","role":"platform_admin"}'
```

Expected: HTTP 201, `"success":true`, `"data":{"email":"newadmin@test.com","role":"platform_admin","platformStatus":"pending", ...}`.

- [ ] **Step 13: Inviting the same email twice is rejected as a duplicate**

```bash
curl -s -b data/test-cookies-admin.txt -X POST http://localhost:3099/api/v1/platform/staff/invite \
  -H "Content-Type: application/json" \
  -d '{"email":"newadmin@test.com","name":"New Admin Again","role":"platform_manager"}'
```

Expected: `"success":false`, `"error":"Already platform staff"`.

- [ ] **Step 14: Stop the test server and delete the isolated test artifacts**

Stop the background server process from Step 6, then:

```bash
rm -f "data/test-platform-staff.db" "data/test-platform-staff.db-shm" "data/test-platform-staff.db-wal" "data/test-cookies-manager.txt" "data/test-cookies-admin.txt"
```

- [ ] **Step 15: Commit**

```bash
git add src/services/types.ts server/routes/platform.ts
git commit -m "feat: add platform staff list/invite routes with manager escalation guard"
```

---

### Task 2: Client service — `getStaff` / `inviteStaff`

**Files:**
- Modify: `src/services/platformService.ts`

**Interfaces:**
- Consumes: `isHttpBackendConfigured`, `apiGet`, `apiPostJson` (`@/lib/apiClient`), `dataStore`, `generateId`, `simulateDelay` (`./dataStore`), `User` (`./types`) — the `platformStatus` field added in Task 1.
- Produces: `platformService.getStaff(): Promise<ServiceResponse<User[]>>` and `platformService.inviteStaff(email: string, role: 'platform_admin' | 'platform_manager', name?: string): Promise<ServiceResponse<User>>`, both consumed by Task 3's `PlatformTeamView.tsx`.

- [ ] **Step 1: Add `User` to the type import**

In `src/services/platformService.ts`, the current import is:

```ts
import type { ServiceResponse } from './types';
```

Change to:

```ts
import type { ServiceResponse, User } from './types';
```

- [ ] **Step 2: Add `getStaff` and `inviteStaff` to the `platformService` object**

The `platformService` object currently ends with `getBackupHistory` right before its closing `};`:

```ts
  /**
   * List manual-backup history, newest first.
   * When `VITE_API_BASE_URL` is set: `GET /platform/backup-history`.
   */
  async getBackupHistory(): Promise<ServiceResponse<BackupHistoryEntry[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<BackupHistoryEntry[]>('/platform/backup-history');
    }
    await simulateDelay();
    return { success: true, data: [...dataStore.backupHistory] };
  },
};
```

Insert two new methods before the closing `};`:

```ts
  /**
   * List manual-backup history, newest first.
   * When `VITE_API_BASE_URL` is set: `GET /platform/backup-history`.
   */
  async getBackupHistory(): Promise<ServiceResponse<BackupHistoryEntry[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<BackupHistoryEntry[]>('/platform/backup-history');
    }
    await simulateDelay();
    return { success: true, data: [...dataStore.backupHistory] };
  },

  /**
   * List all platform staff (platform_admin + platform_manager users).
   * When `VITE_API_BASE_URL` is set: `GET /platform/staff`.
   */
  async getStaff(): Promise<ServiceResponse<User[]>> {
    if (isHttpBackendConfigured()) {
      return apiGet<User[]>('/platform/staff');
    }
    await simulateDelay();
    return {
      success: true,
      data: dataStore.users.filter(u => u.role === 'platform_admin' || u.role === 'platform_manager'),
    };
  },

  /**
   * Invite a new platform admin/manager by email — find-or-create by email, mirroring
   * organizationService.inviteMember. This method does NOT check the caller's own role; the
   * server enforces (authoritatively) that a platform_manager can only invite platform_manager.
   * The mock branch below has no such check either, matching every other mock-branch method in
   * this codebase (mock mode has no real auth boundary — see organizationService.inviteMember).
   * When `VITE_API_BASE_URL` is set: `POST /platform/staff/invite`.
   */
  async inviteStaff(
    email: string,
    role: 'platform_admin' | 'platform_manager',
    name?: string,
  ): Promise<ServiceResponse<User>> {
    if (isHttpBackendConfigured()) {
      return apiPostJson<{ email: string; name?: string; role: 'platform_admin' | 'platform_manager' }, User>(
        '/platform/staff/invite',
        { email, name, role },
      );
    }
    await simulateDelay(200);
    const trimmedEmail = email.trim().toLowerCase();
    let user = dataStore.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (user && (user.role === 'platform_admin' || user.role === 'platform_manager')) {
      return { success: false, data: user, error: 'Already platform staff' };
    }
    if (!user) {
      user = {
        id: generateId('user'),
        email: trimmedEmail,
        name: name?.trim() || trimmedEmail,
        role,
        createdAt: new Date().toISOString(),
        platformStatus: 'pending',
      };
      dataStore.users.push(user);
    } else {
      user.role = role;
      user.platformStatus = 'pending';
    }
    dataStore.notify('users');
    return {
      success: true,
      data: user,
      message: 'Staff added (no HTTP backend configured, so no invite email was sent)',
    };
  },
};
```

- [ ] **Step 3: Start an isolated frontend-only dev server**

```bash
pnpm exec vite --port 5199
```

Run in the background. This repo's `.env` sets `VITE_USE_SUPABASE_DATA=true`, which makes `isHttpBackendConfigured()` always return `false` regardless of `VITE_API_BASE_URL` (see `CLAUDE.md` §3) — so this port-5199 instance exercises exactly the mock/`dataStore` branch written above with no other setup needed. The HTTP branch (`apiGet`/`apiPostJson` calls) is not independently exercised here; it's the same call shape already proven working for `organizationService.inviteMember` in `src/services/organizationService.ts:229-277`, so it is not re-tested live in this task.

- [ ] **Step 4: Confirm the dev server is serving this repo before trusting it**

Open the Browser pane at `http://localhost:5199`, then in the page's JS console:

```js
fetch('/src/services/platformService.ts').then(r => r.text()).then(t =>
  console.log(JSON.stringify({ hasInviteStaff: t.includes('inviteStaff'), hasGetStaff: t.includes('getStaff') }))
)
```

Expected: `{"hasInviteStaff":true,"hasGetStaff":true}`. If either is `false`, stop — this port is serving stale or unrelated content; do not proceed with a dev server you can't confirm is this repo.

- [ ] **Step 5: Call `getStaff` directly via a dynamic import, confirm the seeded staff**

In the same page's JS console:

```js
(async function(){
  const mod = await import('/src/services/platformService.ts');
  const res = await mod.platformService.getStaff();
  return JSON.stringify({ success: res.success, count: res.data.length, roles: res.data.map(u => u.role) });
})()
```

Expected: `success: true`, `count: 4` (the seeded `admin@financeos.com`, `support@financeos.com`, `platform.manager@financeos.com`, `ops.manager@financeos.com`), `roles` containing both `platform_admin` and `platform_manager`.

- [ ] **Step 6: Call `inviteStaff` directly, confirm it's added and pending**

```js
(async function(){
  const mod = await import('/src/services/platformService.ts');
  const res = await mod.platformService.inviteStaff('client-test@test.com', 'platform_manager', 'Client Test');
  const list = await mod.platformService.getStaff();
  const added = list.data.find(u => u.email === 'client-test@test.com');
  return JSON.stringify({ inviteSuccess: res.success, added });
})()
```

Expected: `inviteSuccess: true`, `added` present with `role: "platform_manager"`, `platformStatus: "pending"`.

- [ ] **Step 7: Confirm the duplicate-email guard**

```js
(async function(){
  const mod = await import('/src/services/platformService.ts');
  const res = await mod.platformService.inviteStaff('client-test@test.com', 'platform_admin');
  return JSON.stringify(res);
})()
```

Expected: `{"success":false, ..., "error":"Already platform staff"}`.

- [ ] **Step 8: Stop the isolated dev server**

Stop the background process from Step 3.

- [ ] **Step 9: Commit**

```bash
git add src/services/platformService.ts
git commit -m "feat: add platformService.getStaff/inviteStaff"
```

---

### Task 3: UI — Platform Team view

**Files:**
- Modify: `src/app/components/platform/PlatformDashboard.tsx`
- Modify: `src/app/components/platform/PlatformLayout.tsx`
- Create: `src/app/components/platform/PlatformTeamView.tsx`

**Interfaces:**
- Consumes: `platformService.getStaff` / `platformService.inviteStaff` (Task 2), `useServiceArray` (`@/hooks/useService`), `useAuth` (`@/contexts/AuthContext`), `User` (`@/services/types`), `AXIOM` (`../../../styles/axiom-tokens`), `toast` (`sonner`).
- Produces: a `'team'` entry reachable from the Platform Console sidebar, rendering `<PlatformTeamView />`.

- [ ] **Step 1: Add the `'team'` view to `PlatformDashboard.tsx`**

Current file:

```tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { PlatformLayout } from './PlatformLayout';
import { PlatformHome } from './PlatformHome';
import { OrganizationsView } from './OrganizationsView';
import { PlansView } from './PlansView';
import { PlatformSettingsView } from './PlatformSettingsView';
import { PlatformAiPortal } from './PlatformAiPortal';

type PlatformView = 'home' | 'organizations' | 'plans' | 'ai' | 'settings';

const ALL_PLATFORM_VIEWS: readonly PlatformView[] = ['home', 'organizations', 'plans', 'ai', 'settings'];
```

Change to:

```tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { PlatformLayout } from './PlatformLayout';
import { PlatformHome } from './PlatformHome';
import { OrganizationsView } from './OrganizationsView';
import { PlansView } from './PlansView';
import { PlatformSettingsView } from './PlatformSettingsView';
import { PlatformAiPortal } from './PlatformAiPortal';
import { PlatformTeamView } from './PlatformTeamView';

type PlatformView = 'home' | 'organizations' | 'team' | 'plans' | 'ai' | 'settings';

const ALL_PLATFORM_VIEWS: readonly PlatformView[] = ['home', 'organizations', 'team', 'plans', 'ai', 'settings'];
```

Then, in `renderView()`, the current `case 'organizations':` block is:

```tsx
      case 'organizations':
        return <OrganizationsView />;
      case 'plans':
        return <PlansView />;
```

Change to:

```tsx
      case 'organizations':
        return <OrganizationsView />;
      case 'team':
        return <PlatformTeamView />;
      case 'plans':
        return <PlansView />;
```

- [ ] **Step 2: Add the nav item to `PlatformLayout.tsx`**

Current `navItems`:

```tsx
  const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'plans', label: 'Plans & Billing', icon: CreditCard },
    { id: 'ai', label: 'AI Portal', icon: Brain },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];
```

Change to:

```tsx
  const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'team', label: 'Platform Team', icon: Shield },
    { id: 'plans', label: 'Plans & Billing', icon: CreditCard },
    { id: 'ai', label: 'AI Portal', icon: Brain },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];
```

`Shield` is already imported in this file (used for the header logo) — no import change needed.

- [ ] **Step 3: Create `PlatformTeamView.tsx`**

```tsx
import { useState } from 'react';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { platformService } from '@/services/platformService';
import { useServiceArray } from '@/hooks/useService';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PlatformTeamView() {
  const { user: currentUser } = useAuth();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'platform_admin' | 'platform_manager'>('platform_manager');
  const [inviting, setInviting] = useState(false);

  const canInviteAdmin = currentUser?.role === 'platform_admin';

  const { data: staff, loading, refetch } = useServiceArray(
    () => platformService.getStaff(),
    [],
    ['users'],
  );

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Enter an email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setInviting(true);
    const res = await platformService.inviteStaff(email, inviteRole, inviteName.trim());
    setInviting(false);
    if (!res.success) {
      toast.error(res.error || 'Could not invite platform staff.');
      return;
    }
    toast.success(res.message || `${email} invited as ${inviteRole === 'platform_admin' ? 'Platform Admin' : 'Platform Manager'}.`);
    setShowInviteForm(false);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('platform_manager');
    await refetch();
  };

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Platform Team</h1>
          <p className="text-slate-400 font-mono">Manage platform admins and managers</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium"
          style={AXIOM.buttons.action}
        >
          <Plus className="size-5" />
          Invite Platform Staff
        </button>
      </motion.div>

      {showInviteForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl p-6"
          style={{
            background: AXIOM.backgrounds.chartContainer,
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 20px 60px -20px rgba(168, 85, 247, 0.3)',
          }}
        >
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Plus className="size-5 text-purple-400" />
            Invite Platform Staff
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@financeos.com"
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'platform_admin' | 'platform_manager')}
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              >
                <option value="platform_manager">Platform Manager</option>
                {canInviteAdmin && <option value="platform_admin">Platform Admin</option>}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => void handleInvite()}
              disabled={inviting}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.success}
            >
              {inviting ? <Loader2 className="size-4 animate-spin" /> : null}
              Send Invite
            </button>
            <button onClick={() => setShowInviteForm(false)} className="px-4 py-2 rounded-lg text-slate-400 text-sm" style={AXIOM.buttons.outline}>
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: AXIOM.backgrounds.chartContainer, border: '1px solid rgba(168, 85, 247, 0.15)' }}
      >
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono">Loading platform staff…</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono">No platform staff found.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(168, 85, 247, 0.1)' }}>
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: AXIOM.iconBoxes.purple }}>
                    <Shield className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-mono"
                    style={{
                      color: member.role === 'platform_admin' ? '#c084fc' : '#60a5fa',
                      background: member.role === 'platform_admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      border: `1px solid ${member.role === 'platform_admin' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                    }}
                  >
                    {member.role === 'platform_admin' ? 'Admin' : 'Manager'}
                  </span>
                  {member.platformStatus === 'pending' && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-mono"
                      style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                    >
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 4: Start an isolated dev server and confirm it's serving this repo**

```bash
pnpm exec vite --port 5199
```

In the Browser pane at `http://localhost:5199`, run the same file-identity check as Task 2 Step 4, this time for the new component:

```js
fetch('/src/app/components/platform/PlatformTeamView.tsx').then(r => r.status)
```

Expected: `200`. A `404` means the dev server needs restarting to pick up the new file, or you're on the wrong port.

- [ ] **Step 5: Log in as the platform manager and open Platform Team**

Navigate to `http://localhost:5199/login/platform`. In the console, drive the login form the same way Task 2's isolated verification did — set the email/password inputs via the native value setter (so React's `onChange` fires) and click submit:

```js
(function(){
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const email = document.querySelector('input[type="email"]');
  const pass = document.querySelector('input[type="password"]');
  setter.call(email, 'platform.manager@financeos.com');
  email.dispatchEvent(new Event('input', {bubbles:true}));
  setter.call(pass, 'demo');
  pass.dispatchEvent(new Event('input', {bubbles:true}));
  document.querySelector('button[type="submit"]').click();
  return 'submitted';
})()
```

Then navigate the sidebar to "Platform Team" (or set the URL query directly: `http://localhost:5199/platform?view=team`).

- [ ] **Step 6: Confirm the manager's dropdown is restricted**

```js
(function(){
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Invite Platform Staff');
  btn.click();
  const select = document.querySelector('select');
  return JSON.stringify(Array.from(select.options).map(o => o.value));
})()
```

Expected: `["platform_manager"]` only — no `platform_admin` option.

- [ ] **Step 7: Invite a new manager through the real form and confirm it lands in the list**

```js
(function(){
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const nameEl = document.querySelector('input[placeholder="Jane Doe"]');
  const emailEl = document.querySelector('input[placeholder="jane@financeos.com"]');
  setter.call(nameEl, 'UI Test Manager');
  nameEl.dispatchEvent(new Event('input', {bubbles:true}));
  setter.call(emailEl, 'uitest-manager@test.com');
  emailEl.dispatchEvent(new Event('input', {bubbles:true}));
  const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Send Invite');
  sendBtn.click();
  return 'submitted';
})()
```

Wait one second, then:

```js
document.body.innerText.includes('uitest-manager@test.com') && document.body.innerText.includes('Pending')
```

Expected: `true`.

- [ ] **Step 8: Log out, log in as the platform admin, confirm the dropdown offers both roles**

```js
(function(){ const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Logout' || b.title === 'Log out'); btn.click(); return 'logged out'; })()
```

Then repeat Step 5's login snippet with `admin@financeos.com` / `demo`, navigate to `http://localhost:5199/platform?view=team`, open the invite form, and re-run Step 6's dropdown-options check.

Expected: `["platform_manager","platform_admin"]`.

- [ ] **Step 9: Admin invites a new admin, confirm it lands in the list with the Admin badge**

Repeat Step 7's form-fill pattern with `input[placeholder="Jane Doe"]` → `'UI Test Admin'`, `input[placeholder="jane@financeos.com"]` → `'uitest-admin@test.com'`, and additionally set the role select before clicking Send Invite:

```js
(function(){
  const select = document.querySelector('select');
  select.value = 'platform_admin';
  select.dispatchEvent(new Event('change', {bubbles:true}));
  return select.value;
})()
```

Then check:

```js
document.body.innerText.includes('uitest-admin@test.com') && document.body.innerText.includes('Admin')
```

Expected: `true`.

- [ ] **Step 10: Crash-sweep the new view**

```js
const t = document.body.innerText;
JSON.stringify({ crashed: t.includes('Something went wrong') || /is not defined/.test(t), nan: /\bNaN\b/.test(t) })
```

Expected: `{"crashed":false,"nan":false}`.

- [ ] **Step 11: Stop the isolated dev server**

Stop the background process from Step 4.

- [ ] **Step 12: Commit**

```bash
git add src/app/components/platform/PlatformDashboard.tsx src/app/components/platform/PlatformLayout.tsx src/app/components/platform/PlatformTeamView.tsx
git commit -m "feat: add Platform Team view for inviting platform admins/managers"
```
