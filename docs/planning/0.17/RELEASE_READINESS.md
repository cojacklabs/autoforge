# v0.17 Release Readiness

## Acceptance Review

- **Typed design schemas:** PASS — design types and metadata invariants are validated.
- **Repository-native codec and storage:** PASS — Markdown/YAML codec and `.autoforge/specifications/` storage are covered.
- **Deterministic registry/search:** PASS — filtering, search, and relationship traversal are deterministic.
- **Relationship diagnostics:** PASS — missing targets are reported by `design check`.
- **Provenance and freshness:** PASS — source kind, capture time, SHA-256 hashes, and current/stale/unknown states are supported.
- **Design maintenance workflows:** PASS — import, update, list, show, search, and check are available.
- **Explainable context:** PASS — selected design provenance and relationship reasons are rendered in packets.
- **Machine-readable diagnostics:** PASS — `design check --json` emits structured results.
- **Documentation:** PASS — CLI reference, architecture decisions, audit, and validation records are updated.
- **Validation:** PASS — foundation suite has 101 files and 457 passing tests; legacy suite has 17 passing tests.

## Release Blockers

None identified for the v0.17 design protocol scope.

## Follow-up Scope

Visual rendering, autonomous design generation, and richer interactive UI remain deferred to the north-star milestones after the continuous product evolution layer.

## Decision

The v0.17 implementation is ready for package versioning and release checkpoint preparation. Publication remains gated on the final package audit and explicit release approval.
