# v0.25 — Interactive TUI Slash Commands: Design

## Status

Superseded for AutoForge Core; preserved as AutoForge Agent prototype material.

This document is historical and must not be implemented or shipped as the Core
v0.25 milestone. The approved Core milestone is the platform architecture
migration defined in
`docs/planning/0.25/PLATFORM_MIGRATION_PLAN.md`. Existing commits and
uncommitted work in the preserved `v0-25-tui-slash-commands` worktree remain
useful input when the separate AutoForge Agent terminal experience begins.

## Mission

Give AutoForge's interactive TUI (`autoforge tui`) a slash-command
input model — matching the `/command` convention users already know
from Claude Code, Codex, and similar tools — so the shell can both
switch views and trigger real AutoForge actions (`/start`, `/done`,
`/decide`) without leaving the terminal. Along the way, fix the actual
cause of garbled/corrupted screen redraws reported during manual
testing.

At the time this design was approved, it redefined v0.25's scope: the previously-planned "polished
`projects` table output" work was designed, implemented, reviewed
clean, and then explicitly discarded (worktree and branch deleted, docs
removed from `main`) once a larger direction for this milestone was
chosen. The later platform-architecture decision superseded this direction for
Core and moved the interactive shell into the separate Agent product boundary.

## Background

`autoforge tui` currently runs a read-only, line-based loop
(`src/tui/app.ts`): it prints a view, prompts with `autoforge> ` via
`node:readline`, and accepts a small fixed set of bare words (`quit`,
`help`, `refresh`, `context-refresh`, `session-repair`) or a view
name/number to switch screens. It has no ability to trigger a mutating
action (start work, complete it, record a decision) — those still
require dropping back to the flat CLI.

**Root cause of the reported "extra keys" corruption**: `runTuiSession`
(`src/tui/app.ts:36-82`) calls `options.terminal.clear()` — which
writes the raw ANSI "clear screen, cursor to home position" escape
sequence — on every loop iteration, immediately before redrawing the
view and re-prompting. This
races `readline`'s own internal cursor-position tracking: `readline`
assumes it owns the terminal's cursor state across the lifetime of its
`Interface`, but this app's manual `clear()` calls reset the terminal
without readline's knowledge, corrupting the visual state cursor-move
and line-editing keys (arrows, backspace) depend on. This is not a
raw-mode problem and does not require abandoning `node:readline` — the
fix is to stop fighting readline's cursor model in this loop (see
Design §4).

**Explicitly excluded scope, recorded for a future milestone**: this
project's larger ambition is for AutoForge's TUI to eventually accept
free-text prompts, send them to an LLM (via OpenRouter or a similar
provider), stream the response, and apply the result as code changes —
becoming an AI coding agent in its own right, alongside AutoForge's
existing identity as a control plane other agents call into. That is a
fundamentally different, multi-milestone undertaking (provider/API
abstraction, credential handling, streaming response parsing, a
code-edit application and safety-review loop) with no existing
foundation in this codebase. It is **not** designed or scheduled here.
This spec's slash-command shell is deliberately built as the interface
layer that capability would eventually plug into (see Non-Goals), but
building that capability itself is out of scope for v0.25.

## Non-Goals

- No free-text (non-slash-prefixed) input is treated as a command or a
  prompt. Bare text always produces a fixed guidance message (Design
  §2) — it is never routed anywhere, including to an LLM.
- No LLM/AI-provider integration of any kind (no OpenRouter, no
  streaming, no API key handling, no code-generation-and-apply loop).
  That is a distinct, future initiative.
- No raw-keypress-mode input handling. The shell stays on
  `node:readline`'s standard line-editing model (type a line, edit it
  normally, press Enter to submit) — full stop. Live-as-you-type
  suggestion menus and instant arrow-key view-switching (both discussed
  and rejected during brainstorming) are not part of this design.
