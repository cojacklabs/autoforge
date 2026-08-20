# AutoForge 0.7.0 Phase 3 Decisions

## D-3.1 — Model decision memory as validated records and chains

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 3, Task 3.1

### Decision

Represent each decision as a stable record containing a statement, reasoning, consequences, canonical scope tags, canonical keywords, related work IDs, status, timestamps, and an optional superseded decision ID.

Decision memory stores normalized records. Supersession is a directed acyclic chain: a replacement points to one prior decision, the prior decision is marked superseded, a decision may be replaced only once, and every superseded record must have a replacement.

### Rationale

- Stable records make rationale independently persistent, searchable, and linkable from future context packets.
- Canonical lowercase metadata enables deterministic relevance search without embeddings.
- Typed work IDs connect “why” memory to the control kernel without coupling decision schemas to work object storage.
- Explicit supersession preserves history while distinguishing current guidance from obsolete choices.
- Acyclic, single-replacement chains make decision lineage explainable and deterministic.

### Consequences

- Renaming or editing a decision does not change its stable ID.
- Superseding a decision requires an atomic update of both the replacement and prior status.
- Related work existence must be checked by the application service because work lives in a separate envelope.
- Free-form uppercase keywords and duplicate metadata are rejected rather than normalized silently.
- Persistence and relevance scoring remain separate Phase 3 tasks.

## D-3.2 — Persist decisions in an independent envelope

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 3, Task 3.2

### Decision

Persist decision memory in a dedicated versioned envelope at `.autoforge/state/decisions.json`. Reuse the audited atomic state store, structured invalid-state parsing, staging initialization, revision checks, locks, backups, and recovery behavior.

Decision state is required installation state. Initialization creates empty decision memory, installation inspection validates it, and doctor reports its schema health.

### Rationale

- Decisions have different mutation and search patterns from work and sessions and should not create unrelated revision conflicts.
- Reusing the common persistence boundary avoids a second implementation of locking, atomic writes, backups, and schema enforcement.
- Initialization and health integration ensure every current project can safely execute later `decide` and `why` commands.
- A dedicated envelope permits independent decision migrations and future retention policies.

### Consequences

- Existing Phase 2-only installations are considered partial until a future migration creates decision state.
- Decision services must use the decision envelope revision for optimistic writes.
- Adding another required state file must continue to update initialization, inspection, doctor, and migration behavior together.

## D-3.3 — Record and supersede through one service boundary

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 3, Task 3.3

### Decision

Record decisions through a revision-aware `DecisionService`. The service validates every related work ID against current control-kernel state, generates a readable collision-safe decision ID, validates the complete decision record, and commits against the observed decision revision.

Supersession is one decision-envelope mutation: an active target is marked superseded and its active replacement is appended with the same update timestamp. Missing, revoked, or already superseded targets are rejected before persistence.

### Rationale

- A single service prevents future CLI commands and adapters from duplicating identity, relationship, and supersession rules.
- Validating work links at write time keeps decision relationships meaningful without coupling the two persistence envelopes.
- One atomic decision write prevents a superseded target from existing without its replacement.
- Optimistic revision checks prevent silent loss when multiple processes record decisions concurrently.

### Consequences

- Work deletion or archival must account for related decisions before that capability is introduced.
- Concurrent recorders may receive a state conflict and must retry from fresh memory.
- Superseded decisions remain immutable history except for their status and update timestamp transition.
- Revocation behavior and CLI argument parsing remain separate tasks.

## D-3.4 — Rank decisions with fixed explainable weights

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 3, Task 3.4

### Decision

Implement relevance search as a pure deterministic function over decision memory. Normalize and tokenize the query, score explicit fields with fixed weights, return the matching fields and tokens as reasons, sort by descending score, and resolve ties by ascending decision ID.

Weights are: ID 20, related work 15, keyword 12, scope 10, statement token 8, reasoning token 4, consequence token 3, and exact normalized statement phrase 10. Exact tokens and deterministic four-character-or-longer prefixes match.

Active decisions are searched by default. Superseded decisions appear only when history is explicitly requested; revoked decisions are excluded.

### Rationale

- Fixed weights make ranking reproducible across machines, processes, and time.
- Field-level reasons make every result inspectable without a model-generated explanation.
- Canonical keywords and scopes provide controlled related terminology without embeddings or a vector database.
- Stable ID tie-breaking prevents persistence order from changing results.
- Optional related-work boosts connect search to the control kernel without requiring context intelligence.

### Consequences

- Search quality depends on well-authored statements, keywords, scopes, and rationale.
- Prefix matching is intentionally conservative and does not perform stemming or semantic inference.
- Weight changes are observable behavior and should be versioned or documented.
- Persistence reads and CLI formatting remain separate responsibilities.

## D-3.5 — Keep decide explicit and scriptable

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 3, Task 3.5

### Decision

Expose recording as an explicit non-interactive `autoforge decide` command. Require `--statement`, `--reasoning`, and at least one each of `--consequence`, `--scope`, and `--keyword`. Allow repeated values for those metadata fields, optional repeated `--work` relationships, and one optional `--supersedes` decision ID.

The command layer owns argument validation, project discovery, and human-readable output. `DecisionService` remains responsible for IDs, work-link validation, supersession, decision-schema validation, and revision-aware persistence.

### Rationale

- Explicit flags preserve argument boundaries for long rationale and consequence text.
- Repeated metadata flags remain predictable for humans, agents, shell scripts, and CI.
- Requiring search metadata at creation improves later deterministic relevance without silent enrichment.
- A thin command avoids a second implementation of decision mutation semantics.

### Consequences

- Shell callers must quote multi-word values.
- Interactive decision capture and editor-based input are deferred.
- Malformed metadata returns usage status; missing work or supersession targets retain structured domain errors.
- The command prints the stable decision ID and committed revision for traceability.

## D-3.6 — Why renders stored evidence, not generated explanations

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 3, Task 3.6

### Decision

Expose deterministic retrieval as `autoforge why` with optional `--query`, repeated `--work`, optional `--history`, and optional positive `--limit`. Require at least a query or one work relationship.

Render ordered stored evidence for every match: stable ID, score, status, statement, reasoning, consequences, scope, keywords, related work, match reasons, and supersession target when present. Render a stable no-match message instead of treating no results as an error.

### Rationale

- Showing stored rationale answers “why” without model-generated interpretation or hallucination risk.
- Scores and field-level reasons expose exactly why deterministic search returned each record.
- Work-only lookup supports retrieving decisions attached to active or known work even without textual terminology.
- Explicit history inclusion keeps obsolete guidance out of default results while preserving discoverability.
- Stable plain text is useful to humans, agents, tests, and shell-driven workflows.

### Consequences

- `why` is read-only and never enriches or rewrites decision records.
- Revoked decisions remain excluded because search does not expose them.
- JSON output and interactive result navigation remain future presentation work.
- Multi-word query values must be quoted by shell callers.
