# Documentation Gate & Changelog Compilation

## What changed

- `autoforge decide` accepts an optional `--kind architecture|bugfix|feature-note` flag (default `architecture`).
- `autoforge done` now requires at least one decision linked (`relatedWork`) to the active `issue` or `task` before it will complete. `feature`/`phase` completion is unaffected.
- Bypass with `autoforge done --no-decision "<reason>"` — the reason is recorded as a `kind: skip-reason` decision, auditable via `autoforge why`.
- `autoforge changelog compile [--since <git-tag>]` renders `bugfix`/`feature-note` decisions since the last version tag into a marked section of `CHANGELOG.md`.

## Why

`CHANGELOG.md` silently stopped tracking releases after v0.6.0 (v0.7.0 through v0.21.0 shipped undocumented) because documentation was advisory guidance rather than a checked precondition. This closes that gap structurally: an agent cannot close a bug-fix or implementation task without either recording rationale or explicitly, auditable-y, opting out.

## Deferred

A dedicated bug-fixtures store (structured error signature / root cause / affected files, separate from `decide`) was considered and deferred — see `docs/superpowers/specs/2026-08-22-documentation-gate-design.md` for the revisit trigger.

## For agents picking up this project

- Before running `autoforge done` on an issue or task, run `autoforge decide` with `--work <the-work-id>` and an appropriate `--kind`.
- Search prior fixes before starting new bug work: `autoforge why --query "<error or symptom>"`.
- Run `autoforge changelog compile` before a version release checkpoint commit.
