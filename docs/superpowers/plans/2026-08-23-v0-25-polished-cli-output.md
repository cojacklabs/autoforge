# v0.25 Polished CLI Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `autoforge projects` aligned, color-coded table output via a
new shared formatting module, without changing any other command's
behavior or breaking the automation contract agentic callers rely on.

**Architecture:** Extract the existing ANSI color/truncation logic in
`src/tui/renderer.ts` into a new general-purpose `src/cli/format.ts`
module (adding a new `renderTable` table renderer, a `shouldUseColor`
auto-detection helper, and an `emptyMessage` helper), refactor
`tui/renderer.ts` to consume it, then split `autoforge projects` (bare)
and `autoforge projects list` into two distinct code paths in
`src/commands/projects.ts` that both render through `renderTable`.

**Tech Stack:** TypeScript, Vitest, raw ANSI escape codes (no new
dependency), Zod (unchanged, no new schemas needed for this milestone).

## Global Constraints

- No new runtime dependency (e.g. chalk, cli-table3). Use raw ANSI
  escape codes, matching the existing `tui/renderer.ts` convention.
- `--json` output must never be colorized, under any flag combination.
- Bare `autoforge projects --json` output shape is unchanged:
  `{ path, metadata }[]`.
- `autoforge projects list --json` gains exactly one new field per
  entry: `activeWork: { kind: string; id: string } | null`. No other
  field changes.
- No behavior change to `autoforge init`, `autoforge update`, or any
  other flat subcommand.
- No behavior change to `autoforge tui`'s rendered output — the
  `tui/renderer.ts` refactor must be behavior-preserving; its existing
  tests (`test/tui.test.ts`) must pass unmodified.
- Empty project registry prints `"No projects registered."`, never an
  empty or header-only table.
- Overlong `PATH` cells are truncated to fit terminal width via the
  existing `truncate()` helper, never wrapped.
- Color is on only when: no `--no-color` flag, no `NO_COLOR` env var,
  and the output stream is a TTY (or `--color` is explicitly passed,
  which forces it on regardless of TTY/env).

---

## File Structure

- **Create `src/cli/format.ts`** — the new shared formatting module.
  Owns `paint`, `truncate`, `shouldUseColor`, `renderTable`,
  `emptyMessage`. This is the single place ANSI/table logic lives for
  every non-TUI command.
- **Create `test/format.test.ts`** — unit tests for every export of
  `format.ts` in isolation.
- **Modify `src/tui/renderer.ts`** — remove its private `COLORS`,
  `paint`, `truncate` and import them from `../cli/format.js` instead.
  No change to `renderTuiView`'s exported signature or output.
- **Modify `src/commands/projects.ts`** — split the bare/`list` code
  path, add flag parsing for `--no-color`/`--color`, render through
  `renderTable`/`emptyMessage`, enrich `list --json` with `activeWork`.
- **Modify `test/projects-command.test.ts`** — extend with new
  assertions for both views' plain-text rendering (color on/off, empty
  registry, long-path truncation) and the new `activeWork` JSON field.
- **No change** to `test/tui.test.ts` assertions (it must pass
  unmodified after Task 2's refactor — this is how Task 2 proves it's
  behavior-preserving).

---

### Task 1: Shared formatting module — `paint`, `truncate`, `emptyMessage`

**Files:**
- Create: `src/cli/format.ts`
- Test: `test/format.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `export type FormatTone = "neutral" | "positive" | "warning" | "negative" | "muted" | "heading"`
  - `export function paint(value: string, tone: FormatTone, color: boolean): string`
  - `export function truncate(value: string, width: number): string`
  - `export function emptyMessage(text: string): string`

These three are moved/adapted from `src/tui/renderer.ts` lines 3-24
(`COLORS`, `truncate`, `paint`) with no behavior change — same ANSI
codes, same truncation logic (ellipsis on overflow, single `"…"` when
`width <= 1`). `emptyMessage` is new and trivial (returns its input
unchanged; it exists purely so every command produces this output the
same way instead of ad-hoc string literals).

- [ ] **Step 1: Write the failing tests**

```typescript
// test/format.test.ts
import { describe, expect, it } from "vitest";
import { emptyMessage, paint, truncate } from "../src/cli/format.js";

