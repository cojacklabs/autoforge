# Paused Work Status + `pause`/`resume` Commands — Design

**Date:** 2026-08-30
**Status:** Approved
**Origin:** Product gap surfaced via cross-project memory
(`autoforge-missing-paused-status`), reproduced in the CoJack Labs AI
project (`~/Code/Business/ai`) where `task.verify-remote-ci-and-railway-staging`
needed to stop mid-flight (missing account access) without being marked
`completed` or left silently `active`.

## Problem

Work items (tasks/issues) support only
`planned | ready | active | blocked | completed | canceled`. The only
command that ends a session (`autoforge done`) always marks the active
item `completed`. There is no way to stop working on an in-progress item
without either lying (`completed`) or leaving it `active` — which blocks
starting any other work, since only one item may be active at a time.

`blocked` does not fit: it implies an external dependency prevents *any*
progress, whereas the pause case is "real progress happened, more is
planned, just not right now."

## Decisions

1. **Pausing ends the session** (mirrors `done`), rather than leaving the
   session open. This unblocks starting other work immediately, which was
   the actual pain point in the reported case.
2. **New top-level command `autoforge pause`**, paired with
   `autoforge resume <task|issue> <id>` — not a flag on `done`. Keeps
   `done`'s meaning ("this is completed") unambiguous.
3. **`resume` mirrors `start`'s invariants exactly**: fails if another item
   is already active, requires the target to exist and have status
   `paused`, moves it to `active`, opens a new session. Multiple items may
   sit `paused` simultaneously; only one may ever be `active`.
4. **Pause reason is mandatory**, stored directly on the work item (not
   routed through the decision store — pausing is a status note, not a
   governance decision). Matches the durable/queryable intent from the
   original workaround (`autoforge decide` entries) without requiring the
   decision machinery.

## Schema Changes

`src/work/schemas.ts`:

- Add `"paused"` to `workStatusSchema`'s enum:
  `["planned", "ready", "active", "blocked", "paused", "completed", "canceled"]`.
- Add to `workItemBaseSchema`:
  `pauseReason: z.string().trim().min(1).max(2_000).nullable().default(null)`.
  Cleared back to `null` on resume or completion.
- No change needed to the `activeWork` invariant in `workStateSchema`'s
  `superRefine` — it already only requires the referenced item to have
  status `"active"`; a `paused` item is simply not `activeWork`.

## Lifecycle Service Changes

`src/work/lifecycle.ts` (`WorkLifecycleService`):

- **`pause(reason: string): Promise<PauseWorkResult>`** — mirrors
  `complete()`: requires `activeWork` + current session to agree (same
  checks as `complete`), sets the item's status to `"paused"` and
  `pauseReason` to the given reason, clears `activeWork`, ends the session
  (`status: "ended"`, `endedAt` set), same write/compensation-rollback
  pattern as `complete()`.
- **`resume(input: { kind, id }): Promise<StartWorkResult>`** — mirrors
  `start()`: requires no current `activeWork`/session (same conflict
  checks as `start`), requires the target item to exist and have status
  exactly `"paused"` (new `assertResumableStatus` guard — reject any other
  status with a clear error), sets status to `"active"`, clears
  `pauseReason` back to `null`, opens a new session, same
  write/compensation-rollback pattern as `start()`.
- **`assertStartableStatus`** (used by `start()`) gains `"paused"` to its
  rejection list, alongside `"completed"`/`"canceled"` — `start` must not
  silently resume paused work; only `resume` may.

## Commands

- **`src/commands/pause.ts`** — `autoforge pause "<reason>"`. Reason is
  required (usage error if missing/blank). Structurally mirrors
  `src/commands/done.ts` (reads work/session/doctrine stores, ends the
  doctrine session, calls the lifecycle service, reports the result) but
  **without** the decision-linking requirement `done` enforces — pausing
  is not a governance decision.
- **`src/commands/resume.ts`** — `autoforge resume <task|issue> <id>`.
  Structurally mirrors `src/commands/start.ts` exactly, calling
  `WorkLifecycleService.resume()` instead of `.start()`.
- Both registered in the CLI router (`src/cli/index.ts`) and in the
  hand-maintained `--help` text.

## Doctrine Session Integration

`pause`/`resume` call `DoctrineSessionService.end`/`.select` the same way
`done`/`start` already do, so doctrine routing stays consistent across all
four session-boundary commands.

## Testing

- `test/pause-command.test.ts` — mirrors `test/done-command.test.ts`
  structure: pause sets status to `paused` + records the reason, rejects
  missing/blank reason with usage error, rejects pausing when nothing is
  active.
- `test/resume-command.test.ts` — mirrors `test/start-command.test.ts`
  structure: resume moves a paused item back to active and opens a new
  session, rejects resuming a non-paused item, rejects resume when
  something else is already active.
- Lifecycle-service unit tests for `pause`/`resume` added alongside
  existing `start`/`complete` coverage (find the existing work-lifecycle
  test file and extend it).
- Schema test confirming a `"paused"` item is rejected by
  `assertStartableStatus` (via `start`) but accepted by `resume`.

## Explicitly Out of Scope

- No changes to `blocked` semantics.
- No `autoforge status`/`recap` filtering or display changes for paused
  items (may be a follow-up).
- No TUI (`src/commands/tui.ts`) changes.
- No changes to the decision store or `autoforge decide`.

## Release

Ships as part of `v0.25.3` (tag will be moved to the commit that includes
this work; the tag has a GitHub Release but was never published to npm,
so no registry state exists yet to reconcile).
