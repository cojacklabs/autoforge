# v0.20 Release Readiness

## Acceptance Review

- **Digital-twin architecture:** PASS — the twin is a bounded projection of existing project records.
- **Versioned schemas:** PASS — nodes, edges, projections, and queries are validated with explicit schema versions.
- **Deterministic projection:** PASS — work and decision state produces stable, deduplicated output with source provenance.
- **Bounded queries:** PASS — type, relationship, depth, and result-limit controls are enforced.
- **Project persistence:** PASS — projections use atomic writes under `.autoforge/twin/`.
- **CLI workflows:** PASS — `twin generate`, `twin show`, and `twin query` support text and JSON output.
- **Documentation:** PASS — architecture, progress, validation, and CLI reference documents are updated.
- **Validation:** PASS — 113 foundation test files and 472 tests pass; all 17 legacy tests pass.

## Release Blockers

None identified for the v0.20 Product Digital Twin scope.

## Deferred Scope

Expanded project metadata, storage quotas, archive/prune controls, export/import
recovery, cross-project synchronization, and workspace-level policy controls
remain follow-up v0.20.x/v0.21 work. They must not alter the local `.autoforge/`
authority invariant.

## Decision

The current v0.20 implementation is ready for versioning and release
checkpoint preparation.
