# v0.25 — Polished CLI Output: Design

## Status

Approved for implementation planning.

## Mission

Give AutoForge's human-facing terminal output the same visual polish
users already expect from Claude Code, Codex, and Antigravity — aligned
tables, color-coded status, and consistent formatting — starting with
`autoforge projects`, while leaving every flat subcommand's behavior and
`--json` contract untouched for agentic callers (Claude Code, Codex,
and other automation shells shell out to discrete commands; they do not
drive an interactive TUI, and must never be forced to parse decorated
text).

This redefines the north-star's v0.25 "Interactive CLI Experience"
milestone down in scope: this release is the polished-static-output
phase only. A persistent interactive shell (if ever pursued) is
explicitly deferred to a future milestone, not part of this spec.

## Background

`autoforge projects list`'s plain-text branch currently emits raw
tab-separated `lifecycle\tname\tpath` lines with no header row, no
alignment, and no color — the CLI's least polished output surface
relative to how much information (`projects`, `projects show`,
`recap`) a working session needs to scan quickly.

A visual foundation already exists but is scoped to one command:
`src/tui/renderer.ts` (used only by `autoforge tui`) already has ANSI
tone coloring (`positive`/`warning`/`negative`/`muted`/`heading`), a
`color`/no-color toggle, and column-alignment/truncation logic. No
other command can reach it, and no color/table dependency (chalk,
cli-table, etc.) is installed anywhere in the project — the existing
renderer uses raw ANSI escape codes directly, which this design
continues rather than introducing a new dependency.

## Non-Goals

- No interactive/persistent shell. `autoforge tui` is untouched by this
  spec except for an internal refactor (below).
- No change to any command's exit codes, error paths, or `--json`
  output *except* the one explicit addition described below.
- No new runtime dependency. Continue using raw ANSI escape codes, as
  `tui/renderer.ts` already does.
- No change to how `autoforge init`, `autoforge update`, or any other
  flat subcommand is invoked or behaves — this is presentation-layer
  only, preserving the automation contract agentic callers rely on.

## Design

### 1. Shared formatting module: `src/cli/format.ts`

Extract the reusable pieces of `src/tui/renderer.ts` into a new,
general-purpose module any command can import:

- `paint(value, tone, color): string` — same ANSI tone palette
  (`positive`/`warning`/`negative`/`muted`/`heading`/`reset`) moved
  verbatim from `tui/renderer.ts`.
- `truncate(value, width): string` — moved verbatim.
- `shouldUseColor(options): boolean` — new. Centralizes the
  auto-detect convention (see below) so every command applies it
  identically instead of each command re-implementing TTY checks.
- `renderTable(columns, rows, options): string` — new. Given a list of
  `{ header, tone? }` column definitions and row data (arrays of
  cell strings, with optional per-cell tone), computes per-column
  width from content (capped by terminal width), pads/aligns headers
  and cells, and joins into a plain-ASCII table (padded columns and a
  header separator rule, not Unicode box-drawing — matching the
  `git status`-style plainness the rest of the CLI already uses, and
  avoiding rendering issues in constrained or non-UTF-8 terminals).
- `emptyMessage(text): string` — trivial helper so every table-backed
  command reports "No X found." consistently instead of printing an
  empty or header-only table.

`src/tui/renderer.ts` is refactored to import `paint`/`truncate` from
this new module instead of duplicating them. This is an internal
cleanup with no behavior change to `autoforge tui` — its own tests must
continue passing unmodified in assertions, only the import path moves.

### 2. Color auto-detection: `shouldUseColor`

```
shouldUseColor({ stream, flags, env }):
  if flags.noColor -> false
  if flags.color -> true
  if env.NO_COLOR is set -> false
  if !stream.isTTY -> false
  return true
```

