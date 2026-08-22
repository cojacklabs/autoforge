# v0.20.1 Project Metadata Decisions

## Scope

v0.20.1 extends the v0.11 global project registry with inspectable metadata
and explicit project controls. It does not move active project authority out
of the repository.

## D-20.1.1 — Use stable project identity

Each registered project has a stable ID derived from its canonical path and a
user-editable display name. Aliases may improve navigation but must not
replace canonical identity or silently redirect project-scoped commands.

## D-20.1.2 — Separate descriptive metadata from authority

Metadata describes repository, runtime, package manager, AutoForge version,
agent contract, governance profile, lifecycle, and storage capabilities. It
cannot override project-local configuration, work state, decisions, or
contracts.

## D-20.1.3 — Make lifecycle state explicit

Projects may be `active`, `paused`, `archived`, or `inaccessible`. Read-only
inspection remains available for archived and inaccessible entries;
mutating commands must require an active, resolvable project.

## D-20.1.4 — Record freshness and capabilities

Registry metadata records last discovery, last validation, AutoForge schema
versions, and supported capabilities. These values are advisory diagnostics,
not authorization grants.

## Acceptance Criteria

The implementation must provide a versioned metadata schema, deterministic
read/write behavior, `projects show` output, explicit lifecycle updates,
canonical-path validation, migration coverage, JSON output, and focused
tests before v0.20.1 release.
