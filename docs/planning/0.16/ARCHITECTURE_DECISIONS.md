# v0.16 Domain Intelligence Architecture Decisions

## Mission

Represent what the product means—business concepts, relationships, and invariants—without replacing the repository as the canonical source of truth.

## Decisions

### D-16.1 — Domain knowledge is an additive artifact layer

Domain concepts are persisted as typed, stable-ID artifacts in the existing AutoForge knowledge/specification architecture. v0.16 does not introduce a second state store or replace work, intent, design, or governance records.

### D-16.2 — Concepts and relationships are explicit and traversable

Each domain concept has a stable identity, name, description, aliases, and optional metadata. Relationships are typed edges with explicit source and target IDs, cardinality where known, and human-readable rationale. Consumers must be able to traverse both incoming and outgoing edges deterministically.

### D-16.3 — Invariants are first-class, evaluable rules

Domain invariants are structured records with a statement, scope, severity, evidence or rationale, and lifecycle status. They are evaluated independently from governance rules, then made available to governance-aware context selection and later validation gates.

### D-16.4 — Governance remains the enforcement boundary

Domain artifacts describe product meaning; constitution rules decide how that meaning constrains implementation. Domain intelligence must integrate with v0.15 governance rather than create a parallel policy engine.

### D-16.5 — Partial domain knowledge is valid but visible

The model permits provisional concepts, unresolved relationships, and unknown invariant evidence. Unknowns must be represented explicitly and must not be presented as confirmed product truth.

### D-16.6 — Domain artifacts link to existing project knowledge

Concepts and invariants may link to intents, decisions, specifications, work items, files, tests, and releases through typed relationships. Links preserve provenance and enable the v0.18 traceability and change-impact engine.

### D-16.7 — No generated code is required in v0.16

Database schemas, API contracts, DTOs, permissions, UI models, and tests are future consumers. v0.16 delivers durable domain meaning and deterministic context delivery; generation and validation remain subsequent bounded capabilities.

## Acceptance Boundary

The implementation is ready for v0.16 development when schemas, persistence, relationship traversal, invariant evaluation, governance/context integration, agent delivery, and golden tests can be implemented without inventing a second memory or policy system.
