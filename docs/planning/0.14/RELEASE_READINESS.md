# AutoForge v0.14 Release Readiness

Status: release candidate preparation in progress

## Verified

- Knowledge artifact, extraction, registry, persistence, protocol, and CLI tests pass.
- Formatting and typecheck pass.
- Foundation suite passes: 88 files and 426 tests.
- Legacy suite passes: 17 tests.
- Package metadata and CLI assertions are prepared for `0.14.0`.
- npm dry-run contains the expected six package files.
- Clean npm-style symlink smoke test prints `AutoForge 0.14.0`.
- Complete `npm test` passes: 88 foundation files / 426 tests and 17 legacy tests.

## Before Release

- Create the local `v0.14.0` commit and tag.
- Push and publish only after explicit release approval.