- No change to the flat CLI's existing subcommands
  (`autoforge start`/`done`/`decide`/etc.) — this spec only adds a new
  caller (the TUI) of their existing, unmodified `run*Command`
  functions.
- No new persistent state, schema, or domain. Every slash command in
  this spec operates through an existing service/command function.

## Design

### 1. Command surface

Eleven view-switch commands, one per existing `TuiViewId`
(`src/tui/schemas.ts`'s `TUI_VIEW_IDS`), plus six action/session
commands:

| Command           | Effect                                      |
| ----------------- | ------------------------------------------- |
| `/dashboard`      | switch to the `dashboard` view              |
| `/active-work`    | switch to the `active-work` view            |
| `/features`       | switch to the `features` view               |
| `/issues`         | switch to the `issues` view                 |
| `/tasks`          | switch to the `tasks` view                  |
| `/decisions`      | switch to the `decisions` view              |
| `/context`        | switch to the `context` view                |
| `/specifications` | switch to the `specifications` view         |
| `/doctrines`      | switch to the `doctrines` view              |
| `/agents`         | switch to the `agents` view                 |
| `/health`         | switch to the `health` view                 |
| `/start <id>`     | start `<id>` as the active work item        |
| `/done`           | complete the active work item               |
| `/decide`         | launch the guided decision-recording wizard |
| `/refresh`        | today's `context-refresh`, renamed          |
| `/repair`         | today's `session-repair`, renamed           |
| `/help`           | list every command above                    |
| `/quit`           | exit the session                            |

The eleven view commands are generated directly from `TUI_VIEW_IDS`
(`/${id}` for each), so adding a twelfth view to that array in the
future automatically gets a matching slash command with no separate
registration step.

### 2. Input handling

Only input starting with `/` is treated as a command. Every other
input produces a fixed response and takes no action:

```
> dashboard
Commands must start with /. Type /help for available commands.
```

A `/`-prefixed input that does not match any command in the table
above:

```
> /dance
Unknown command: /dance. Type /help for available commands.
```

No bare-word aliases survive from the current implementation — `q`,
`quit`, `exit`, `help`, `refresh`, a bare view name/number — all of
that is replaced by the `/`-prefixed table above. This is a deliberate,
one-time breaking change to the TUI's own input surface (not the flat
CLI, which is untouched); `autoforge tui`'s interactive mode has no
scripted/agentic consumers to preserve compatibility for; the
non-interactive `--snapshot` mode's output format is unaffected by
this spec entirely, since `--snapshot` never reads a command.

### 3. Command dispatch architecture

`runTuiSession` (`src/tui/app.ts`) gains a small parser/dispatcher
that:

1. Reads the submitted line.
2. If it does not start with `/`, sets the bare-text guidance message
   as the next notice and loops.
3. Strips the leading `/` and splits the remainder on whitespace into
   `commandWord` and `rest: string[]`.
4. If `commandWord` matches a view-switch command, sets `current` to
   that view and loops (identical to today's view-switching, just
   `/`-gated).
5. If `commandWord` is `start`, `done`, or `decide`, dispatches to the
   matching handler (§3.1–§3.3 below), which internally calls the
   corresponding existing `run*Command` function from
   `src/commands/start.ts` / `done.ts` / `decide.ts` — **not** a
   reimplementation against `WorkService`/`DecisionService` directly.
   This guarantees `/start`/`/done`/`/decide` inside the TUI behave
   identically to `autoforge start`/`done`/`decide` on the flat CLI,
   including any future bugfix or behavior change to those functions.
6. If `commandWord` is `refresh`, `repair`, `help`, or `quit`, handles
   it inline (same logic already present for `context-refresh`,
   `session-repair`, `help`, `quit` today, just renamed and re-gated
   behind the `/` prefix).
7. Otherwise, sets the unknown-command message as the next notice and
   loops.

`runTuiSession`'s options gain one new required field,
`projectRoot: string` (the value `runTuiCommand` in
`src/commands/tui.ts` already has as `project.path` from
`discoverProjectRoot`), since `runStartCommand`/`runDoneCommand`/
`runDecideCommand` all require a `startDirectory` to operate against.

