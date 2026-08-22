# AutoForge v0.20 Architecture Decisions

## Scope

v0.20 delivers the Product Digital Twin described by the north-star roadmap.
It builds on the v0.11 global workspace foundation without moving active
project authority out of the repository.

## D-20.1 — Compose the digital twin from existing registries

The digital twin is a queryable projection of existing work, decisions,
specifications, designs, traceability, evidence, and governance records. It
is not a second competing source of truth or a monolithic database.

## D-20.2 — Keep project-local state authoritative

Project-local `.autoforge/` remains authoritative for active configuration,
work, decisions, contracts, and reproducible collaboration. Global
`~/.autoforge/` remains responsible for project registration, shared assets,
caches, and optional historical indexes.

## D-20.3 — Use tiered storage for derived history

Derived digital-twin snapshots and completed historical evidence may be
placed in project-scoped global storage keyed by the canonical project
identity. Active records stay local; archived records are immutable,
content-addressed where practical, and recoverable through an explicit
export/import workflow.

## D-20.4 — Bound every projection

Digital-twin queries must specify bounded scope, depth, and result size.
Commands must provide deterministic text output and machine-readable JSON
where applicable. A projection must never scan unrelated registered projects
unless the user explicitly requests a cross-project query.

## D-20.5 — Preserve graceful degradation

If global storage is unavailable, AutoForge continues using project-local
state and reports the degraded capability. Removing `~/.autoforge/` must not
destroy the active project or prevent local validation.

## Acceptance Criteria

Before v0.20 release, the implementation must provide a versioned twin
projection contract, bounded queries, local/global ownership tests,
degraded-storage behavior, archive retention rules, export/import recovery,
documentation, and full foundation validation.

## Deferred Scope

Cross-project policy synchronization, hosted storage, autonomous remediation,
and the interactive terminal UI remain outside v0.20.
