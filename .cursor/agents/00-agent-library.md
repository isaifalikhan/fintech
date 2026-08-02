# Cursor Agent Library (Finance OS)

**Principle:** Agents are **reusable prompts** (copy into a new chat or @-mention the file). **Chats stay per-feature** so context does not mix across unrelated work.

## How to use

1. Open a **new chat** for one feature or task slice.
2. Paste or attach the agent file you need from `.cursor/agents/` (see table below).
3. MARQ workflow docs (`AGENTS.md`, `01_scope.md`–`04_tasks.md`) still apply unless the user overrides them.
4. If work touches **employee + org + QA** in parallel, read **Multi-phase alignment** at the top of `04_tasks.md` (and `03_project_memory.md`) so statuses stay consistent.

## Agents

| ID | File | Use when |
|----|------|----------|
| Master orchestrator | `master-orchestrator.md` | Coordinating phases, backlog, and handoffs |
| Architect | `architect-agent.md` | Boundaries, structure, non-functional constraints |
| Feature breakdown | `feature-breakdown-agent.md` | Turning a feature into tasks and acceptance notes |
| Frontend | `frontend-agent.md` | UI, routing, client state, accessibility |
| Service layer | `service-agent.md` | App services, API shape, orchestration |
| Data layer | `data-agent.md` | Models, persistence, mock/seed data |
| Database | `database-agent.md` | Local/hosted SQL: schema, migrations, ORM, repositories, replacing `dataStore` |
| Integration | `integration-agent.md` | Auth, external APIs, cross-cutting wiring |
| QA | `qa-agent.md` | Checklists, flow verification, sign-off |

## MARQ alignment

Orchestrator / Builder / QA / Doc-manager in `AGENTS.md` map loosely: **master-orchestrator** + **feature-breakdown-agent** → planning; **frontend** / **service** / **data** / **database** / **integration** → build slices; **qa-agent** → validation. Use **database-agent** when introducing SQLite/Postgres/migrations — not for in-memory `dataStore`-only work (**data-agent**). Use one role per response when the user asks for strict MARQ mode.
