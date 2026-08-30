# Real AI Assistant (Groq-backed, merged with existing BYOK) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One real, conversational AI Assistant per remaining surface (org workspace, employee portal) — grounded in that org's/employee's actual data, able to hold an open conversation (data questions, Finance OS how-to, general finance knowledge), using the org's own configured provider key when set and a free Groq key as the zero-config fallback otherwise. Removes the floating widget, the hardcoded fake "AI insight" dashboards, and every silent fallback to canned demo replies.

**Architecture:** This plan **extends already-committed code** rather than building a parallel implementation — a separate commit (`83d16b9`, on `main`, made outside this design process) already added per-org "bring your own key" chat (`server/lib/aiProviders.ts`, a `POST /organizations/:organizationId/ai-chat` route, `AiChatPanel`'s async `getReply`). This plan: (1) adds a `callGroq()` alongside the existing Anthropic/OpenAI caller, (2) extends the existing `/ai-chat` route with real server-built data context, a `surface` field so it serves both portals, and a BYOK-then-Groq-then-honest-error resolution order, (3) threads real conversation history through end-to-end (previously always sent as `[]`), (4) removes every canned-demo fallback, the fake dashboard cards, and the floating widget. See [Amendment 3](../specs/2026-08-30-ai-assistant-design.md#amendment-3--reconciled-with-the-already-committed-byok-implementation-2026-08-30) in the spec for the full reconciliation reasoning.

**Tech Stack:** Express + TypeScript (server), React 18 + TypeScript + Tailwind (client), Anthropic Messages API + OpenAI-compatible chat completions (already wired) + Groq (OpenAI-compatible, added by this plan), plain `fetch` (no SDKs), `express-rate-limit` (already a dependency). No test framework in this repo — verification is `pnpm run build` / manual server boot + in-browser DOM checks per [CLAUDE.md](../../../CLAUDE.md) §6.

**Spec:** [`docs/superpowers/specs/2026-08-30-ai-assistant-design.md`](../specs/2026-08-30-ai-assistant-design.md) (see "Amendment 3" for why this plan's shape differs from the spec's original file list)

## Global Constraints

- Use `pnpm` — `npm` is not installed on this machine.
- Never call a service directly from a component — go through hooks; `AiChatPanel` is the
  established exception (surface-agnostic, takes `getReply` as a prop), unchanged by this plan.
- No mock/dataStore branch for AI chat — an LLM call needs the server (no key, of either kind,
  may ever reach the browser) and has no meaningful mock-mode equivalent.
  `isHttpBackendConfigured() === false` must produce an honest "not available" error, never a
  fake reply.
- Never hardcode currency — every amount shown to the model must carry its own currency from the
  record it came from.
- Never pad with fake data — this plan removes hardcoded literal "AI insight" dashboards and the
  canned-reply fallback; it must not reintroduce either.
- `GROQ_API_KEY` is a server-only env var — never prefix with `VITE_`, never send it to the client.
  The org's own BYOK key (`OrgAiIntegrationSettings.apiKey`) already follows this rule (server-side
  proxy) — preserve that.
- Don't commit unless asked — this plan does NOT include git commits in its steps; stop after each
  task and let the user review, then commit only if asked.
- **Do not revert or duplicate** the already-committed, unrelated fixes in `83d16b9` (the `<Toaster/>`
  mount in `App.tsx`, the mailto fallback toast in `EmployeeSettings.tsx`, the org-creation owner
  invite in `OrganizationsView.tsx`) — every step below that touches a file `83d16b9` also touched
  is written against that file's *current* content, anchored to keep those unrelated changes intact.

---

### Task 1: `GROQ_API_KEY` config + AI Assistant rate limiter

**Files:**
- Modify: `server/config/env.ts`
- Modify: `.env.example`
- Modify: `server/middleware/rateLimit.ts`

**Interfaces:**
- Produces: `env.groqApiKey: string` (empty string when unset), `aiAssistantRateLimiter` (Express middleware, keyed per signed-in user) — both consumed by Task 4.

- [ ] **Step 1: Add `groqApiKey` to `server/config/env.ts`**

Find:

```ts
  supabaseUrl: process.env.SUPABASE_URL?.trim() || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
};
```

Replace with:

```ts
  supabaseUrl: process.env.SUPABASE_URL?.trim() || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
  // Server-only — never prefix with VITE_. Zero-config fallback for the AI Assistant chat
  // (server/routes/organizations.ts's /ai-chat) when an org hasn't configured its own provider
  // key under Settings → AI Assistant → Integrations. A free Groq API key. Optional — when unset
  // and no org key is configured either, the route reports a clear "not configured" error.
  groqApiKey: process.env.GROQ_API_KEY?.trim() || '',
};
```

- [ ] **Step 2: Document the var in `.env.example`**

Append this section at the end of the file:

```
# ── AI Assistant (optional) ─────────────────────────────────────────────────
# Read by the Express API only (server/config/env.ts) — do NOT add a VITE_ prefix, or the key
# would ship to every client. Zero-config fallback for the real AI Assistant chat when an org
# hasn't set up its own provider key (Settings → AI Assistant → Integrations, which uses
# Anthropic/OpenAI instead). Get a free key at https://console.groq.com/keys (no credit card
# required). Leave blank to rely on org-configured keys only — orgs without one see a clear
# "not configured" message instead of a reply.
GROQ_API_KEY=
```

- [ ] **Step 3: Add the rate limiter to `server/middleware/rateLimit.ts`**

Find:

```ts
import rateLimit from 'express-rate-limit';

/** Throttle brute-force login attempts: 10 tries / 15 min / IP. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: 'Too many login attempts. Try again later.' },
});
```

Replace with:

```ts
import rateLimit from 'express-rate-limit';

/** Throttle brute-force login attempts: 10 tries / 15 min / IP. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: 'Too many login attempts. Try again later.' },
});

/**
 * Throttle AI Assistant chat calls: 20 messages / hour / signed-in user — protects both the
 * shared free Groq quota and an org's own configured key from runaway use. Keyed by
 * `req.authUser!.id` rather than IP — this route is mounted under `/organizations/:organizationId`,
 * which already runs `requireAuth` before this middleware, so `req.authUser` is guaranteed set.
 */
export const aiAssistantRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.authUser!.id,
  message: { success: false, data: null, error: 'Too many messages. Try again in a bit.' },
});
```

- [ ] **Step 4: Verify the server still boots**

```bash
pnpm run dev:server
```

Expected: log shows the server started on port 3001, no import/type errors. Stop it with Ctrl+C.

---

### Task 2: Consolidate `AiChatTurn` into `src/services/types.ts`

**Files:**
- Modify: `src/services/types.ts`
- Modify: `server/lib/aiProviders.ts`
- Modify: `src/services/aiSettingsService.ts`

**Interfaces:**
- Produces: `AiChatTurn { role: 'user' | 'assistant'; content: string }` in `src/services/types.ts` — the single shared definition, consumed by Task 3 (server), Task 5 (client service), Task 6 (`AiChatPanel`).
- Removes: the two duplicate local `AiChatTurn` definitions currently in `server/lib/aiProviders.ts` and `src/services/aiSettingsService.ts`.

- [ ] **Step 1: Add the shared type next to `OrgAiIntegrationSettings`**

Find:

```ts
export interface OrgAiIntegrationSettings {
  /** User opts in to supplying their own API key */
  useCustomKey: boolean;
  /** Display name, e.g. OpenAI, Anthropic */
  providerName: string;
  /** Model id, e.g. gpt-4o-mini */
  modelName: string;
  /** Secret — never log; in production store server-side only */
  apiKey: string;
}
```

Replace with:

