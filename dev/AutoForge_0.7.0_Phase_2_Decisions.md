# AutoForge 0.7.0 Phase 2 Decisions

## D-2.1 — Normalize the control-kernel work model

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.1

### Decision

Persist features, phases, tasks, and issues as normalized collections connected by IDs. Store the single active task or issue as an explicit discriminated reference rather than nesting mutable child records.

Scope patterns are repository-relative. Sessions use an explicit active/ended lifecycle and retain ended sessions separately from the current session.

### Rationale

- Normalized records avoid rewriting an entire nested feature tree for a single task update.
- Explicit references make hierarchy integrity and active-work consistency independently testable.
- One active-work reference establishes a deterministic foundation for `start`, `recap`, `done`, context selection, and future guardrails.
- Repository-relative scopes complement the canonical path-containment boundary established in Phase 1.
- Explicit session lifecycle fields make interrupted-session recovery possible without guessing from missing values.

### Consequences

- Work-state parsing must reject orphaned hierarchy references, duplicate IDs, and contradictory active state.
- Application services must update an item's status and the active-work reference atomically.
- Future persistence migrations must preserve IDs and reference integrity.
- Glob interpretation and edit enforcement remain out of scope for Task 2.1.

## D-2.2 — Persist work and sessions independently

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.2

### Decision

Persist control-kernel work and session state in separate versioned envelopes at `.autoforge/state/work.json` and `.autoforge/state/session.json`. Initialize both files together with project metadata through the existing staged, non-destructive initialization flow.

### Rationale

- Work is durable project memory, while sessions are ephemeral execution history with different future retention and source-control policies.
- Separate revisions prevent frequent session updates from creating false write conflicts in the durable work model.
- Reusing the audited atomic store preserves locking, backup, validation, and recovery behavior without introducing a second persistence mechanism.
- Publishing all initial state from staging prevents a successful initialization from omitting required kernel files.

### Consequences

- Commands that coordinate work and sessions must handle two state revisions explicitly.
- Cross-file lifecycle operations will need compensating recovery rules because filesystem persistence cannot provide a multi-file transaction.
- Schema changes require registered migrations for each affected envelope.

## D-2.3 — Create work through a revision-aware service

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.3

### Decision

Create features, phases, tasks, and issues through a persistence-backed `WorkService`. Each operation reads the current envelope, validates the new entity and its parent reference, and commits the complete next state using the observed revision.

Entity IDs use a readable `<kind>.<slug>` format with numeric collision suffixes. Phase sequence numbers are assigned independently within each feature. Newly created work begins in `planned` status.

### Rationale

- A single mutation boundary prevents CLI commands and later adapters from duplicating hierarchy and revision rules.
- Optimistic revision checks surface competing writes instead of silently discarding them.
- Generated readable IDs are convenient for CLI use, logs, relationships, and future context packets.
- Parent validation before persistence keeps the normalized hierarchy valid at every committed revision.
- Starting work as planned separates creation from the explicit `start` lifecycle.

### Consequences

- Renaming work does not change its stable ID.
- Concurrent callers may receive a state conflict and must retry from fresh state.
- CLI argument parsing and user-facing creation output remain outside the service.

## D-2.4 — Coordinate start with compensating persistence

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.4

### Decision

Starting work is a service operation spanning the durable work envelope and ephemeral session envelope. The service activates the selected task or issue first, then opens a session containing the same active-work reference and timestamp.

Only one task or issue may be active. Completed or canceled work cannot be restarted. If the session commit fails after work activation, the service restores the original work data using the committed activation revision before returning the session error.

### Rationale

- A shared active-work reference makes work state authoritative while allowing sessions to capture execution history.
- Explicit start behavior separates creation from execution and supplies the foundation for `recap`, `done`, and context routing.
- Revision-aware compensation avoids leaving ordinary session write failures as contradictory cross-file state.
- Terminal-state rejection preserves lifecycle meaning and prevents accidental reopening without a future explicit workflow.

### Consequences

- A compensated start consumes two work revisions: activation and restoration.
- A simultaneous failure of the session write and compensating work write is reported as invalid state requiring recovery.
- Multi-file persistence is coordinated but is not a true filesystem transaction.
- Completing work and closing the matching session remain a separate lifecycle operation.

## D-2.5 — Complete only consistent active work

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.5

### Decision

Completion requires the durable active-work reference and current session active-work reference to identify the same task or issue. The lifecycle service marks that entity completed, clears durable active work, then moves the current session into ended session history.

If session archival fails after the work commit, the service restores the original active work using the completion revision. Missing active work is a normal lifecycle conflict; contradictory work and session references are invalid state.

### Rationale

- Exact cross-envelope agreement prevents completing the wrong item when state is damaged or externally modified.
- Retaining the ended session and its active-work reference creates deterministic execution history for recap and future recovery.
- Work-first persistence keeps durable work authoritative while compensation covers ordinary second-write failures.
- An explicit completion transition preserves terminal-state semantics established by start.

