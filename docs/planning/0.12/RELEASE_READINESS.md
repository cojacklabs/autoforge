# AutoForge v0.12 Release Readiness

Status: development complete; release candidate not yet versioned

## Verified

- Repository formatting check passes.
- TypeScript typecheck passes.
- Production build succeeds and includes `bin/autoforge.js`.
- Foundation suite passes: 83 test files and 412 tests.
- Bootstrap lifecycle passes end to end: inspect, scaffold, discover, status, and gates.
- Package metadata currently remains at `0.11.11` until release approval.

## Before Release

- Review and approve the v0.12 changelog entry and README version heading.
- Bump `package.json` to `0.12.0` and update version assertions.
- Run the full `npm test` suite after the version bump.
- Inspect the packed tarball and verify the executable through an npm-style symlink.
- Create the `v0.12.0` commit and tag locally.
- Push and publish only after explicit release approval.
