# Elite 0.1 Feature Spec

## Goal
Ship a deployable, testable Finance OS experience that feels premium, stays simple for non-accountants, and keeps core tasks within 3 clicks.

## Product Principles
- Calm by default: guidance over pressure, no aggressive visual noise.
- Explainable AI: every suggestion must include a short "why".
- Actionable UI: insights must end with clear next actions.
- 3-click rule: every key workflow should complete in 3 clicks or less.
- Layman language first: avoid accounting jargon in primary labels.

## Core AI Placement

### 1) Expenses AI
- Smart autofill from natural language input (category, project, department, tax hint).
- Receipt-to-draft extraction (OCR -> editable draft).
- Duplicate/overlap detection before submit.
- Policy checks (limit breaches, missing receipt, unusual claim timing).
- Confidence-based submission:
  - High confidence: one-click apply.
  - Medium confidence: review suggestions.
  - Low confidence: manual confirmation path.

### 2) Finance Pattern Engine AI
- Vendor and narration pattern memory per organization.
- Pattern confidence + explanation ("matched prior 8 entries from same vendor").
- Spend anomaly detection (frequency, amount spikes, odd categories).
- Cashflow trend alerts (14-day and 30-day risk windows).
- Learning loop:
  - user corrections become reusable rules
  - rules are versioned and auditable.

### 3) Profit Intelligence AI
- Quote Profit Checker with risk score and safe-price recommendation.
- Margin drift alerts by project and department.
- Profit drivers summary ("what changed and why").
- AI action cards (max two actions shown at once, e.g. Apply/Review).

## UX Rules (3-Click + Layman)
- One primary action per screen.
- Default to plain language:
  - "Accounts Payable" -> "Bills to Pay"
  - "Receivables" -> "Money to Receive"
  - "COGS" -> "Delivery Cost"
- Progressive disclosure:
  - advanced fields behind "More options".
- Inputs should feel journaling-first for AI interactions:
  - large input area
  - subtle styling
  - low-contrast assistive controls.
- No hard-blocking dialogs unless data loss risk is real.

## MVP Scope (Elite 0.1)

### A. Platform Reliability
- Single source of truth for employee data in shared store.
- Remove inline mock fallbacks from must-use employee flows.
- Local persistence strategy finalized (`localStorage` hydrate/save).
- Must-not-break flow verification checklist updated and passing.

### B. AI Features
- Expenses AI: narration autofill + duplicate warning + policy check.
- Pattern Engine AI: confidence + explanation + correction learning.
- Profit AI: quote checker + margin drift summary.

### C. Must-Not-Break Flows
- FLOW-001: Auth + Redirect.
- FLOW-002: Employee Expenses (draft + submit).
- FLOW-003: Employee Timesheet (timer/manual + submit week).

## V2 Scope (After Elite 0.1)
- Multi-org benchmarking recommendations.
- Budget auto-allocation suggestions by department trends.
- Weekly executive AI summary export (PDF/email).
- Advanced AI simulation mode (what-if staffing/pricing scenarios).

## Success Metrics

### UX Metrics
- 90% of key actions completed in <= 3 clicks.
- 80% of new users complete first expense + timesheet without help.
- Median time-to-first-value under 10 minutes.

### AI Metrics
- Expense autofill acceptance rate >= 70%.
- Pattern confidence precision >= 85% on high-confidence suggestions.
- Quote checker adoption in >= 60% of new quote events.

### Reliability Metrics
- 0 regression in must-not-break flows before release.
- 100% pass on flow verification checklist for release candidate.
- No data drift between employee screens after refresh.

## Implementation Order (Low Cost, High Impact)
1. Stabilize data layer (single store + persistence).
2. Remove UI fallback mocks from critical flows.
3. Add Expenses AI suggestions and confidence pipeline.
4. Add Pattern Engine explanation + learning loop.
5. Add Profit AI action cards and quote checker.
6. Final UX polishing pass for 3-click compliance.

## Release Readiness Checklist
- [ ] All three must-not-break flows pass.
- [ ] Employee data persistence verified across refresh and re-login.
- [ ] AI suggestions show confidence + reason text.
- [ ] Layman labels applied on key screens.
- [ ] No aggressive CTA patterns in assistant/insight surfaces.
- [ ] QA signoff on Elite 0.1 metrics and acceptance criteria.
