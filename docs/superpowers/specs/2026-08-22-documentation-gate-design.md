# Documentation Gate & Changelog Compilation — Design

**Date:** 2026-08-22
**Status:** Approved, pending implementation plan

## Problem

`CHANGELOG.md` tracked releases through v0.6.0 and then silently stopped —
every release from v0.7.0 through v0.21.0 shipped without a changelog entry,
discovered only during a manual audit. The underlying cause: documentation
of changes (changelog entries, bug-fix rationale, decision records) was
advisory guidance an agent was *expected* to remember, with no mechanism
that noticed or blocked when it didn't happen. This is especially acute
across agent handoffs (e.g. Codex sessions) where no human was present to
catch the omission in real time.

The goal is to make "was this change documented" a **structurally enforced**
condition of closing work, not a behavior that depends on any individual
agent remembering — while still letting a future agent (or human) cheaply
answer "has something like this happened before?" before re-diagnosing a
bug from scratch.

## Non-Goals

- A dedicated bug-fixture store (error signature / root cause / affected
  files as first-class structured fields) is explicitly **out of scope**
  for this effort. See "Deferred: Fixtures Store" below.
- No change to `feature`/`phase` completion — this gate applies only to
  `issue` and `task` work items.
- No automatic git commit of the compiled changelog — a human/agent still
  reviews and commits it as part of the existing release-checkpoint flow.

## Design

### 1. Decision-kind tagging

`autoforge decide` gains an optional `--kind` flag:

```
autoforge decide --kind bugfix|feature-note|architecture|skip-reason ...
```

Default: `architecture` (preserves current behavior for every existing
caller and all 22 decisions already recorded in this project). Stored as a
new required `kind` field on the decision schema, additive and backward
compatible — existing decision JSON is migrated to `kind: "architecture"`
on read if the field is absent.

`bugfix` and `feature-note` are the two kinds that feed changelog
compilation. `skip-reason` is written automatically by the `--no-decision`
escape hatch (see below) and is excluded from changelog compilation but
still searchable via `autoforge why`.

### 2. Completion gate on `autoforge done`

For an active work item of kind `issue` or `task` only:

1. Before completing, query decisions where `relatedWork` includes the
   active work item's ID.
2. If at least one such decision exists, complete normally (no behavior
   change from today).
3. If none exists, block: return `EXIT_CODE.invalidState` and print
   `No decision is linked to <work-id>. Run 'autoforge decide ... --work <work-id>' before closing this <issue|task>, or pass --no-decision "<reason>" to bypass.`
4. `autoforge done --no-decision "<reason>"` bypasses the block. The reason
   is written as a `kind: skip-reason` decision automatically linked to the
   work item via `relatedWork`, so the bypass is itself an auditable
   record — never a silent skip.

`feature` and `phase` completion are unaffected (no `done` gate exists for
those kinds today; this change does not add one).

### 3. Changelog compilation

New command:

```
autoforge changelog compile [--since <git-tag>]
```

Behavior:

- Determines the range: decisions created after the resolved starting
  point (`--since <tag>`'s commit timestamp, or the latest `v*` git tag if
  omitted, or project start if no tag exists).
- Selects decisions with `kind: bugfix` or `kind: feature-note` in that
  range.
- Groups by kind, renders a Markdown section (`### Fixed` / `### Added`
  style, consistent with the existing CHANGELOG.md format), and inserts or
  updates a section at the top of `CHANGELOG.md`, directly below the
  standing "entries before 0.7.0 tracked elsewhere" note.
- Idempotent: re-running with the same `--since` value and no new
  qualifying decisions produces no diff. Running again after new decisions
  are recorded appends only the new entries under the current version
  section rather than duplicating prior ones.
- Never touches or reorders content below the compiled section (preserves
  the existing v0.6.0-and-earlier manual history untouched).
- Does not write a version number or commit — the agent fills in the
  version heading as part of the existing release-checkpoint step, same as
  today.

### 4. Deferred: Fixtures Store

A dedicated structured store for bug fixtures (error signature, root
cause, fix commit, affected files as first-class typed fields, separate
from architectural decisions) was considered and explicitly deferred. The
`bugfix`-kind tag on `decide` records, combined with the existing
`autoforge why --query <text>` search over `scope`/`keywords`/`relatedWork`,
is judged sufficient for now.

**Revisit trigger:** if an agent searches `autoforge why` for a recurring
bug pattern and gets poor or no results despite that class of bug having
been fixed before (i.e., tag-based free-text search proves too shallow to
reliably surface the prior fix), build the dedicated fixtures store as a
follow-up.

## Testing

- **Gate — blocks:** `done` on an issue/task with no linked decision
  returns `EXIT_CODE.invalidState` with the documented message; work
  remains active (not silently completed).
- **Gate — passes:** `done` on an issue/task with a `relatedWork`-linked
  decision (any `kind`) completes normally.
- **Gate — bypass:** `done --no-decision "<reason>"` completes the work
  item and a `skip-reason` decision is recorded and linked.
- **Gate — unaffected kinds:** `done` on a feature/phase (no active-work
  concept change) behaves identically to today; regression test confirms
  no new gate applies.
- **Changelog — golden fixture:** a fixed set of `bugfix`/`feature-note`
  decisions compiles to an expected Markdown section (exact-match golden
  test, same pattern as existing golden-fixture tests in this repo).
- **Changelog — idempotency:** compiling twice with no new decisions
  produces no diff.
- **Changelog — preservation:** pre-existing manual CHANGELOG.md content
  outside the compiled section is byte-identical before and after.
- **Decision schema — backward compatibility:** existing decision JSON
  (22 records, no `kind` field) loads successfully and is treated as
  `kind: "architecture"`.

## Rollout

This is implemented as AutoForge work on itself (self-hosted), tracked
through the normal `autoforge add` → `autoforge start` → `autoforge done`
lifecycle, same as the v0.21.1 patch. A decision documenting the change
should be recorded and linked to the implementing work item before running
`autoforge done` — both to follow the practice this feature establishes and
to give `changelog compile` a first real entry to render.
