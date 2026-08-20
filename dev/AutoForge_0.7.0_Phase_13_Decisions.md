# AutoForge 0.7.0 Phase 13 Decisions

## D-13.1 — Require an explicit migration command

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 13 migration entry point

### Decision

Keep `autoforge init` non-destructive when it detects a legacy installation and direct the user to `autoforge migrate --dry-run`. Perform migration only through an explicit `autoforge migrate` invocation.

### Rationale

- Replacing a legacy installation is a consequential filesystem operation.
- A dry run gives users artifact-level visibility before any backup or publication.
- Initialization should never silently reinterpret or destroy older data.

### Consequences

- `init` and `doctor` provide migration-aware guidance.
- Migration is deliberate rather than an implicit initialization side effect.
- Automation can inspect the same plan with `--dry-run --json`.

## D-13.2 — Support recognized AutoForge 0.0–0.6 package metadata

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 13 source-version detection

### Decision

Require `.autoforge/package.json` to identify `@cojacklabs/autoforge` with a recognized pre-0.7 semantic version. Reject missing, malformed, differently named, current, partial, or unknown installations without changing files.

### Rationale

- The legacy directory shape alone cannot reliably identify its producer or version.
- Version detection is required before applying a migration policy.
- Failing closed prevents arbitrary directories from being replaced as AutoForge data.

### Consequences

- Minimal legacy fixtures without package metadata are diagnosable but not migratable.
- Pre-0.7 installations share the same conservative migration boundary.
- Future source versions require an explicit schema update.

## D-13.3 — Back up the complete legacy tree

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 13 data preservation

### Decision

Copy the complete legacy `.autoforge` tree to a unique sibling `.autoforge.backup-<id>` before publishing 0.7. Preserve symlinks rather than dereferencing them. Retain the backup after successful migration.

### Rationale

- Most 0.6 files do not have safe one-to-one 0.7 equivalents.
- Full preservation permits manual recovery and later targeted import.
- Avoiding symlink dereference prevents backup traversal outside the legacy tree.

### Consequences

- Migration requires sufficient space for a complete copy.
- Backup name collisions fail before legacy publication changes.
- Partial backup copies are removed and never reported as complete.

## D-13.4 — Migrate only unambiguous quality commands

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 13 artifact conversion

### Decision

Convert legacy `typecheck`, `lint`, format-check, and test commands from `autoforge.config.json` only when each command is a simple whitespace-separated executable and argument list without shell syntax. Record unsupported commands and every legacy file as skipped with a reason.

### Rationale

- Project quality commands remain meaningful in the 0.7 quality-gate model.
- Shell parsing would introduce quoting ambiguity and possible behavioral changes.
- Prompt catalogs, SQLite state, telemetry, templates, and broad documents do not map reliably to work, decisions, doctrines, or specifications.

### Consequences

- Safe commands become typed 0.7 quality gates.
- Commands with quotes, redirects, pipes, substitutions, or other shell semantics are preserved only in source configuration and backup.
- Migration does not flood the specification registry with legacy templates.

## D-13.5 — Stage and validate before atomic publication

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 13 publication and rollback

### Decision

Build a complete 0.7 installation in a unique staging root, apply converted configuration, and validate it before touching the legacy target. Acquire the shared initialization lock, verify the plan has not changed, create the backup, displace the legacy directory, rename the validated current directory into place, and validate again. Restore the legacy directory if publication or final validation fails.

### Rationale

- State should never be generated incrementally inside the live legacy directory.
- The shared lock prevents initialization and migration races.
- Pre- and post-publication validation catches schema and identity failures.
- Rename-based publication minimizes the inconsistent-state window.

### Consequences

- Current 0.7 schemas and initialization code remain the canonical target generator.
- A failed migration leaves the original legacy tree active.
- A successful migration has both validated current state and a complete retained backup.

## D-13.6 — Make migration reporting bounded and machine-readable

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 13 operator reporting

### Decision

Return typed plans and results containing source version, backup path, artifact outcomes, migrated quality gates, and validation status. Print bounded human-readable skipped details by default and the complete result with `--json`.

### Rationale

- Large legacy installations may contain hundreds of files.
- Operators need concise terminal output without losing audit detail.
- Machine-readable output supports external review and automation.

### Consequences

- Human output lists at most 20 skipped artifacts plus a remaining count.
- JSON output contains every artifact outcome.
- Dry-run and actual migration share the same planner.