describe("paint", () => {
  it("wraps a value in the tone's ANSI codes when color is true", () => {
    expect(paint("active", "positive", true)).toBe(
      "[32mactive[0m",
    );
  });

  it("returns the value unmodified when color is false", () => {
    expect(paint("active", "positive", false)).toBe("active");
  });

  it("supports the heading tone", () => {
    expect(paint("Title", "heading", true)).toBe(
      "[1;36mTitle[0m",
    );
  });

  it("supports the muted tone", () => {
    expect(paint("archived", "muted", true)).toBe(
      "[90marchived[0m",
    );
  });
});

describe("truncate", () => {
  it("returns short values unchanged", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("truncates long values with an ellipsis", () => {
    expect(truncate("a very long value indeed", 10)).toBe("a very lo…");
  });

  it("returns a bare ellipsis when width is 1 or less", () => {
    expect(truncate("anything", 1)).toBe("…");
    expect(truncate("anything", 0)).toBe("…");
  });
});

describe("emptyMessage", () => {
  it("returns the message unchanged", () => {
    expect(emptyMessage("No projects registered.")).toBe(
      "No projects registered.",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/vitest run test/format.test.ts`
Expected: FAIL — `Cannot find module '../src/cli/format.js'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/cli/format.ts
export type FormatTone =
  | "neutral"
  | "positive"
  | "warning"
  | "negative"
  | "muted"
  | "heading";

const COLORS: Record<FormatTone | "reset", string> = {
  neutral: "[37m",
  positive: "[32m",
  warning: "[33m",
  negative: "[31m",
  muted: "[90m",
  heading: "[1;36m",
  reset: "[0m",
};

export function paint(
  value: string,
  tone: FormatTone,
  color: boolean,
): string {
  return color ? `${COLORS[tone]}${value}${COLORS.reset}` : value;
}

export function truncate(value: string, width: number): string {
  if (value.length <= width) return value;
  if (width <= 1) return "…";
  return `${value.slice(0, width - 1)}…`;
}

export function emptyMessage(text: string): string {
  return text;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/vitest run test/format.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/cli/format.ts test/format.test.ts
git commit -m "feat: add shared paint/truncate/emptyMessage formatting helpers"
```

---

### Task 2: Refactor `tui/renderer.ts` to consume the shared module

**Files:**
- Modify: `src/tui/renderer.ts`
- Test: `test/tui.test.ts` (must pass unmodified — do not edit this file
  in this task)

**Interfaces:**
- Consumes: `paint`, `truncate` from `../cli/format.js` (Task 1).
- Produces: `renderTuiView` — unchanged exported signature
  `(view: TuiViewModel, options: RenderTuiOptions): string`.

**Context:** `src/tui/renderer.ts` currently defines its own private
`COLORS` map, `paint`, and `truncate` (lines 3-32 of the current file).
This task deletes those three and imports the equivalents from
`../cli/format.js` instead. The `heading`/tone union in `format.ts`
matches `tui/renderer.ts`'s original `TuiTone | "heading"` exactly
(`neutral`/`positive`/`warning`/`negative`/`muted`/`heading`), so no
call site inside `renderTuiView` changes.

- [ ] **Step 1: Confirm the baseline passes before touching anything**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: PASS (existing baseline, establishes the "must still pass
unmodified" contract for this task)

- [ ] **Step 2: Replace the private helpers with shared imports**

Read the current top of `src/tui/renderer.ts` (lines 1-32) before
editing — replace this block:

```typescript
import { TUI_VIEW_IDS, type TuiTone, type TuiViewModel } from "./schemas.js";

const COLORS: Record<TuiTone | "heading" | "reset", string> = {
  neutral: "[37m",
  positive: "[32m",
  warning: "[33m",
  negative: "[31m",
  muted: "[90m",
  heading: "[1;36m",
  reset: "[0m",
};

export interface RenderTuiOptions {
  projectName: string;
  width?: number;
  color?: boolean;
  notice?: string;
}

function truncate(value: string, width: number): string {
  if (value.length <= width) return value;
  if (width <= 1) return "…";
  return `${value.slice(0, width - 1)}…`;
}

function paint(
  value: string,
  tone: TuiTone | "heading",
  color: boolean,
): string {
  return color ? `${COLORS[tone]}${value}${COLORS.reset}` : value;
}
```

with:

```typescript
import { paint, truncate } from "../cli/format.js";
import { TUI_VIEW_IDS, type TuiViewModel } from "./schemas.js";

export interface RenderTuiOptions {
  projectName: string;
  width?: number;
  color?: boolean;
  notice?: string;
}
```

The rest of `renderTuiView` (the function body calling `paint(...)` and
`truncate(...)`) is untouched — those calls already match `format.ts`'s
signatures exactly since they were the source the module was extracted
from.

- [ ] **Step 3: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors (confirms `TuiTone` import removal didn't orphan
any other usage in the file — if `TuiTone` is still referenced
elsewhere in `renderer.ts`, this will fail and the import must be kept
alongside the new one)

- [ ] **Step 4: Run the TUI test suite unmodified to confirm behavior preservation**

Run: `./node_modules/.bin/vitest run test/tui.test.ts`
Expected: PASS — identical pass count to Step 1, zero assertion
changes needed

- [ ] **Step 5: Commit**

```bash
git add src/tui/renderer.ts
git commit -m "refactor: tui renderer consumes shared cli/format helpers"
```

---

### Task 3: `renderTable` and `shouldUseColor`

**Files:**
- Modify: `src/cli/format.ts`
- Modify: `test/format.test.ts`

**Interfaces:**
- Consumes: `paint`, `truncate` (this file, Task 1).
- Produces:
  - `export interface FormatColumn { header: string; tone?: (cell: string) => FormatTone }`
  - `export function renderTable(columns: readonly FormatColumn[], rows: readonly (readonly string[])[], options: { color: boolean; width?: number }): string`
  - `export interface ShouldUseColorOptions { noColor: boolean; color: boolean; env: Record<string, string | undefined>; isTTY: boolean }`
  - `export function shouldUseColor(options: ShouldUseColorOptions): boolean`

**Design notes:**
- `renderTable` computes each column's width as
  `Math.max(header.length, ...cells in that column, by index)`, then
  pads every header and cell to that width with `padEnd`. The `PATH`-style
  last column is the only one allowed to exceed available terminal
  width — this task builds the general mechanism; Task 5 decides which
  column receives the width cap when rendering `projects`. `renderTable`
  itself takes a single overall `width` budget: if the sum of all
  column widths (plus 2-space gutters between columns) exceeds `width`,
  the *last* column is truncated via `truncate()` down to whatever
  space remains (minimum 10 characters) — this generic last-column
  truncation is what Task 5 relies on for the `PATH` column.
- Row rendering applies `column.tone(cell)` per cell when a tone
  function is provided for that column, else renders the cell
  unpainted (tone `"neutral"` with `color` still respected, i.e.
  `paint(cell, "neutral", color)` renders as plain text since
  `"neutral"` is white — for parity with the rest of the codebase, plain
  cells should call `paint(cell, "neutral", false)` regardless of the
  `color` flag, i.e. only apply color when a tone function is actually
  supplied). Concretely: if `column.tone` is undefined, the cell is
  rendered as the raw string with no ANSI wrapping at all.
- The header row and a `─`-repeated separator line beneath it are
  always rendered in the `"heading"` tone (matching `tui/renderer.ts`'s
  existing section-header convention), respecting `color`.
- `shouldUseColor` is a pure function (no `process.*` access) so it's
  trivially testable; call sites (Task 5) pass in `process.env`,
  `process.stdout.isTTY === true`, and parsed flags.

- [ ] **Step 1: Write the failing tests**

```typescript
// append to test/format.test.ts
import { renderTable, shouldUseColor, type FormatColumn } from "../src/cli/format.js";

describe("renderTable", () => {
  const columns: FormatColumn[] = [
    { header: "NAME" },
    { header: "STATUS", tone: (cell) => (cell === "active" ? "positive" : "muted") },
  ];

  it("renders an aligned header and rows with no color", () => {
    const output = renderTable(
      columns,
      [
        ["autoforge", "active"],
        ["old-project", "archived"],
      ],
      { color: false },
    );
    const lines = output.split("\n");
    expect(lines[0]).toBe("NAME         STATUS  ");
    expect(lines[1]).toBe("─".repeat(21));
    expect(lines[2]).toBe("autoforge    active  ");
    expect(lines[3]).toBe("old-project  archived");
  });

  it("colors cells using each column's tone function", () => {
    const output = renderTable(
      columns,
      [["autoforge", "active"]],
      { color: true },
    );
    expect(output).toContain("[32mactive[0m");
  });

  it("leaves cells unpainted when no tone function is given for that column", () => {
    const output = renderTable(
      columns,
      [["autoforge", "active"]],
      { color: true },
    );
    expect(output).toContain("autoforge");
    expect(output).not.toContain("[37mautoforge");
  });

  it("truncates the last column to fit the given width", () => {
    const wideColumns: FormatColumn[] = [
      { header: "NAME" },
      { header: "PATH" },
    ];
    const output = renderTable(
      wideColumns,
      [["autoforge", "/a/very/long/path/that/will/not/fit/in/the/given/width"]],
      { color: false, width: 30 },
    );
    const lines = output.split("\n");
    expect(lines[2].length).toBeLessThanOrEqual(30);
    expect(lines[2]).toContain("…");
  });
});

describe("shouldUseColor", () => {
  it("is false when --no-color is passed, regardless of everything else", () => {
    expect(
      shouldUseColor({ noColor: true, color: true, env: {}, isTTY: true }),
    ).toBe(false);
  });

  it("is true when --color is passed, even without a TTY", () => {
    expect(
      shouldUseColor({ noColor: false, color: true, env: {}, isTTY: false }),
    ).toBe(true);
  });

  it("is false when NO_COLOR is set in the environment", () => {
    expect(
      shouldUseColor({
        noColor: false,
        color: false,
        env: { NO_COLOR: "1" },
        isTTY: true,
      }),
    ).toBe(false);
  });

  it("is false when stdout is not a TTY", () => {
    expect(
      shouldUseColor({ noColor: false, color: false, env: {}, isTTY: false }),
    ).toBe(false);
  });

  it("is true by default on an interactive TTY with no flags or env set", () => {
    expect(
      shouldUseColor({ noColor: false, color: false, env: {}, isTTY: true }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/vitest run test/format.test.ts`
Expected: FAIL — `renderTable`/`shouldUseColor`/`FormatColumn` not
exported yet

- [ ] **Step 3: Write the implementation**

Append to `src/cli/format.ts`:

```typescript
export interface FormatColumn {
  header: string;
  tone?: (cell: string) => FormatTone;
}

export function renderTable(
  columns: readonly FormatColumn[],
  rows: readonly (readonly string[])[],
  options: { color: boolean; width?: number },
): string {
  const widths = columns.map((column, index) =>
    Math.max(
      column.header.length,
      ...rows.map((row) => (row[index] ?? "").length),
    ),
  );
  const gutter = 2;
  const totalWidth = options.width ?? 100;
  const fixedWidth =
    widths.slice(0, -1).reduce((sum, w) => sum + w + gutter, 0);
  const lastColumnBudget = Math.max(10, totalWidth - fixedWidth);
  const renderedWidths = widths.map((width, index) =>
    index === widths.length - 1 ? Math.min(width, lastColumnBudget) : width,
  );

  const renderRow = (cells: readonly string[], tone: boolean): string =>
    cells
      .map((cell, index) => {
        const width = renderedWidths[index] ?? cell.length;
        const truncated = truncate(cell, width);
        const padded = truncated.padEnd(width);
        if (!tone) return padded;
        const columnTone = columns[index]?.tone;
        return columnTone ? paint(padded, columnTone(cell), options.color) : padded;
      })
      .join(" ".repeat(gutter));

  const headerRow = paint(
    renderRow(
      columns.map((column) => column.header),
      false,
    ),
    "heading",
    options.color,
  );
  const separator = paint(
    "─".repeat(
      renderedWidths.reduce((sum, w) => sum + w, 0) +
        gutter * (renderedWidths.length - 1),
    ),
    "heading",
    options.color,
  );
  const dataRows = rows.map((row) => renderRow(row, true));
  return [headerRow, separator, ...dataRows].join("\n");
}

export interface ShouldUseColorOptions {
  noColor: boolean;
  color: boolean;
  env: Record<string, string | undefined>;
  isTTY: boolean;
}

export function shouldUseColor(options: ShouldUseColorOptions): boolean {
  if (options.noColor) return false;
  if (options.color) return true;
  if (options.env.NO_COLOR !== undefined) return false;
  return options.isTTY;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/vitest run test/format.test.ts`
Expected: PASS (all tests from Task 1 and Task 3)

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/cli/format.ts test/format.test.ts
git commit -m "feat: add renderTable and shouldUseColor to cli/format"
```

---

### Task 4: Fix bare `autoforge projects --json` argument parsing

**Files:**
- Modify: `src/commands/projects.ts`
- Test: `test/projects-command.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: no new exports — this task only fixes argument parsing in
  `runProjectsCommand` so the existing behavior described in the v0.25
  spec ("bare `autoforge projects --json` is unchanged") is actually
  true, since verification during planning found bare `--json` is
  currently broken (it hits the usage-error branch because `rawAction`
  becomes the literal string `"--json"` when no action word is given).

**Context:** Read `src/commands/projects.ts` lines 29-34 before editing.
Currently:

```typescript
const [rawAction, projectPath, flag] = options.args;
const action = rawAction ?? "list";
const json = flag === "--json" || projectPath === "--json";
```

When invoked as `autoforge projects --json` (no action word), `args`
is `["--json"]`, so `rawAction` is `"--json"` — not `undefined` — and
`action` becomes `"--json"`, which matches no branch and falls through
to the final `else return usage(...)`.

- [ ] **Step 1: Write the failing test**

```typescript
// add to test/projects-command.test.ts, inside describe("projects command", ...)
it("accepts --json with no action word as the bare JSON view", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
  roots.push(home);
  const project = path.join(home, "project");
  await new GlobalWorkspaceStore(home).registerProject(project);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runProjectsCommand({
      args: ["--json"],
      output,
      homeDirectory: home,
    }),
  ).resolves.toBe(0);
  expect(output.stdout).toHaveBeenCalledWith(
    expect.stringContaining('"path":'),
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./node_modules/.bin/vitest run test/projects-command.test.ts -t "accepts --json with no action word"`
Expected: FAIL — resolves to `2` (usage error) instead of `0`

- [ ] **Step 3: Fix the argument parsing**

Replace the destructuring at the top of `runProjectsCommand`:

```typescript
const [rawAction, projectPath, flag] = options.args;
const action = rawAction ?? "list";
const json = flag === "--json" || projectPath === "--json";
```

with:

```typescript
const isBareJsonFlag = options.args[0] === "--json";
const [rawAction, projectPath, flag] = isBareJsonFlag
  ? [undefined, undefined, options.args[0]]
  : options.args;
const action = rawAction ?? "list";
const json =
  flag === "--json" || projectPath === "--json" || isBareJsonFlag;
```

This treats a leading `--json` (with nothing before it) as the bare
view's JSON flag rather than an action word, while every other
existing call shape (`["list", "--json"]`, `["show", path, "--json"]`,
etc.) is untouched since `isBareJsonFlag` is only true when `args[0]`
is literally `"--json"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `./node_modules/.bin/vitest run test/projects-command.test.ts -t "accepts --json with no action word"`
Expected: PASS

- [ ] **Step 5: Run the full existing projects-command suite to confirm no regressions**

Run: `./node_modules/.bin/vitest run test/projects-command.test.ts`
Expected: PASS (all tests, including the pre-existing ones)

- [ ] **Step 6: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/commands/projects.ts test/projects-command.test.ts
git commit -m "fix: accept bare 'autoforge projects --json' with no action word"
```

---

### Task 5: Split bare `projects` and `projects list` into two rendered views

**Files:**
- Modify: `src/commands/projects.ts`
- Modify: `test/projects-command.test.ts`

**Interfaces:**
- Consumes: `renderTable`, `shouldUseColor`, `emptyMessage`,
  `FormatColumn` from `../cli/format.js` (Tasks 1, 3);
  `inspectProjectSummary` from `../workspace/inventory.js` (already
  imported in this file).
- Produces: no new exported functions — `runProjectsCommand`'s
  behavior changes as described below; this is the task the whole
  spec exists to deliver.

**Context:** Read the full current `action === "list"` branch at
`src/commands/projects.ts` lines 323-353 before editing (reproduced
here for reference):

```typescript
} else if (action === "list") {
  const config = await store.read().catch(() => ({
    version: "0.11.0" as const,
    projects: [],
    projectMetadata: {},
  }));
  options.output.stdout(
    json
      ? JSON.stringify(
          config.projects.map((project) => ({
            path: project,
            metadata:
              (
                config.projectMetadata as
                  Record<string, unknown> | undefined
              )?.[project] ?? null,
          })),
          null,
          2,
        )
      : config.projects
          .map((project) => {
            const metadata = (
              config.projectMetadata as
                | Record<string, { name: string; lifecycle?: string }>
                | undefined
            )?.[project];
            return `${metadata?.lifecycle ?? "active"}\t${metadata?.name ?? project}\t${project}`;
          })
          .join("\n"),
  );
} else return usage(options.output);
```

Also read the argument-count guard at lines 287-300 (the ternary chain
ending `: action === "list" ? options.args.length > 2 || (options.args.length === 2 && !json) : options.args.length !== 1`)
— it currently treats `"list"` as the only bare-capable action, since
`rawAction ?? "list"` (from `runProjectsCommand`'s top, now also
patched in Task 4) makes bare invocation equal to `"list"`. This task
must distinguish "no action word was given" (bare) from "the action
word `list` was given explicitly", since they now render differently.

Introduce a new local: `const isBareInvocation = rawAction === undefined;`
placed right after the `action` assignment. Use this to pick between
the two branches below. Both branches share flag parsing for
`--no-color`/`--color`, so extract a small local helper at the top of
the function (after the existing destructuring) rather than duplicating
it in each branch:

```typescript
const noColorFlagPresent = options.args.includes("--no-color");
const colorFlagPresent = options.args.includes("--color");
```

(These two flags only need to be recognized for `action === "list"`
and bare invocation in this task — they are additive, optional flags
that do not appear in any other action's usage string, so no other
branch's argument-count guard needs to change to tolerate them. The
argument-count guard for `list` at lines 296-297 must be widened to
also tolerate `--no-color`/`--color` appearing anywhere in `args`
alongside `--json` — see Step 3 below.)

- [ ] **Step 1: Write the failing tests**

```typescript
// add to test/projects-command.test.ts

it("renders bare projects as an aligned table with a header row", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
  roots.push(home);
  const project = path.join(home, "project");
  await new GlobalWorkspaceStore(home).registerProject(project);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runProjectsCommand({
      args: ["--no-color"],
      output,
      homeDirectory: home,
    }),
  ).resolves.toBe(0);
  const rendered = output.stdout.mock.calls[0]?.[0] as string;
  expect(rendered).toContain("NAME");
  expect(rendered).toContain("STATUS");
  expect(rendered).toContain("PATH");
  expect(rendered).toContain("project");
  expect(rendered).toContain(project);
  expect(rendered).not.toContain("ACTIVE WORK");
});

it("renders projects list with an ACTIVE WORK column", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
  roots.push(home);
  const project = path.join(home, "project");
  await mkdir(path.join(project, ".autoforge/state"), { recursive: true });
  await writeFile(
    path.join(project, ".autoforge/state/work.json"),
    JSON.stringify({
      data: { activeWork: { kind: "task", id: "task.example" } },
    }),
  );
  await new GlobalWorkspaceStore(home).registerProject(project);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runProjectsCommand({
      args: ["list", "--no-color"],
      output,
      homeDirectory: home,
    }),
  ).resolves.toBe(0);
  const rendered = output.stdout.mock.calls[0]?.[0] as string;
  expect(rendered).toContain("ACTIVE WORK");
  expect(rendered).toContain("task.example");
});

it("shows an em dash in ACTIVE WORK for idle projects", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
  roots.push(home);
  const project = path.join(home, "project");
  await new GlobalWorkspaceStore(home).registerProject(project);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runProjectsCommand({
      args: ["list", "--no-color"],
      output,
      homeDirectory: home,
    }),
  ).resolves.toBe(0);
  const rendered = output.stdout.mock.calls[0]?.[0] as string;
  expect(rendered).toContain("—");
});

it("prints an empty message when no projects are registered", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
  roots.push(home);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runProjectsCommand({
      args: [],
      output,
      homeDirectory: home,
    }),
  ).resolves.toBe(0);
  expect(output.stdout).toHaveBeenCalledWith("No projects registered.");
});

it("enriches list --json with an activeWork field", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
  roots.push(home);
  const project = path.join(home, "project");
  await mkdir(path.join(project, ".autoforge/state"), { recursive: true });
  await writeFile(
    path.join(project, ".autoforge/state/work.json"),
    JSON.stringify({
      data: { activeWork: { kind: "issue", id: "issue.example" } },
    }),
  );
  await new GlobalWorkspaceStore(home).registerProject(project);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runProjectsCommand({
      args: ["list", "--json"],
      output,
      homeDirectory: home,
    }),
  ).resolves.toBe(0);
  const parsed = JSON.parse(output.stdout.mock.calls[0]?.[0] as string);
  expect(parsed[0]).toMatchObject({
    path: project,
    activeWork: { kind: "issue", id: "issue.example" },
  });
});

it("bare --json output has no activeWork field", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
  roots.push(home);
  const project = path.join(home, "project");
  await new GlobalWorkspaceStore(home).registerProject(project);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runProjectsCommand({
      args: ["--json"],
      output,
      homeDirectory: home,
    }),
  ).resolves.toBe(0);
  const parsed = JSON.parse(output.stdout.mock.calls[0]?.[0] as string);
  expect(parsed[0]).not.toHaveProperty("activeWork");
  expect(parsed[0]).toMatchObject({ path: project, metadata: null });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./node_modules/.bin/vitest run test/projects-command.test.ts`
Expected: FAIL on all six new tests (old plain-text output has no
`NAME`/`STATUS`/`ACTIVE WORK` headers, no em dash, no empty message,
and `list --json` has no `activeWork` field yet)

- [ ] **Step 3: Implement the two views**

First widen the `list` argument-count guard (lines 296-297) to also
tolerate the two new flags. Change:

```typescript
: action === "list"
  ? options.args.length > 2 || (options.args.length === 2 && !json)
  : options.args.length !== 1
```

to:

```typescript
: action === "list"
  ? options.args
      .slice(1)
      .some(
        (arg) =>
          arg !== "--json" && arg !== "--no-color" && arg !== "--color",
      )
  : options.args.length !== 1
```

This accepts any combination of `--json`/`--no-color`/`--color` after
`list` (in any order, since users may type `list --no-color --json` or
`list --json --no-color`) and rejects anything else, replacing the
previous positional-count check (which only tolerated exactly one
trailing `--json`).

Now replace the entire `action === "list"` branch (identified in the
Context section above) with:

```typescript
} else if (action === "list" || isBareInvocation) {
  const config = await store.read().catch(() => ({
    version: "0.11.0" as const,
    projects: [],
    projectMetadata: {},
  }));
  const metadataMap = config.projectMetadata as
    | Record<string, { name?: string; lifecycle?: string }>
    | undefined;
  const color = shouldUseColor({
    noColor: noColorFlagPresent,
    color: colorFlagPresent,
    env: process.env,
    isTTY: process.stdout.isTTY === true,
  });

  if (action === "list") {
    const rows = await Promise.all(
      config.projects.map(async (project) => {
        const metadata = metadataMap?.[project];
        const summary = await inspectProjectSummary(project).catch(
          () => ({ activeWork: null }) as { activeWork: { kind: string; id: string } | null },
        );
        return { project, metadata, activeWork: summary.activeWork };
      }),
    );
    if (json) {
      options.output.stdout(
        JSON.stringify(
          rows.map(({ project, metadata, activeWork }) => ({
            path: project,
            metadata: metadata ?? null,
            activeWork,
          })),
          null,
          2,
        ),
      );
    } else if (rows.length === 0) {
      options.output.stdout(emptyMessage("No projects registered."));
    } else {
      options.output.stdout(
        renderTable(
          [
            { header: "NAME" },
            {
              header: "STATUS",
              tone: (cell) => (cell === "active" ? "positive" : "muted"),
            },
            { header: "PATH" },
            { header: "ACTIVE WORK" },
          ],
          rows.map(({ project, metadata, activeWork }) => [
            metadata?.name ?? project,
            metadata?.lifecycle ?? "active",
            project,
            activeWork ? `${activeWork.kind}.${activeWork.id}` : "—",
          ]),
          { color },
        ),
      );
    }
  } else {
    if (json) {
      options.output.stdout(
        JSON.stringify(
          config.projects.map((project) => ({
            path: project,
            metadata: metadataMap?.[project] ?? null,
          })),
          null,
          2,
        ),
      );
    } else if (config.projects.length === 0) {
      options.output.stdout(emptyMessage("No projects registered."));
    } else {
      options.output.stdout(
        renderTable(
          [
            { header: "NAME" },
            {
              header: "STATUS",
              tone: (cell) => (cell === "active" ? "positive" : "muted"),
            },
            { header: "PATH" },
          ],
          config.projects.map((project) => [
            metadataMap?.[project]?.name ?? project,
            metadataMap?.[project]?.lifecycle ?? "active",
            project,
          ]),
          { color },
        ),
      );
    }
  }
} else return usage(options.output);
```

Add the required imports at the top of `src/commands/projects.ts`:

```typescript
import {
  emptyMessage,
  renderTable,
  shouldUseColor,
} from "../cli/format.js";
```

Add the `isBareInvocation` and flag-detection locals near the top of
`runProjectsCommand`, immediately after the (Task 4-patched) `action`
assignment:

```typescript
const isBareInvocation = rawAction === undefined;
const noColorFlagPresent = options.args.includes("--no-color");
const colorFlagPresent = options.args.includes("--color");
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./node_modules/.bin/vitest run test/projects-command.test.ts`
Expected: PASS (all tests, old and new)

Note: the pre-existing test `"lists projects as text when no action is
given"` (asserts `output.stdout` was called with a string containing
`project`'s path) continues to pass unmodified, since the new bare
table view still contains the full path in its `PATH` column and the
assertion is a loose `stringContaining` check.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Run the full test suite**

Run: `./node_modules/.bin/vitest run`
Expected: PASS — full suite green, no regressions in any other command's
tests

- [ ] **Step 7: Commit**

```bash
git add src/commands/projects.ts test/projects-command.test.ts
git commit -m "feat: prettify 'autoforge projects' and 'projects list' as tables"
```

---

### Task 6: Update the CLI reference and usage string

**Files:**
- Modify: `docs/AUTOFORGE_CLI_REFERENCE.md`
- Modify: `src/commands/projects.ts` (usage string only)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new — documentation and help-text accuracy only.

**Context:** The usage string at the top of `src/commands/projects.ts`
(the `usage()` function, currently reading
`"Usage: autoforge projects [list [--json] | show <path|project_name> [--json] | ..."`)
needs `--no-color`/`--color` added to the `list` segment so
`autoforge projects` with a bad flag combination reports accurate
usage. The CLI reference's "Global Workspace" section needs a short
note describing the new table output and the `activeWork` JSON field.

- [ ] **Step 1: Update the usage string**

In `src/commands/projects.ts`, find:

```typescript
"Usage: autoforge projects [list [--json] | show <path|project_name> [--json] | relocate <path|project_name> <new-path> [--planned] | move <path|project_name> <new-path> [--planned] | storage <path> [--json] | global-storage <path> [--json] | global-export <path> [--json] | global-import <path> <bundle> [--json] | update <path> [--name <name>] [--alias <alias>] [--lifecycle <state>] [--retention-days <n>] | archive <path> | restore <path> | register <path> | prune [--dry-run]]",
```

Replace with:

```typescript
"Usage: autoforge projects [--json] [--no-color] [--color] [list [--json] [--no-color] [--color] | show <path|project_name> [--json] | relocate <path|project_name> <new-path> [--planned] | move <path|project_name> <new-path> [--planned] | storage <path> [--json] | global-storage <path> [--json] | global-export <path> [--json] | global-import <path> <bundle> [--json] | update <path> [--name <name>] [--alias <alias>] [--lifecycle <state>] [--retention-days <n>] | archive <path> | restore <path> | register <path> | prune [--dry-run]]",
```

- [ ] **Step 2: Verify the usage-error path still works**

Run: `./node_modules/.bin/vitest run test/projects-command.test.ts -t "rejects a trailing flag on list that is not --json"`
Expected: PASS (this test only checks the exit code and that stderr
contains `"Usage:"`, so the wording change doesn't break it)

- [ ] **Step 3: Update the CLI reference doc**

In `docs/AUTOFORGE_CLI_REFERENCE.md`, find the "Global Workspace"
section (the code block starting `autoforge projects list [--json]`).
Immediately after that code block's closing fence, add:

```markdown
`autoforge projects` (bare) renders a fast NAME/STATUS/PATH table from
the global registry alone. `autoforge projects list` additionally reads
each project's active work and renders a fourth ACTIVE WORK column —
slower by design, since it reads every registered project's state.
Both accept `--no-color`/`--color` to override the default (color when
attached to a terminal, auto-disabled when piped or when `NO_COLOR` is
set). `--json` output is never colorized; `projects list --json` adds
an `activeWork: { kind, id } | null` field per entry that bare
`projects --json` does not have.
```

- [ ] **Step 4: Commit**

```bash
git add src/commands/projects.ts docs/AUTOFORGE_CLI_REFERENCE.md
git commit -m "docs: document prettified projects table output and flags"
```

---

## Final Verification

After Task 6, run the complete verification sequence used for every
prior AutoForge release before considering this plan done:

```bash
rm -rf dist
npm run build
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/prettier --check src/cli/format.ts src/tui/renderer.ts src/commands/projects.ts test/format.test.ts test/projects-command.test.ts docs/AUTOFORGE_CLI_REFERENCE.md
./node_modules/.bin/vitest run
node --test tests/*.test.js
node dist/cli.js projects
node dist/cli.js projects list
node dist/cli.js projects --json
node dist/cli.js projects list --json
```

Expected: clean build, zero typecheck errors, zero prettier warnings on
the files this plan touched, full vitest + legacy suite green, and the
four manual CLI invocations render a table (first two), and valid JSON
(last two) with `list --json` showing an `activeWork` field per entry.