Every command that renders color-capable output (starting with
`projects`) parses `--no-color` and `--color` flags (mirroring
`autoforge tui`'s existing flag names for consistency) and passes the
result through `shouldUseColor`. `--json` output is never colored,
regardless of flags — colorizing machine-readable output would be a
contract break for any agent or script parsing it.

### 3. Two distinct `projects` views

Today, bare `autoforge projects` (no subcommand) and
`autoforge projects list` are the same code path. This spec splits them:

**`autoforge projects` (bare, no subcommand)** — fast glance view.
Reads only the global workspace registry (`GlobalWorkspaceStore.read()`,
already the only read the current code path performs). Renders a
3-column table:

```
NAME              STATUS    PATH
autoforge         active    /Users/.../autoforge
datameetdata      active    /Users/.../datameetdata
```

`STATUS` is colored by tone: `active` → positive (green), `archived` →
muted (gray). No per-project state is read — this stays O(1) per
project regardless of how large any individual project's `.autoforge/`
state is.

**`autoforge projects list`** — richer view. For each registered
project, additionally calls the existing `inspectProjectSummary()`
(already used by `projects show`; already reads
`.autoforge/state/work.json` for `activeWork`) to populate a 4th
column:

```
NAME              STATUS    PATH                          ACTIVE WORK
autoforge         active    /Users/.../autoforge           task.add-login-form
datameetdata      active    /Users/.../datameetdata         —
```

`ACTIVE WORK` shows `<kind>.<id>` when a project has active work, or
`—` when idle. This is deliberately the slower path (N additional file
reads for N projects) — an explicit tradeoff for richer data, not a
regression, since `projects` (bare) remains available for the fast
path.

Both views:

- Print `emptyMessage("No projects registered.")` when the registry
  has zero entries, never an empty or header-only table.
- Truncate an overlong `PATH` cell with `truncate()` to fit the
  detected terminal width (`process.stdout.columns`, falling back to
  100 when undefined — matching `tui/renderer.ts`'s existing fallback),
  rather than wrapping or letting the table overflow.
- Are driven entirely by `shouldUseColor`; piping either command's
  output (e.g. `autoforge projects | grep foo`) auto-disables color
  since stdout is no longer a TTY, with no special-casing needed in
  the command itself.

### 4. `--json` output changes

- **`autoforge projects --json`** (bare): **unchanged**. Still
  `{ path, metadata }[]`. No new fields — the bare view intentionally
  reads nothing beyond the registry, so there is nothing new to add.
- **`autoforge projects list --json`**: **enriched**. Adds an
  `activeWork: { kind, id } | null` field per entry, sourced from the
  same `inspectProjectSummary()` call the plain-text table now uses.
  This is the one intentional shape change in this spec. It is
  additive only (existing `path`/`metadata` fields are untouched), so
  any consumer destructuring known fields is unaffected; a consumer
  doing a strict/exhaustive key comparison against the old shape is
  the only case this could affect, and is called out explicitly in the
  CHANGELOG entry for this release.

### 5. What does not change

- `autoforge init`, `autoforge update`, `autoforge add`, `autoforge
  start`, `autoforge done`, and every other flat subcommand: zero
  behavior change. This spec touches only `src/commands/projects.ts`'s
  plain-text rendering branch, `src/tui/renderer.ts`'s internals, and
  adds the new `src/cli/format.ts` module.
- `autoforge tui`'s own rendered output: unchanged, since the extracted
  helpers preserve identical behavior.
- Exit codes, error handling, and usage-error messages for `projects`:
  unchanged.

## Testing

- `test/format.test.ts` (new): unit tests for `paint`, `truncate`,
  `shouldUseColor` (matrix of flag/env/TTY combinations), `renderTable`
  (column alignment, truncation, empty rows), and `emptyMessage`.
- `test/projects-command.test.ts` (existing, extended): plain-text
  table output for both bare `projects` and `projects list`, including
  the empty-registry message, color-on vs. color-off rendering, and
  long-path truncation; `--json` assertions for both bare (unchanged
  shape) and `list` (new `activeWork` field present and correctly
  `null` vs. populated).
- `test/tui.test.ts` (existing): re-run unmodified after the extraction
  to confirm the refactor is behavior-preserving.

## Rollout

Ships as v0.25.0. CHANGELOG explicitly calls out the `projects list
--json` additive field as the one contract change agentic integrators
should be aware of (informational, not breaking).
