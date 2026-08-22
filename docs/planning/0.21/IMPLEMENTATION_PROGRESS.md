# v0.21 Multi-Agent Orchestration Progress

## Implemented Foundation

- Typed orchestration graph, assignment, lease, approval, event, packet, and
  handoff contracts.
- Atomic project-scoped orchestration state with runtime packet persistence.
- Deterministic dependency readiness and explainable priority ordering.
- Agent capability validation and canonical agent-alias normalization.
- Exclusive overlapping-write protection with concurrent read-only claims.
- Default isolated Git branches and global worktrees for mutating assignments.
- Risk-based approval gates, handoff completion, release, and lease expiry.
- `autoforge orchestrate plan|status|ready|claim|handoff|release|approve|explain`.
- Compatibility with the existing single-active-work lifecycle.
- Canonical, role-aware context resolution for every claimed assignment.
- Assignment packets include selected-source reasons, budgeted context, and a
  deterministic source fingerprint.
- `orchestrate explain` reports whether an active assignment packet is fresh or
  stale relative to current canonical project state.
- Global projects support planned and completed relocation with identity
  validation, metadata history, and path-derived storage migration.
- Applicable constitution rules are evaluated into assignment context and
  enforced through required or prohibited execution directives.
- Assignment validation commands derive from configured project quality gates
  and agent-contract completion requirements.
- Independent agents receive identical canonical task context; agent-specific
  contract behavior remains a separate execution overlay.

## Deferred Beyond the Foundation

- Automated branch merging and conflict resolution.
- Distributed/cloud schedulers and remote lease coordination.
- Model execution or autonomous agent spawning from AutoForge itself.
- Interactive orchestration dashboards, reserved for the interactive CLI phase.

## Live-Use Hardening

- Workflow recommendations always explain label-driven stages.
- Intent deferral and conflict heuristics operate on bounded field/sentence
  segments rather than one joined document.
- Bootstrap artifacts support atomic, timestamped, evidence-backed approvals.
- Vision approval synchronizes the bootstrap manifest when present.
- Intent work kinds and workflow kinds share a canonical mapping and aliases.
- Validation and filesystem errors are no longer collapsed into generic usage.
- JSON-file commands expose generated Draft 2020-12 schemas through the CLI.
- The bootstrap-to-intent-to-workflow-to-approval lifecycle is documented.