Output from a dispatched command is captured via a `LogWriter` adapter
built inline at dispatch time — an object implementing `stdout`/
`stderr` that appends each call's message into a local array, joined
into one string and set as the loop's `notice` once the command
function resolves. This is the same `LogWriter` interface every
`run*Command` function already accepts (`src/core/logger.ts`), so no
new interface is introduced — only a new implementation of the
existing one, scoped to a single dispatch.

#### 3.1 `/start <id>`

```
> /start task.add-login-form
```

Kind is inferred from the id's prefix (everything before the first
`.`): `task.` → `"task"`, `issue.` → `"issue"`. Any other prefix, or an
id with no `.`, produces:

```
Could not infer a work kind from "<id>". Ids must start with "task." or "issue.".
```

On a valid id, dispatches to `runStartCommand({ args: [kind, id],
output: adapter, startDirectory: projectRoot })` and shows its output
(success or error) as the next notice.

#### 3.2 `/done`

No arguments accepted in this spec (the flat CLI's
`--no-decision "<reason>"` bypass is intentionally not exposed here —
if a user needs that path, they still have the flat
`autoforge done --no-decision "..."` available; adding it to the TUI
is a natural, small follow-up but is not required for this milestone).
Dispatches to `runDoneCommand({ args: [], output: adapter,
startDirectory: projectRoot })`.

#### 3.3 `/decide`

Launches a guided sequence of prompts, asked one at a time via the
same `terminal.prompt()` the main loop already uses:

