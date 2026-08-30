# Real AI Assistant (Groq-backed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three keyword-matched demo "AI Assistant" chat surfaces (a global floating widget, the org workspace "Ask" tab, and the employee portal assistant) with one real, Groq-backed conversational assistant per remaining surface (org workspace, employee portal), grounded in that org's/employee's actual data and able to hold an open conversation (data questions, Finance OS how-to, general finance knowledge) — not a narrow lookup tool.

**Architecture:** One new Express route (`/organizations/:organizationId/ai-assistant/chat`) builds a text summary of the caller's real data straight from `server/lib/store.ts`, wraps it in a system prompt, and forwards the conversation to Groq's OpenAI-compatible chat-completions endpoint via plain `fetch` — no new SDK. A new client service (`aiAssistantService.ts`) calls that route and refuses to call anything in mock/localStorage-only mode (no backend to proxy through, and an API key must never reach the browser). The existing shared `AiChatPanel.tsx` UI is kept, with its fake synchronous `getReply` prop swapped for an async `sendMessage` call to the real service.

**Tech Stack:** Express + TypeScript (server), React 18 + TypeScript + Tailwind (client), Groq API (free tier, OpenAI-compatible REST, model `llama-3.3-70b-versatile`), `express-rate-limit` (already a dependency). No test framework in this repo — verification is `pnpm run build` / manual server boot + in-browser DOM checks per [CLAUDE.md](../../../CLAUDE.md) §6.

**Spec:** [`docs/superpowers/specs/2026-08-30-ai-assistant-design.md`](../specs/2026-08-30-ai-assistant-design.md)

## Global Constraints

- Use `pnpm` — `npm` is not installed on this machine.
- Never call a service directly from a component — go through hooks (`useOrgServices`, `useAuth`, etc.); this feature's one exception is `AiChatPanel`, which is intentionally surface-agnostic and takes `sendMessage` as a prop rather than importing a service itself (existing pattern in this file, unchanged by this plan).
- A change to `src/services/*.ts` normally needs a mirrored change in `server/routes/*.ts` — this feature is the documented exception: there is **no** mock/dataStore branch for the AI Assistant, because an LLM call requires the server (the API key must never reach the browser) and has no meaningful mock-mode equivalent. `isHttpBackendConfigured() === false` must produce an honest "not available" error, never a fake reply.
- Never hardcode currency — every amount shown to the model must carry its own currency from the record it came from (`org.currency`, `account.currency`, `budget.currency`, etc.), never assumed.
- Never pad with fake data — this plan explicitly removes hardcoded literal "AI insight" dashboards, it does not add new ones.
- `GROQ_API_KEY` is a server-only env var — never prefix with `VITE_`, never send it to the client.
- Don't commit unless asked — this plan does NOT include git commits in its steps; stop after each task and let the user review, then commit only if asked. (Note: this differs from some other plans in this repo that do commit per task — for this feature, hold commits until the user reviews the working chat end-to-end.)

---

### Task 1: `GROQ_API_KEY` config + AI Assistant rate limiter

**Files:**
- Modify: `server/config/env.ts`
- Modify: `.env.example`
- Modify: `server/middleware/rateLimit.ts`

**Interfaces:**
- Produces: `env.groqApiKey: string` (empty string when unset), `aiAssistantRateLimiter` (Express middleware, keyed per signed-in user) — both consumed by Task 3.

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
  // Server-only — never prefix with VITE_. Powers the real AI Assistant chat
  // (server/routes/aiAssistant.ts): a free Groq API key. Optional — when unset, the assistant
  // route reports a clear "not configured" error instead of the server failing to boot.
  groqApiKey: process.env.GROQ_API_KEY?.trim() || '',
};
```

- [ ] **Step 2: Document the var in `.env.example`**

Append this section at the end of the file:

```
# ── AI Assistant (optional) ─────────────────────────────────────────────────
# Read by the Express API only (server/config/env.ts) — do NOT add a VITE_ prefix, or the key
# would ship to every client. Powers the real AI Assistant chat in the org workspace and employee
# portal. Get a free key at https://console.groq.com/keys (no credit card required). Leave blank
# to run without it — the assistant shows a clear "not configured" message instead of a reply.
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
 * Throttle AI Assistant chat calls: 20 messages / hour / signed-in user, so one user can't burn
 * through the shared free Groq quota. Keyed by `req.authUser!.id` rather than IP — this route is
 * always mounted under `/organizations/:organizationId`, which already runs `requireAuth` before
 * this middleware, so `req.authUser` is guaranteed set (no IP fallback needed).
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

