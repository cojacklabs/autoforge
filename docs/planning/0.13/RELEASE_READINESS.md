# AutoForge v0.13 Release Readiness

Status: release candidate prepared; approval pending

## Verified

- Package metadata and CLI assertions are prepared for `0.13.0`.
- Formatting and typecheck pass.
- Foundation suite passes: 83 files and 415 tests.
- Legacy suite passes: 17 tests.
- Vision and discovery lifecycle tests pass, including clean and legacy modes.
- npm dry-run contains the launcher, bundled CLI, README, license, and metadata only.
- Clean `.bin/autoforge` symlink smoke test passes for `version` and `--help`.

## Before Release

- Create the local `v0.13.0` commit and tag.
- Push and publish only after explicit release approval.
