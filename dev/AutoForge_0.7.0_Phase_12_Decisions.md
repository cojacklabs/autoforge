# AutoForge 0.7.0 Phase 12 Decisions

## D-12.1 — Keep the TUI optional and kernel-backed

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 12 terminal interface architecture

### Decision

Implement the TUI as an optional interface over existing application and domain services. Keep CLI commands, state stores, context resolution, guardrails, specifications, doctrines, and agent adapters independently usable.

### Rationale

- The development plan requires the CLI and domain architecture to work without the TUI.
- Reusing services prevents a second state model and inconsistent behavior.
- A thin projection boundary is easier to test than domain logic embedded in terminal components.

### Consequences

- `src/tui/service.ts` contains view projections, not domain state transitions.
- The existing CLI remains fully non-interactive.
- Future terminal frameworks may replace rendering without changing the kernel.

## D-12.2 — Use typed view models and a deterministic renderer

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 12 presentation contracts

### Decision

Define strict Zod contracts for view IDs, sections, rows, tones, and complete view models. Render those models with a small terminal-independent renderer supporting width limits and optional ANSI colors.

### Rationale

- Typed models make every view testable without a live terminal.
- Deterministic text supports CI snapshots and accessibility through plain output.
- Avoiding a framework dependency keeps the first TUI portable and auditable.

### Consequences

- Phase 12 adds no terminal UI runtime dependency.
- Rendering has no filesystem, state, or domain access.
- Rich mouse layouts and component widgets are deferred.

## D-12.3 — Provide interactive and snapshot modes

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 12 CLI behavior

### Decision

Expose `autoforge tui` for interactive terminals and `autoforge tui --snapshot [--view <view>]` for non-interactive output. Reject interactive mode when stdin or stdout is not a TTY and direct users to snapshot mode.

### Rationale

- Automation, CI, redirected output, and coding agents need deterministic non-interactive access.
- A TTY check avoids stalled processes waiting for input that cannot arrive.
- Both modes exercise the same view service and renderer.

### Consequences

- Snapshot mode is read-only and emits no ANSI color.
- Interactive color can be disabled with `--no-color`.
- Every planned view can be inspected without launching an interactive session.

## D-12.4 — Make mutations explicit and narrowly scoped

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 12 action safety

### Decision

Keep navigation and refresh read-only. Permit only two explicit mutation commands: `context-refresh`, which uses the established context compiler and packet store, and `session-repair`, which uses the conservative recovery service.

### Rationale

- Opening or navigating the TUI must never change project state.
- Existing application services already enforce active-work, validation, containment, and conflict rules.
- Named action commands make side effects visible and testable.

### Consequences

- `refresh` reloads the current view but does not publish context.
- Failed actions display an error notice without terminating the session.
- Work creation, start, completion, and decision writes remain dedicated CLI workflows.

## D-12.5 — Implement all planned views as projections

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 12 information architecture

### Decision

Provide Dashboard, Active Work, Features, Issues, Tasks, Decisions, Context, Specifications, Doctrines, Agents, and Health views. Use current installation envelopes for stable state projections and established services where computation or external inspection is required.

### Rationale

- The view set directly covers the Phase 12 plan.
- Installation inspection supplies one coherent state snapshot.
- Doctor, recap, context, guardrail, specification, and agent services preserve canonical semantics.

### Consequences

- Uninitialized projects receive an unavailable view instead of a crash, while Health remains diagnostic.
- Context shows selection budgets and published-packet freshness only while work is active.
- Collection views deliberately favor concise operational summaries over editing controls.