### Task 2: Shared `AiChatMessage` type

**Files:**
- Modify: `src/services/types.ts`

**Interfaces:**
- Produces: `AiChatMessage { role: 'user' | 'assistant'; content: string }` — consumed by Task 3 (server), Task 4 (client service), Task 5 (`AiChatPanel`).

- [ ] **Step 1: Add the type next to `OrgAiIntegrationSettings`**

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

/** One turn in an AI Assistant conversation, sent to `/ai-assistant/chat` and echoed back in UI state. */
export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

- [ ] **Step 2: Verify the project still builds**

```bash
pnpm run build
```

Expected: no new errors (an unused-export warning, if any, is not an error — `AiChatMessage` will be consumed starting in Task 3).

---

### Task 3: Server route — real Groq-backed chat

**Files:**
- Create: `server/routes/aiAssistant.ts`
- Modify: `server/routes/apiV1.ts`

**Interfaces:**
- Consumes: `store.organizations/transactions/categories/bankAccounts/budgets/loans/projects/organizationMembers/expenses/timesheets/payslips` (pre-existing, `server/lib/store.ts`), `env.groqApiKey` + `aiAssistantRateLimiter` (Task 1), `AiChatMessage` (Task 2), `ok`/`fail` from `server/lib/http.js` (pre-existing), `req.authUser` (pre-existing, set by `requireAuth`).
- Produces: `POST /api/v1/organizations/:organizationId/ai-assistant/chat` — body `{ messages: AiChatMessage[], surface: 'org' | 'employee' }`, response `{ success: true, data: { reply: string } }` or `{ success: false, error: string }` — consumed by Task 4.

- [ ] **Step 1: Write `server/routes/aiAssistant.ts`**

```ts
/**
 * AI Assistant — real Groq-backed chat, grounded in this organization's/employee's own data.
 * Mounted at `/organizations/:organizationId/ai-assistant` (mergeParams), already gated by
 * requireAuth + requireOrgMembership from the parent mount in apiV1.ts. Context summaries are
 * built server-side from `store` directly (never from client-supplied numbers), so a client can't
 * spoof its own financial picture and the answer doesn't depend on what's cached in the browser.
 */

import { Router, type Request, type Response } from 'express';
import type { AiChatMessage } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, fail } from '../lib/http.js';
import { env } from '../config/env.js';
import { aiAssistantRateLimiter } from '../middleware/rateLimit.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const HISTORY_LIMIT = 10;
const RECENT_TRANSACTION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

const ORG_PRODUCT_GUIDE =
  'Finance OS features available to this organization: Dashboard (overview), Transactions ' +
  '(ledger, import bank statements), Recurring Transactions, Accounts (chart of accounts + bank ' +
  'accounts), Budgets, Loans, Projects, Departments, Assets (depreciation), Inventory, Reports, ' +
  'Team & Permissions (invite members, roles), Payroll (issue payslips), Import (bank statement ' +
  'upload + AI classification), Settings, Integrations.';

const EMPLOYEE_PRODUCT_GUIDE =
  'Finance OS features available to this employee: Dashboard, My Timesheet (log hours per ' +
  'project), My Expenses (submit and track reimbursement claims), My Payslips (view pay history), ' +
  'My Projects, Company Announcements.';

function money(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

function buildOrgContext(organizationId: string): string {
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

function buildEmployeeContext(organizationId: string, userId: string): string {
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

function buildSystemPrompt(surface: 'org' | 'employee', context: string): string {
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

function isChatMessage(value: unknown): value is AiChatMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === 'user' || v.role === 'assistant') &&
    typeof v.content === 'string' &&
    v.content.trim().length > 0
  );
}

export function createAiAssistantRouter(): Router {
  const r = Router({ mergeParams: true });

  r.post('/chat', aiAssistantRateLimiter, async (req: Request, res: Response) => {
    const organizationId = req.params.organizationId;
    const userId = req.authUser!.id;
    const body = req.body as { messages?: unknown; surface?: unknown };

    if (
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      !body.messages.every(isChatMessage)
    ) {
      return fail(res, 400, 'messages is required (a non-empty array of {role, content})');
    }
    if (body.surface !== 'org' && body.surface !== 'employee') {
      return fail(res, 400, 'surface must be "org" or "employee"');
    }

    if (!env.groqApiKey) {
      return fail(res, 503, "AI Assistant isn't configured. Ask an admin to set GROQ_API_KEY.");
    }

    const messages = body.messages as AiChatMessage[];
    const context =
      body.surface === 'org'
        ? buildOrgContext(organizationId)
        : buildEmployeeContext(organizationId, userId);
    const systemPrompt = buildSystemPrompt(body.surface, context);
    const history = messages.slice(-HISTORY_LIMIT);

    try {
      const groqRes = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.3,
          messages: [{ role: 'system', content: systemPrompt }, ...history],
        }),
      });

      if (!groqRes.ok) {
        console.error('[ai-assistant] Groq API error', groqRes.status, await groqRes.text());
        return fail(res, 502, 'Assistant is unavailable right now. Try again in a moment.');
      }

      const data = (await groqRes.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        return fail(res, 502, 'Assistant is unavailable right now. Try again in a moment.');
      }
      ok(res, { reply });
    } catch (err) {
      console.error('[ai-assistant] request failed', err);
      fail(res, 502, 'Assistant is unavailable right now. Try again in a moment.');
    }
  });

  return r;
}
```

