# v0.25 Interactive TUI Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `autoforge tui`'s bare-word input (`quit`, `help`,
`refresh`, view names/numbers) with a `/`-prefixed slash-command
surface that can both switch views and trigger real mutating actions
(`/start`, `/done`, `/decide`) by calling the existing, unmodified
`runStartCommand`/`runDoneCommand`/`runDecideCommand` functions — and
fix the screen-clear/readline cursor race that caused garbled key
rendering.

**Architecture:** `runTuiSession` (`src/tui/app.ts`) gains a small
parser that recognizes only `/`-prefixed input, dispatches view-switch
commands inline (as today, just re-gated), and routes `/start`/`/done`/
`/decide` to the existing flat-CLI command functions through a
`LogWriter` adapter that captures their output as the loop's next
notice. The per-iteration `terminal.clear()` call is removed (kept only
at session start) to stop the redraw race with readline's cursor
tracking. `createNodeTuiTerminal`'s `readline.createInterface` call
gains a `completer` for Tab-completion over the command list.

**Tech Stack:** TypeScript, Vitest, `node:readline/promises` (already
in use, no new dependency).

## Global Constraints

- Only input starting with `/` is ever treated as a command. Bare text
  always produces the fixed guidance message
  `"Commands must start with /. Type /help for available commands."`
  and takes no action.
- An unrecognized `/`-prefixed command produces
  `"Unknown command: <input>. Type /help for available commands."`
  where `<input>` is the trimmed original line the user typed
  (including its leading `/`).
- `/start`, `/done`, `/decide` dispatch to the existing
  `runStartCommand`, `runDoneCommand`, `runDecideCommand` functions
  from `src/commands/start.ts` / `done.ts` / `decide.ts` respectively —
  no new logic against `WorkService`/`DecisionService`/etc. directly.
  Any error thrown by these functions is caught and converted to a
  notice via `toAutoForgeError(error).message`, exactly as the existing
  `context-refresh`/`session-repair` handling already does.
- `autoforge tui --snapshot`'s output and `renderTuiView`'s function
  signature are completely unchanged by this plan.
- No raw-keypress-mode input handling is introduced. The shell stays on
  `node:readline`'s standard line-editing model throughout.
- No new runtime dependency.

---

## File Structure

- **Modify `src/tui/app.ts`** — the whole plan's core: the
  `/`-prefixed parser/dispatcher, the three action-command handlers
  (`/start`, `/done`, `/decide`'s wizard), the `LogWriter` adapter, the
  `projectRoot` option, the removed per-iteration `clear()`, and the
  `completer` wiring inside `createNodeTuiTerminal`.
- **Modify `src/commands/tui.ts`** — thread `project.path` through to
  `runTuiSession` as `projectRoot`.
- **Modify `test/tui.test.ts`** — every existing interactive test's
  input strings move to their `/`-prefixed equivalents; new tests for
  bare-text guidance, unknown-command message, `/start`, `/done`,
  `/decide`'s wizard (happy path, cancellation, required-field
  re-prompt), and the `completer`.
- **No change** to `src/tui/renderer.ts`, `src/tui/schemas.ts`,
  `src/tui/service.ts`, or any file under `src/commands/start.ts` /
  `done.ts` / `decide.ts` — this plan is a new caller of those, not a
  modification of them.

---

### Task 1: `/`-prefixed input gate and view-switch commands

**Files:**
- Modify: `src/tui/app.ts`
- Test: `test/tui.test.ts`

**Interfaces:**
- Consumes: `TUI_VIEW_IDS`, `tuiViewIdSchema`, `TuiViewId` (already
  imported in this file); no changes to their shapes.
- Produces: the parsing/dispatch skeleton every later task in this
  plan builds on. After this task, `runTuiSession`'s command loop only
  ever inspects a line if it starts with `/`; the specific handling of
  `/start`, `/done`, `/decide`, `/refresh`, `/repair`, `/help` is
  intentionally deferred to Tasks 2-4 (this task's dispatcher must have
  a clearly marked branch for "recognized action-command word, handled
  by a later task" so those tasks can slot in without restructuring the
  dispatcher again — see Step 3's `// handled in a later task` comment
  placement).

**Context:** Read `src/tui/app.ts` in full before editing (it is short,
110 lines). The current command loop (lines 36-82) does:

