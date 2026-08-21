# AutoForge v0.12 Release Readiness

Status: v0.12.0 release candidate prepared; approval pending

## Verified

- Repository formatting check passes.
- TypeScript typecheck passes.
- Production build succeeds and includes `bin/autoforge.js`.
- Foundation suite passes: 83 test files and 412 tests.
- Bootstrap lifecycle passes end to end: inspect, scaffold, discover, status, and gates.
- Package metadata is prepared at `0.12.0`; publication remains deferred.
- Dry-run npm pack contains the launcher, bundled CLI, README, license, and package metadata only.
- Local launcher execution prints `AutoForge 0.12.0` successfully.
- Clean npm-style `.bin/autoforge` symlink smoke test passes for `version` and `--help`.
- Complete `npm test` passes: 83 foundation files / 412 tests and 17 legacy tests.

## Before Release

- Create the `v0.12.0` commit and tag locally.
- Push and publish only after explicit release approval.
