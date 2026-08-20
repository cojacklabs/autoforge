# AutoForge 0.7.0 Phase 14 Decisions

## D-14.1 — Dogfood against the real AutoForge repository

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 14 self-hosting environment

### Decision

Migrate the repository's actual legacy `.autoforge` installation to the 0.7 state model and use that state for self-hosting. Retain the complete legacy backup rather than using only temporary test repositories.

### Rationale

- Phase 14 must exercise real repository size, configuration, Git rules, tests, and commands.
- Synthetic fixtures cannot reveal integration friction around existing project artifacts.
- Phase 13 provides the required explicit backup, validation, and rollback boundary.

### Consequences

- AutoForge's feature, phase, tasks, decisions, doctrines, sessions, context, and quality configuration now live in its own repository.
- The legacy 0.3 tree remains recoverable in a locally ignored backup.
- Current durable state becomes reviewable repository content.

## D-14.2 — Use narrow self-hosted tasks before every edit

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 14 implementation workflow

### Decision

Create one feature, one phase, and five narrowly scoped tasks. Start each task, generate and inspect its deterministic context packet, run guardrails against every intended path, implement only inside scope, validate behavior, and complete the session before opening the next task.

### Rationale

- The workflow must prove AutoForge can govern incremental development rather than merely store metadata.
- Small tasks make scope and resolver behavior observable.
- Separate sessions provide concrete recovery, recap, doctrine, and lifecycle evidence.

### Consequences

- All five tasks are persisted as completed with no active work or session remaining.
- Out-of-scope checks fail advisory guardrails as designed.
- Each implementation has a retained task, scope, packet, and session history.

## D-14.3 — Normalize migration Git policy for durable and ephemeral artifacts

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Dogfood finding: repository artifact safety

### Decision

During legacy migration, remove broad `.autoforge/` Git ignores and install precise rules. Keep config, metadata, work, decisions, doctrines, and specifications visible; ignore context packets, current and doctrine sessions, atomic state backups, and retained legacy backups. Apply the `.gitignore` update atomically and restore it when migration rolls back.

### Rationale

- The broad legacy ignore contradicted the 0.7 artifact policy.
- Recovery backups may contain historical generated state or sensitive material and must not become commit candidates.
- Durable state is useful only if it can be reviewed and shared.

### Consequences

- Current AutoForge durable state appears in `git status`.
- Ephemeral state and both backup classes remain ignored.
- Future migrations produce the correct policy automatically.

## D-14.4 — Keep self-hosted gates executable and representative

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Dogfood finding: migrated quality configuration

### Decision

Remove the unavailable legacy ESLint command from AutoForge's current 0.7 config. Retain typecheck, formatting, and complete test commands because they exist and represent the repository's actual validation boundary.

### Rationale

- A syntactically migratable command may still reference a tool not installed by the project.
- Keeping a known-unavailable gate creates false operational failure.
- Weakening the gate to typecheck alone would not prove self-hosting quality.

### Consequences

- `autoforge gate check` runs the real TypeScript, Prettier, foundation, and retained legacy checks.
- Migration continues reporting safe syntax separately from runtime availability.
- Future projects may need to review migrated quality commands during dry run.

## D-14.5 — Terminate timed-out quality process trees

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Dogfood finding: quality-command recovery

### Decision

On POSIX, spawn each quality command in an isolated process group and terminate the group when its timeout expires. Use direct child termination as the Windows and error fallback. Add a regression test whose descendant attempts a delayed filesystem write after the timeout.

### Rationale

- Killing only an `npm` parent left Vitest descendants running.
- Orphaned test processes consumed resources and made later checks fail nondeterministically.
- A gate must own and clean up the command tree it starts.

### Consequences

- Timed-out POSIX command descendants cannot outlive the gate.
- Windows retains the prior direct-child behavior pending a platform-specific job-object strategy.
- Timeout recovery is now behaviorally tested.

## D-14.6 — Bound foundation test concurrency

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Dogfood finding: test determinism

### Decision

Run Vitest with at most four workers and use a 15-second per-test timeout. Preserve file parallelism, test isolation, and the existing 120-second outer quality-command timeout.

### Rationale

- Default worker parallelism overloaded process-heavy bundled CLI tests in the agent environment.
- Failures disappeared when contention was reduced.
- Bundled CLI integration legitimately requires more time than pure unit tests.

### Consequences

- The 324-test foundation suite becomes deterministic under the self-gate.
- Total test time may be longer on high-core machines in exchange for reliability.
- Individual hung tests still fail well before the outer command timeout.

## D-14.7 — Keep machine-managed state outside Prettier

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Dogfood finding: formatter boundary

### Decision

Exclude current AutoForge state, retained migration backups, and established generated planning documents from Prettier. Restore `npm run format:check` as a self-hosted quality gate for authored source, tests, config, and documentation.

### Rationale

- State stores use canonical JSON serialization and rewrite files during normal lifecycle operations.
- Formatting generated state would create unstable revisions and conflict with atomic store ownership.
- Existing generated planning bundles are outside the rewrite's formatting scope.

### Consequences

- Prettier passes without mutating managed state or unrelated generated documents.
- Authored Phase 14 documents remain checked.
- AutoForge's full self-gate includes formatting again.

## D-14.8 — Record resolver noise without tuning from one dogfood sample

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 14 resolver feedback

### Decision

Record low-score decision over-selection, weak generic token matches, and one incorrect doctrine keyword match as explicit findings. Do not change tokenization, scoring thresholds, or doctrine routing during Phase 14 without representative golden fixtures.

### Rationale

- Every task selected its exact related decision correctly.
- Later tasks also selected prior decisions on very small scores from generic terms such as `by`, `files`, `test`, and `quality`.
- The formatting task selected security guidance from a weak `auth` token overlap.
- Tuning against five closely related tasks risks hiding valid context in other projects.

### Consequences

- Phase 14 passes because the correct sources were always present and budgets remained small.
- Minimum relevance thresholds, stop words, token boundaries, and doctrine keyword precision require focused golden tests before Phase 15 or release.
- The audit reports this as a non-blocking quality issue, not silent success.
