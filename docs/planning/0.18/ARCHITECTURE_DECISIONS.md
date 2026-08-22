# v0.18 Traceability Architecture Decisions

## Mission

Connect product intent to implementation evidence so AutoForge can explain what a change affects before work begins.

## Decisions

### D-18.1 — Traceability is an additive relationship layer

Trace links extend the existing specification and domain relationship model. v0.18 does not introduce a second graph database or duplicate project artifacts.

### D-18.2 — Trace links are typed and directional

Every link records a source artifact, target artifact, relationship kind, provenance, and capture time. Direction is preserved so impact traversal is deterministic.

### D-18.3 — Repository paths are first-class targets

Files and test paths may participate in trace links, but path references remain relative to the project root and are validated as contained paths.

### D-18.4 — Missing links are visible, not inferred silently

Impact analysis reports missing targets, stale provenance, and unresolved references explicitly. AutoForge does not invent traceability edges without recorded evidence.

### D-18.5 — Impact traversal is bounded and explainable

Traversal has explicit direction, relationship filters, and depth limits. Each result includes the path of edges that caused it to be selected.

### D-18.6 — Human authority remains the merge boundary

AutoForge can propose and validate trace links, but humans remain responsible for accepting architectural and product relationships.

## Acceptance Boundary

Before v0.18 release, the implementation must provide typed trace schemas, repository persistence, deterministic graph traversal, missing-target diagnostics, CLI workflows, context integration, documentation, and end-to-end tests.

## Deferred

Automatic code ownership inference, remote analytics, hosted graph storage, and autonomous impact remediation remain outside v0.18.