```ts
export interface OrgAiIntegrationSettings {
  /** User opts in to supplying their own API key */
  useCustomKey: boolean;
  /** Display name, e.g. OpenAI, Anthropic */
  providerName: string;
  /** Model id, e.g. gpt-4o-mini */
  modelName: string;
  /** Secret — never log; in production store server-side only */
  apiKey: string;
}

/** One turn in an AI Assistant conversation. Shared by the client chat UI/service and the
 *  server's provider callers — previously defined twice, identically, in both places. */
export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
```

- [ ] **Step 2: Point `server/lib/aiProviders.ts` at the shared type**

Find:

```ts
export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiProviderRequest {
```

Replace with:

```ts
import type { AiChatTurn } from '../../src/services/types.js';

export interface AiProviderRequest {
```

- [ ] **Step 3: Point `src/services/aiSettingsService.ts` at the shared type**

Find:

```ts
import { isHttpBackendConfigured, apiGet, apiPostJson, apiRequest } from '@/lib/apiClient';
import type { OrgAiIntegrationSettings, ServiceResponse } from './types';
import { simulateDelay } from './dataStore';

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'finance_os_org_ai_settings_v1';
```

Replace with:

```ts
import { isHttpBackendConfigured, apiGet, apiRequest } from '@/lib/apiClient';
import type { OrgAiIntegrationSettings, ServiceResponse } from './types';
import { simulateDelay } from './dataStore';

const STORAGE_KEY = 'finance_os_org_ai_settings_v1';
```

(`apiPostJson` is dropped from this import because Step 4 of this task removes its only caller in
this file, `sendOrgAiChatMessage` — that function moves to `src/services/aiAssistantService.ts` in
Task 5, which does its own `apiPostJson` import.)

- [ ] **Step 4: Remove the chat-sending function from this settings-only file**

Find (the last section of the file):

```ts
/** Last 4 chars for display when masked */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return `••••••••${key.slice(-4)}`;
}

/**
 * Real chat completion via the org's configured provider (server-side proxy, so the raw key
 * never has to leave the server or be called from the browser). Only meaningful in local-HTTP
 * mode — there is no server to proxy through in mock/Supabase mode, so callers should keep
 * using the local demo replies there regardless of what's saved in `aiSettings`.
 */
export async function sendOrgAiChatMessage(
  organizationId: string,
  message: string,
  history: AiChatTurn[],
  systemPrompt?: string,
): Promise<ServiceResponse<{ reply: string }>> {
  if (!isHttpBackendConfigured()) {
    return { success: false, data: null as any, error: 'not_configured' };
  }
  const err = requireOrg<{ reply: string }>(organizationId);
  if (err) return err;
  return apiPostJson<{ message: string; history: AiChatTurn[]; systemPrompt?: string }, { reply: string }>(
    AI_CHAT_PATH(organizationId),
    { message, history, systemPrompt },
  );
}
```

Replace with:

```ts
/** Last 4 chars for display when masked */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return `••••••••${key.slice(-4)}`;
}
```

- [ ] **Step 5: Remove the now-unused `AI_CHAT_PATH` constant from this file**

Find:

```ts
const AI_SETTINGS_PATH = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/ai-settings`;
const AI_CHAT_PATH = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/ai-chat`;
```

Replace with:

```ts
const AI_SETTINGS_PATH = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/ai-settings`;
```

(Task 5 recreates this same path constant inside the new `aiAssistantService.ts` — it belongs
there now, next to the function that uses it.)

- [ ] **Step 6: Verify the project builds**

```bash
pnpm run build
```

Expected: errors are expected here — `AIFinancialAssistant.tsx` still imports and calls
`sendOrgAiChatMessage` (removed in this task) until Task 7 updates it, and
`server/routes/organizations.ts` still imports `AiChatTurn` from `aiProviders.js` (Task 4 fixes
that). Confirm the *only* new errors trace to those two not-yet-updated files — if anything else
breaks, stop and fix before continuing.

---

### Task 3: Add `callGroq` to `server/lib/aiProviders.ts`

**Files:**
- Modify: `server/lib/aiProviders.ts`

**Interfaces:**
- Consumes: `AiChatTurn` (Task 2), `AiProviderRequest`/`AiProviderResult` (pre-existing in this file).
- Produces: `callGroq(req: AiProviderRequest): Promise<AiProviderResult>` — consumed by Task 4.

- [ ] **Step 1: Generalize `callOpenAiCompatible` to take a base URL and default model**

Find:

```ts
async function callOpenAiCompatible(req: AiProviderRequest): Promise<AiProviderResult> {
  const model = req.modelName?.trim() || 'gpt-4o-mini';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          ...recentHistory(req.history),
          { role: 'user', content: req.message },
        ],
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.error?.message) || `OpenAI API error (${res.status})`;
      return { success: false, error: msg };
    }
    const text = body?.choices?.[0]?.message?.content;
    if (!text) return { success: false, error: 'OpenAI returned an empty response.' };
    return { success: true, reply: text };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not reach OpenAI API.' };
  }
}
```

Replace with:

```ts
async function callOpenAiCompatible(
  req: AiProviderRequest,
  baseUrl: string,
  defaultModel: string,
  providerLabel: string,
): Promise<AiProviderResult> {
  const model = req.modelName?.trim() || defaultModel;
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          ...recentHistory(req.history),
          { role: 'user', content: req.message },
        ],
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.error?.message) || `${providerLabel} API error (${res.status})`;
      return { success: false, error: msg };
    }
    const text = body?.choices?.[0]?.message?.content;
    if (!text) return { success: false, error: `${providerLabel} returned an empty response.` };
    return { success: true, reply: text };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : `Could not reach ${providerLabel} API.`,
    };
  }
}

/** Zero-config fallback tier: Groq's endpoint is OpenAI-request-shaped, so this reuses the same
 *  caller with Groq's base URL and free-tier model instead of a parallel implementation. */