1. `Statement? `
2. `Reasoning? `
3. `Consequence? ` (repeatable: after each answer, prompt
   `Another consequence? (leave blank to continue) ` — blank ends the
   list; at least one consequence is required, matching
   `runDecideCommand`'s existing validation)
4. `Scope? ` (repeatable, same blank-to-continue pattern, at least one
   required)
5. `Keywords (comma-separated)? ` (split on `,`, trimmed, empty
   entries dropped; at least one required)

If the user answers any required prompt with an empty string when a
non-empty answer is required, re-ask the same prompt once with
`(required) ` prepended to the label rather than aborting the wizard.
If `terminal.prompt()` returns `null` (EOF/Ctrl-D) at any step, abort
the wizard entirely and set the notice to
`"Decision wizard cancelled."` — do not partially submit.

Once all fields are collected, assemble them into
`args: ["--statement", statement, "--reasoning", reasoning,
"--consequence", consequence1, "--consequence", consequence2, ...,
"--scope", scope1, "--scope", scope2, ..., "--keyword", keyword1,
"--keyword", keyword2, ...]` (repeating `--consequence`/`--scope`/
`--keyword` once per collected value, matching
`runDecideCommand`'s existing repeatable-flag parsing) and dispatch to
`runDecideCommand({ args, output: adapter, startDirectory:
projectRoot })`. `--kind` and `--work` are not collected by this
wizard in this spec (both are optional on the flat command; the
recorded decision is simply not linked to a specific work item or
kind unless a future iteration adds those prompts) — this keeps the
wizard to five questions, matching the design's original five-field
description, rather than growing it further.

### 4. Fixing the redraw-corruption bug

The corruption traced to `runTuiSession` calling
`options.terminal.clear()` on every loop iteration, which conflicts
with `readline`'s internal cursor-state assumptions. The fix: stop
issuing a manual `clear()` immediately before every redraw. Instead:

- Clear once, when the session starts (before the first view render) —
  this is the one point where there is no prior `readline` prompt state
  to conflict with.
- On every subsequent iteration (after a command or view-switch),
  render the new view's content directly after the previous prompt
  line, separated by a blank line, rather than clearing the whole
  screen. This trades "always a fresh full-screen view" for "never
  fights readline's cursor tracking" — a reasonable default for a
  line-based shell, since Claude Code's and Codex's own prompt
  interfaces work the same way (new content appends below the previous
  turn, the screen is not wiped each turn).
- `TuiTerminal.clear()` remains on the interface (still used once at
  startup) but callers other than session-start no longer invoke it.

**Accepted visible tradeoff**: `renderTuiView` always re-emits the full
header, navigation line, and view body on every call — it is not
changed by this spec. Without a per-iteration screen clear, each
command or view-switch now appends a fresh copy of that full block
below the previous one, so the terminal scrolls rather than staying on
one fixed screen. This is intentional, not a regression to fix later —
it is the direct, necessary consequence of no longer racing readline's
cursor tracking, and it is the same visible behavior Claude Code's and
Codex's own interfaces already have.

This changes `runTuiSession`'s per-iteration behavior but does not
change `renderTuiView`'s output format, `TuiTerminal`'s interface
shape, or `autoforge tui --snapshot`'s output at all (snapshot mode
never loops or clears).

### 5. Tab-completion

`createNodeTuiTerminal`'s `readline.createInterface(...)` call gains a
`completer` option:

```typescript
completer(line: string): [string[], string] {
  const commands = ["/dashboard", "/active-work", ..., "/quit"];
  if (!line.startsWith("/")) return [[], line];
  const hits = commands.filter((command) => command.startsWith(line));
  return [hits.length > 0 ? hits : commands, line];
}
```

Pressing Tab after typing `/dec` completes to `/decide` (only match);
after typing `/d` it cycles through `/dashboard`, `/decisions`,
`/decide`, `/done` (four matches, standard readline Tab-cycling
behavior — no custom UI needed, this is `readline`'s built-in
behavior). No completion is offered for bare text with no `/` prefix,
consistent with Non-Goals (bare text is never a command).

The command list used for completion is derived from the same table
in §1 (single source of truth — the eleven view commands generated
from `TUI_VIEW_IDS`, plus the six named action/session commands),
never hand-duplicated a second time.

## Testing

- `test/tui.test.ts` (existing, extended): every current test exercises
  the old bare-word input (`"quit"`, `"help"`, `"2"`, etc.) — since
  this spec removes that surface entirely, every existing test's input
  strings must be updated to their `/`-prefixed equivalents
  (`"/quit"`, `"/help"`, `"/active-work"`, etc.). This is expected,
  necessary churn to the test file, not a sign of an accidental
  behavior change — assert the same underlying behavior, just through
  the new input syntax.
- New tests: bare (non-slash) input produces the guidance message; an
  unmatched `/command` produces the unknown-command message; `/start
task.foo` dispatches to `runStartCommand` with `["task", "task.foo"]`
  and surfaces its output as a notice; `/start` with an unprefixed or
  malformed id produces the kind-inference error; `/done` dispatches to
  `runDoneCommand` with `[]`; the `/decide` wizard collects all five
  fields across multiple prompt turns (including the repeatable
  consequence/scope loops and comma-split keywords) and dispatches to
  `runDecideCommand` with the correctly-assembled flag args; an EOF
  (`null`) mid-wizard aborts cleanly with the cancellation notice; a
  required wizard field re-prompts once with `(required)` on an empty
  answer.
- `completer` unit test: given a partial `/`-prefixed line, returns the
  matching subset; given a partial line with no matches, returns the
  full command list (readline's documented fallback-to-showing-all
  convention); given a line with no `/` prefix, returns no completions.
- Manual verification: run `autoforge tui` interactively, confirm
  arrow-key line-editing (moving the cursor within a typed command,
  backspace) no longer produces corrupted output, since the `clear()`
  race that caused it is removed.

## Rollout

No longer ships as AutoForge Core v0.25. Preserve the command surface,
`/decide` wizard, completion behavior, and redraw analysis as candidate Agent
requirements. Any Agent implementation must consume the supported Core SDK and
protocol rather than calling or duplicating Core stores directly.
