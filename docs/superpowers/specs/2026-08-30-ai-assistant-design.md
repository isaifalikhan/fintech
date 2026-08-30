# Real AI Assistant (Groq-backed) — design

Approved 2026-08-30. Companion: [`../../../CLAUDE.md`](../../../CLAUDE.md), [`../../data-sources.md`](../../data-sources.md)
(this closes the "AI Assistant — replies come from `SAMPLE_RESPONSES` keyword matching" gap listed there).

## Problem

Three separate "AI Assistant" surfaces exist today and all three fake it — keyword-matched canned
replies (`SAMPLE_RESPONSES.find(word => text.includes(word))`), not an LLM, explicitly labeled as
demo:

- A floating chat bubble (`src/app/components/ai-assistant/AIAssistantChat.tsx`), mounted globally
  in `App.tsx`, with zero access to real org data.
- The org workspace "Ask" tab (`src/app/components/organization/AIFinancialAssistant.tsx`), whose
  chat and "Current Situation / Future Projections / Patterns" dashboard blocks are hardcoded
  literals, sitting alongside a genuinely real Insights tab (computed from live data) and Activity
  tab (real audit log).
- The employee portal assistant (`src/app/components/employee/EmployeeAiAssistant.tsx`), same
  canned-reply pattern.

All three route through a shared, well-built chat shell (`src/app/components/shared/AiChatPanel.tsx`)
wired to a synchronous fake `getReply()`. An unused per-org BYOK settings UI
(`src/services/aiSettingsService.ts`) already exists but nothing calls it. No AI SDK is installed,
no server route exists, no env var convention exists for an LLM key — this is a from-scratch build.

## Decisions

- **Provider:** Groq (free API key, no credit card, OpenAI-compatible chat completions endpoint,
  fast). Model: `llama-3.3-70b-versatile`. Called via plain `fetch` from the server — no new SDK
  dependency, since Groq's endpoint is OpenAI-request-shaped REST.
- **Key source:** one server-side env var, `GROQ_API_KEY`. Not per-org BYOK — the existing
  `aiSettingsService.ts` / `OrgAiIntegrationSettings` UI is left as-is and stays unused; wiring it
  up is future scope, not this pass.
- **Scope:** org workspace + employee portal only. No platform console assistant (it has none
  today; out of scope).
- **Floating widget:** removed entirely (`AIAssistantChat.tsx` + its mount in `App.tsx`). One real
  assistant per surface (org, employee) rather than three variants.
- **Backend requirement:** the assistant calls Groq from the Express server only — an API key must
  never reach the browser, and Groq's endpoint isn't meant for direct browser calls anyway. In pure
  mock/localStorage mode (`isHttpBackendConfigured() === false`, e.g. `pnpm run dev` without the
  Express server), the assistant shows an honest "requires the local API server" message instead of
  any reply. This is the one feature that structurally cannot work in mock mode — no dataStore-only
  fallback is invented for it, per this repo's "never pad with fake data" rule.
- **Conversational scope:** this is a general, open-ended chat — like talking to Claude/ChatGPT
  inside Finance OS — not a narrow data-lookup tool. It must handle three kinds of question in the
  same conversation: (1) the org's/employee's real data (already designed below), (2) "how do I…" /
  "where is…" questions about Finance OS itself, and (3) general finance/accounting knowledge
  questions the model already knows. The system prompt does **not** restrict the model to only
  answering from injected data — it's instructed to use the data when relevant, use its own
  knowledge otherwise, and say so plainly only when a question needs specific data it wasn't given
  (e.g. "I don't have visibility into X — check the Y page").
- **Product knowledge block:** alongside the per-org/per-employee data summary, the system prompt
  also includes a short, static "what Finance OS can do" guide (org: Transactions, Accounts,
  Budgets, Loans, Projects, Departments, Assets, Inventory, Reports, Team, Import, Payroll, Settings;
  employee: Timesheet, Expenses, Payslips, Projects) so how-to answers name real features instead of
  the model guessing/hallucinating them. This is a fixed string per surface, not per-org dynamic
  data — cheap to build, lives next to the context builders below.
- **Context building:** the server builds the data summary itself from `server/lib/store.ts`
  (already the source of truth for every other org-scoped route), not from client-supplied numbers.
  This also means the answer doesn't depend on what happens to be cached in the browser, and a
  client can't spoof its own financial summary.
  - `surface: 'org'` — recent transaction totals by category, account balances, budget vs. actual,
    loan status, project list, team/pending-invite counts. Same underlying data the real Insights
    tab already computes, reshaped as a compact text block for the system prompt (aggregates, not a
    raw dump of every row — keeps token usage bounded).
  - `surface: 'employee'` — **only the caller's own** timesheet hours, expense claim statuses,
    payslip history, scoped via `req.authUser!.id` exactly like `employee.ts`'s `callerId()`
    pattern. One employee must never be able to ask about another's data.