export async function callGroq(req: AiProviderRequest): Promise<AiProviderResult> {
  return callOpenAiCompatible(
    req,
    'https://api.groq.com/openai/v1/chat/completions',
    'llama-3.3-70b-versatile',
    'Groq',
  );
}
```

- [ ] **Step 2: Update the one existing call site to pass the new required arguments**

Find:

```ts
export async function callConfiguredAiProvider(req: AiProviderRequest): Promise<AiProviderResult> {
  const name = req.providerName.toLowerCase();
  if (name.includes('anthropic') || name.includes('claude')) {
    return callAnthropic(req);
  }
  return callOpenAiCompatible(req);
}
```

Replace with:

```ts
export async function callConfiguredAiProvider(req: AiProviderRequest): Promise<AiProviderResult> {
  const name = req.providerName.toLowerCase();
  if (name.includes('anthropic') || name.includes('claude')) {
    return callAnthropic(req);
  }
  return callOpenAiCompatible(req, 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini', 'OpenAI');
}
```

- [ ] **Step 3: Verify the project builds**

```bash
pnpm run build
```

Expected: no new errors in this file (the two-argument-only `callOpenAiCompatible` call from
Step 2's "before" text no longer exists anywhere).

---

### Task 4: Real data context + extend the `/ai-chat` route

**Files:**
- Create: `server/lib/aiContext.ts`
- Modify: `server/routes/organizations.ts`

**Interfaces:**
- Consumes: `store.organizations/transactions/categories/bankAccounts/budgets/loans/projects/organizationMembers/expenses/timesheets/payslips` (pre-existing, `server/lib/store.ts`), `env.groqApiKey` + `aiAssistantRateLimiter` (Task 1), `AiChatTurn` (Task 2), `callGroq` (Task 3), `callConfiguredAiProvider` (pre-existing), `ok`/`fail` (pre-existing), `req.authUser` (pre-existing).
- Produces: `buildOrgContext(organizationId): string`, `buildEmployeeContext(organizationId, userId): string`, `buildSystemPrompt(surface, context): string` (all in `aiContext.ts`) — consumed by the route in this same task. The route's new contract: `POST /api/v1/organizations/:organizationId/ai-chat` with body `{ message: string, history: AiChatTurn[], surface: 'org' | 'employee' }`, response `{ success: true, data: { reply: string } }` or `{ success: false, error: string }` — consumed by Task 5.

- [ ] **Step 1: Write `server/lib/aiContext.ts`**

```ts
/**
 * Builds the real-data context and system prompt for the AI Assistant chat
 * (`server/routes/organizations.ts`'s `/ai-chat`). Kept separate from that route file — this is
 * data summarization, not request handling — and from `aiProviders.ts` — that file only knows how
 * to call an external provider, not what an organization's transactions mean.
 *
 * Context is built server-side from `store` directly (never from client-supplied numbers), so a
 * client can't spoof its own financial picture and the answer doesn't depend on what's cached in
 * the browser.
 */

import { store } from './store.js';

const RECENT_TRANSACTION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

const ORG_PRODUCT_GUIDE =
  'Finance OS features available to this organization: Dashboard (overview), Transactions ' +
  '(ledger, import bank statements), Recurring Transactions, Accounts (chart of accounts + bank ' +
  'accounts), Budgets, Loans, Projects, Departments, Assets (depreciation), Inventory, Reports, ' +
  'Team & Permissions (invite members, roles), Payroll (issue payslips), Import (bank statement ' +
  'upload + AI classification), Settings, Integrations (configure your own AI provider key).';

const EMPLOYEE_PRODUCT_GUIDE =
  'Finance OS features available to this employee: Dashboard, My Timesheet (log hours per ' +
  'project), My Expenses (submit and track reimbursement claims), My Payslips (view pay history), ' +
  'My Projects, Company Announcements.';

function money(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

export function buildOrgContext(organizationId: string): string {
  const org = store.organizations.find(o => o.id === organizationId);
  const currency = org?.currency ?? 'USD';

  const allTransactions = store.transactions.filter(t => t.organizationId === organizationId);
  const cutoff = Date.now() - RECENT_TRANSACTION_WINDOW_MS;
  const recent = allTransactions.filter(t => {
    const ts = Date.parse(t.date);
    return !Number.isNaN(ts) && ts >= cutoff;
  });
  // Fall back to all-time data if nothing falls inside the last 90 days (e.g. seed data dated
  // outside that window) — an empty "recent" summary would be misleadingly quiet, not helpful.
  const transactionsForSummary = recent.length > 0 ? recent : allTransactions;

  const categoryTotals = new Map<string, number>();
  for (const t of transactionsForSummary) {
    const cat = t.categoryId ? store.categories.find(c => c.id === t.categoryId) : undefined;
    const label = cat?.name ?? 'Uncategorized';
    const signed = t.type === 'debit' ? -Math.abs(t.amount) : Math.abs(t.amount);
    categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + signed);
  }
  const categoryLines = [...categoryTotals.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 10)
    .map(([label, total]) => `  - ${label}: ${money(total, currency)}`)
    .join('\n');

  const accountLines = store.bankAccounts
    .filter(a => a.organizationId === organizationId)
    .map(a => `  - ${a.bankName} (${a.accountType}): ${money(a.balance, a.currency)}`)
    .join('\n');

  const budgetLines = store.budgets
    .filter(b => b.organizationId === organizationId)
    .map(
      b =>
        `  - ${b.name} (${b.period}): spent ${money(b.spentAmount, b.currency)} of ${money(b.budgetedAmount, b.currency)} (${b.status})`,
    )
    .join('\n');

  const loans = store.loans.filter(l => l.organizationId === organizationId);
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'partially_paid');
  const overdueLoanLines = overdueLoans
    .map(l => `  - OVERDUE: ${l.party} — ${money(l.amount, l.currency)}`)
    .join('\n');

  const projects = store.projects.filter(p => p.organizationId === organizationId);
  const activeProjects = projects.filter(p => p.status === 'active');
  const projectLines = activeProjects
    .slice(0, 10)
    .map(
      p =>
        `  - ${p.name} (${p.clientName}): quoted ${money(p.quotedAmount, p.currency)}, actual cost ${money(p.actualCost, p.currency)}`,
    )
    .join('\n');

  const members = store.organizationMembers.filter(m => m.organizationId === organizationId);
  const pendingInvites = members.filter(m => m.status === 'pending').length;

  return [
    `Organization: ${org?.name ?? 'Unknown'} (currency: ${currency})`,
    '',
    'Account balances:',
    accountLines || '  (none)',
    '',
    'Transaction categories (net amount, positive = income, negative = expense):',
    categoryLines || '  (no transactions yet)',
    '',
    'Budgets:',
    budgetLines || '  (none set up)',
    '',
    `Loans: ${activeLoans.length} active, ${overdueLoans.length} overdue.`,
    overdueLoanLines,
    '',
    `Projects: ${activeProjects.length} active of ${projects.length} total.`,
    projectLines || '  (none active)',
    '',
    `Team: ${members.length} member(s), ${pendingInvites} pending invite(s).`,
  ]
    .filter(line => line !== '')
    .join('\n');
}

export function buildEmployeeContext(organizationId: string, userId: string): string {
  const timesheets = store.timesheets.filter(
    t => t.organizationId === organizationId && t.userId === userId,
  );
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekHours = timesheets
    .filter(t => {
      const ts = Date.parse(t.date);
      return !Number.isNaN(ts) && ts >= weekAgo;
    })
    .reduce((sum, t) => sum + t.hours, 0);
  const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);

  const expenses = store.expenses.filter(
    e => e.organizationId === organizationId && e.userId === userId,
  );
  const expenseLines = expenses
    .slice(0, 10)
    .map(e => `  - ${e.date}: ${e.description} — ${money(e.amount, e.currency)} (${e.status})`)
    .join('\n');

  const payslips = store.payslips
    .filter(p => p.organizationId === organizationId && p.userId === userId)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const latest = payslips[0];
  const latestLine = latest
    ? `${latest.period}, net ${money(latest.net, latest.currency)}, issued ${latest.issueDate}, status ${latest.status}`
    : '(none issued yet)';

  return [
    `Your logged hours: ${thisWeekHours.toFixed(1)} this week, ${totalHours.toFixed(1)} total on record.`,
    '',
    `Your expense claims (${expenses.length} total):`,
    expenseLines || '  (none submitted)',
    '',
    `Your most recent payslip: ${latestLine}`,
    `Total payslips on record: ${payslips.length}.`,
  ].join('\n');
}

