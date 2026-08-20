# AutoForge 0.7.0 Phase 4 Decisions

## D-4.1 — Keep doctrines compact and deterministically routable

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 4, Task 4.1

### Decision

Represent doctrines as stable `doctrine.<name>` records containing a short title and summary, compact Markdown behavior guidance, deterministic routing metadata, source, status, and timestamps.

Routing metadata consists of canonical keywords, applicable work kinds, canonical scope tags, and repository-relative path patterns. Doctrine content is limited to 6,000 characters. The registry enforces unique IDs and names.

The required initial doctrine names are `router`, `planning`, `decisions`, `scope`, `questions`, `testing`, `frontend`, `backend`, `design`, and `security`.

### Rationale

- Compact content preserves the small-doctrine philosophy and prevents a new monolithic project encyclopedia.
- Separating instructions from routing signals keeps behavior guidance readable while selection remains deterministic and testable.
- Stable identity supports session references, future context packets, and project overrides.
- Repository-relative path patterns preserve the containment model established by the control kernel.
- Explicit source and status support built-in guidance, project customization, and temporary disabling without deletion.

### Consequences

- Large general-purpose guidance must be split into focused doctrines.
- Routing services must interpret explicit metadata rather than parsing doctrine prose.
- Project facts and specifications do not belong in doctrine content.
- Persistence, initial doctrine content, routing, and CLI presentation remain separate tasks.

## D-4.2 — Seed and persist built-in doctrine records

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 4, Task 4.2

### Decision

Create the 10 required built-in doctrines as compact validated registry records and persist the registry in a dedicated versioned envelope at `.autoforge/state/doctrines.json`.

Initialization seeds every built-in with the same project initialization timestamp. Doctrine registry state is required installation state and is validated by installation inspection and doctor. Registry mutations reuse the atomic store's revisions, locks, backups, and recovery behavior.

### Rationale

- Shipping useful defaults makes doctrine routing available immediately without requiring project authoring.
- Persisted records allow projects to disable or eventually override guidance while retaining stable built-in identity.
- A dedicated revision domain avoids unrelated conflicts with work, session, and decision memory.
- Staged initialization guarantees a successful current installation contains a usable doctrine registry.
- Health integration prevents missing or malformed behavior guidance from appearing valid.

### Consequences

- Existing Phase 3-only installations are partial until a future migration creates doctrine state.
- Built-in content changes are observable behavior and require migration or reconciliation rules.
- Projects may disable persisted built-ins, but mutation services and CLI controls remain future tasks.
- Doctrine selection and presentation remain separate tasks.

## D-4.3 — Route doctrines with explicit weighted signals

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 4, Task 4.3

### Decision

Select active doctrines deterministically from the current objective, work kind, scope tags, and repository-relative paths. Assign fixed weights to every matched signal, retain each match as an explanation reason, order results by descending score and then stable doctrine ID, and always include the router doctrine first.

Path routing supports the small glob subset required by doctrine metadata: `*`, `**`, and `?`. Unsafe or absolute candidate paths are rejected rather than normalized outside the repository boundary. Disabled doctrines never participate in selection.

### Rationale

- Explicit signals keep doctrine routing reproducible and testable without model inference.
- Weighted matches favor direct file and scope evidence over incidental objective terminology.
- Stable tie-breaking guarantees identical inputs produce identical output order.
- Preserved reasons support future `context --explain` output without recomputing selection logic.
- Always loading the compact router preserves routing guidance even when no domain doctrine matches.

### Consequences

- Routing vocabulary and weights are observable behavior and must change deliberately.
- Doctrine authors must provide useful metadata instead of relying on prose inspection.
- Semantic similarity and embeddings remain outside the 0.7.0 doctrine router.
- CLI presentation and doctrine-session tracking remain separate tasks.

## D-4.4 — Present persisted doctrines through one compact CLI command

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 4, Task 4.4

### Decision

Expose doctrine state through two canonical command forms: `autoforge doctrine` lists every persisted doctrine with status, source, and summary; `autoforge doctrine <name>` renders identity, metadata, routing signals, and complete compact guidance. Stable `doctrine.<name>` IDs are accepted as an equivalent lookup key.

The command is read-only and renders persisted registry state rather than regenerating built-ins. Disabled doctrines remain visible so project behavior is inspectable.

### Rationale

- A single command avoids separate list, show, and status syntax for a small registry.
- Reading persisted state accurately exposes project-specific status and future overrides.
- Showing routing metadata makes doctrine selection understandable before context compilation exists.
- Stable ID lookup supports future callers while short-name lookup remains convenient for humans.

### Consequences

- Unknown doctrine names and extra positional arguments return usage errors.
- Doctrine mutation and project-authored doctrine commands remain separate tasks.
- Future context output can reuse these formatters or their underlying registry data.

## D-4.5 — Persist explainable doctrine selections per work session

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 4, Task 4.5

### Decision

Persist the doctrines selected for active work in the versioned `.autoforge/state/doctrine-session.json` state domain. Each record binds a work session, task or issue, selection timestamp, ordered doctrine IDs, scores, and routing reasons. Ended selections move to history with their original evidence intact.

Project initialization creates empty doctrine-session state. Installation inspection and doctor require its schema and require the active work session and active doctrine session to agree. The `start` and `done` commands coordinate doctrine-session transitions with work lifecycle transitions and compensate doctrine state when the work transition fails.

### Rationale

- Persisting the exact selection makes agent guidance reproducible throughout a session.
- Stored scores and reasons provide explainability without rerunning routing against changed metadata.
- A separate revision domain keeps doctrine refreshes independent from work and session history.
- Cross-state validation detects partial or externally corrupted lifecycle transitions.
- Compensation preserves consistency without coupling the control kernel to doctrine implementation.

### Consequences

- Every current installation now requires `doctrine-session.json`.
- Starting work performs doctrine selection before publishing the work session.
- Completing work archives the doctrine selection alongside the work session.
- Explicit mid-session doctrine refresh remains a future capability.