- **History:** session-only (component state), resets on reload/reopen. No new DB table, no
  persistence service.
- **Delivery:** single complete reply per request, not token-streamed. Simpler server + client, and
  Groq is fast enough that this still feels responsive for short financial answers.
- **Suggestion chips:** the per-message dynamic "suggestions" in `AiChatPanel` were sugar tied to
  the canned responses. Dropped — keeping only the static starter-prompt chips shown in the empty
  state. Asking a free-tier model to also emit structured follow-up suggestions on every turn is
  extra fragility (JSON-parsing a smaller model's output) for a cosmetic feature.
- **Rate limiting:** a small in-memory per-user counter (e.g. 20 messages/hour) so one user can't
  burn through the shared free Groq quota. Not persisted, resets on server restart — acceptable for
  a prototype guard.
- **Fake dashboard cleanup:** `AIFinancialAssistant.tsx`'s "Ask" tab currently renders hardcoded
  `currentSituation`, `futureProjections`, `aiInsights`, `financialPatterns`, and a "How AI Works"
  block — all literal invented numbers, not computed from anything. These are removed; the "Ask" tab
  becomes the real chat only. The already-real Insights and Activity tabs, and the keyword-based
  command bar (already honestly labeled "not an AI, just text matching"), are untouched.

## Server

### New env var

`server/config/env.ts` — add `groqApiKey: process.env.GROQ_API_KEY?.trim() || ''`. Optional: like
`supabaseServiceRoleKey`, the server boots fine without it; the route degrades to a clear
"not configured" response instead of crashing or silently faking a reply. Document in
`.env.example` under a new "AI Assistant (optional)" section, same tone as the Supabase-admin block.

### New route: `server/routes/aiAssistant.ts`

```ts
export function createAiAssistantRouter(): Router
```

Mounted at `/organizations/:organizationId/ai-assistant` in `apiV1.ts`, in the same list as
`createEmployeeMeRouter()` (line ~260) — inherits the existing single-gate
`requireAuth + requireOrgMembership` already applied at `r.use('/organizations/:organizationId', ...)`
(apiV1.ts:242). No new auth code needed.

- `POST /chat` — body `{ messages: { role: 'user' | 'assistant'; content: string }[], surface: 'org' | 'employee' }`.
  - Trim `messages` to the last ~10 turns before building the request (bounds token usage; the
    client still keeps full history in its own state for display).
  - If `env.groqApiKey` is empty, respond via the existing `fail()` helper with a clear message
    ("AI Assistant isn't configured. Ask an admin to set GROQ_API_KEY.") rather than calling out.
  - Enforce the per-user rate limit (in-memory `Map<userId, {count, windowStart}>`); on limit,
    respond with a clear "too many requests, try again in a bit" message.
  - Build the context block:
    - `surface: 'org'` → `buildOrgAiContext(organizationId)`, reading `store.transactions`,
      `store.budgets`, `store.loans`, `store.projects`, `store.accounts` /
      `store.bankAccounts`, `store.organizationMembers`, filtered to `organizationId`, reduced to
      aggregates (category totals, budget-vs-actual per budget, overdue loan count, active project
      count/budgets, pending invite count).
    - `surface: 'employee'` → `buildEmployeeAiContext(organizationId, callerId(req))`, reading
      `store.timesheetEntries`, `store.employeeExpenses`, `store.payslips` filtered to
      `organizationId` AND that user's id only.
    - If `surface` doesn't match the caller's actual relationship to the org (e.g. `employee`
      surface requested by a non-member — can't happen given the org-membership gate, but validate
      anyway), reject with a 400.
  - Compose the system prompt: role framing ("You are the AI Assistant built into Finance OS, a
    financial-ops platform for agencies") + the static product-knowledge block for that surface +
    the per-org/per-employee data block + an instruction to hold a normal helpful conversation —
    answer from the data when the question is about their finances (be specific with numbers), from
    general knowledge for finance/product questions, and say so plainly only when a question needs
    specific data that wasn't provided, rather than inventing numbers.
  - `fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: \`Bearer ${env.groqApiKey}\`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.3, messages: [systemMessage, ...trimmedHistory] }) })`.
  - On a non-OK response or network failure, return a clear "Assistant is unavailable right now, try
    again in a moment" error (mirrors `AiChatPanel`'s existing `sendError` UI, already built).
  - On success, extract `choices[0].message.content` and respond `ok(res, { reply })`.

### `server/lib/store.ts`

No schema changes. Read-only access to existing collections; no new persisted state beyond the
route's in-memory rate-limit map.

## Client

### New service: `src/services/aiAssistantService.ts`

```ts
export async function sendAiChatMessage(
  organizationId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  surface: 'org' | 'employee',
): Promise<ServiceResponse<{ reply: string }>>
```

- If `!isHttpBackendConfigured()`, short-circuit with
  `{ success: false, error: 'AI Assistant requires the app to be running with the local API server (pnpm run dev:full).' }`
  — no network call attempted, no fake reply.
- Otherwise `apiPostJson(`/organizations/${organizationId}/ai-assistant/chat`, { messages, surface })`.

No `dataStore` branch — this endpoint has no mock-mode equivalent, per the backend-requirement
decision above.

### `AiChatPanel.tsx`

Replace the `getReply: (text: string) => { response: string; suggestions?: string[] }` prop with:

```ts
sendMessage: (history: { role: 'user' | 'assistant'; content: string }[]) => Promise<{ response: string }>
```

`handleSend` already builds the running message list and has try/catch + `sendError` wiring for the
demo's synthetic "error demo" trigger — that trigger is removed, and the try block now `await`s
`sendMessage(fullHistoryIncludingNewUserMessage)`, surfacing thrown/returned errors through the
existing `sendError` UI unchanged. The `suggestions` field on `ChatMessage` and its rendering block
are removed; the empty-state `quickPrompts` chips (prop-driven, unaffected by this change) stay.

### `AIFinancialAssistant.tsx`

- Remove `CHAT_SAMPLE_RESPONSES`, `matchDemoReply`, and the hardcoded `currentSituation`,
  `futureProjections`, `aiInsights`, `financialPatterns` objects and their render blocks (including
  the "How AI Financial Assistant Works" static card).
- `AiChatPanel`'s `sendMessage` prop becomes
  `(history) => sendAiChatMessage(orgId, history, 'org').then(unwrap)` (mapping `ServiceResponse`
  to a thrown error on failure, matching the panel's expected contract).
- `CHAT_QUICK_PROMPTS`, the 3-tab structure (Ask/Insights/Activity), the Insights tab, the Activity
  tab, and the command bar are all untouched.

### `EmployeeAiAssistant.tsx`

- Remove `CHAT_SAMPLE_RESPONSES` / `matchDemoReply`.
- Same `sendMessage` wiring, with `surface: 'employee'`.
- `QUICK_ACTIONS` block and `CHAT_QUICK_PROMPTS` untouched.

### `App.tsx`

- Remove the `AIAssistantChat` lazy import (line ~51) and its mount (`<AIAssistantChat />` inside
  `SilentErrorBoundary`, line ~316).

### Deleted files

- `src/app/components/ai-assistant/AIAssistantChat.tsx` (and the now-empty `ai-assistant/` folder,
  if nothing else lives there).

## Error / empty states

| Condition | Behavior |
|---|---|
| Mock mode, no Express backend (`!isHttpBackendConfigured()`) | Chat input still works, but every send immediately shows: "AI Assistant requires the app to be running with the local API server (`pnpm run dev:full`)." No network call. |
| Backend up, `GROQ_API_KEY` unset | Server returns a clear config error; panel shows it via `sendError`. |
| Backend up, key set, Groq API error/timeout/rate-limited upstream | Panel shows "Assistant is unavailable right now. Try again in a moment." (existing `sendError` UI). |
| Caller over the per-user rate limit | Panel shows a "too many requests, try again shortly" error. |
| Groq responds successfully | Reply renders as a normal assistant bubble; no suggestion chips. |

## Testing / verification

No test suite in this repo (per `CLAUDE.md` §6) — verify in-browser:

1. `pnpm run dev:full` with `GROQ_API_KEY` unset → confirm both Ask tabs show the config-missing
   message, not a crash or fake reply.
2. Set `GROQ_API_KEY` (a real free-tier key), restart → ask a real question in the org workspace
   ("What's my current budget status?") and confirm the reply reflects actual seeded budget data,
   not generic filler.
3. Same for the employee portal ("How many hours have I logged this week?") — confirm it answers
   from that employee's own timesheet, and (spot check) that a different employee's data never
   leaks in.
3a. Ask a product how-to question ("How do I add a new expense?") and a general finance-concept
    question ("What's the difference between cash flow and profit?") in the same conversation as a
    data question — confirm it answers both naturally instead of refusing because they're not in
    the injected data.
4. `pnpm run dev` (no `dev:full`, no local API) → confirm the honest "requires the local API
   server" message appears instantly, no hung network request.
5. Confirm the floating bubble is gone from every screen; confirm no console errors from the
   removed import in `App.tsx`.
6. Crash-sweep per `CLAUDE.md` §6 (`Something went wrong` / `\bNaN\b` check) across both AI
   Assistant views.
