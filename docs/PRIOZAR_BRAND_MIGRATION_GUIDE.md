# Priozar Brand Migration and Compatibility Guide

Status: Authoritative migration guide
Updated: 2026-09-13
Successor Identity: Priozar (`priozar`, `.priozar/`, `@cojacklabs/priozar`, `priozar.sh`)
Compatibility Bridge: `@cojacklabs/autoforge` (`autoforge`, `.autoforge/`)

## 1. Overview

AutoForge is transitioning to **Priozar**, the open-source engineering control plane for AI-assisted software, data, and AI development.

During the v0.26 compatibility window:

- Both `autoforge` and `priozar` CLI binaries are provided by `@cojacklabs/autoforge`.
- Existing `.autoforge/` directories remain readable and functional.
- Repositories can migrate to the canonical `.priozar/` state directory using the built-in, non-destructive migration command.

---

## 2. Dry-Run Inspection

Before performing any filesystem changes, inspect the deterministic migration plan:

```bash
autoforge migrate brand --dry-run
# or
priozar migrate brand --dry-run
```

For automation or machine parsing, pass `--json`:

```bash
autoforge migrate brand --dry-run --json
```

The output details:

- Source directory (`.autoforge`)
- Target directory (`.priozar`)
- Project root path
- Actions to be taken (copying state, migrating agent contracts)
- Verification that no files have been altered

---

## 3. Applying Migration

To apply the migration:

```bash
autoforge migrate brand
# or
priozar migrate brand
```

### Safety & Invariants

1. **Mutation Lock**: Acquires `.priozar.migrate.lock` to ensure no concurrent processes alter state during migration.
2. **Conflict Prevention**: Halts immediately if both `.autoforge` and `.priozar` already exist.
3. **Automatic Backup**: Creates an immutable, recoverable backup directory (e.g. `.autoforge.backup-<id>/`) outside the target before staging changes.
4. **Atomic Publication**: Stages the complete `.priozar/` state tree in a temporary staging directory, validates schemas, and atomically publishes it into place.
5. **Contract Preservation**: Automatically updates agent contract metadata and repairs project roots without touching application source files or git history.
6. **Automatic Rollback**: If staging or publication encounters any failure, the source state is restored from backup and staging files are cleaned up.

---

## 4. Post-Migration Verification

After migrating:

```bash
# Verify project health
priozar doctor

# View current project status
priozar status

# Check active work and context
priozar recap
priozar context --explain
```

---

## 5. Global Registry Updates

If your repository was attached in the global registry under its prior path, update or verify it with:

```bash
autoforge projects show priozar
# or
priozar projects list
```

---

## 6. Rollback Instructions

If you ever need to manually revert a brand migration:

1. Ensure no processes are running in the repository.
2. Locate the created backup directory: `ls -d .autoforge.backup-*`.
3. Remove the staged `.priozar` directory:
   ```bash
   rm -rf .priozar
   ```
4. Restore `.autoforge` from the backup:
   ```bash
   cp -R .autoforge.backup-<id> .autoforge
   ```
5. Run `autoforge doctor` to confirm state integrity.
