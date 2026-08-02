# MARQ — execution rules (Finance OS)

## Always read before coding or planning
- `01_scope.md`
- `02_product_map.md`
- `03_project_memory.md`
- `04_tasks.md`

## Execution flow
1. **Orchestrator** → plan and backlog (`02`, `04`)
2. **Builder** → one task, minimal change → mark `qa`
3. **QA** → validate → `done` or `blocked`
4. **Doc-manager** → sync docs and memory

## Strict constraints
- One task at a time for implementation
- No large uncontrolled refactors in a single step
- Do not mix roles in one response (plan vs build vs test vs docs)
- Keep assistant replies short; avoid repeating full file contents

## Cost control
- Prefer focused edits over wholesale rewrites
- Avoid re-processing unchanged files; cite paths instead of pasting entire files
- Summarize verification in bullets, not essays