export function buildSystemPrompt(surface: 'org' | 'employee', context: string): string {
  const guide = surface === 'org' ? ORG_PRODUCT_GUIDE : EMPLOYEE_PRODUCT_GUIDE;
  return [
    'You are the AI Assistant built into Finance OS, a financial-ops platform for agencies and ' +
      'software houses. Have a normal, helpful conversation with the user.',
    '',
    guide,
    '',
    'Here is the current data you have access to:',
    context,
    '',
    'Guidelines:',
    '- When the question is about their own finances/work data, answer using the data above and be specific with numbers.',
    '- When the question is about how to use Finance OS, answer using the feature list above.',
    '- When the question is general finance/accounting knowledge, answer from what you know.',
    "- Only say you don't have enough information when a question needs specific data that isn't listed above — don't invent numbers.",
    '- Keep answers clear and reasonably concise unless the user asks for more detail.',
  ].join('\n');
}
```

- [ ] **Step 2: Rewrite the `/ai-chat` route's imports**

Find:

```ts
import { Router, type Request, type Response } from 'express';
import type { Organization, OrganizationMember, OrgAiIntegrationSettings, User } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';
import { requireOrgRole } from '../middleware/auth.js';
import { findAuthUserIdByLegacyId, getSupabaseAdminClient, isSupabaseAdminConfigured } from '../lib/supabaseAdmin.js';
import { callConfiguredAiProvider, type AiChatTurn } from '../lib/aiProviders.js';
```

Replace with:

```ts
import { Router, type Request, type Response } from 'express';
import type { Organization, OrganizationMember, OrgAiIntegrationSettings, User, AiChatTurn } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, fail, notFound } from '../lib/http.js';
import { requireOrgRole } from '../middleware/auth.js';
import { findAuthUserIdByLegacyId, getSupabaseAdminClient, isSupabaseAdminConfigured } from '../lib/supabaseAdmin.js';
import { callConfiguredAiProvider, callGroq } from '../lib/aiProviders.js';
import { buildOrgContext, buildEmployeeContext, buildSystemPrompt } from '../lib/aiContext.js';
import { env } from '../config/env.js';
import { aiAssistantRateLimiter } from '../middleware/rateLimit.js';
```

- [ ] **Step 3: Replace the `/ai-chat` handler**

Find:

```ts
  /**
   * Real chat completion using the org's own configured provider/key (`ai-settings` above).
   * Callers (AiChatPanel via aiSettingsService) fall back to local demo replies when this
   * returns `not_configured` or any error — this never replaces that fallback, only extends it.
   */
  r.post('/ai-chat', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const settings = store.aiSettings[orgId];
    if (!settings?.useCustomKey || !settings.apiKey.trim()) {
      return fail(res, 400, 'not_configured');
    }

    const { message, history, systemPrompt } = req.body as {
      message?: unknown;
      history?: unknown;
      systemPrompt?: unknown;
    };
    if (typeof message !== 'string' || !message.trim()) {
      return fail(res, 400, 'message is required');
    }
    const safeHistory: AiChatTurn[] = Array.isArray(history)
      ? history.filter(
          (h): h is AiChatTurn =>
            h && typeof h === 'object' && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string',
        )
      : [];

    void callConfiguredAiProvider({
      providerName: settings.providerName,
      modelName: settings.modelName,
      apiKey: settings.apiKey,
      systemPrompt: typeof systemPrompt === 'string' && systemPrompt.trim()
        ? systemPrompt
        : 'You are a helpful financial assistant for a small agency. Be concise.',
      message,
      history: safeHistory,
    }).then((result) => {
      if (!result.success) return fail(res, 502, result.error);
      ok(res, { reply: result.reply });
    });
  });

  return r;
}
```

Replace with:

```ts
  /**
   * Real chat completion, grounded in this organization's/employee's own data. Resolution order:
   * (1) the org's own configured provider key (`ai-settings` above) if set, (2) the server's free
   * Groq key (GROQ_API_KEY) as a zero-config fallback, (3) a clear "not configured" error if
   * neither is available. No silent fallback to canned replies — an honest error either way.
   */
  r.post('/ai-chat', aiAssistantRateLimiter, async (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const userId = req.authUser!.id;

    const { message, history, surface } = req.body as {
      message?: unknown;
      history?: unknown;
      surface?: unknown;
    };
    if (typeof message !== 'string' || !message.trim()) {
      return fail(res, 400, 'message is required');
    }
    if (surface !== 'org' && surface !== 'employee') {
      return fail(res, 400, 'surface must be "org" or "employee"');
    }
    const safeHistory: AiChatTurn[] = Array.isArray(history)
      ? history.filter(
          (h): h is AiChatTurn =>
            h && typeof h === 'object' && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string',
        )
      : [];

    const settings = store.aiSettings[orgId];
    const context =
      surface === 'org' ? buildOrgContext(orgId) : buildEmployeeContext(orgId, userId);
    const systemPrompt = buildSystemPrompt(surface, context);

    let result;
    if (settings?.useCustomKey && settings.apiKey.trim()) {
      result = await callConfiguredAiProvider({
        providerName: settings.providerName,
        modelName: settings.modelName,
        apiKey: settings.apiKey,
        systemPrompt,
        message,
        history: safeHistory,
      });
    } else if (env.groqApiKey) {
      result = await callGroq({
        providerName: 'Groq',
        modelName: 'llama-3.3-70b-versatile',
        apiKey: env.groqApiKey,
        systemPrompt,
        message,
        history: safeHistory,
      });
    } else {
      return fail(
        res,
        503,
        "AI Assistant isn't configured. Add your own AI provider key in Settings → AI Assistant → Integrations, or ask an admin to set GROQ_API_KEY on the server.",
      );
    }

    if (!result.success) return fail(res, 502, result.error);
    ok(res, { reply: result.reply });
  });

  return r;
}
```

- [ ] **Step 4: Verify the server boots and the route registers**

```bash
pnpm run dev:server
```

Expected: server starts on port 3001 with no route-registration or import errors. Stop with
Ctrl+C once confirmed. Full functional verification (an actual reply, from either provider tier)
happens in Task 8, once the client can reach this route.

---

### Task 5: Client service — `aiAssistantService.ts`

**Files:**
- Create: `src/services/aiAssistantService.ts`

**Interfaces:**
- Consumes: `isHttpBackendConfigured`, `apiPostJson` from `@/lib/apiClient` (pre-existing), `AiChatTurn`, `ServiceResponse` from `./types` (Task 2; `ServiceResponse` pre-existing).
- Produces: `sendAiChatMessage(organizationId: string, message: string, history: AiChatTurn[], surface: 'org' | 'employee'): Promise<ServiceResponse<{ reply: string }>>` — consumed by Task 6 and Task 7.

- [ ] **Step 1: Write `src/services/aiAssistantService.ts`**

```ts
/**
 * AI Assistant chat — real replies via the Express server's `/ai-chat` route
 * (`server/routes/organizations.ts`), which resolves to the org's own configured provider key or
 * the server's free Groq fallback. Deliberately has no dataStore/mock-mode branch: an LLM call
 * needs the server (no key may ever reach the browser), so mock mode gets an honest "not
 * available" error, never a fake reply.
 */

import { isHttpBackendConfigured, apiPostJson } from '@/lib/apiClient';
import type { AiChatTurn, ServiceResponse } from './types';

const AI_CHAT_PATH = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/ai-chat`;

export async function sendAiChatMessage(
  organizationId: string,
  message: string,
  history: AiChatTurn[],
  surface: 'org' | 'employee',
): Promise<ServiceResponse<{ reply: string }>> {
  if (!organizationId.trim()) {
    return { success: false, data: { reply: '' }, error: 'organizationId required' };
  }

  if (!isHttpBackendConfigured()) {
    return {
      success: false,
      data: { reply: '' },
      error:
        'AI Assistant requires the app to be running with the local API server (pnpm run dev:full).',
    };
  }

  return apiPostJson<
    { message: string; history: AiChatTurn[]; surface: 'org' | 'employee' },
    { reply: string }
  >(AI_CHAT_PATH(organizationId), { message, history, surface });
}
```

- [ ] **Step 2: Verify the project builds**

```bash
pnpm run build
```

Expected: no errors in this new file (errors elsewhere referencing `sendOrgAiChatMessage` are
expected until Task 7 — see that task).

---

### Task 6: `AiChatPanel.tsx` — thread real conversation history

**Files:**
- Modify: `src/app/components/shared/AiChatPanel.tsx`