```typescript
const answer = await options.terminal.prompt("autoforge> ");
if (answer === null) return;
const command = answer.trim().toLowerCase();
if (["q", "quit", "exit"].includes(command)) return;
if (command === "refresh" || command === "") continue;
if (command === "help") {
  notice =
    "Choose a view by number/name; mutations require context-refresh or session-repair.";
  continue;
}
const requestedView = resolveView(command);
if (requestedView) {
  current = requestedView;
  continue;
}
try {
  if (command === "context-refresh")
    notice = await options.service.refreshContext();
  else if (command === "session-repair")
    notice = await options.service.repairSession();
  else notice = `Unknown command: ${answer.trim()}`;
} catch (error) {
  notice = `Error: ${toAutoForgeError(error).message}`;
}
```

This task replaces that whole block. `resolveView` (lines 24-34) stays
unchanged — it is reused for view-name matching, just no longer for
number matching (numeric view-switching is a Non-Goal removed by this
spec's Design §1/§2: only named `/`-prefixed commands remain).

- [ ] **Step 1: Write the failing tests**

Replace the two existing interactive-loop tests in `test/tui.test.ts`
(`"navigates by number and exits without mutating state"` and
`"runs session recovery only after an explicit action"`) with:

```typescript
it("switches views via a named slash command and exits with /quit", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["/features", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[0]).toContain("Dashboard");
  expect(writes[1]).toContain("Features");
  expect(terminal.close).toHaveBeenCalledOnce();
});

it("shows a guidance message for bare text with no leading slash", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["dashboard", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[1]).toContain(
    "Commands must start with /. Type /help for available commands.",
  );
});

it("shows an unknown-command message for an unrecognized slash command", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["/dance", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[1]).toContain(
    "Unknown command: /dance. Type /help for available commands.",
  );
});

it("runs session recovery via /repair", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["/repair", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[1]).toContain("Session state is healthy.");
});

it("shows /help listing available commands", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["/help", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[1]).toContain("/dashboard");
  expect(writes[1]).toContain("/quit");
});
```

Also update the existing `"exits without mutating state"` numeric-entry
assumption: this plan removes numeric view-switching entirely (Design
§1/§2 only lists named commands), so no test should submit a bare
number as a view selector any more — the tests above replace that
coverage with named `/`-prefixed commands.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: FAIL — `runTuiSession` does not yet accept a `projectRoot`
option (TypeScript error) and does not yet recognize `/`-prefixed
input.

- [ ] **Step 3: Implement the `/`-prefixed dispatcher**

Add `projectRoot: string` to `RunTuiSessionOptions`:

```typescript
export interface RunTuiSessionOptions {
  service: TuiProjectService;
  terminal: TuiTerminal;
  projectRoot: string;
  initialView?: TuiViewId;
  color?: boolean;
  width?: number;
}
```

Replace the command-loop body (from `const answer = ...` through the
end of the `while` loop's try/catch, i.e. everything after
`notice = undefined;` and before the loop's closing brace) with:

```typescript
      const answer = await options.terminal.prompt("autoforge> ");
      if (answer === null) return;
      const trimmed = answer.trim();
      if (!trimmed.startsWith("/")) {
        notice =
          "Commands must start with /. Type /help for available commands.";
        continue;
      }
      const [rawCommand, ...rest] = trimmed.slice(1).split(/\s+/);
      const command = (rawCommand ?? "").toLowerCase();
      if (command === "quit") return;
      if (command === "help") {
        const commandList = [
          ...VIEW_COMMANDS.map((id) => `/${id}`),
          "/start <id>",
          "/done",
          "/decide",
          "/refresh",
          "/repair",
          "/help",
          "/quit",
        ];
        notice = `Commands: ${commandList.join(", ")}`;
        continue;
      }
      const requestedView = resolveView(command);
      if (requestedView) {
        current = requestedView;
        continue;
      }
      try {
        if (command === "refresh") notice = await options.service.refreshContext();
        else if (command === "repair") notice = await options.service.repairSession();
        else {
          notice = `Unknown command: /${trimmed.slice(1)}. Type /help for available commands.`;
        }
      } catch (error) {
        notice = `Error: ${toAutoForgeError(error).message}`;
      }
```

Add a `VIEW_COMMANDS` constant near the top of the file (module scope,
alongside `resolveView`), derived from `TUI_VIEW_IDS` so no view name
is ever hand-duplicated:

```typescript
const VIEW_COMMANDS: readonly TuiViewId[] = TUI_VIEW_IDS;
```

Update `resolveView` to no longer accept a numeric string (numeric
view-switching is removed per this plan's Global Constraints):

```typescript
function resolveView(command: string): TuiViewId | undefined {
  const result = tuiViewIdSchema.safeParse(command);
  return result.success ? result.data : undefined;
}
```

The unused `rest` variable from the destructuring above is
intentionally unused in this task — it exists so Task 2's `/start`
handler can read `rest[0]` as the id argument without re-destructuring.
Prefix it with an underscore is not appropriate since Task 2 uses it;
leave it as `rest` and expect a `noUnusedLocals`-style lint/tsc
complaint to resolve itself once Task 2 lands in the same file later
this same session — if `tsc --noEmit` fails on this task alone with an
unused-variable error, that is expected and will be resolved by Task 2,
not a sign this task is wrong (note this in your self-review if it
occurs, do not work around it by deleting `rest`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: the five interactive-loop tests from Step 1 PASS. The
non-interactive tests (`"validates strict view models"`, `"loads every
planned view..."`, `"renders deterministic snapshots..."`, `"reports
unavailable kernel views..."`, `"prints a non-interactive snapshot"`,
`"rejects interactive mode without a terminal"`, `"rejects unknown
views..."`) are untouched by this task and must also still pass.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: if `rest` is unused at this point (Task 2 not yet done),
this may report an unused-variable error depending on the project's
`tsconfig.json` strictness. If it does, that is expected per Step 3's
note — proceed to commit anyway; Task 2 resolves it in the same
implementer session if both tasks are done back-to-back, or note it
explicitly in your report if Task 2 is a separate dispatch.

- [ ] **Step 6: Commit**

```bash
git add src/tui/app.ts test/tui.test.ts
git commit -m "feat: gate TUI input behind a leading slash, remove numeric view-switching"
```

---

### Task 2: `/start <id>` and `/done`

**Files:**
- Modify: `src/tui/app.ts`
- Test: `test/tui.test.ts`

**Interfaces:**
- Consumes: `runStartCommand` from `../commands/start.js`,
  `runDoneCommand` from `../commands/done.js`. Both already exist,
  unmodified:
  - `runStartCommand(options: { args: readonly string[]; output: LogWriter; startDirectory: string }): Promise<ExitCode>`
  - `runDoneCommand(options: { args: readonly string[]; output: LogWriter; startDirectory: string }): Promise<ExitCode>`
  - `LogWriter` from `../core/logger.js`: `{ stdout(message: string): void; stderr(message: string): void }`.
- Produces: the `LogWriter` adapter helper (a local function in
  `app.ts`) that Task 3's `/decide` also reuses — build it generically
  enough that Task 3 does not need to redefine it.

**Context:** Read the current state of `src/tui/app.ts` after Task 1
before editing (line numbers below assume Task 1 is already applied in
this same file). The `rest` array destructured in Task 1's dispatcher
(`const [rawCommand, ...rest] = trimmed.slice(1).split(/\s+/);`) holds
everything after the command word — for `/start task.foo`, `rest` is
`["task.foo"]`.

- [ ] **Step 1: Write the failing tests**

```typescript
it("dispatches /start to runStartCommand with the inferred kind", async () => {
  const projectRoot = await createProject();
  const { WorkService } = await import("../src/work/service.js");
  const { createWorkStateStore } = await import("../src/state/kernel.js");
  await new WorkService(createWorkStateStore(projectRoot)).createTask({
    phaseId: "phase.none",
    name: "Test task",
    description: "A task for testing /start.",
    scope: { include: ["src/**"], exclude: [] },
  }).catch(() => {}); // phase may not exist; the test only needs a plausible id shape
  const writes: string[] = [];
  const answers = ["/start task.does-not-exist", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  // The task id does not exist, so runStartCommand's underlying service
  // throws; the dispatcher must catch it and surface it as a notice,
  // not let it crash the session.
  expect(writes[1]).toContain("Error:");
});

it("reports a clear error when /start's id has no recognizable kind prefix", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["/start not-a-valid-id", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[1]).toContain(
    'Could not infer a work kind from "not-a-valid-id". Ids must start with "task." or "issue.".',
  );
});

it("dispatches /done to runDoneCommand", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["/done", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  // No active work exists in a freshly-initialized project, so
  // runDoneCommand's underlying lifecycle service throws; confirm the
  // dispatcher surfaces that as a notice rather than crashing.
  expect(writes[1]).toContain("Error:");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: FAIL — `/start`/`/done` are not yet recognized commands, so
`writes[1]` currently contains the "Unknown command" message instead.

- [ ] **Step 3: Implement the dispatch**

Add these imports to the top of `src/tui/app.ts`:

```typescript
import { runStartCommand } from "../commands/start.js";
import { runDoneCommand } from "../commands/done.js";
import type { LogWriter } from "../core/logger.js";
```

Add a `LogWriter`-capturing helper function near the top of the file
(module scope):

```typescript
function collectingLogWriter(): { writer: LogWriter; text(): string } {
  const lines: string[] = [];
  return {
    writer: {
      stdout(message) {
        lines.push(message);
      },
      stderr(message) {
        lines.push(message);
      },
    },
    text: () => lines.join("\n"),
  };
}
```

Add a kind-inference helper near `resolveView`:

```typescript
function inferWorkKind(id: string): "task" | "issue" | undefined {
  if (id.startsWith("task.")) return "task";
  if (id.startsWith("issue.")) return "issue";
  return undefined;
}
```

In the dispatcher's `try` block (from Task 1), add two new branches
before the final `else` (the "Unknown command" fallback):

```typescript
      try {
        if (command === "refresh") notice = await options.service.refreshContext();
        else if (command === "repair") notice = await options.service.repairSession();
        else if (command === "start") {
          const id = rest[0];
          const kind = id ? inferWorkKind(id) : undefined;
          if (!id || !kind) {
            notice = `Could not infer a work kind from "${id ?? ""}". Ids must start with "task." or "issue.".`;
          } else {
            const { writer, text } = collectingLogWriter();
            await runStartCommand({
              args: [kind, id],
              output: writer,
              startDirectory: options.projectRoot,
            });
            notice = text();
          }
        } else if (command === "done") {
          const { writer, text } = collectingLogWriter();
          await runDoneCommand({
            args: [],
            output: writer,
            startDirectory: options.projectRoot,
          });
          notice = text();
        } else {
          notice = `Unknown command: /${trimmed.slice(1)}. Type /help for available commands.`;
        }
      } catch (error) {
        notice = `Error: ${toAutoForgeError(error).message}`;
      }
```

Also update the `/help` notice string from Task 1 to mention `/start
<id>` and `/done` explicitly (it currently lists them via the
`VIEW_COMMANDS` spread plus a hardcoded tail array — confirm `/start`
and `/done` already appear there from Task 1's implementation; if
Task 1's tail array does not already include them verbatim, add them).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: all three new tests PASS, plus every test from Task 1 and
every pre-existing non-interactive test still PASS.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors (this resolves Task 1's expected-if-run-alone
unused-`rest` situation, since `rest` is now used here).

- [ ] **Step 6: Commit**

```bash
git add src/tui/app.ts test/tui.test.ts
git commit -m "feat: add /start and /done slash commands to the TUI"
```

---

### Task 3: `/decide` guided wizard

**Files:**
- Modify: `src/tui/app.ts`
- Test: `test/tui.test.ts`

**Interfaces:**
- Consumes: `runDecideCommand` from `../commands/decide.js` —
  `runDecideCommand(options: { args: readonly string[]; output: LogWriter; startDirectory: string }): Promise<ExitCode>`.
  `collectingLogWriter()` from Task 2 (this same file).
  `options.terminal.prompt(label: string): Promise<string | null>`
  (already exists, used repeatedly in sequence).
- Produces: the `/decide` dispatch branch; no new exports.

**Context:** `runDecideCommand` (already existing, unmodified) parses
repeatable flags: `--consequence <value>` (one or more required),
`--scope <value>` (one or more required), `--keyword <value>` (one or
more required), plus single-value `--statement` and `--reasoning`
(both required). This task's wizard collects these five fields via
sequential prompts and assembles them into that exact flag-array shape
before calling `runDecideCommand`.

- [ ] **Step 1: Write the failing tests**

```typescript
it("runs the /decide wizard end to end and records a decision", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = [
    "/decide",
    "Use indexed search", // Statement?
    "Fast results matter", // Reasoning?
    "Must add an index", // Consequence? (first)
    "", // Another consequence? (blank ends the list)
    "search", // Scope? (first)
    "", // Another scope? (blank ends the list)
    "index,performance", // Keywords (comma-separated)?
    "/quit",
  ];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[1]).toContain("Recorded decision");

  const { createDecisionStore } = await import("../src/decisions/store.js");
  const stored = await createDecisionStore(projectRoot).read();
  expect(stored.state.data.decisions).toHaveLength(1);
  expect(stored.state.data.decisions[0]?.statement).toBe(
    "Use indexed search",
  );
  expect(stored.state.data.decisions[0]?.consequences).toEqual([
    "Must add an index",
  ]);
  expect(stored.state.data.decisions[0]?.scope).toEqual(["search"]);
  expect(stored.state.data.decisions[0]?.keywords).toEqual([
    "index",
    "performance",
  ]);
});

it("re-prompts once for a required /decide field left blank", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = [
    "/decide",
    "", // Statement? (blank, must re-prompt)
    "Use indexed search", // Statement? (required), retried
    "Fast results matter", // Reasoning?
    "Must add an index", // Consequence?
    "", // Another consequence?
    "search", // Scope?
    "", // Another scope?
    "index", // Keywords?
    "/quit",
  ];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes[1]).toContain("Recorded decision");
});

