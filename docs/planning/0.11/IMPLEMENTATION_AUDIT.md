# AutoForge v0.11 Foundation Audit

Status: certified for v0.11.10 foundation release

## Implemented

- User-scoped global workspace storage at `~/.autoforge/config.json`.
- Atomic project registration and removal with canonical paths.
- Registry metadata for project names and last-seen timestamps.
- Stable global asset directories for templates, doctrines, cache, and logs.
- `autoforge agents list` capability reporting for supported adapters.
- On-demand persistence of adapter capability snapshots in global config.
- Scope-aware asset resolution with project-local precedence.
- Asset-name traversal and absolute-path rejection.
- `autoforge projects`, `projects list`, and `projects register <path>`.
- `autoforge attach <path>` to initialize and register a project.
- `autoforge detach <path>` to remove only the global registration.
- `autoforge projects prune` to remove inaccessible registry entries.
- Global registry diagnostics in `autoforge doctor`.
- Upward project-root discovery from nested working directories.
- Global `--project <path>` targeting for project-scoped commands.
- `autoforge use <project-name> <command>` alias routing.
- CLI routing, help text, and focused regression coverage.

## Verified

- TypeScript typecheck passes.
- Production build passes.
- Foundation suite passes: 81 files and 398 tests.
- Legacy suite passes: 17 tests.

## Foundation Certification

The v0.11 foundation is certified for v0.12 bootstrap development. Global
workspace behavior, project targeting, adapter contracts, asset scoping,
package entrypoints, planning synchronization, and release validation have
all passed their required checks.

## Not Yet Implemented

## Alias Design Constraint

Named switching must be an explicit, per-invocation selection. It must not
silently change the current working-directory resolution or share project
state. The eventual `use` interface should resolve a registered name to a
canonical path and delegate to the same `--project` execution path.

- Global template/doctrine content management and upgrade tooling.
- Universal project contract generation for globally attached projects.
- Full v0.11 security and isolation audit.

## Release Note

These changes remain local development work. No v0.11 package, tag, or remote branch has been published.
