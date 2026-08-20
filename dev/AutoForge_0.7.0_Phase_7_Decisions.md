# AutoForge 0.7.0 Phase 7 Decisions

## D-7.1 — Make context selection a strict explainable domain contract

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 7 context model

### Decision

Represent resolved context as a strict `ContextSelection` containing the active work hierarchy, selected doctrine, decisions, specifications, explicit exclusions, and a budget summary.

Retain each selected source object with its deterministic score, inclusion reasons, and estimated token cost. Require budget totals to equal the sum of all selected estimates and require selected IDs to remain unique within each category.

### Rationale

- Phase 8 can compile a packet from one validated snapshot instead of re-reading mutable inputs.
- Inclusion reasons make future `context --explain` output inspectable.
- Runtime budget invariants prevent a packet compiler from trusting inconsistent accounting.
- Full source objects avoid ambiguity about which content version was selected.

### Consequences

- A selection is larger than an ID-only reference list.
- Phase 8 must preserve the resolver's ordering and must not silently add sources.
- Context selection remains independent from concrete agent adapters and delivery files.

## D-7.2 — Treat active work and persisted doctrine routing as authoritative

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 7 work and doctrine integration

### Decision

Require exactly one resolvable active task or issue before selecting context. Include the complete task hierarchy for tasks and the standalone issue for issues. Treat this active-work projection as mandatory context.

Consume the current persisted doctrine-session selections rather than silently rerouting doctrine. Require the doctrine session to match active work and fail closed when a selected doctrine is missing. Exclude a selected doctrine if it has subsequently been disabled.

A supplemental task description may refine decision and specification relevance, but it does not mutate or refresh the doctrine selection bound to the active session.

### Rationale

- Work state is the authoritative scope anchor for the control plane.
- Persisted doctrine selection keeps agent behavior stable for the lifetime of a session.
- A mismatched work and doctrine session indicates invalid project state rather than optional context.
- Mid-session doctrine refresh needs an explicit lifecycle policy and is not hidden inside resolution.

### Consequences

- Context cannot be resolved before work and its doctrine session are started.
- New task-description wording can select additional knowledge without changing behavioral doctrine.
- A future doctrine refresh operation must update the persisted session explicitly.

## D-7.3 — Rank decisions and specifications with bounded deterministic signals

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 7 relevance and relationships

### Decision

Use the existing deterministic decision search with the active task, phase, and feature IDs, or the active issue ID, as related-work signals. Remove common stop words from the resolver's decision query so generic prose cannot admit otherwise unrelated decisions. Exclude superseded and revoked decisions as inactive.

Rank specifications with fixed field weights across ID, name, tags, description, source, and content. Use the work objective and included scope paths as query signals, then expand incoming and outgoing relationships by exactly one hop from at most the top 25 directly matched specifications. Use the abstract specification registry's `list` and `findRelationships` operations rather than reading its storage directory.

### Rationale

- Fixed weights, stable ID tie breakers, and bounded traversal are reproducible.
- Work hierarchy links recover decisions even when task wording differs.
- One-hop relationships include necessary adjacent specifications without graph explosion.
- A seed cap bounds registry calls for large projects.
- Stop-word filtering corrects a concrete false-positive class without changing the general decision-search API.

### Consequences

- Semantic similarity and embeddings remain out of scope.
- Specifications beyond one relationship hop require their own direct relevance signal.
- Relationship expansion is capped at 25 direct seeds, while all directly relevant specifications remain eligible.
- Unresolved outgoing references are reported instead of silently discarded.

## D-7.4 — Budget optional context fairly and retain mandatory work

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 7 context budgeting

### Decision

Estimate source cost deterministically with a replaceable estimator. The default estimator uses one token per four characters, rounded up, with a minimum estimate of one token.

Always retain active work. Apply the configured maximum to optional sources using stable round-robin admission across doctrine, decisions, and specifications while preserving relevance order within each category. Exclude a candidate that does not fit and continue evaluating later candidates so a large source cannot block smaller useful sources.

Allow the result to exceed the configured budget only when mandatory active work alone is larger than the budget, and report that condition explicitly.

### Rationale

- Tokenization differs by downstream model, so an injectable estimator avoids coupling the resolver to one provider.
- Round-robin admission prevents one knowledge category from consuming every available token.
- Continuing after an oversized candidate uses remaining capacity efficiently.
- Dropping active work would produce a context packet without its governing scope.

### Consequences

- Estimates are conservative approximations rather than provider-specific counts.
- A mandatory-work overrun produces no optional selections until the budget changes.
- Every budget rejection includes required and remaining token estimates.

## D-7.5 — Explain all relevant exclusions without mutating source memory

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 7 explainability

### Decision

Report exclusions using the stable reasons `not-relevant`, `budget-exceeded`, `inactive`, and `unresolved-reference`. Include deterministic details and an estimated cost whenever a source object exists.

Keep resolution read-only. Do not modify work, doctrine sessions, decision memory, specifications, configuration, or agent artifacts while selecting context.

### Rationale

- Exclusions are necessary to explain why known project memory did not reach an agent.
- Stable reason codes support human display and future machine-readable diagnostics.
- Read-only selection makes repeated resolution safe and reproducible.

### Consequences

- Large registries may produce a correspondingly large explainability section.
- Phase 8 may present concise and expanded views, but it must not erase exclusion meaning.
- Source-state changes require a new resolution rather than mutation of an existing selection.
