# v0.21 Multi-Agent Orchestration Decisions

## Coordination Authority

AutoForge owns readiness evaluation and deterministic queue ordering. Agents
claim eligible assignments, while humans retain authority to set priority,
approve risk gates, release assignments, and resolve conflicts.

## State Boundary

Concurrent orchestration uses a separate validated state envelope under
`.autoforge/orchestration/state.json`. It references canonical task and issue
IDs without changing the strict v1 single-agent work and session schemas.
Existing `start`, `context`, `check`, and `done` behavior remains compatible.

## Assignment Context

Claims resolve context from canonical AutoForge work, doctrine, decision, and
specification state without changing the project's single active-work pointer.
The resolver receives a temporary assignment-scoped work view and role-based
specification preferences. Each packet records source-selection reasons and a
deterministic fingerprint; `orchestrate explain` recomputes the fingerprint to
surface stale packets after canonical state changes.

Canonical context remains agent-neutral so independent agents interpret the
same project truth. Agent-specific contracts are applied as execution overlays
that supply required actions, prohibited actions, and validation commands
without changing selected doctrines, decisions, specifications, or governance.

## Concurrency Safety

- Mutating sessions receive exclusive write leases for repository scopes.
- Overlapping write scopes are rejected conservatively before provisioning.
- Read-only sessions may inspect scopes while another assignment writes them.
- Mutating sessions receive branches and Git worktrees outside the repository.
- Expired leases return incomplete work to the ready queue and emit events.

## Human Authority

Architecture, security, critical-risk, release-critical, and release-stage work
requires explicit approval before it can be claimed. Routine dependency and
handoff transitions remain deterministic and automatic.

## Priority Order

Ready work is ranked by human-pinned priority, release criticality, downstream
unlock count, risk reduction, explicit priority, and oldest-ready age. The CLI
must explain the reasons and must not reduce prioritization to an opaque score.