**Interfaces:**
- Consumes: `AiChatTurn` (Task 2).
- Produces: `AiChatPanelProps.getReply: (text: string, history: AiChatTurn[]) => Promise<{ response: string; suggestions?: string[] }>` — consumed by Task 7 and Task 8 (replacing the current single-argument `getReply` everywhere it's used).

- [ ] **Step 1: Add the `AiChatTurn` import**

Find:

```ts
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
```

Replace with:

```ts
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import type { AiChatTurn } from '@/services/types';
```

- [ ] **Step 2: Widen `getReply` to take conversation history**

Find:

```ts
export interface AiChatPanelProps {
  /** Heading shown at the top of the chat card, e.g. "Ask the assistant" */
  title: string;
  /** Short description shown under the title */
  subtitle: string;
  /** Prompt chips shown in the empty state; clicking one sends it immediately */
  quickPrompts: string[];
  /**
   * Pluggable reply generator. Each caller (org, platform, ...) supplies its own logic — a
   * synchronous canned-response lookup, or an async one that calls a real backend first and
   * falls back to a canned reply (see `AIFinancialAssistant`'s `getChatReply`).
   */
  getReply: (
    text: string,
  ) => { response: string; suggestions?: string[] } | Promise<{ response: string; suggestions?: string[] }>;
  /** Placeholder text for the composer textarea */
  placeholder?: string;
  /** Helper copy shown in the empty state, above the quick prompts */
  emptyStateHint?: string;
}
```

Replace with:

```ts
export interface AiChatPanelProps {
  /** Heading shown at the top of the chat card, e.g. "Ask the assistant" */
  title: string;
  /** Short description shown under the title */
  subtitle: string;
  /** Prompt chips shown in the empty state; clicking one sends it immediately */
  quickPrompts: string[];
  /**
   * Sends the new message plus everything said so far (oldest first, not including the new
   * message) to a real backend and resolves with the assistant's reply. Each caller (org,
   * employee, ...) supplies its own org/surface-scoped call — see `AIFinancialAssistant`'s and
   * `EmployeeAiAssistant`'s `getChatReply`. Throw (or reject with) an Error to surface a message
   * via the panel's built-in error banner.
   */
  getReply: (
    text: string,
    history: AiChatTurn[],
  ) => Promise<{ response: string; suggestions?: string[] }>;
  /** Placeholder text for the composer textarea */
  placeholder?: string;
  /** Helper copy shown in the empty state, above the quick prompts */
  emptyStateHint?: string;
}
```

- [ ] **Step 3: Pass history through `handleSend`, drop the fake-delay/error-demo scaffolding**

Find:

```ts
  const handleSend = useCallback(async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || sending) return;
    if (raw.length > CHAT_INPUT_MAX) return;
    setSendError(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: raw,
    };
    // Commit user bubble before sending=true so the log never briefly shows neither empty hero nor bubbles (BUG-ORG-P04-001).
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      await new Promise<void>((resolve, reject) => {
        window.setTimeout(() => {
          if (raw.toLowerCase() === 'error demo') {
            reject(new Error('Assistant is unavailable right now. Try again in a moment.'));
            return;
          }
          resolve();
        }, 700);
      });

      const { response, suggestions } = await getReply(raw);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response,
        suggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending, getReply]);
```

Replace with:

```ts
  const handleSend = useCallback(async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || sending) return;
    if (raw.length > CHAT_INPUT_MAX) return;
    setSendError(null);

    // History sent to getReply is everything said BEFORE this new message — captured from state
    // now, before the user bubble below is added to it.
    const historyBeforeThisMessage: AiChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: raw,
    };
    // Commit user bubble before sending=true so the log never briefly shows neither empty hero nor bubbles (BUG-ORG-P04-001).
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const { response, suggestions } = await getReply(raw, historyBeforeThisMessage);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response,
        suggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, getReply]);
```

- [ ] **Step 4: Verify the project builds**

```bash
pnpm run build
```

Expected: errors at this point are expected and fine — `AIFinancialAssistant.tsx` and
`EmployeeAiAssistant.tsx` still pass a single-argument `getReply` until Task 7 updates them.
Confirm the *only* new errors are exactly those two files' `getReply` mismatching — if anything
else is broken, stop and fix it before continuing.

---

### Task 7: Wire both surfaces to the real, history-aware assistant

**Files:**
- Modify: `src/app/components/organization/AIFinancialAssistant.tsx`
- Modify: `src/app/components/employee/EmployeeAiAssistant.tsx`

**Interfaces:**
- Consumes: `sendAiChatMessage` (Task 5), `AiChatTurn` (Task 2), `AiChatPanelProps.getReply` (Task 6).

#### Part A — `AIFinancialAssistant.tsx`

- [ ] **Step 1: Trim the icon imports, swap the settings-service import for the new chat service**

Find:

```ts
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { fetchOrgAiSettings, sendOrgAiChatMessage } from '@/services/aiSettingsService';
import { organizationService } from '@/services/organizationService';
import { auditService } from '@/services/auditService';
import type { OrgAiIntegrationSettings } from '@/services/types';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
import { useOrgWorkspaceNav } from './OrgWorkspaceNavContext';
import { AXIOM } from '../../../styles/axiom-tokens';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
  Users,
  PieChart,
  Activity,
  MessageCircle,
  Search,
  ArrowRight,
  Receipt,
  Landmark,
  Wallet,
  Mail,
  Crown,
  Shield,
} from 'lucide-react';
```

Replace with:

```ts
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { fetchOrgAiSettings } from '@/services/aiSettingsService';
import { sendAiChatMessage } from '@/services/aiAssistantService';
import { organizationService } from '@/services/organizationService';
import { auditService } from '@/services/auditService';
import type { AiChatTurn, OrgAiIntegrationSettings } from '@/services/types';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
import { useOrgWorkspaceNav } from './OrgWorkspaceNavContext';
import { AXIOM } from '../../../styles/axiom-tokens';
import {
  Brain,
  Lightbulb,
  Activity,
  MessageCircle,
  Search,
  ArrowRight,
  Receipt,
  Landmark,
  Wallet,
  Mail,
  Crown,
  Shield,
} from 'lucide-react';
```

- [ ] **Step 2: Remove the unused `AIInsight`/`FinancialPattern` types and the canned-reply table**

Find:

```ts
interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'success' | 'info';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation?: string;
}

interface FinancialPattern {
  id: string;
  pattern: string;
  frequency: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  suggestion: string;
}

const CHAT_SAMPLE_RESPONSES: {
  trigger: string[];
  response: string;
  suggestions?: string[];
}[] = [
  {
    trigger: ['profit', 'margin'],
    response:
      'Your profit margin for this month is 28%, which is about 3% higher than last month in this demo. In production this would use your ledger.',
    suggestions: ['Show me department profitability', 'Which clients are most profitable?'],
  },
  {
    trigger: ['cash', 'flow', 'balance'],
    response:
      'Demo answer: cash and runway here are illustrative. Connect live data to personalize this.',
    suggestions: ['Show cash flow forecast', 'List upcoming expenses'],
  },
  {
    trigger: ['expense', 'spending'],
    response:
      'Top expense categories would appear here from your categorized transactions. This is a mock response until the API is wired.',
    suggestions: ['Show expense breakdown', 'Compare to last quarter'],
  },
];

const CHAT_QUICK_PROMPTS = [
  'How is my cash position?',
  'What are my biggest expenses?',
  'Explain profit margin trends',
];

function matchDemoReply(text: string): { response: string; suggestions?: string[] } {
  const lower = text.toLowerCase();
  const hit = CHAT_SAMPLE_RESPONSES.find((r) => r.trigger.some((k) => lower.includes(k)));
  if (hit) return { response: hit.response, suggestions: hit.suggestions };
  return {
    response:
      'I can help with cash flow, expenses, margins, and forecasts. This reply is a demo — in production it would use your org data. Try the quick prompts or ask something specific.',
    suggestions: ['Why did profit change?', 'Show cash flow forecast'],
  };
}
```

Replace with:

```ts
const CHAT_QUICK_PROMPTS = [
  'How is my cash position?',
  'What are my biggest expenses?',
  'Explain profit margin trends',
  'How do I invite a team member?',
];
```

- [ ] **Step 3: Rewrite `getChatReply` to call the real service with real history, drop the BYOK-only gate**

Find:

```ts
  const hasLiveAiProvider = !!(aiSettings?.useCustomKey && aiSettings.apiKey.trim());

  /** Tries the org's configured provider (server-side proxy) first; falls back to the local
   *  demo reply on any failure — missing/invalid key, provider outage, or mock/Supabase mode
   *  where there's no server to proxy through. Never throws: the fallback IS the error handling. */
  const getChatReply = async (text: string): Promise<{ response: string; suggestions?: string[] }> => {
    if (hasLiveAiProvider) {
      const res = await sendOrgAiChatMessage(orgId, text, []);
      if (res.success) return { response: res.data.reply };
    }
    return matchDemoReply(text);
  };
```

Replace with:

```ts
  /** Server resolves the org's own configured provider key first, then the free Groq fallback,
   *  then an honest "not configured" error — this component doesn't need to know which. */
  const getChatReply = useCallback(
    async (text: string, history: AiChatTurn[]): Promise<{ response: string }> => {
      const res = await sendAiChatMessage(orgId, text, history, 'org');
      if (!res.success) throw new Error(res.error || 'Something went wrong. Try again.');
      return { response: res.data.reply };
    },
    [orgId],
  );
```

(`aiSettings`/`fetchOrgAiSettings` stay — they still drive the real "Integration: ..." display line
elsewhere in this file, which is untouched by this task.)

- [ ] **Step 4: Remove the hardcoded `currentSituation`/`futureProjections` data objects**

Find:

```ts
  const currentSituation = {
    cashPosition: 'healthy',
    burnRate: 'PKR 420,000/month',
    runway: '8.5 months',
    profitMargin: '32%',
    personalDrawings: '42% of revenue (too high)',
    teamUtilization: '78%'
  };

  const futureProjections = {
    nextQuarter: {
      revenue: 'PKR 1.85M',
      profit: 'PKR 580K',
      confidence: 85
    },
    nextYear: {
      revenue: 'PKR 7.2M',
      profit: 'PKR 2.3M',
      confidence: 72
    }
  };

  return (
```

Replace with:

```ts
  return (
```

- [ ] **Step 5: Remove the `aiInsights`/`financialPatterns` literal data**

Find:

```ts
  const aiInsights: AIInsight[] = [
    {
      id: '1',
      type: 'warning',
      category: 'Personal vs Business',
      title: 'High Personal Expense Ratio Detected',
      description: 'You\'re drawing 42% of business revenue as personal expenses. Industry standard for agencies is 15-25%.',
      impact: 'high',
      actionable: true,
      recommendation: 'Consider reducing personal drawings to PKR 180,000/month to maintain healthy cash flow.'
    }
  ];

  const financialPatterns: FinancialPattern[] = [
    {
      id: '1',
      pattern: 'Peak Revenue Months',
      frequency: 'Q4 (Oct-Dec)',
      trend: 'increasing',
      suggestion: 'Your revenue increases 35% in Q4. Plan for increased hiring/expenses in Q3 to capture demand.'
    },
    {
      id: '2',
      pattern: 'Cash Withdrawal Pattern',
      frequency: 'Every 15th of month',
      trend: 'stable',
      suggestion: 'You consistently withdraw PKR 150,000 on the 15th. Set up automated transfer for better planning.'
    },
    {
      id: '3',
      pattern: 'Client Payment Delays',
      frequency: 'Average 18 days',
      trend: 'increasing',
      suggestion: 'Payment delays increasing by 3 days/quarter. Implement stricter payment terms or advance billing.'
    },
    {
      id: '4',
      pattern: 'Office Expense Spike',
      frequency: 'January & July',
      trend: 'stable',
      suggestion: 'Office expenses spike in Jan (utilities) and July (maintenance). Budget extra PKR 40,000 for these months.'
    }
  ];

  return (
```

Replace with:

```ts
  return (
```

(Both this step and Step 4 delete a `return (` line — only one `return (` should remain once both
edits are applied; make sure you don't end up with two.)

- [ ] **Step 6: Replace the "Ask" tab's JSX — real chat only, drop the fake dashboards**

Find (the header's AI-settings line and the opening of the `activeTab === 'ask'` block):

```tsx
        {aiSettings && (aiSettings.providerName.trim() || aiSettings.modelName.trim()) && (
          <p className="text-slate-500 text-xs mt-2 max-w-2xl leading-relaxed">
            Integration: {aiSettings.providerName.trim() || 'Custom provider'}
            {aiSettings.modelName.trim() ? ` · Model: ${aiSettings.modelName.trim()}` : ''}
            {aiSettings.useCustomKey && aiSettings.apiKey
              ? ' · API key saved on this device (Integrations). Chat still uses demo replies until your backend uses this key.'
              : ''}
          </p>
        )}
```

Replace with:

```tsx
        {aiSettings && (aiSettings.providerName.trim() || aiSettings.modelName.trim()) && (
          <p className="text-slate-500 text-xs mt-2 max-w-2xl leading-relaxed">
            Integration: {aiSettings.providerName.trim() || 'Custom provider'}
            {aiSettings.modelName.trim() ? ` · Model: ${aiSettings.modelName.trim()}` : ''}
            {aiSettings.useCustomKey && aiSettings.apiKey
              ? ' · This key powers the chat below.'
              : ''}
          </p>
        )}
```

Then find:

```tsx
      {activeTab === 'ask' && (
      <>
      {/* ORG-P04: chat panel — send path + empty state + errors in UI */}
      <AiChatPanel
        title="Ask the assistant"
        subtitle="Demo replies for now — type a question or use a quick prompt. Live answers will use your org data when connected."
        quickPrompts={CHAT_QUICK_PROMPTS}
        getReply={matchDemoReply}
        placeholder="Ask about cash flow, expenses, or margins…"
        emptyStateHint="Start a conversation about your finances. Answers below the fold are sample dashboards until your data is connected."
      />
```

Replace with:

```tsx
      {activeTab === 'ask' && (
        <AiChatPanel
          title="Ask the assistant"
          subtitle="Real answers grounded in your organization's data — ask about cash flow, expenses, margins, how to use Finance OS, or general finance questions."
          quickPrompts={CHAT_QUICK_PROMPTS}
          getReply={getChatReply}
          placeholder="Ask about cash flow, expenses, margins, or how to use Finance OS…"
          emptyStateHint="Start a conversation about your organization's finances or Finance OS itself."
        />
      )}
```

Then find the (now-orphaned) remainder of that block — from the "Current Situation" section
through the end of the `ask` tab:

Find the start marker:

```tsx
      {/* Current Situation - Dashboard Style */}
```

...through the end marker (right before the Insights tab):

```tsx
      </>
      )}

      {/* Task 2: real, computed Insights tab */}
```

Delete every line from the start marker through `      </>\n      )}\n\n` (inclusive), **keeping**
the `{/* Task 2: real, computed Insights tab */}` line and everything after it unchanged. This
removes "Current Situation", "Future Projections", "AI-Generated Insights", "Detected Financial
Patterns", and "How AI Financial Assistant Works" — all rendering the literal hardcoded numbers
just deleted in Steps 4–5. The already-real Insights tab (`activeTab === 'insights'`) and Activity
tab (`activeTab === 'activity'`) that follow are untouched.

- [ ] **Step 7: Verify the project builds**

```bash
pnpm run build
```

Expected: no errors referencing this file (unused `AIInsight`/`FinancialPattern`/
`CHAT_SAMPLE_RESPONSES`/`matchDemoReply`/`hasLiveAiProvider`/`currentSituation`/
`futureProjections`/`aiInsights`/`financialPatterns` should all be gone; no leftover references).

- [ ] **Step 8: Smoke-check the page in the browser**

```bash
pnpm run dev:full
```

Open `/login/owner`, sign in, navigate to `?view=ai-assistant` (or the AI Assistant nav item). In
the browser devtools console:

```js
const t = document.body.innerText;
[t.includes('Something went wrong'), /is not defined/.test(t)]
```

Expected: `[false, false]`. Confirm the page shows only the chat panel under the "Ask" tab (no
"Current Financial Situation" / "Future Projections" / "Detected Financial Patterns" cards), and
that Insights/Activity tabs still render as before.

#### Part B — `EmployeeAiAssistant.tsx`

- [ ] **Step 9: Update imports**

Find:

```ts
import { motion } from 'motion/react';
import { Bot, DollarSign, Clock, FileText, ArrowRight } from 'lucide-react';
import { PageShell, PageHeader } from '../layout';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
import { AXIOM } from '../../../styles/axiom-tokens';
import type { EmployeeView } from './EmployeeWorkspace';
```

Replace with:

```ts
import { useCallback } from 'react';
import { motion } from 'motion/react';
import { Bot, DollarSign, Clock, FileText, ArrowRight } from 'lucide-react';
import { PageShell, PageHeader } from '../layout';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
import { AXIOM } from '../../../styles/axiom-tokens';
import { useAuth } from '@/contexts/AuthContext';
import { sendAiChatMessage } from '@/services/aiAssistantService';
import type { AiChatTurn } from '@/services/types';
import type { EmployeeView } from './EmployeeWorkspace';
```

- [ ] **Step 10: Remove the canned-reply table**

Find:

```ts
const CHAT_SAMPLE_RESPONSES: { trigger: string[]; response: string; suggestions?: string[] }[] = [
  {
    trigger: ['hour', 'timesheet', 'week'],
    response:
      "Demo answer: your logged hours for this week would appear here from your timesheet. This is a mock response until the API is wired — check My Timesheet for the real numbers.",
    suggestions: ['View my timesheet', 'How do I log overtime?'],
  },
  {
    trigger: ['expense', 'claim', 'reimburse'],
    response:
      'Demo answer: the status of your most recent expense claim would appear here. This is a mock response until the API is wired — check My Expenses for the real status.',
    suggestions: ['View my expenses', 'How long does approval take?'],
  },
  {
    trigger: ['payslip', 'pay', 'salary'],
    response:
      "Demo answer: your next payslip date would appear here based on your organization's pay schedule. This is a mock response until the API is wired — check Payslips for the real date.",
    suggestions: ['View my payslips', 'Who do I contact about pay?'],
  },
];

function matchDemoReply(text: string): { response: string; suggestions?: string[] } {
  const lower = text.toLowerCase();
  const hit = CHAT_SAMPLE_RESPONSES.find((r) => r.trigger.some((k) => lower.includes(k)));
  if (hit) return { response: hit.response, suggestions: hit.suggestions };
  return {
    response:
      'I can help with questions about your hours, expenses, projects, and payslips. This reply is a demo — in production it would use your real employee data. Try a quick prompt or ask something specific.',
    suggestions: CHAT_QUICK_PROMPTS,
  };
}
```

Replace with: *(nothing — delete this whole block)*

- [ ] **Step 11: Add `useAuth` + the real `getChatReply`, wire the panel**

Find:

```ts
export function EmployeeAiAssistant({ onNavigate }: EmployeeAiAssistantProps) {
  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title="AI Assistant"
          description="Ask about your hours, expenses, and payslips"
        />
      </motion.div>

      <AiChatPanel
        title="AI Assistant"
        subtitle="Demo replies for now — type a question or use a quick prompt. Live answers will use your employee data when connected."
        quickPrompts={CHAT_QUICK_PROMPTS}
        getReply={matchDemoReply}
        placeholder="Ask about your hours, expenses, or payslips…"
        emptyStateHint="Start a conversation about your work. Answers below are sample data until this is connected to a live backend."
      />
```

Replace with:

```ts
export function EmployeeAiAssistant({ onNavigate }: EmployeeAiAssistantProps) {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? 'org-001';

  const getChatReply = useCallback(
    async (text: string, history: AiChatTurn[]): Promise<{ response: string }> => {
      const res = await sendAiChatMessage(orgId, text, history, 'employee');
      if (!res.success) throw new Error(res.error || 'Something went wrong. Try again.');
      return { response: res.data.reply };
    },
    [orgId],
  );

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title="AI Assistant"
          description="Ask about your hours, expenses, and payslips"
        />
      </motion.div>

      <AiChatPanel
        title="AI Assistant"
        subtitle="Real answers grounded in your own timesheet, expenses, and payslips — or ask anything about how to use Finance OS."
        quickPrompts={CHAT_QUICK_PROMPTS}
        getReply={getChatReply}
        placeholder="Ask about your hours, expenses, or payslips…"
        emptyStateHint="Start a conversation about your work or Finance OS itself."
      />
```

- [ ] **Step 12: Verify the project builds**

```bash
pnpm run build
```

Expected: no errors referencing this file.

- [ ] **Step 13: Smoke-check the page in the browser**

```bash
pnpm run dev:full
```

Open `/login/employee`, sign in, navigate to the AI Assistant view. Run the same crash check as
Step 8 and confirm it renders — full functional verification happens in Task 8.

---

### Task 8: Remove the floating widget

**Files:**
- Delete: `src/app/components/ai-assistant/AIAssistantChat.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:** none — this task only removes code; nothing downstream depends on it.

- [ ] **Step 1: Remove the lazy import (keep the `Toaster` import above it — added by an unrelated prior fix — untouched)**

Find:

```ts
import { LoginPage } from './components/LoginPage';
import { Toaster } from './components/ui/sonner';
```

Confirm this line is present unchanged (it should already be — do not modify it; it's from an
unrelated fix). Then find:

```ts
const KeyboardShortcuts = React.lazy(() =>
  import('./components/keyboard-shortcuts/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts }))
);
const AIAssistantChat = React.lazy(() =>
  import('./components/ai-assistant/AIAssistantChat').then(m => ({ default: m.AIAssistantChat }))
);
```

Replace with:

```ts
const KeyboardShortcuts = React.lazy(() =>
  import('./components/keyboard-shortcuts/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts }))
);
```

- [ ] **Step 2: Remove the mount (keep the `<Toaster/>` mount above it untouched)**

Find:

```tsx
            <OnboardingProvider>
              {/* Every toast.success/toast.error call across the app (Add Asset, Invite Member,
                  Save Settings, Export, ...) was a silent no-op — sonner's <Toaster/> was never
                  mounted anywhere, so the toast queue had nowhere to render. */}
              <Toaster richColors position="top-right" />
              <Suspense fallback={<LoadingScreen />}>
                <SilentErrorBoundary>
                  <MagneticCursor />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <OnboardingWizard />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <CommandPalette />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <KeyboardShortcuts />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <AIAssistantChat />
                </SilentErrorBoundary>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </Suspense>
            </OnboardingProvider>
```

Replace with:

```tsx
            <OnboardingProvider>
              {/* Every toast.success/toast.error call across the app (Add Asset, Invite Member,
                  Save Settings, Export, ...) was a silent no-op — sonner's <Toaster/> was never
                  mounted anywhere, so the toast queue had nowhere to render. */}
              <Toaster richColors position="top-right" />
              <Suspense fallback={<LoadingScreen />}>
                <SilentErrorBoundary>
                  <MagneticCursor />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <OnboardingWizard />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <CommandPalette />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <KeyboardShortcuts />
                </SilentErrorBoundary>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </Suspense>
            </OnboardingProvider>
```

- [ ] **Step 3: Delete the file and its now-empty folder**

```bash
rm "src/app/components/ai-assistant/AIAssistantChat.tsx"
rmdir "src/app/components/ai-assistant" 2>/dev/null || true
```

(On Windows/PowerShell: `Remove-Item "src/app/components/ai-assistant" -Recurse -Force`.)

- [ ] **Step 4: Verify the project builds**

```bash
pnpm run build
```

Expected: no errors (no remaining references to `AIAssistantChat` anywhere — confirm with a
repo-wide search for the string `AIAssistantChat` if unsure).

- [ ] **Step 5: Smoke-check the app boots**

```bash
pnpm run dev:full
```

Open any page (e.g. `/login/owner`, sign in). Confirm the floating chat bubble (bottom-right) no
longer appears anywhere, that toasts still work (e.g. trigger any `toast.success` action —
unaffected by this task, just confirming Step 1–2 didn't regress it), and no console error
mentions a missing module.

---

### Task 9: End-to-end verification

**Files:** none — verification only.

- [ ] **Step 1: Confirm the "not configured" path (both tiers absent)**

Ensure no org has `useCustomKey: true` with a saved key (fresh seed data should already satisfy
this), and leave `GROQ_API_KEY` unset in `.env.local`. Run:

```bash
pnpm run dev:full
```

Sign in via `/login/owner`, open the AI Assistant "Ask" tab, send any message. Expected: the
panel's error banner shows "AI Assistant isn't configured. Add your own AI provider key in
Settings → AI Assistant → Integrations, or ask an admin to set GROQ_API_KEY on the server." — not
a crash, not a fake reply.

- [ ] **Step 2: Groq fallback tier**

Get a free key at https://console.groq.com/keys (no credit card) and add it to `.env.local`:

```
GROQ_API_KEY=gsk_your_key_here
```

Restart `pnpm run dev:full` (env vars are read at server boot). With no org-level key configured,
ask: *"What's my current budget status?"* Expected: a real, specific reply referencing actual
seeded budget names/amounts — not generic filler, not an error.

- [ ] **Step 3: Multi-turn memory**

In the same conversation, ask a follow-up that only makes sense with context from the previous
answer (e.g. after asking about budget status, ask *"Which of those is closest to going over?"*).
Expected: the reply correctly references the prior turn — confirms history is actually threaded
end-to-end now (it previously wasn't, on either provider path).

- [ ] **Step 4: How-to and general-knowledge questions in the same conversation**

Still in the same conversation, ask: *"How do I invite a new team member?"* and then *"What's the
difference between cash flow and profit?"* Expected: both answered naturally and correctly — the
first referencing Finance OS's Team & Permissions feature, the second from general finance
knowledge — neither refused for being "outside the data."

- [ ] **Step 5: BYOK tier takes priority when configured**

In the org workspace, go to Settings → AI Assistant → Integrations, enable "use your own key",
enter a real Anthropic or OpenAI API key, and save. Ask another question in the Ask tab. Expected:
a real reply (confirms the BYOK path still works after the route rewrite); the header's
"Integration: ..." line shows the configured provider/model. Then clear that key again (Integrations
→ remove/disable) so the rest of this task exercises the Groq fallback as intended.

- [ ] **Step 6: Employee portal — own-data question, and isolation check**

Log out, sign in via `/login/employee` (Alex Chen). Open the AI Assistant, ask: *"How many hours
have I logged this week?"* Expected: a reply reflecting Alex Chen's own seeded timesheet data.
Then ask something implying another employee's data (e.g. *"What's Lisa Kumar's payslip?"*) —
expected: the assistant does not fabricate another employee's figures (it has no access to them
server-side, so it can only decline or say it doesn't have that information).

- [ ] **Step 7: Mock-mode honest failure**

Stop `dev:full`. Run `pnpm run dev` alone (no local API server). Open the app, sign in, open either
AI Assistant view, send a message. Expected: "AI Assistant requires the app to be running with the
local API server (pnpm run dev:full)." appears immediately — no hung network request, no fake
reply. Stop this server once confirmed; restart `pnpm run dev:full` if continuing to test.

- [ ] **Step 8: Confirm the floating widget is gone everywhere**

Click through a few different views/surfaces (org dashboard, employee dashboard, platform console
if accessible) and confirm the bottom-right chat bubble never appears on any of them.

- [ ] **Step 9: Crash sweep**

In the browser devtools console, on each of the org "Ask" tab and the employee AI Assistant page:

```js
const t = document.body.innerText;
[t.includes('Something went wrong'), /\bNaN\b/.test(t)]
```

Expected: `[false, false]` on both.

- [ ] **Step 10: Report results**

Summarize what was confirmed in Steps 1–9 (pass/fail per step). No commit needed for this task —
it's verification only. If everything passes, this plan is complete; commit the whole feature only
if/when the user asks.

---

## Self-Review Notes

- **Spec coverage:** BYOK-first, Groq-fallback, honest-error-otherwise resolution order (Task 4,
  verified Task 9 Steps 1–2, 5) · session-only history, now actually threaded end-to-end (Task 6,
  verified Task 9 Step 3 — previously broken on both provider paths) · org context from real
  `store` data (Task 4 `buildOrgContext`) · employee context scoped to caller only via
  `req.authUser!.id` (Task 4 `buildEmployeeContext`, verified Task 9 Step 6) · open conversational
  scope incl. product how-to + general knowledge (Task 4 `buildSystemPrompt`, verified Task 9 Step
  4) · mock-mode honest failure, no dataStore branch (Task 5, verified Task 9 Step 7) · floating
  widget removed (Task 8) · fake dashboards + all canned-reply fallbacks removed (Task 7 Steps
  2–3, 5–6, 10–11) · rate limiting (Task 1 Step 3, applied in Task 4 Step 3) · reconciliation with
  the pre-existing `83d16b9` commit without reverting its unrelated fixes (Task 8 Steps 1–2 anchor
  around the `Toaster` addition explicitly; Global Constraints call this out). All covered.
- **Type consistency:** `AiChatTurn` (Task 2, in `src/services/types.ts`) is the single shape used
  by `AiProviderRequest`/`callConfiguredAiProvider`/`callGroq` (Task 3), the route's
  `safeHistory`/`req.body` handling (Task 4), `sendAiChatMessage`'s signature (Task 5),
  `AiChatPanelProps.getReply` (Task 6), and both callers' `getChatReply` (Task 7) —
  `{ role: 'user' | 'assistant'; content: string }` everywhere, no drift.
  `sendAiChatMessage(organizationId, message, history, surface)` parameter order/types match every
  call site (Task 5 definition; Task 7 Parts A and B calls).
- **No placeholders:** every step has literal code or an exact, unambiguous find/replace anchor;
  every anchor was re-derived from the *current* file content (post-`83d16b9`), not the original
  pre-existing-commit assumption — the two large-deletion steps (Task 7 Step 6, Step 10) name exact
  start/end markers rather than describing "remove the fake stuff" vaguely.
