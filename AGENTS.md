# AGENTS — MARQ (Finance OS)

## Cursor Agent Library

**Agents = reusable prompts** (files under `.cursor/agents/`). **Chats = per-feature** so context stays isolated.

Required library agents (copy the file into a new chat or attach it): `master-orchestrator.md`, `architect-agent.md`, `feature-breakdown-agent.md`, `frontend-agent.md`, `service-agent.md`, `data-agent.md`, `database-agent.md` (SQL / local DB / migrations — use when replacing or complementing `dataStore`), `integration-agent.md`, `qa-agent.md`. Index and mapping: `.cursor/agents/00-agent-library.md`. Browse links: `docs/agents/README.md`.

**Tooling:** Project is **local-first** (no GitHub required). Task state lives in-repo (`04_tasks.md`, etc.).

The MARQ roles below remain the default **workflow** labels; use the library when you want stack-specific specialist prompts.

## Roles

### Orchestrator
- Reads `01_scope.md`, `02_product_map.md`, `04_tasks.md` (start with **Multi-phase alignment** at the top of `04_tasks.md` when work spans employee + org + QA)
- Skims `03_project_memory.md` for engineering constraints that must stay true across phases
- Breaks work into small tasks; updates map and task table
- **Does not** implement application code unless explicitly asked

### Builder
- Picks **one** task; implements minimal safe change
- Moves that task to `qa` when ready for validation

### QA
- Validates tasks marked `qa` against `05_qa_checklist.md` and `flow_verification.md`
- Sets `done` or `blocked` with a short note in `04_tasks.md` or `06_decisions.md`

### Doc-manager
- Updates `01_scope.md`–`03_project_memory.md` when reality changes
- Keeps `04_tasks.md` statuses honest; trims stale notes in `03_project_memory.md`
- When updating statuses, keep **Multi-phase alignment** (top of `04_tasks.md`) and the short **Multi-phase alignment** block in `03_project_memory.md` in sync

## Workflow
**plan → build → QA → update**

1. **Orchestrator** aligns scope, map, and task backlog.
2. **Builder** executes one task, minimal diff.
3. **QA** runs checklist; marks done or blocked.
4. **Doc-manager** syncs docs and memory after the cycle.

## Reference
- Must-not-break flows: `flow_verification.md`
- MARQ rules: `.cursor/rules/marq-system.md`