it("cancels the /decide wizard cleanly on EOF mid-wizard", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = [
    "/decide",
    "Use indexed search", // Statement?
    null, // Reasoning? -> EOF
  ];
  let index = 0;
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => {
      const value = answers[index];
      index += 1;
      return value === undefined ? "/quit" : value;
    }),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(writes.some((w) => w.includes("Decision wizard cancelled."))).toBe(
    true,
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: FAIL — `/decide` is not yet a recognized command.

- [ ] **Step 3: Implement the wizard**

Add a `runDecideWizard` helper function in `src/tui/app.ts` (module
scope, near the other helpers added in Tasks 1-2):

```typescript
async function promptRequired(
  terminal: TuiTerminal,
  label: string,
): Promise<string | null> {
  let answer = await terminal.prompt(label);
  if (answer === null) return null;
  while (answer.trim().length === 0) {
    answer = await terminal.prompt(`(required) ${label}`);
    if (answer === null) return null;
  }
  return answer.trim();
}

async function promptRepeatable(
  terminal: TuiTerminal,
  firstLabel: string,
  againLabel: string,
): Promise<string[] | null> {
  const values: string[] = [];
  const first = await promptRequired(terminal, firstLabel);
  if (first === null) return null;
  values.push(first);
  while (true) {
    const next = await terminal.prompt(againLabel);
    if (next === null) return null;
    if (next.trim().length === 0) return values;
    values.push(next.trim());
  }
}

async function runDecideWizard(
  terminal: TuiTerminal,
  projectRoot: string,
): Promise<string> {
  const statement = await promptRequired(terminal, "Statement? ");
  if (statement === null) return "Decision wizard cancelled.";
  const reasoning = await promptRequired(terminal, "Reasoning? ");
  if (reasoning === null) return "Decision wizard cancelled.";
  const consequences = await promptRepeatable(
    terminal,
    "Consequence? ",
    "Another consequence? (leave blank to continue) ",
  );
  if (consequences === null) return "Decision wizard cancelled.";
  const scope = await promptRepeatable(
    terminal,
    "Scope? ",
    "Another scope? (leave blank to continue) ",
  );
  if (scope === null) return "Decision wizard cancelled.";
  const keywordsAnswer = await promptRequired(
    terminal,
    "Keywords (comma-separated)? ",
  );
  if (keywordsAnswer === null) return "Decision wizard cancelled.";
  const keywords = keywordsAnswer
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const args: string[] = ["--statement", statement, "--reasoning", reasoning];
  for (const consequence of consequences) args.push("--consequence", consequence);
  for (const scopeValue of scope) args.push("--scope", scopeValue);
  for (const keyword of keywords) args.push("--keyword", keyword);

  const { writer, text } = collectingLogWriter();
  await runDecideCommand({ args, output: writer, startDirectory: projectRoot });
  return text();
}
```

Import `runDecideCommand` at the top of the file:

```typescript
import { runDecideCommand } from "../commands/decide.js";
```

Add the dispatch branch inside the existing `try` block, alongside
`start`/`done` from Task 2:

```typescript
        else if (command === "decide") {
          notice = await runDecideWizard(options.terminal, options.projectRoot);
        }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: all three new tests PASS, plus every test from Tasks 1-2 and
every pre-existing non-interactive test still PASS.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/tui/app.ts test/tui.test.ts
git commit -m "feat: add the /decide guided wizard to the TUI"
```

---

### Task 4: Remove the per-iteration screen clear (fix the redraw race)

**Files:**
- Modify: `src/tui/app.ts`
- Test: `test/tui.test.ts`

**Interfaces:**
- Consumes: `TuiTerminal.clear()` (unchanged interface — this task
  changes only how often `runTuiSession` calls it, not the interface
  itself).
- Produces: no new exports.

**Context:** `runTuiSession`'s loop currently calls
`options.terminal.clear()` on every iteration, immediately before
`options.terminal.write(renderTuiView(...))`. This races `readline`'s
internal cursor tracking (see this plan's design spec, Background
section, for the full root-cause explanation) and is the actual cause
of the reported garbled-key rendering. The fix: call `clear()` exactly
once, before the loop's first iteration, and never again inside the
loop.

- [ ] **Step 1: Write the failing test**

```typescript
it("clears the screen only once at session start, not on every iteration", async () => {
  const projectRoot = await createProject();
  const writes: string[] = [];
  const answers = ["/features", "/dashboard", "/quit"];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => answers.shift() ?? null),
    close: vi.fn(),
  };
  await runTuiSession({
    service: new TuiProjectService(projectRoot),
    terminal,
    projectRoot,
    color: false,
  });
  expect(terminal.clear).toHaveBeenCalledOnce();
  // Three renders happened (initial dashboard, /features, /dashboard again)
  expect(writes).toHaveLength(3);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./node_modules/.bin/vitest run test/tui.test.ts -t "clears the screen only once"`
Expected: FAIL — `terminal.clear` is currently called once per loop
iteration (3 times for this test's 3 renders), not once.

- [ ] **Step 3: Remove the per-iteration clear**

In `runTuiSession`, move `options.terminal.clear()` out of the `while`
loop entirely, calling it exactly once immediately before the loop
starts:

```typescript
export async function runTuiSession(
  options: RunTuiSessionOptions,
): Promise<void> {
  let current = options.initialView ?? "dashboard";
  let notice: string | undefined;
  options.terminal.clear();
  try {
    while (true) {
      const view = await options.service.loadView(current);
      options.terminal.write(
        renderTuiView(view, {
          projectName: options.service.projectName,
          ...(options.color === undefined ? {} : { color: options.color }),
          ...(options.width === undefined ? {} : { width: options.width }),
          ...(notice ? { notice } : {}),
        }),
      );
      notice = undefined;
      // ... rest of the loop body from Tasks 1-3, unchanged
```

Only the position of the `options.terminal.clear()` call moves (from
inside the loop, first line, to just before the loop, one call site
total) — nothing else in the loop body changes in this task.

- [ ] **Step 4: Run the test to verify it passes**

Run: `./node_modules/.bin/vitest run test/tui.test.ts -t "clears the screen only once"`
Expected: PASS.

- [ ] **Step 5: Run the full TUI test suite**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: every test from Tasks 1-4 and every pre-existing
non-interactive test PASS.

- [ ] **Step 6: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/tui/app.ts test/tui.test.ts
git commit -m "fix: clear the TUI screen once at startup, not every iteration

Stops racing readline's internal cursor-position tracking, which was
the actual cause of garbled key rendering during interactive use."
```

---

### Task 5: Tab-completion and threading `projectRoot` through `runTuiCommand`

**Files:**
- Modify: `src/tui/app.ts`
- Modify: `src/commands/tui.ts`
- Test: `test/tui.test.ts`

**Interfaces:**
- Consumes: `readline.createInterface`'s `completer` option (Node.js
  built-in, accepts `(line: string) => [string[], string]` or the
  async/callback equivalent — this task uses the synchronous form,
  matching every other synchronous option already passed to
  `createInterface` in this file).
- Produces: `createNodeTuiTerminal` gains a working `completer`; no
  new exported symbols.

**Context:** `createNodeTuiTerminal` (`src/tui/app.ts`, bottom of the
file) currently calls `createInterface({ input, output })` with no
`completer`. This task adds one, built from the same command list used
by `/help` (Task 1's `VIEW_COMMANDS` plus the fixed action/session
command names) so the two never drift out of sync.

Separately, `runTuiCommand` (`src/commands/tui.ts`) already computes
`project.path` via `discoverProjectRoot` (line 62-64) but does not pass
it to `runTuiSession` (line 86's call). This task adds that one field.

- [ ] **Step 1: Write the failing tests**

```typescript
it("threads the discovered project root into the interactive session", async () => {
  const projectRoot = await createProject();
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  const writes: string[] = [];
  const terminal: TuiTerminal = {
    clear: vi.fn(),
    write: (content) => writes.push(content),
    prompt: vi.fn(async () => "/done"),
    close: vi.fn(),
  };
  // /done requires active work; a fresh project has none, so
  // runDoneCommand throws, and the notice should reflect that error
  // rather than a missing-projectRoot crash, proving projectRoot was
  // correctly threaded through runTuiCommand into runTuiSession.
  let callCount = 0;
  const terminalWithQuit: TuiTerminal = {
    ...terminal,
    prompt: vi.fn(async () => {
      callCount += 1;
      return callCount === 1 ? "/done" : "/quit";
    }),
  };
  await runTuiCommand({
    args: [],
    output,
    startDirectory: projectRoot,
    terminal: terminalWithQuit,
  });
  expect(writes[1]).toContain("Error:");
});
```

`createNodeTuiTerminal`'s `completer` is normally a closure passed
directly to `readline.createInterface`, which makes it awkward to
reach in a test (the returned `TuiTerminal` does not expose the
underlying `readline.Interface`). This task avoids that problem by
extracting the completion logic into its own small, independently
testable exported function — `completeSlashCommand` — that
`createNodeTuiTerminal` then passes as its `completer`:

```typescript
export function completeSlashCommand(line: string): [string[], string] {
  const commands = [
    ...VIEW_COMMANDS.map((id) => `/${id}`),
    "/start",
    "/done",
    "/decide",
    "/refresh",
    "/repair",
    "/help",
    "/quit",
  ];
  if (!line.startsWith("/")) return [[], line];
  const hits = commands.filter((entry) => entry.startsWith(line));
  return [hits.length > 0 ? hits : commands, line];
}
```

Add these three tests for it directly (no need to go through
`createNodeTuiTerminal` or a real terminal at all, since
`completeSlashCommand` is a plain exported function):

```typescript
it("completeSlashCommand suggests matching commands for a partial slash prefix", () => {
  const [matches] = completeSlashCommand("/dec");
  expect(matches).toEqual(["/decide"]);
});

it("completeSlashCommand falls back to every command when nothing matches", () => {
  const [matches] = completeSlashCommand("/zzz");
  expect(matches.length).toBeGreaterThan(1);
  expect(matches).toContain("/quit");
});

it("completeSlashCommand returns no completions for non-slash input", () => {
  const [matches] = completeSlashCommand("dash");
  expect(matches).toEqual([]);
});
```

`test/tui.test.ts` already imports from `../src/tui/app.js` on its
existing line 10 (`import { runTuiSession, type TuiTerminal } from
"../src/tui/app.js";`). Modify that existing import line in place to
also bring in `completeSlashCommand` and `createNodeTuiTerminal` —
do not add a second, separate import line for the same module:

```typescript
import {
  completeSlashCommand,
  createNodeTuiTerminal,
  runTuiSession,
  type TuiTerminal,
} from "../src/tui/app.js";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: FAIL — `completeSlashCommand` is not yet exported, and
`runTuiCommand` does not yet pass `projectRoot` to `runTuiSession`.

- [ ] **Step 3: Implement**

Add `completeSlashCommand` (as shown above) to `src/tui/app.ts`, and
wire it into `createNodeTuiTerminal`:

```typescript
export function createNodeTuiTerminal(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): TuiTerminal {
  const readline = createInterface({
    input,
    output,
    completer: completeSlashCommand,
  });
  // ... rest unchanged
```

In `src/commands/tui.ts`, add `projectRoot: project.path` to the
`runTuiSession` call:

```typescript
  await runTuiSession({
    service,
    terminal: options.terminal ?? createNodeTuiTerminal(),
    projectRoot: project.path,
    initialView: parsed.view,
    color: parsed.color,
    ...(options.width === undefined ? {} : { width: options.width }),
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: all new tests PASS, plus every test from Tasks 1-4 and every
pre-existing non-interactive test still PASS.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/tui/app.ts src/commands/tui.ts test/tui.test.ts
git commit -m "feat: add Tab-completion for slash commands and thread projectRoot through runTuiCommand"
```

---

### Task 6: Documentation

**Files:**
- Modify: `docs/AUTOFORGE_CLI_REFERENCE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new — documentation accuracy only.

**Context:** `docs/AUTOFORGE_CLI_REFERENCE.md`'s "Help and TUI" section
currently reads:

```markdown
## Help and TUI

```bash
autoforge help
autoforge tui
autoforge tui --snapshot --no-color
```
```

- [ ] **Step 1: Update the doc**

Replace that section with:

```markdown
## Help and TUI

```bash
autoforge help
autoforge tui
autoforge tui --snapshot --no-color
```

`autoforge tui`'s interactive mode accepts only `/`-prefixed slash
commands. View-switching commands match every `TuiViewId` exactly
(`/dashboard`, `/active-work`, `/features`, `/issues`, `/tasks`,
`/decisions`, `/context`, `/specifications`, `/doctrines`, `/agents`,
`/health`). `/start <id>` infers `task` or `issue` from the id's
`<kind>.` prefix and starts it; `/done` completes the active work item;
`/decide` walks through a guided sequence of prompts (statement,
reasoning, one or more consequences, one or more scope entries,
comma-separated keywords) and records the decision exactly as
`autoforge decide` would. `/refresh` and `/repair` run context refresh
and session repair; `/help` lists every command; `/quit` exits. Input
with no leading `/` produces a guidance message rather than being
treated as a command. Tab-completion suggests matching commands as you
type. `autoforge tui --snapshot` is unaffected by any of this — it
never reads a command.
```

- [ ] **Step 2: Commit**

```bash
git add docs/AUTOFORGE_CLI_REFERENCE.md
git commit -m "docs: document the TUI's slash-command surface"
```

---

### Task 7: Version bump and changelog

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `test/cli-foundation.test.ts`
- Modify: `test/cli-integration.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new — release bookkeeping only.

**Context:** `package.json` is currently at `"0.24.0"`. This plan's
work is v0.25.0. Three test files assert the current version as a
hardcoded string and must move in lockstep with the bump — searched
and confirmed during planning:
`test/cli-foundation.test.ts:277` (`expect(findPackageVersion()).toBe("0.24.0")`)
and `test/cli-integration.test.ts:87,114,130` (`stdout: "AutoForge 0.24.0\n"`,
three occurrences).

- [ ] **Step 1: Bump the version**

In `package.json`, change:

```json
  "version": "0.24.0",
```

to:

```json
  "version": "0.25.0",
```

- [ ] **Step 2: Regenerate the lockfile's version fields**

Run: `npm install --package-lock-only --cache /tmp/npm-cache-autoforge-v025-tui`
Expected: `package-lock.json`'s root `"version"` and
`packages[""].version` fields update to `"0.25.0"`, matching
`package.json`. Do not hand-edit `package-lock.json`.

- [ ] **Step 3: Update the hardcoded version-assertion tests**

In `test/cli-foundation.test.ts`, change:

```typescript
    expect(findPackageVersion()).toBe("0.24.0");
```

to:

```typescript
    expect(findPackageVersion()).toBe("0.25.0");
```

In `test/cli-integration.test.ts`, change all three occurrences of:

```typescript
      stdout: "AutoForge 0.24.0\n",
```

to:

```typescript
      stdout: "AutoForge 0.25.0\n",
```

- [ ] **Step 4: Add the CHANGELOG entry**

In `CHANGELOG.md`, insert a new entry directly above the existing
`## [0.24.0] - 2026-08-23` line (leave the
`<!-- autoforge:changelog:start/end -->` markers exactly as they are —
empty, untouched):

```markdown
## [0.25.0] - 2026-08-23

### Added

- **Interactive TUI slash commands**: `autoforge tui`'s interactive
  mode now accepts only `/`-prefixed commands. Eleven view-switching
  commands match every `TuiViewId` (`/dashboard`, `/active-work`,
  `/features`, `/issues`, `/tasks`, `/decisions`, `/context`,
  `/specifications`, `/doctrines`, `/agents`, `/health`); `/start <id>`
  infers `task` or `issue` from the id's prefix and starts it; `/done`
  completes the active work item; `/decide` walks through a guided
  sequence of prompts (statement, reasoning, one or more consequences,
  one or more scope entries, comma-separated keywords) and records the
  decision. `/start`, `/done`, and `/decide` all dispatch to the exact
  same `runStartCommand`/`runDoneCommand`/`runDecideCommand` functions
  the flat CLI uses, so behavior is identical between the two
  surfaces. `/refresh` and `/repair` replace the former
  `context-refresh`/`session-repair` bare words; `/help` lists every
  command. Bare text with no leading `/` is never treated as a
  command. Tab-completion suggests matching slash commands as you
  type.
- Numeric view-switching (typing a bare number to change views) is
  removed along with every other bare-word command, in favor of the
  `/`-prefixed surface above.

### Fixed

- **TUI screen corruption during interactive use**: the interactive
  loop cleared the screen on every iteration, racing `readline`'s
  internal cursor-position tracking and corrupting arrow-key/backspace
  line editing. The screen now clears once at session start only.
```

- [ ] **Step 5: Verify**

Run:
```bash
./node_modules/.bin/vitest run test/cli-foundation.test.ts test/cli-integration.test.ts
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/prettier --check package.json CHANGELOG.md test/cli-foundation.test.ts test/cli-integration.test.ts
npm run build
node dist/cli.js version
```
Expected: version-assertion tests pass, typecheck clean, prettier
clean, and the built CLI reports `AutoForge 0.25.0`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json test/cli-foundation.test.ts test/cli-integration.test.ts CHANGELOG.md
git commit -m "chore: bump version to 0.25.0 and add changelog entry"
```

---

## Final Verification

After Task 7, run the complete verification sequence:

```bash
rm -rf dist
npm run build
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/prettier --check src/tui/app.ts src/commands/tui.ts test/tui.test.ts docs/AUTOFORGE_CLI_REFERENCE.md package.json CHANGELOG.md test/cli-foundation.test.ts test/cli-integration.test.ts
./node_modules/.bin/vitest run
node --test tests/*.test.js
node dist/cli.js version
```

Expected: clean build, zero typecheck errors, zero prettier warnings on
the files this plan touched, full vitest + legacy suite green, and the
built CLI reports `AutoForge 0.25.0`.

Then manually verify the redraw fix and slash commands interactively:

```bash
node dist/cli.js tui
```

Type `/help`, `/features`, `/decide` (walk through the wizard, then
`/quit` at the end or answer normally), and confirm arrow-key line
editing (moving the cursor within a typed command, backspace) no
longer produces corrupted output.
