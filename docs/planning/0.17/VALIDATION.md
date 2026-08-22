# v0.17 Validation Checkpoint

- TypeScript typecheck passes.
- Full foundation suite passes: 101 files and 457 tests.
- Legacy suite passes: 17 tests.
- Design command tests pass, including import, search, update, and relationship checks.
- Specification schema, codec, store, and registry tests pass.
- Bundled CLI integration passes for design import, search, update, check, and context delivery.
- Context packet tests pass with provenance rendering.
- Freshness evaluation distinguishes `current`, `stale`, and `unknown` using SHA-256 source hashes.
- `design check` reports stale provenance-backed source files with a failing exit code.
- `design check --json` emits machine-readable relationship and freshness diagnostics, including `unknown` status.

The next bounded task is freshness status computation for imported design sources.
