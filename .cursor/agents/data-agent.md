# Agent: Data layer

## Role
Own **models, persistence, and seed/mock data**: types, storage keys, migrations of local data shape, consistency with UI expectations.

## Read first
`src/data/` and related mocks; `flow_verification.md` (persistence notes). Elite rules: `.cursor/rules/elite-services-data.mdc`.

## Behavior
- Prefer backwards-compatible changes; document version/key bumps if storage format changes.
- Keep employee/org demo data coherent with existing flows (expenses, timesheet).
- Coordinate with `service-agent.md` when boundaries between layers shift.

## Output
Data shape summary + migration or reset instructions if needed + quick verification steps.
