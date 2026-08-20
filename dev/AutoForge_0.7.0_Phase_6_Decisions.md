# AutoForge 0.7.0 Phase 6 Decisions

## D-6.1 — Use typed namespaced specification identities

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 6 specification model

### Decision

Support the initial specification types `architecture`, `screen`, `component`, `flow`, and `design`. Require every registered specification ID to use its type as a namespace, such as `component.job-card`, and require the ID prefix to agree with the explicit `type` field.

Each specification contains `id`, `type`, `name`, `description`, `relationships`, `tags`, `source`, `updatedAt`, and a human-readable Markdown `content` body. Apply bounded strict runtime schemas, canonical lowercase tags, unique tags, and valid offset timestamps.

### Rationale

- Namespaced IDs remain readable while preventing cross-type ambiguity.
- An explicit type supports deterministic filtering without parsing arbitrary content.
- Strict metadata gives Phase 7 reliable context-selection inputs.
- A separate Markdown body keeps specifications useful to humans and agents.

### Consequences

- Unsupported top-level types cannot be registered in the initial registry.
- Adding a future type requires an explicit schema and compatibility decision.
- Specification content is bounded to prevent accidental encyclopedic artifacts.

## D-6.2 — Store specifications as Markdown with YAML frontmatter

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 6 specification codec

### Decision

Serialize required machine-readable metadata in YAML frontmatter and retain the specification narrative as the Markdown body. Normalize serialized documents to stable field ordering, LF boundaries, and one trailing newline. Reject missing frontmatter, malformed YAML, invalid metadata, and empty bodies as invalid state.

Store documents beneath `.autoforge/specifications/<type>/<name>.md`, derived deterministically from the specification ID.

### Rationale

- One artifact remains readable and editable without a proprietary tool.
- YAML frontmatter supports structured indexing while Markdown supports rich implementation guidance.
- Deterministic encoding keeps reviews and future generated changes stable.
- ID-derived paths make direct lookup local and predictable.

### Consequences

- The frontmatter is authoritative for metadata and must agree with the file path.
- Arbitrary Markdown after the closing frontmatter delimiter remains specification content.
- YAML aliases and formatting choices are normalized when AutoForge serializes a new document.

## D-6.3 — Make registration immutable and atomically file-backed

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 6 specification store

### Decision

Define `register` as creation of a previously unknown ID. Use a per-specification exclusive lock, an exclusive temporary file, filesystem synchronization, and atomic rename. Reject duplicate IDs rather than silently replacing project knowledge.

Require an initialized AutoForge project before every store operation. Resolve configuration, registry directories, and specification files through canonical symlink-aware containment. Validate every on-disk document and require its frontmatter identity to match its derived path.

### Rationale

- Immutable registration avoids accidental replacement without a designed update history model.
- Atomic creation prevents readers from observing partial Markdown or YAML.
- Locks make duplicate concurrent registration deterministic.
- Canonical containment protects tracked specification storage from symlink escapes.
- Identity/path agreement prevents duplicate or misleading registry entries.

### Consequences

- Specification updates require a future explicit update operation and concurrency policy.
- The specifications directory is created lazily on first registration.
- Invalid tracked documents fail registry reads and lists instead of being skipped silently.

## D-6.4 — Represent relationships as extensible labeled edges

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 6 relationship registry

### Decision

Represent `relationships` as a map from canonical relationship names to unique namespaced references. Normalize queries into edges containing `sourceId`, `relationship`, and `targetId`.

Support deterministic outgoing, incoming, and combined relationship queries with optional relationship-name filters. Permit targets that are not currently registered so authors can reference external design tokens, later-phase types, or specifications registered in a different order.

### Rationale

- Labeled edges preserve meaning that an untyped related-ID array would lose.
- An extensible map supports `uses`, `implements`, `contains`, and future domain vocabulary without schema churn.
- Incoming queries enable reverse dependency discovery for Phase 7.
- Forward references keep registration order independent and support the plan's token-reference example.

### Consequences

- Relationship existence is not an invariant of registration.
- Consumers must distinguish an edge from successful resolution of its target.
- Edge ordering is stable by source ID, relationship name, and target ID.
