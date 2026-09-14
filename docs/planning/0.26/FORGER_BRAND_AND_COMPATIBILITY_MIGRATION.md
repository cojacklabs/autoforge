# Forger Brand and Compatibility Migration

Status: Superseded as an implementation identity; compatibility pattern retained
Approved: 2026-09-13
Target line: 0.26.x

> **Identity gate failed:** Subsequent verification found direct collisions in
> the product name, AI-development category, `forger` executable, and
> `.forger/` state directory, plus adjacent trademark risk. Do not implement
> the Forger-specific identifiers in this document. See
> [Forger Identity Verification](FORGER_IDENTITY_VERIFICATION.md). The bounded
> migration pattern may be adapted to a later approved distinctive name.

## Decision

The proposed transition was from **AutoForge** to **Forger**. The framework
boundary does not change: Forger remains the deterministic, model-independent
engineering control plane used by humans, coding agents, and future CoJack Labs
products. It does not become the separately planned general-purpose AI.

Under the superseded proposal, AutoForge 0.26.x was the final compatibility line
under the AutoForge name and Forger 0.26.x was the supported successor line.
AutoForge 0.26.x would have received
migration and critical compatibility fixes, but new framework capabilities
belong to Forger. A sunset date must be announced separately; this plan does
not imply that an installed tool may silently upgrade itself or delete user
state.

The public notice should use language equivalent to:

> AutoForge 0.26.x is the final compatibility release under the AutoForge
> name. Install Forger 0.26.x to continue receiving framework features and
> support. Your existing project state can be migrated with the supported
> Forger migration command.

## Identity Map

| Concern             | Compatibility identity           | Successor identity                                                               |
| ------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Product             | AutoForge                        | Forger                                                                           |
| Display name        | `AutoForge`                      | `Forger`                                                                         |
| Executable          | `autoforge`                      | `forger`                                                                         |
| Public CLI package  | `@cojacklabs/autoforge`          | scoped Forger package, expected `@cojacklabs/forger` after registry verification |
| Project state       | `.autoforge/`                    | `.forger/` (recommended; final acceptance required before implementation)        |
| Environment prefix  | `AUTOFORGE_`                     | `FORGER_`, with documented temporary aliases                                     |
| Credential services | existing AutoForge service names | versioned Forger service names with an explicit credential migration path        |

Use `Forger` for display text and `forger` for technical identifiers. Do not
introduce `forge` as a third product identity. In particular, `.forge/` is not
the recommended state directory: it is overly generic and collides conceptually
with several unrelated Forge developer ecosystems.

The unscoped `forger` npm name and adjacent FORGER/Forge developer products are
known collision risks. The scoped package, executable, repository name, domain,
searchability, and relevant legal risk must therefore receive a final recorded
verification before publication. Approval of this migration architecture is
not authorization to purchase a domain or claim an unavailable identifier.

## Compatibility Contract

1. Publish an AutoForge 0.26.x bridge through the existing
   `@cojacklabs/autoforge` package.
2. Keep the `autoforge` executable functional during the documented
   compatibility window. It should print a bounded deprecation and migration
   notice and delegate only through a versioned, tested boundary.
3. Publish the supported Forger 0.26.x package with the `forger` executable.
4. Do not require silent background updates. `autoforge update` may identify
   the final compatibility release and explain the successor installation;
   automation must remain deterministic and non-interactive.
5. Gate new project creation and post-0.26 features with a clear minimum-version
   error when required. Existing readable state must not be held hostage to an
   automatic upgrade.
6. Preserve temporary command, environment-variable, and API aliases with
   explicit warnings and a documented removal horizon.
7. Preserve stable IDs, historical decisions, evidence, provenance, Git
   history, and references to the external AutoForgeAI project. Historical
   records are evidence, not branding defects to rewrite.

## Project-State Migration

The supported interface should be explicit and previewable:

```bash
forger migrate brand --dry-run
forger migrate brand
```

Migration must:

1. resolve the canonical Git repository root;
2. inspect `.autoforge/` and `.forger/` before writing;
3. stop on ambiguous dual-directory or identity conflicts;
4. acquire the same project mutation lock used by initialization;
5. generate a deterministic migration plan;
6. create a recoverable backup outside the destination being replaced;
7. stage the complete successor state without mutating the source;
8. transform only framework-owned schemas and configuration fields;
9. validate schemas, project identity, references, and generated contracts;
10. atomically publish `.forger/`, update the global registry and relevant
    ignore rules, and retain rollback metadata;
11. restore the prior state if publication or final validation fails; and
12. report preserved historical names and any manual follow-up.

The migrator must never perform a repository-wide text replacement. It must not
rename arbitrary user files, edit application code merely because it contains
`AutoForge`, rewrite Git history, migrate secrets through plaintext, or erase
the source before the successor state validates.

During the compatibility window, Forger should prefer `.forger/`, support an
explicit read-only discovery path for unmigrated `.autoforge/` projects, and
direct users to the migration command before successor-owned writes. Dual-write
state is prohibited because it creates competing project truth.

## Implementation Sequence

### 1. Final identity verification

- verify the scoped npm package, executable, repository, and domains;
- document known adjacent products and legal/search risks;
- approve `.forger/` or record a different distinctive state directory;
- define ownership and recovery for all public identifiers.

### 2. Central compatibility vocabulary

- replace scattered literals with tested identity and state-path constants;
- add dual-read discovery without changing canonical writes;
- inventory environment variables, credential namespaces, generated contracts,
  documentation, CI, release automation, fixtures, and global registry fields.

### 3. Migration engine

- implement dry-run, conflict detection, backup, staging, validation, atomic
  publication, global-registry repair, and rollback;
- add fixtures for clean migration, interrupted migration, dual-directory
  conflict, malformed legacy state, linked worktrees, and nested invocation;
- demonstrate that historical records and stable IDs remain unchanged.

### 4. Package and executable transition

- publish the supported scoped Forger packages and `forger` binary;
- publish the AutoForge 0.26.x compatibility bridge;
- preserve deterministic explicit subcommands and machine-readable output;
- test npm, pnpm, and yarn global installation and replacement flows on Linux,
  macOS, and Windows.

### 5. Documentation, telemetry-free notice, and enforcement

- update human and agent onboarding only when successor packages are usable;
- provide install, upgrade, migration, rollback, and uninstall instructions;
- ensure notices expose no project data and require no hosted telemetry;
- freeze feature development on the AutoForge compatibility package;
- announce the alias-removal horizon separately after adoption evidence exists.

## Release Gates

The transition is not release-ready until all of the following are evidenced:

- approved public identifiers are available and controlled by CoJack Labs;
- the AutoForge bridge and Forger successor install together without dependency
  or executable ambiguity;
- migration dry-run is non-mutating and machine-readable;
- migration and rollback fixtures pass on every supported operating system;
- `.autoforge/` remains recoverable after a failed migration;
- global project registration points to the successor state exactly once;
- credentials are preserved or explicitly re-entered without secret output;
- old explicit automation either continues to work or fails with stable,
  actionable guidance;
- package tarballs, provenance, documentation links, and release notices are
  validated before publication; and
- the framework-only north-star remains unchanged after the brand transition.

## Non-Goals

- turning Forger into the future CoJack Labs AI;
- silently forcing package installation or filesystem mutation;
- deleting `.autoforge/` without a validated, recoverable migration;
- bulk rewriting historical evidence;
- purchasing `forger.sh` or another domain as part of repository migration;
- removing the AutoForge compatibility package in the same release that
  introduces its successor.
