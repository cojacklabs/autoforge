# AutoForge 0.7.0 Phase 10 Decisions

## D-10.1 — Migrate capabilities by purpose, not by legacy implementation

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 10 migration policy

### Decision

Evaluate each AutoForge 0.6 capability against one question: does it strengthen AutoForge as a local development context and control plane? Keep or rewrite only capabilities that answer yes without reintroducing a second kernel, memory model, prompt system, or orchestration engine.

Treat the Phase 0–9 services as the destination architecture. Do not import legacy JavaScript modules into `src/` or wrap them as permanent compatibility layers.

### Rationale

- Legacy code reflects a broader autonomous software-factory product direction.
- The 0.7 kernel already supplies strict schemas, atomic state, scoped context, adapter setup, and guardrails.
- Porting implementation details would preserve duplication and old assumptions.
- A capability-first review permits useful behavior without architectural regression.

### Consequences

- Phase 10 is a selective migration rather than feature parity with 0.6.
- Retained behavior uses 0.7 state and services even when command names remain familiar.
- Legacy tests stay as regression evidence until the later repository migration phase decides their final disposition.

## D-10.2 — Retain quality gates as a read-only control-plane check

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 10 quality validation

### Decision

Expose `autoforge gate check` as the retained quality-gate surface. Always validate current AutoForge installation integrity. Optionally validate explicitly selected contained files for readability, recognized secret patterns, and JSON/YAML syntax. Run explicitly configured project commands sequentially.

Return one strict report containing all completed, failed, warned, and skipped checks. Support text output for people and `--json` for automation.

### Rationale

- Quality status is useful control-plane evidence before a person or agent completes work.
- Read-only validation composes safely with the work lifecycle and guardrails.
- Complete reports are easier to recover from than first-error-only behavior.
- Machine-readable output avoids coupling CI to terminal formatting.

### Consequences

- The gate never formats files, changes configuration, or records compliance evidence.
- With no selected files, content checks are explicitly skipped rather than reported as passes.
- With no configured commands, command execution is explicitly skipped.

## D-10.3 — Require explicit, shell-free quality command configuration

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 10 project command execution

### Decision

Add optional `qualityGates` entries to the version-1 project config. Each entry has a unique stable ID, executable, argument array, and bounded timeout. Preserve compatibility with existing version-1 configs by defaulting the field to an empty array during parsing.

Spawn configured executables directly with `shell: false`, ignored child output, a project-root working directory, sequential ordering, and hard timeout termination. Do not auto-discover package scripts, invoke `npx --yes`, download tools, interpret shell strings, or retry with write flags.

### Rationale

- Explicit configuration makes project policy reviewable.
- Argument arrays avoid shell expansion and injection ambiguity.
- No auto-download keeps validation deterministic and offline-compatible.
- Timeouts prevent a stuck project command from blocking the control plane indefinitely.

### Consequences

- Projects choose their own formatter, linter, typecheck, test, build, and audit commands.
- Command output is not ingested into AutoForge context or persisted in state.
- Users rerun a failed project command directly when they need detailed tool output.

## D-10.4 — Scope content checks explicitly and redact secret values

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 10 file and security checks

### Decision

Accept repeated `--path` arguments and the familiar comma-separated `--files` form. Resolve every file through canonical, symlink-aware repository containment, deduplicate and sort repository-relative paths, require regular readable files, and cap content inspection at one MiB per file.

Scan text files for a deliberately small set of recognizable credential patterns. Report only rule ID, repository-relative path, and line number. Never return or print the matched value. Exclude binary files from content parsing with an explicit warning.

### Rationale

- Explicit file scope avoids expensive or misleading whole-repository scans.
- Canonical containment reuses the same workspace boundary as guardrails.
- Redaction prevents the scanner from becoming a secret-exfiltration mechanism.
- Size and binary handling bound memory use and reduce accidental noise.

### Consequences

- Secret scanning is useful but not a substitute for a dedicated security product.
- Unreadable, missing, non-regular, or oversized selected files fail closed.
- Binary files do not fail the gate solely because content inspection is inapplicable.

## D-10.5 — Map retained memory, health, workspace, prompt, and orchestration behavior to the 0.7 kernel

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 10 rewritten capabilities

### Decision

Recognize the following Phase 0–9 services as the completed rewrites of useful 0.6 capabilities:

| 0.6 capability         | 0.7 destination                                                    |
| ---------------------- | ------------------------------------------------------------------ |
| Project health         | `autoforge doctor` and strict installation inspection              |
| Structured memory      | Work, decisions, doctrines, specifications, and session state      |
| Workspace boundaries   | Canonical path containment, work scope, and Phase 9 guardrails     |
| Current memory loading | Relevance resolver plus deterministic build packet                 |
| Agent manifests        | Typed adapter registry and capability metadata                     |
| Prompt architecture    | Shared context artifact, selected doctrines, and managed blocks    |
| Orchestration flow     | Explicit work lifecycle, session state, context refresh, and check |
| Useful security checks | Redacted, selected-file credential scan in the Phase 10 gate       |

Do not add parallel implementations merely to preserve legacy filenames or data shapes.

### Rationale

- These services already satisfy the underlying useful behavior with stronger invariants.
- One source of truth prevents agents from receiving contradictory memory or policy.
- Explicit lifecycle commands replace autonomous orchestration with operator-visible control.
- Workspace and context decisions remain centralized.

### Consequences

- Phase 10 does not create another memory directory, prompt catalog, manifest, or run database.
- Physical conversion of old installation files remains Phase 13 work.
- Legacy command aliases beyond the retained gate surface are not introduced here.

## D-10.6 — Defer or remove capabilities that do not strengthen the kernel

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 10 non-migration decisions

### Decision

Defer SOC 2 evidence generation, advanced compliance, autonomous autopilot, adaptive multi-agent orchestration, model-training telemetry, execution metrics, and approval automation. Reconsider them only when a concrete 0.7 use case and domain boundary exist.

Remove from the target architecture redundant role prompt catalogs, copy/paste orchestrator payloads, duplicate command documentation systems, broad required-file manifests, and context loading that asks agents to ingest irrelevant repository material.

### Rationale

- These systems expand AutoForge beyond its current context/control-plane purpose.
- Compliance artifacts without trustworthy source events create false assurance.
- Autonomous orchestration and training telemetry add state and privacy complexity prematurely.
- Broad prompt and manifest systems directly conflict with selective context delivery.

### Consequences

- Passing legacy tests does not imply these features are part of the 0.7 product.
- Old files remain untouched until Phase 13 migration planning can preserve user data safely.
- Future reintroduction requires a new explicit decision rather than accidental reuse.

## D-10.7 — Ship YAML as a runtime dependency

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 10 package integrity

### Decision

Declare `yaml` as a production dependency in npm and pnpm manifests. Continue externalizing it from the ESM bundle so Node loads the installed package at runtime.

### Rationale

- Phase 8 specification parsing and Phase 10 syntax gates both execute in the installed CLI.
- A development-only declaration makes the packed CLI incomplete for production consumers.
- The existing build decision intentionally keeps YAML outside the bundle.

### Consequences

- Production installation supplies the external YAML parser.
- Package dry-run and bundled CLI execution remain release gates.