- [ ] **Step 2: Mount the router in `server/routes/apiV1.ts`**

Find the import block:

```ts
import { createEmployeeMeRouter } from './employee.js';
```

Add right below it (check the actual import name used for the payroll router in this repo — if `createPayrollRouter` is already imported on the next line, add this new import right after that one instead; either position is fine as long as it's grouped with the other org-scoped router imports):

```ts
import { createAiAssistantRouter } from './aiAssistant.js';
```

Then find the mount list:

```ts
  r.use('/organizations/:organizationId/me', createEmployeeMeRouter());
  r.use('/organizations/:organizationId/payroll', createPayrollRouter());
```

Replace with:

```ts
  r.use('/organizations/:organizationId/me', createEmployeeMeRouter());
  r.use('/organizations/:organizationId/payroll', createPayrollRouter());
  r.use('/organizations/:organizationId/ai-assistant', createAiAssistantRouter());
```

(If `createPayrollRouter`/the payroll mount line isn't present in the file as written above — plans can drift from the live file — add the `ai-assistant` import and mount line directly after the `createEmployeeMeRouter` import/mount instead, following the exact same one-line pattern.)

- [ ] **Step 3: Verify the server boots and the route registers**

```bash
pnpm run dev:server
```

Expected: server starts on port 3001 with no route-registration errors (Express throws immediately at boot if a router is malformed). Stop with Ctrl+C once confirmed. Full functional verification (an actual Groq reply) happens in Task 9, once the client can reach this route.

---

### Task 4: Client service — `aiAssistantService.ts`

**Files:**
- Create: `src/services/aiAssistantService.ts`

**Interfaces:**
- Consumes: `isHttpBackendConfigured`, `apiPostJson` from `@/lib/apiClient` (pre-existing), `AiChatMessage`, `ServiceResponse` from `./types` (Task 2; `ServiceResponse` pre-existing).
- Produces: `sendAiChatMessage(organizationId: string, messages: AiChatMessage[], surface: 'org' | 'employee'): Promise<ServiceResponse<{ reply: string }>>` — consumed by Task 6 and Task 7.

- [ ] **Step 1: Write `src/services/aiAssistantService.ts`**

```ts
/**
 * AI Assistant chat — real Groq-backed replies via the Express server (`server/routes/aiAssistant.ts`).
 * Deliberately has no dataStore/mock-mode branch: an LLM call needs the server (the API key must
 * never reach the browser), so mock mode gets an honest "not available" error, never a fake reply.
 */

import { isHttpBackendConfigured, apiPostJson } from '@/lib/apiClient';
import type { AiChatMessage, ServiceResponse } from './types';

const CHAT_PATH = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/ai-assistant/chat`;

export async function sendAiChatMessage(
  organizationId: string,
  messages: AiChatMessage[],
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

  return apiPostJson<{ messages: AiChatMessage[]; surface: 'org' | 'employee' }, { reply: string }>(
    CHAT_PATH(organizationId),
    { messages, surface },
  );
}
```

- [ ] **Step 2: Verify the project builds**

```bash
pnpm run build
```

Expected: no new errors.

---

### Task 5: `AiChatPanel.tsx` — swap fake `getReply` for real async `sendMessage`

**Files:**
- Modify: `src/app/components/shared/AiChatPanel.tsx`

**Interfaces:**
- Consumes: `AiChatMessage` (Task 2).
- Produces: `AiChatPanelProps.sendMessage: (history: AiChatMessage[]) => Promise<string>` — consumed by Task 6 and Task 7 (replacing the old `getReply` prop everywhere it's used).

- [ ] **Step 1: Add the `AiChatMessage` import**

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
import type { AiChatMessage } from '@/services/types';
```

- [ ] **Step 2: Drop `suggestions` from the internal message shape**

Find:

```ts
type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  suggestions?: string[];
}
```

Replace with:

```ts
type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}
```

- [ ] **Step 3: Swap the `getReply` prop for `sendMessage`**

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
   * Pluggable demo reply generator. Each caller (org, platform, ...) supplies its own
   * canned-response logic instead of one hardcoded set living in this shared component.
   */
  getReply: (text: string) => { response: string; suggestions?: string[] };
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
   * Sends the full conversation (including the newest user message) to a real backend and
   * resolves with the assistant's reply text. Each caller (org, employee, ...) supplies its own
   * org/surface-scoped call instead of this shared component knowing about services directly.
   * Throw (or reject with) an Error to surface a message via the panel's built-in error banner.
   */
  sendMessage: (history: AiChatMessage[]) => Promise<string>;
  /** Placeholder text for the composer textarea */
  placeholder?: string;
  /** Helper copy shown in the empty state, above the quick prompts */
  emptyStateHint?: string;
}
```

- [ ] **Step 4: Update the component signature's destructured prop and default hint copy**

Find:

```ts
export function AiChatPanel({
  title,
  subtitle,
  quickPrompts,
  getReply,
  placeholder = 'Ask a question…',
  emptyStateHint = 'Start a conversation. Answers below are sample data until this is connected to a live backend.',
}: AiChatPanelProps) {
```

Replace with:

```ts
export function AiChatPanel({
  title,
  subtitle,
  quickPrompts,
  sendMessage,
  placeholder = 'Ask a question…',
  emptyStateHint = 'Start a conversation and ask anything about your finances or Finance OS.',
}: AiChatPanelProps) {
```

- [ ] **Step 5: Rewrite `handleSend` to call `sendMessage` instead of the fake delay + `getReply`**

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

      const { response, suggestions } = getReply(raw);
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
      const history: AiChatMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await sendMessage(history);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, sendMessage]);
```

- [ ] **Step 6: Remove the per-message suggestion-chip rendering**

Find:

```tsx
                {m.content}
                {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-600/50 pt-3">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void handleSend(s)}
                        disabled={sending}
                        className="rounded-full border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
```

Replace with:

```tsx
                {m.content}
```

- [ ] **Step 7: Verify the project builds**

```bash
pnpm run build
```

Expected: errors at this point are expected and fine — `AIFinancialAssistant.tsx` and `EmployeeAiAssistant.tsx` still pass the old `getReply` prop until Task 6/7 update them. Confirm the *only* new errors are exactly those two files complaining about a missing/mismatched `getReply`/`sendMessage` prop — if anything else is broken, stop and fix it before continuing.

---

### Task 6: Wire `AIFinancialAssistant.tsx` to the real assistant, remove the fake dashboards

**Files:**
- Modify: `src/app/components/organization/AIFinancialAssistant.tsx`

**Interfaces:**
- Consumes: `sendAiChatMessage` (Task 4), `AiChatMessage` (Task 2), `AiChatPanelProps.sendMessage` (Task 5).

- [ ] **Step 1: Trim the icon imports and add `useCallback` + the new service import**

Find:

```ts
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { fetchOrgAiSettings } from '@/services/aiSettingsService';
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
import { organizationService } from '@/services/organizationService';
import { auditService } from '@/services/auditService';
import { sendAiChatMessage } from '@/services/aiAssistantService';
import type { AiChatMessage, OrgAiIntegrationSettings } from '@/services/types';
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

- [ ] **Step 2: Remove the unused `AIInsight`/`FinancialPattern` types and the fake reply table**

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

- [ ] **Step 3: Add the real `sendMessage` callback inside the component**

Find (the start of the component body):

```ts
export function AIFinancialAssistant() {
  const svc = useOrgServices();
  const { orgId } = svc;
  const goToOrgView = useOrgWorkspaceNav();
```

Replace with:

```ts
export function AIFinancialAssistant() {
  const svc = useOrgServices();
  const { orgId } = svc;
  const goToOrgView = useOrgWorkspaceNav();

  const sendAssistantMessage = useCallback(
    async (history: AiChatMessage[]): Promise<string> => {
      const res = await sendAiChatMessage(orgId, history, 'org');
      if (!res.success) throw new Error(res.error || 'Something went wrong. Try again.');
      return res.data.reply;
    },
    [orgId],
  );
```

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

(Both this step and Step 4 delete a `return (` line — only one `return (` should remain once both edits are applied; make sure you don't end up with two.)

- [ ] **Step 6: Replace the "Ask" tab's JSX — real chat only, drop the fake dashboards**

Find (the entire `activeTab === 'ask'` block — from its opening through the header/description above it, since the header's "Integration:" line about the unused BYOK settings is also being simplified):

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
          sendMessage={sendAssistantMessage}
          placeholder="Ask about cash flow, expenses, margins, or how to use Finance OS…"
          emptyStateHint="Start a conversation about your organization's finances or Finance OS itself."
        />
      )}
```

Then find the (now-orphaned) remainder of that block — everything from the "Current Situation" section through the closing of the `ask` tab — and delete it entirely:

Find the start marker:

```tsx
      {/* Current Situation - Dashboard Style */}
```

...through the end marker (the block ends right before the Insights tab):

```tsx
      </>
      )}

      {/* Task 2: real, computed Insights tab */}
```

Delete every line from the start marker through `      </>\n      )}\n\n` (inclusive), **keeping** the `{/* Task 2: real, computed Insights tab */}` line and everything after it unchanged. This removes the "Current Situation", "Future Projections", "AI-Generated Insights", "Detected Financial Patterns", and "How AI Financial Assistant Works" sections — all of which rendered the literal hardcoded numbers just deleted in Steps 4–5, not real data. The already-real Insights tab (`activeTab === 'insights'`) and Activity tab (`activeTab === 'activity'`) that follow are untouched.

- [ ] **Step 7: Simplify the header's AI-settings line (it referenced the old demo chat)**

Find:

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
            {' · The chat below uses the server-side AI Assistant, not this saved key.'}
          </p>
        )}
```

- [ ] **Step 8: Verify the project builds**

```bash
pnpm run build
```

Expected: no errors referencing this file (unused `AIInsight`/`FinancialPattern`/`CHAT_SAMPLE_RESPONSES`/`matchDemoReply`/`currentSituation`/`futureProjections`/`aiInsights`/`financialPatterns` should all be gone; no leftover references to any of them).

- [ ] **Step 9: Smoke-check the page in the browser**

```bash
pnpm run dev:full
```

Open `/login/owner`, sign in, navigate to `?view=ai-assistant` (or the AI Assistant nav item). In the browser devtools console:

```js
const t = document.body.innerText;
[t.includes('Something went wrong'), /is not defined/.test(t)]
```

Expected: `[false, false]`. Confirm the page shows only the chat panel under the "Ask" tab (no "Current Financial Situation" / "Future Projections" / "Detected Financial Patterns" cards), and that Insights/Activity tabs still render as before.

---

### Task 7: Wire `EmployeeAiAssistant.tsx` to the real assistant

**Files:**
- Modify: `src/app/components/employee/EmployeeAiAssistant.tsx`

**Interfaces:**
- Consumes: `sendAiChatMessage` (Task 4), `AiChatMessage` (Task 2), `AiChatPanelProps.sendMessage` (Task 5), `useAuth` from `@/contexts/AuthContext` (pre-existing — same `currentOrganization?.id ?? 'org-001'` pattern already used by `MyExpenses.tsx`/`MyPayslips.tsx`/`EmployeeDashboard.tsx` in this same folder).

- [ ] **Step 1: Update imports**

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
import type { AiChatMessage } from '@/services/types';
import type { EmployeeView } from './EmployeeWorkspace';
```

- [ ] **Step 2: Remove the fake reply table**

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

- [ ] **Step 3: Add `useAuth` + the real `sendMessage` callback, wire the panel**

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

  const sendAssistantMessage = useCallback(
    async (history: AiChatMessage[]): Promise<string> => {
      const res = await sendAiChatMessage(orgId, history, 'employee');
      if (!res.success) throw new Error(res.error || 'Something went wrong. Try again.');
      return res.data.reply;
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
        sendMessage={sendAssistantMessage}
        placeholder="Ask about your hours, expenses, or payslips…"
        emptyStateHint="Start a conversation about your work or Finance OS itself."
      />
```

- [ ] **Step 4: Verify the project builds**

```bash
pnpm run build
```

Expected: no errors referencing this file.

- [ ] **Step 5: Smoke-check the page in the browser**

```bash
pnpm run dev:full
```

Open `/login/employee`, sign in, navigate to the AI Assistant view. Run the same crash check as Task 6 Step 9 (`Something went wrong` / `is not defined`) and confirm it renders — full functional verification (a real grounded reply) happens in Task 9.

---

### Task 8: Remove the floating widget

**Files:**
- Delete: `src/app/components/ai-assistant/AIAssistantChat.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:** none — this task only removes code, nothing downstream depends on it.

- [ ] **Step 1: Remove the lazy import**

In `src/app/App.tsx`, find:

```ts
const KeyboardShortcuts = React.lazy(() =>
  import('.\components\keyboard-shortcuts\KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts }))
);
const AIAssistantChat = React.lazy(() =>
  import('./components/ai-assistant/AIAssistantChat').then(m => ({ default: m.AIAssistantChat }))
);
```

Replace with:

```ts
const KeyboardShortcuts = React.lazy(() =>
  import('.\components\keyboard-shortcuts\KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts }))
);
```

- [ ] **Step 2: Remove the mount**

Find:

```tsx
                <SilentErrorBoundary>
                  <KeyboardShortcuts />
                </SilentErrorBoundary>
                <SilentErrorBoundary>
                  <AIAssistantChat />
                </SilentErrorBoundary>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
```

Replace with:

```tsx
                <SilentErrorBoundary>
                  <KeyboardShortcuts />
                </SilentErrorBoundary>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
```

- [ ] **Step 3: Delete the file and its now-empty folder**

```bash
rm "src/app/components/ai-assistant/AIAssistantChat.tsx"
rmdir "src/app/components/ai-assistant" 2>/dev/null || true
```

(On Windows/PowerShell, `Remove-Item "src/app/components/ai-assistant" -Recurse -Force` accomplishes the same — use whichever shell you're running.)

- [ ] **Step 4: Verify the project builds**

```bash
pnpm run build
```

Expected: no errors (no remaining references to `AIAssistantChat` anywhere — confirm with a repo-wide search for the string `AIAssistantChat` if unsure).

- [ ] **Step 5: Smoke-check the app boots**

```bash
pnpm run dev:full
```

Open any page (e.g. `/login/owner`, sign in). Confirm the floating chat bubble (bottom-right) no longer appears anywhere, and no console error mentions a missing module.

---

### Task 9: End-to-end verification

**Files:** none — verification only.

- [ ] **Step 1: Get a free Groq key and set it**

Sign up at https://console.groq.com/keys (free, no credit card), create an API key, and add it to `.env.local`:

```
GROQ_API_KEY=gsk_your_key_here
```

- [ ] **Step 2: Confirm the "not configured" path first (with the key temporarily absent)**

Before adding the key (or by commenting it out), run:

```bash
pnpm run dev:full
```

Sign in via `/login/owner`, open the AI Assistant "Ask" tab, send any message. Expected: the panel's error banner shows "AI Assistant isn't configured. Ask an admin to set GROQ_API_KEY." — not a crash, not a fake reply.

- [ ] **Step 3: Add the real key and restart**

Put the key from Step 1 into `.env.local`, stop and restart `pnpm run dev:full` (env vars are read at server boot).

- [ ] **Step 4: Org workspace — data-grounded question**

Signed in as owner, open the AI Assistant "Ask" tab, ask: *"What's my current budget status?"* Expected: a real, specific reply referencing actual budget names/amounts from the seeded org data (not generic filler, not an error).

- [ ] **Step 5: Org workspace — how-to and general-knowledge questions in the same conversation**

In the same conversation, ask: *"How do I invite a new team member?"* and then *"What's the difference between cash flow and profit?"* Expected: both answered naturally and correctly — the first referencing Finance OS's Team & Permissions feature, the second from general finance knowledge — neither refused for being "outside the data."

- [ ] **Step 6: Employee portal — own-data question, and isolation check**

Log out, sign in via `/login/employee` (Alex Chen). Open the AI Assistant, ask: *"How many hours have I logged this week?"* Expected: a reply reflecting Alex Chen's own seeded timesheet data. Then ask something implying another employee's data (e.g. *"What's Lisa Kumar's payslip?"*) — expected: the assistant does not fabricate another employee's figures (it has no access to them server-side, so it can only decline or say it doesn't have that information).

- [ ] **Step 7: Mock-mode honest failure**

Stop `dev:full`. Run `pnpm run dev` alone (no local API server). Open the app, sign in, open either AI Assistant view, send a message. Expected: the error "AI Assistant requires the app to be running with the local API server (pnpm run dev:full)." appears immediately — no hung network request, no fake reply. Stop this server once confirmed; restart `pnpm run dev:full` if continuing to test.

- [ ] **Step 8: Confirm the floating widget is gone everywhere**

Click through a few different views/surfaces (org dashboard, employee dashboard, platform console if accessible) and confirm the bottom-right chat bubble never appears on any of them.

- [ ] **Step 9: Crash sweep**

In the browser devtools console, on each of the org "Ask" tab and the employee AI Assistant page:

```js
const t = document.body.innerText;
[t.includes('Something went wrong'), /\bNaN\b/.test(t)]
```

Expected: `[false, false]` on both.

- [ ] **Step 10: Report results**

Summarize what was confirmed in Steps 2–9 (pass/fail per step). No commit needed for this task — it's verification only. If everything passes, this plan is complete; commit the whole feature only if/when the user asks.

---

## Self-Review Notes

- **Spec coverage:** Groq provider + server-only key (Task 1, 3) · session-only history / non-streaming (Task 5's `handleSend` keeps `messages` in React state only, one request → one response, no SSE) · org context from real `store` data (Task 3 `buildOrgContext`) · employee context scoped to caller only via `req.authUser!.id` (Task 3 `buildEmployeeContext`, verified in Task 9 Step 6) · open conversational scope incl. product how-to + general knowledge (Task 3 `buildSystemPrompt`, verified in Task 9 Step 5) · mock-mode honest failure, no dataStore branch (Task 4, verified in Task 9 Step 7) · floating widget removed (Task 8) · fake dashboards removed (Task 6 Steps 4–6) · rate limiting (Task 1 Step 3). All covered.
- **Type consistency:** `AiChatMessage` (Task 2) is the single shape used by the server route's `isChatMessage`/`messages` (Task 3), the client service's `sendAiChatMessage` signature (Task 4), `AiChatPanelProps.sendMessage` (Task 5), and both callers' `sendAssistantMessage` callbacks (Task 6, 7) — `{ role: 'user' | 'assistant'; content: string }` everywhere, no drift. `sendAiChatMessage(organizationId, messages, surface)` parameter order/types match every call site.
- **No placeholders:** every step has literal code or an exact, unambiguous find/replace anchor; the two large-deletion steps (Task 6 Step 6, Task 7 Step 2) name exact start/end markers rather than describing "remove the fake stuff" vaguely.
