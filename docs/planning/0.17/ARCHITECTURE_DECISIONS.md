# v0.17 Architecture Decisions

## Mission

Make design intent a repository-native, typed, searchable, and context-deliverable artifact layer.

## Decisions

### D-17.1 — Design specifications remain repository artifacts

Design specifications are stored under `.autoforge/specifications/` and remain readable, reviewable, and versionable alongside source code. No external design database is introduced.

### D-17.2 — Typed design metadata is canonical

Screens, components, tokens, flows, states, and responsive rules use explicit schemas with stable IDs, relationships, provenance, and validation invariants.

### D-17.3 — One codec and registry govern all design artifacts

Markdown/YAML encoding, parsing, persistence, indexing, and search use the existing specification codec/store/registry boundaries rather than parallel design-only storage.

### D-17.4 — Context delivery is selective and explainable

Build packets include only design specifications relevant to active work and declared relationships. Context output must identify why each design artifact was selected.

### D-17.5 — Human review remains authoritative

AutoForge may validate, relate, search, and deliver design intent, but it does not silently rewrite approved specifications or infer final visual decisions.

## Acceptance Boundary

Before v0.17 release, the implementation must provide schema and codec coverage, deterministic registry/search behavior, provenance and freshness checks, context integration, CLI workflows, documentation, and end-to-end tests.

## Deferred

Visual rendering, interactive terminal UI, autonomous design generation, and product strategy remain outside v0.17 and follow the later roadmap milestones.
