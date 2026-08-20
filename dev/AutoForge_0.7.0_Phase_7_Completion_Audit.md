# AutoForge 0.7.0 Phase 7 Completion Audit

**Audit date:** 2026-08-20  
**Scope:** Phase 7 deterministic context resolver  
**Decision:** **PASS — approved to begin Phase 8**

## Executive Summary

Phase 7 satisfies the first deterministic context-resolution objective. AutoForge now combines active work, persisted doctrine routing, decision memory, specification relevance and relationships, a supplemental task description, and the configured context budget into one strict `ContextSelection`.

The resolver is read-only, deterministic for identical source snapshots, independent from agent adapters, explicit about inclusion and exclusion reasons, bounded to one-hop specification traversal, and capable of retaining smaller candidates after an oversized source is rejected.

## Implemented Capability

Phase 7 now provides:

- Strict runtime schemas for work context, doctrine references, decision references, specification references, exclusions, budget accounting, and the complete selection.
- Complete active task hierarchy or standalone active issue projection.
- Required matching between active work and the persisted doctrine session.
- Preservation of doctrine-router scores and structured reasons.
- Existing deterministic decision search integrated with task, phase, feature, or issue identity.
- Stop-word filtering at the resolver boundary to prevent generic prose matches.
- Fixed-weight specification ranking across identity, metadata, source, and content.
- Abstract-registry relationship traversal in both directions.
- One-hop relationship expansion from at most 25 direct seeds.
- Explicit unresolved specification-reference reporting.
- Configured token-budget enforcement with mandatory-work retention.
- Fair round-robin admission across doctrine, decision, and specification categories.
- Replaceable token estimation with a deterministic character-based default.
- Stable exclusion reasons for irrelevance, inactivity, budget rejection, and unresolved references.

## Acceptance Matrix

| Requirement                | Result | Evidence                                                  |
| -------------------------- | ------ | --------------------------------------------------------- |
| Active work input          | PASS   | Required task hierarchy or standalone issue               |
| Task-description input     | PASS   | Supplemental objective changes decision and spec ranking  |
| Specification relations    | PASS   | Bounded one-hop incoming/outgoing registry traversal      |
| Decision memory            | PASS   | Deterministic search with work-hierarchy signals          |
| Doctrine router            | PASS   | Persisted session selections and reasons consumed exactly |
| Configured context budget  | PASS   | Deterministic estimates and explicit accounting           |
| `ContextSelection` output  | PASS   | Strict validated domain schema                            |
| Inclusion reasons          | PASS   | Retained on every selected optional source                |
| Exclusion explanations     | PASS   | Stable reason codes and deterministic details             |
| Deterministic reproduction | PASS   | Identical snapshots produce deeply equal selections       |

## Safety and Integrity

The resolver fails closed when it encounters:

- No active task or issue.
- An active-work reference that cannot be resolved.
- A task whose phase or feature cannot be resolved.
- No current doctrine session for active work.
- A doctrine session bound to different active work.
- A selected doctrine missing from the registry.
- A non-positive or non-integer context budget.
- A supplemental task description longer than 10,000 characters.
- A generated selection with inconsistent token accounting or duplicate selected IDs.

The resolver does not mutate any source artifact and does not write context packets or agent files.

## Validation Evidence

| Gate                        | Result           |
| --------------------------- | ---------------- |
| Strict TypeScript typecheck | PASS             |
| Prettier check              | PASS             |
| Production build            | PASS             |
| Phase 7 focused tests       | PASS — 8 tests   |
| Phase 0–7 foundation tests  | PASS — 253 tests |
| Retained legacy tests       | PASS — 17 tests  |
| Total automated tests       | PASS — 270 tests |
| Offline dependency audit    | PASS — 0 issues  |
| npm package dry-run         | PASS — 5 entries |

## Architecture Assessment

The Phase 7 architecture is approved because:

- Selection contracts depend on domain schemas rather than CLI or adapter presentation.
- The resolver consumes the specification registry abstraction instead of raw tracked files.
- Persisted doctrine routing remains stable for the active session.
- Decision and specification ranking uses fixed weights and stable ID tie breakers.
- Relationship traversal is explicitly bounded by hop count and seed count.
- Budgeting is isolated from ranking and preserves order within each category.
- Token estimation is replaceable without changing selection semantics.
- Selected sources and their reasons form a complete input snapshot for Phase 8.
- Exclusions preserve enough evidence for concise and expanded explanation modes.

## Deferred, Non-Blocking Work

These items do not block Phase 8:

- `autoforge context` and `autoforge context --explain` are Phase 8 commands.
- Packet serialization, headings, and concise presentation are not yet implemented.
- Provider-specific tokenizers are not bundled; the estimator boundary permits them later.
- Context selections are not persisted because Phase 8 owns generated packet artifacts.
- Mid-session doctrine refresh remains an explicit future lifecycle operation.
- Semantic search, embeddings, and traversal beyond one relationship hop remain out of scope.
- The current production bundle exposes only CLI-reachable code; Phase 8 will connect the resolver to the CLI.
- `README.md` and package version still describe the legacy 0.6 release and remain release blockers.

## Phase 8 Entry Criteria

Phase 8 packet compilation may begin under these constraints:

1. Compile only sources present in `ContextSelection`.
2. Preserve resolver ordering and inclusion reasons.
3. Provide concise default output and expanded exclusion evidence for `--explain`.
4. Do not rerun doctrine routing or context ranking inside an agent adapter.
5. Keep packet generation deterministic for identical selections.
6. Write generated packets only beneath the configured AutoForge context artifact boundary.
7. Retain mandatory-work budget overruns visibly rather than silently truncating work.

## Sign-Off

**Engineering audit recommendation:** Proceed to Phase 8.  
**Phase 7 status:** Complete.  
**Deterministic-context acceptance:** Passed.  
**Release readiness:** Not yet applicable; deferred release items remain open.
