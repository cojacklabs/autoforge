# AutoForge 0.7.0 Phase 9 Decisions

## D-9.1 — Evaluate one strict five-check guardrail contract

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 9 guardrail policy

### Decision

Evaluate every edit request against exactly five named checks: active work, session consistency, doctrine requirements, context currency, and scope boundary. Return a validated report containing every check rather than stopping at the first failure.

Fail closed when required project state is absent, partial, inconsistent, stale, disabled, or outside declared scope. Keep the policy evaluator pure and place filesystem inspection in a separate service.

### Rationale

- A fixed report contract makes enforcement behavior inspectable and testable.
- Complete diagnostics tell a person how to recover without weakening the policy.
- A pure evaluator separates policy truth from adapter and filesystem behavior.
- Fail-closed handling prevents incomplete state from being mistaken for permission.

### Consequences

- An active work item alone is insufficient to authorize an edit.
- All adapters consume the same decision even when their enforcement strength differs.
- Adding another mandatory check requires an explicit schema and policy revision.

## D-9.2 — Enforce canonical repository-relative scope

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 9 edit boundaries

### Decision

Resolve requested edit paths through canonical, symlink-aware repository containment before applying work-item include and exclude patterns. Normalize pattern input to repository-relative POSIX paths. Exclusions take precedence over inclusions.

When no target path is supplied, report that path-level scope was not evaluated rather than claiming that every path is allowed.

### Rationale

- Canonical containment prevents relative paths and symlinks from escaping the project.
- One pattern implementation avoids adapter-specific scope interpretations.
- Exclusion precedence preserves explicit protected areas.
- Honest pathless diagnostics avoid false authorization claims.

### Consequences

- Paths outside the repository always fail.
- A path must match an include and must not match an exclude.
- Inventory checks can pass without authorizing a particular edit path.

## D-9.3 — Define context currency by deterministic recompilation

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 9 context refresh

### Decision

Compile the expected Phase 8 packet from current project state and compare its exact content with both `.autoforge/context/current.md` and the active work packet. Classify context as current only when both artifacts match.

Expose refresh explicitly through `autoforge check --refresh`. Do not silently regenerate context during an ordinary guardrail check.

### Rationale

- Deterministic packet compilation is stronger than timestamp heuristics.
- Checking both artifacts detects incomplete cross-file publication.
- Explicit refresh keeps generated-context mutations visible to the operator.
- Reusing the existing compiler prevents guardrails from becoming a second resolver.

### Consequences

- Any relevant work, doctrine, decision, or specification change makes context stale.
- Missing or mismatched packet artifacts deny edits until refreshed.
- Refresh can be combined with a subsequent path check in one command invocation.

## D-9.4 — Repair sessions only when recovery is unambiguous

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 9 session recovery

### Decision

Expose recovery through `autoforge check --repair`. Rebuild a missing work session, doctrine session, or both only when active work and the remaining state identify one unambiguous session. Remove an orphan doctrine session only when no work or work session is active.

Refuse conflicting sessions, mismatched work identities, or other ambiguous state. Use revision-aware writes and compensate doctrine-session creation if the paired work-session write fails.

### Rationale

- Recovery should restore derived state, not guess operator intent.
- Conflicts may represent real concurrent or interrupted work that deserves inspection.
- Revision checks prevent silent overwrites.
- Compensation limits partial repair across separate state stores.

### Consequences

- Some damaged installations require manual resolution before checks can pass.
- Healthy state and an empty inactive project are no-op recovery cases.
- Recovery does not activate work, broaden scope, or refresh context.

## D-9.5 — Share policy while matching each agent's safe enforcement capability

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 9 agent enforcement

### Decision

Use advisory instructions for Codex, Cursor, Gemini/Antigravity, and Grok Build. Install a managed project-level Claude Code `PreToolUse` hook for native `Edit`, `Write`, and `NotebookEdit` tools and deny failed checks with exit code 2.

Describe Claude enforcement as hard only for those inspectable native edit tools. Do not claim that the hook blocks arbitrary filesystem mutations performed through Bash. Claude's official documentation defines project hooks in `.claude/settings.json`, documents `PreToolUse` input and exit-code-2 denial, and recommends separate Bash or Stop coverage when all changes must be inspected: [hooks guide](https://code.claude.com/docs/en/hooks-guide) and [hooks reference](https://code.claude.com/docs/en/hooks).

### Rationale

- Every adapter receives the same AutoForge policy result.
- Native Claude tool input provides a concrete target path before mutation.
- Advisory checks provide useful parity without pretending unsupported hard controls exist.
- A precise boundary is safer than broad enforcement claims that Bash can bypass.

### Consequences

- Claude native edit operations can be blocked before execution.
- Shell-based changes and non-Claude agents still depend on agent cooperation.
- Broader hard enforcement requires a future Git, operating-system, sandbox, or Bash-command design.

## D-9.6 — Merge managed Claude settings without taking ownership of user configuration

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 9 Claude setup

### Decision

Install enforcement only through explicit `autoforge check --install --agent claude`. Parse and validate `.claude/settings.json`, preserve unrelated root properties and hook groups, remove prior AutoForge-managed handlers, and append the current managed handler idempotently.

Treat malformed settings as an error and do not overwrite them. Continue managing only the marked AutoForge instruction block in `CLAUDE.md`.

### Rationale

- Explicit installation avoids surprising configuration mutations.
- Structural JSON merging preserves user permissions and custom hooks.
- Replacing only the managed handler supports safe upgrades and idempotency.
- Refusing malformed input protects recoverable user data.

### Consequences

- Claude detection is fully healthy only when both instructions and the hook are current.
- Setup can report changes to both `CLAUDE.md` and `.claude/settings.json`.
- AutoForge does not mutate user-level or global Claude settings.

## D-9.7 — Centralize operator and hook behavior in `autoforge check`

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 9 CLI contract

### Decision

Use `autoforge check` as the single guardrail entry point. Support target-path checks, adapter-specific reporting, explicit context refresh, safe session repair, explicit adapter installation, and an internal Claude hook mode.

Normal policy failures use the established domain-error exit code and print the complete report. Claude hook success is silent; failure or malformed input writes a concise denial to standard error and exits 2.

### Rationale

- One command prevents policy drift between humans, instructions, and hooks.
- Stable exit behavior supports both interactive use and automation.
- Silent hook success avoids injecting unnecessary content into agent context.
- Malformed hook input must deny rather than bypass enforcement.

### Consequences

- Adapter instruction files can recommend one stable command surface.
- Hook mode remains an internal transport rather than a separate public policy engine.
- Installation, repair, and refresh remain explicit mutations.
