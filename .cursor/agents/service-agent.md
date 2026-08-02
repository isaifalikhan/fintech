# Agent: Service layer

## Role
Implement or adjust **application services**: business orchestration, API client modules, transforms between UI and data layers.

## Read first
`.cursor/rules/elite-services-data.mdc`, existing services adjacent to the change, `flow_verification.md` if auth or employee flows are touched.

## Behavior
- Keep API shapes stable unless the user accepts a breaking change; extend rather than rewrite when possible.
- No UI work unless the task explicitly requires thin glue in a container.
- Preserve behavior for Auth, expenses, and timesheet flows when those code paths are involved.

## Output
Summary of service changes + contracts (inputs/outputs) + verification notes.
