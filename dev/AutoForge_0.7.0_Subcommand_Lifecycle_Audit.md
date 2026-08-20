# AutoForge 0.7.0 Subcommand Lifecycle Audit

## Scope

This audit compares the implemented CLI in `src/cli/index.ts` with the v0.7 CLI philosophy, release criteria, and the 0.8–0.10 roadmap. “Remove” means remove from public documentation and onboarding immediately; “deprecate” means retain temporarily for migration or compatibility with an explicit sunset.

## Decision Summary

| Subcommand | v0.7 disposition                 | Rationale                                                                                                                                         |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`     | Keep                             | Initializes the durable control plane and is a primary command.                                                                                   |
| `recap`    | Keep                             | Provides the canonical current-work handoff.                                                                                                      |
| `add`      | Keep                             | Creates the feature/phase/task/issue work graph.                                                                                                  |
| `start`    | Keep                             | Opens the governed work session.                                                                                                                  |
| `done`     | Keep                             | Closes work and records lifecycle state.                                                                                                          |
| `decide`   | Keep                             | Persists architectural decision memory.                                                                                                           |
| `why`      | Keep                             | Retrieves decision rationale and history.                                                                                                         |
| `doctrine` | Keep                             | Exposes shared agent guidance.                                                                                                                    |
| `context`  | Keep                             | Produces the canonical task-specific build packet.                                                                                                |
| `check`    | Keep                             | Enforces scope, freshness, and adapter guardrails.                                                                                                |
| `doctor`   | Keep                             | Performs installation and state health checks.                                                                                                    |
| `gate`     | Keep, supporting                 | Quality gates are an explicit v0.7 release criterion, but remain a supporting command rather than the core workflow.                              |
| `design`   | Keep, expanding                  | Design specifications and relationships are required by the 0.8 design/context roadmap.                                                           |
| `migrate`  | Deprecate after migration window | Required for 0.6 → 0.7 upgrades; it should become a compatibility command and eventually move to a migration package or documented one-time path. |
| `tui`      | Keep, optional                   | A presentation layer over the same services; not required for automation, but not contrary to the long-term plan.                                 |
| `help`     | Keep                             | Canonical command reference and anti-drift boundary.                                                                                              |
| `version`  | Keep                             | Required for package diagnostics and release verification.                                                                                        |

## Commands To Remove From Documentation

The legacy README and onboarding prompt mention commands that are not part of the v0.7 router and should not be advertised:

- `load`
- `configure`
- `refresh`
- `update`
- `research scan`
- `readiness check`
- `autopilot`
- `status`
- `approve`
- `audit`
- `metrics`
- `snapshot`

These represent the former orchestration/compliance product surface. The rewrite deliberately replaces them with durable work state, specifications, context packets, guardrails, and adapter services. They should not be reintroduced as aliases unless a future roadmap phase defines a typed replacement.

## Long-Term Direction

The v0.7 public workflow is:

```text
init → add → start → context/check → implement → gate → done
             ↘ decide/why/doctrine
```

The 0.8 roadmap may add intent intake, triage, readiness, research records, and planning artifact generation. Those should be new typed commands built on the v0.7 kernel—not restoration of the removed legacy names. The 0.9 roadmap may add workflow orchestration, and 0.10 may formalize the agent contract; neither requires autonomous `autopilot` behavior in v0.7.

## Release Recommendation

No implemented v0.7 command should be deleted before release. The required action is documentation cleanup: make `help.ts` the canonical reference, remove stale legacy command examples from onboarding/docs, mark `migrate` as transitional, and keep the primary workflow small.