### Consequences

- Completion does not automatically change parent phase or feature status.
- A compensated completion consumes two additional work revisions.
- Contradictory envelopes require diagnosis or recovery rather than guessed repair.
- Session-history retention and pruning policy remain future work.

## D-2.6 — Recap is a deterministic read model

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.6

### Decision

Build recap as a read-only projection over work and session envelopes. The projection has explicit idle and active variants, fixed status counters, inventory totals, current session elapsed time, active scope, task hierarchy when applicable, and the most recently ended session.

Recap requires exact active-work agreement, including the activation timestamp, between durable work and the current session. It rejects contradictory state rather than guessing or mutating recovery data.

### Rationale

- A typed read model separates state interpretation from future CLI formatting and agent adapters.
- Fixed fields and counters produce stable output for humans, JSON consumers, tests, and later context packets.
- Task hierarchy gives users useful orientation without introducing Phase 7 context intelligence.
- Read-only failure on contradiction keeps recap safe and directs repair to explicit diagnostic or recovery workflows.

### Consequences

- Recap does not repair or migrate state.
- Elapsed time is derived from an injected clock and clamped at zero for clock skew.
- Only tasks and issues contribute to actionable status counts; features and phases appear in inventory and active hierarchy.
- CLI rendering remains a separate command-layer responsibility.

## D-2.7 — Keep add syntax explicit and non-interactive

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.7

### Decision

Expose creation as `autoforge add <kind>` with explicit long-form options. Names and descriptions are required for every kind; phases require `--feature`, tasks require `--phase`, and tasks/issues require one or more `--include` scope patterns with optional repeated `--exclude` patterns.

The command layer owns argument parsing, usage diagnostics, project discovery, and human-readable output. It delegates hierarchy, ID, validation, and persistence behavior to `WorkService`.

### Rationale

- Non-interactive syntax works consistently for humans, agents, shell scripts, and CI.
- Explicit parent IDs avoid ambiguous inference before context intelligence exists.
- Repeated scope flags preserve argument boundaries without introducing a mini-language.
- Keeping domain behavior in the service prevents CLI-specific creation rules from becoming a second implementation.

### Consequences

- Interactive prompts and shorthand syntax are not part of the initial kernel.
- Values containing spaces must be quoted by the invoking shell.
- Domain conflicts propagate with their structured exit codes; malformed command input returns usage status.
- The canonical help text is the command syntax authority until dedicated command-reference generation is introduced.

## D-2.8 — Start work by explicit kind and ID

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.8

### Decision

Expose activation as `autoforge start <task|issue> <id>`. The command validates only the argument shape, discovers the initialized project, constructs the work and session stores, and delegates activation to `WorkLifecycleService`.

### Rationale

- Explicit kind and ID avoid ambiguous name resolution and keep automation deterministic.
- A thin command preserves the tested lifecycle service as the single owner of conflicts, terminal-state rules, session creation, and compensation.
- The output includes both the activated work and generated session ID for immediate traceability.

### Consequences

- Starting by human-readable name or inferred current phase is not supported yet.
- Unknown IDs and lifecycle conflicts retain the service's structured error and exit status.
- Session IDs are generated by the lifecycle service rather than the command layer.

## D-2.9 — Render recap as stable plain text

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.9

### Decision

Expose recap as argument-free `autoforge recap`. Render a stable plain-text summary containing status, inventory, fixed actionable counters, active work, task hierarchy when applicable, scope, current session, elapsed time, and the most recent ended session when present.

The command layer owns formatting. `WorkRecapService` remains the sole owner of cross-envelope interpretation and consistency validation.

### Rationale

- Stable text is immediately useful to developers and coding agents without requiring a TUI.
- Fixed labels and ordering make output testable and reasonably script-readable.
- Separating projection from formatting enables future JSON or adapter-specific renderers without changing state semantics.
- Humanized elapsed time improves scanning while the read model retains exact seconds.

### Consequences

- `--json` and other alternate formats are intentionally unsupported in this task.
- Recap emits one multiline output message to preserve ordering.
- Contradictory state propagates as an invalid-state error instead of partial output.

## D-2.10 — Done completes the sole active item

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 2, Task 2.10

### Decision

Expose completion as argument-free `autoforge done`. The command discovers the project, constructs the work and session stores, delegates completion to `WorkLifecycleService`, and reports the completed work ID and archived session ID.

### Rationale

- The kernel permits only one active task or issue, so requiring an ID at completion would be redundant and could introduce mismatch errors at the presentation boundary.
- A thin command keeps consistency validation, terminal transitions, archival, and compensation inside the lifecycle service.
- Reporting both IDs makes the completed operation traceable in durable work and session history.

### Consequences

- Running `done` while idle returns the lifecycle conflict status.
- Partial or contradictory state returns the service's invalid-state status.
- Completion notes, outcomes, and parent phase/feature rollups remain future capabilities.
