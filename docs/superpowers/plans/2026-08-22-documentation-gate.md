# Documentation Gate & Changelog Compilation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "was this change documented" a structurally enforced condition of closing `issue`/`task` work in AutoForge, and auto-compile `CHANGELOG.md` from the resulting decision records, so documentation can no longer silently lapse the way it did between v0.6.0 and v0.21.0.

**Architecture:** Add a `kind` field to the existing decision schema (`architecture` | `bugfix` | `feature-note` | `skip-reason`, default `architecture`). Gate `autoforge done` on `issue`/`task` completion to require at least one decision whose `relatedWork` includes the active work item, with an auditable `--no-decision "<reason>"` bypass. Add `autoforge changelog compile [--since <tag>]` to render `bugfix`/`feature-note` decisions since the last version tag into `CHANGELOG.md`.

**Tech Stack:** TypeScript, Zod schemas, Vitest, existing `AtomicStateStore`/`WorkLifecycleService`/`DecisionService` primitives — no new dependencies.

## Global Constraints

- Every source and test file must pass `npm run format:check` (Prettier) before commit.
- Every task must leave `npm run typecheck` and `npm test` green — no unrelated regressions.
- Decision schema changes must be additive/backward compatible: all 22+ existing decision records (no `kind` field) must continue to load, treated as `kind: "architecture"`.
- `feature` and `phase` completion must remain completely unaffected — no gate applies to those kinds.
- New CLI commands/flags follow the existing router pattern: interface entry in `src/cli/router.ts`, wiring in `src/cli/index.ts`, usage text in `src/cli/help.ts`.
- Exit codes must use the existing `EXIT_CODE` constants from `src/core/errors.ts` (`invalidState = 4`) — no new exit codes.

---

### Task 1: Add `kind` field to the decision schema

**Files:**
- Modify: `src/decisions/schemas.ts`
- Test: `test/decision-schemas.test.ts`

**Interfaces:**
- Produces: `decisionKindSchema` (Zod enum: `"architecture" | "bugfix" | "feature-note" | "skip-reason"`), exported `DecisionKind` type, and `decision.kind: DecisionKind` field (required in the schema, always present after parsing — callers that don't supply it get `"architecture"` via a default at the schema level).

- [ ] **Step 1: Write the failing test**

Add to `test/decision-schemas.test.ts` (create the block; do not remove existing tests):

```typescript
import { decisionSchema } from "../src/decisions/schemas.js";

describe("decision kind", () => {
  it("defaults kind to architecture when omitted", () => {
    const decision = decisionSchema.parse({
      id: "decision.example",
      statement: "Example statement.",
      reasoning: "Example reasoning.",
      consequences: ["Example consequence."],
      scope: ["example"],
      keywords: ["example"],
      relatedWork: [],
      supersedes: null,
      status: "active",
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    });
    expect(decision.kind).toBe("architecture");
  });

  it("accepts an explicit bugfix kind", () => {
    const decision = decisionSchema.parse({
      id: "decision.example-bugfix",
      statement: "Example statement.",
      reasoning: "Example reasoning.",
      consequences: ["Example consequence."],
      scope: ["example"],
      keywords: ["example"],
      relatedWork: [],
      supersedes: null,
      status: "active",
      kind: "bugfix",
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    });
    expect(decision.kind).toBe("bugfix");
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      decisionSchema.parse({
        id: "decision.example-bad-kind",
        statement: "Example statement.",
        reasoning: "Example reasoning.",
        consequences: ["Example consequence."],
        scope: ["example"],
        keywords: ["example"],
        relatedWork: [],
        supersedes: null,
        status: "active",
        kind: "not-a-real-kind",
        createdAt: "2026-08-22T00:00:00.000Z",
        updatedAt: "2026-08-22T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/decision-schemas.test.ts`
Expected: FAIL — `decision.kind` is `undefined`, first assertion fails (schema currently uses `.strict()` with no `kind` field, so `kind` in the input is actually stripped/rejected depending on presence; the `defaults kind` test fails because `.kind` is `undefined` rather than `"architecture"`).

- [ ] **Step 3: Add the schema field**

In `src/decisions/schemas.ts`, add near the top (after `decisionStatusSchema`):

```typescript
export const decisionKindSchema = z
  .enum(["architecture", "bugfix", "feature-note", "skip-reason"])
  .default("architecture");
```

Add `kind: decisionKindSchema,` to the `decisionSchema` object, placed after `status: decisionStatusSchema,`:

```typescript
export const decisionSchema = z
  .object({
    id: decisionIdSchema,
    statement: z.string().trim().min(1).max(2_000),
    reasoning: z.string().trim().min(1).max(20_000),
    consequences: z.array(z.string().trim().min(1).max(2_000)).min(1),
    scope: z.array(searchableTagSchema).min(1),
    keywords: z.array(searchableTagSchema).min(1),
    relatedWork: z.array(relatedWorkIdSchema),
    supersedes: decisionIdSchema.nullable(),
    status: decisionStatusSchema,
    kind: decisionKindSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
```

Add the exported type near the bottom, next to `DecisionStatus`:

```typescript
export type DecisionKind = z.infer<typeof decisionKindSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/decision-schemas.test.ts`
Expected: PASS (all three new tests, plus every pre-existing test in the file since `.default()` makes the field optional on input and always present on output).

- [ ] **Step 5: Run the full decisions test slice for regressions**

Run: `npx vitest run test/decision-schemas.test.ts test/decision-store.test.ts test/decision-service.test.ts test/decision-search.test.ts test/decide.test.ts test/why.test.ts`
Expected: PASS — existing decision fixtures with no `kind` field still parse (defaulted to `"architecture"`), `decisionMemorySchema` round-trips.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/decisions/schemas.ts test/decision-schemas.test.ts
git commit -m "feat: add kind field to decision schema"
```

---

### Task 2: Thread `--kind` through `autoforge decide`

**Files:**
- Modify: `src/decisions/service.ts`
- Modify: `src/commands/decide.ts`
- Test: `test/decision-service.test.ts`
- Test: `test/decide.test.ts`

**Interfaces:**
- Consumes: `decisionKindSchema`, `DecisionKind` from Task 1 (`src/decisions/schemas.js`).
- Produces: `RecordDecisionInput.kind?: DecisionKind` (optional, defaults to `"architecture"` inside `DecisionService.record()`); `autoforge decide --kind <value>` CLI flag.

- [ ] **Step 1: Write the failing service test**

Add to `test/decision-service.test.ts` (follow the existing fixture pattern already used in that file for constructing `DecisionService` — reuse whatever store-setup helper the file already defines rather than redefining one):

```typescript
it("records an explicit decision kind", async () => {
  const { service } = createFixture(); // use the file's existing fixture helper
  const result = await service.record({
    statement: "Fix null pointer on empty cart.",
    reasoning: "Cart total crashed when no items were present.",
    consequences: ["Guard the total calculation against an empty array."],
    scope: ["checkout"],
    keywords: ["bugfix", "cart"],
    relatedWork: [],
    kind: "bugfix",
  });
  expect(result.decision.kind).toBe("bugfix");
});

it("defaults decision kind to architecture when not provided", async () => {
  const { service } = createFixture();
  const result = await service.record({
    statement: "Use Postgres for durable storage.",
    reasoning: "Matches existing operational tooling.",
    consequences: ["Provision a Postgres instance."],
    scope: ["storage"],
    keywords: ["database"],
    relatedWork: [],
  });
  expect(result.decision.kind).toBe("architecture");
});
```

If `test/decision-service.test.ts` does not already export/expose a `createFixture()`-style helper, inspect the file first and match its actual existing setup pattern instead of introducing a new one.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/decision-service.test.ts`
Expected: FAIL — TypeScript error or `result.decision.kind` is `"architecture"` when `"bugfix"` was requested (because `record()` doesn't read `input.kind` yet).

- [ ] **Step 3: Update `RecordDecisionInput` and `record()` in `src/decisions/service.ts`**

Add `kind` to the interface:

```typescript
export interface RecordDecisionInput {
  statement: string;
  reasoning: string;
  consequences: string[];
  scope: string[];
  keywords: string[];
  relatedWork: string[];
  supersedes?: string;
  kind?: import("./schemas.js").DecisionKind;
}
```

In `record()`, pass it through to `decisionSchema.parse(...)`:

```typescript
const decision = decisionSchema.parse({
  id: allocateDecisionId(
    input.statement,
    new Set(decisionState.data.decisions.map((item) => item.id)),
  ),
  statement: input.statement,
  reasoning: input.reasoning,
  consequences: input.consequences,
  scope: input.scope,
  keywords: input.keywords,
  relatedWork: input.relatedWork,
  supersedes: target?.id ?? null,
  status: "active",
  kind: input.kind ?? "architecture",
  createdAt: timestamp,
  updatedAt: timestamp,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/decision-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing CLI test**

Add to `test/decide.test.ts` (match the file's existing fixture/setup pattern — inspect it first):

```typescript
it("accepts an explicit --kind flag", async () => {
  const { projectRoot } = await createFixture(); // match file's actual helper name/shape
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runDecideCommand({
      args: [
        "--statement", "Fix null pointer on empty cart.",
        "--reasoning", "Cart total crashed when no items were present.",
        "--consequence", "Guard the total calculation.",
        "--scope", "checkout",
        "--keyword", "bugfix",
        "--kind", "bugfix",
      ],
      output,
      startDirectory: projectRoot,
    }),
  ).resolves.toBe(EXIT_CODE.success);
});

it("rejects --kind provided more than once", async () => {
  const { projectRoot } = await createFixture();
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runDecideCommand({
      args: [
        "--statement", "Example.",
        "--reasoning", "Example.",
        "--consequence", "Example.",
        "--scope", "example",
        "--keyword", "example",
        "--kind", "bugfix",
        "--kind", "architecture",
      ],
      output,
      startDirectory: projectRoot,
    }),
  ).resolves.toBe(EXIT_CODE.usage);
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run test/decide.test.ts`
Expected: FAIL — `--kind` is rejected as `Unknown decide option: --kind` (exit code usage, not success) for the first test.

- [ ] **Step 7: Add `--kind` parsing in `src/commands/decide.ts`**

Add `"--kind"` to `SINGLE_FLAGS`:

```typescript
const SINGLE_FLAGS = new Set(["--statement", "--reasoning", "--supersedes", "--kind"]);
```

Add `kind?: string;` to `ParsedDecideArguments`:

```typescript
interface ParsedDecideArguments {
  statement: string;
  reasoning: string;
  consequences: string[];
  scope: string[];
  keywords: string[];
  relatedWork: string[];
  supersedes?: string;
  kind?: string;
}
```

In `parseDecideArguments`, after the existing `supersedes` extraction, add kind validation and extraction:

```typescript
const KNOWN_KINDS = new Set(["architecture", "bugfix", "feature-note", "skip-reason"]);

const supersedes = singleValues.get("--supersedes");
const kind = singleValues.get("--kind");
if (kind !== undefined && !KNOWN_KINDS.has(kind)) {
  return usageError(
    output,
    `Option --kind must be one of: ${[...KNOWN_KINDS].join(", ")}.`,
  );
}
return {
  statement,
  reasoning,
  consequences,
  scope,
  keywords,
  relatedWork: repeatableValues.get("--work") ?? [],
  ...(supersedes ? { supersedes } : {}),
  ...(kind ? { kind: kind as ParsedDecideArguments["kind"] } : {}),
};
```

In `runDecideCommand`, pass `parsed.kind` through to `service.record`:

```typescript
const result = await service.record({
  ...parsed,
  kind: parsed.kind as import("../decisions/schemas.js").DecisionKind | undefined,
});
```

(If `service.record(parsed)` is already called with the full spread object, this is a no-op change — verify `parsed` already includes `kind` from Step 7's return value and remove the redundant explicit pass-through if so; keep whichever is more consistent with the existing call site.)

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run test/decide.test.ts`
Expected: PASS, including the duplicate-flag rejection (already handled by the existing `SINGLE_FLAGS` "may only be provided once" check since `--kind` is now in that set).

- [ ] **Step 9: Update CLI help text**

In `src/cli/help.ts`, find the `autoforge decide --statement ...` usage line and append `[--kind <architecture|bugfix|feature-note>]` to it (do not document `skip-reason` here — it is written automatically by the gate bypass, not a value an operator should pass by hand).

- [ ] **Step 10: Full regression check**

Run: `npm run typecheck && npx vitest run test/decision-service.test.ts test/decide.test.ts test/decision-schemas.test.ts`
Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add src/decisions/service.ts src/commands/decide.ts src/cli/help.ts test/decision-service.test.ts test/decide.test.ts
git commit -m "feat: add --kind flag to autoforge decide"
```

---

### Task 3: Gate `autoforge done` on a linked decision for issues/tasks

**Files:**
- Modify: `src/commands/done.ts`
- Modify: `test/done.test.ts` (existing "completes work from a nested project directory" test must be updated — it currently completes an issue with no linked decision)
- Test: `test/done.test.ts` (new cases)

**Interfaces:**
- Consumes: `createDecisionStore` (`src/decisions/store.js`), `DecisionService` (`src/decisions/service.js`), `Decision`/`DecisionMemory` types (`src/decisions/schemas.js`); `work.data.activeWork: { kind: "task" | "issue"; id: string; startedAt: string } | null` (already read in `done.ts`).
- Produces: `runDoneCommand` now accepts an additional CLI flag `--no-decision <reason>` (parsed from `options.args`, which was previously required to be empty — this changes `done`'s argument contract). Returns `EXIT_CODE.invalidState` (4) with a specific stderr message when the gate blocks.

- [ ] **Step 1: Write the failing "blocks" test**

Add to `test/done.test.ts`, inside the `describe("done command", ...)` block:

```typescript
it("blocks completion of an issue with no linked decision", async () => {
  const { projectRoot } = await createFixture();
  const output = { stdout: vi.fn(), stderr: vi.fn() };

  await expect(
    runDoneCommand({ args: [], output, startDirectory: projectRoot }),
  ).resolves.toBe(EXIT_CODE.invalidState);
  expect(output.stderr).toHaveBeenCalledWith(
    expect.stringContaining(
      "before closing this issue, or pass --no-decision",
    ),
  );
});

it("completes an issue with a linked decision", async () => {
  const { issue, projectRoot, workStore } = await createFixture();
  const { createDecisionStore } = await import("../src/decisions/store.js");
  const { DecisionService } = await import("../src/decisions/service.js");
  await new DecisionService(createDecisionStore(projectRoot), workStore).record({
    statement: "Document the done-command fixture.",
    reasoning: "Required by the documentation gate.",
    consequences: ["Recorded for test coverage."],
    scope: ["testing"],
    keywords: ["done-command"],
    relatedWork: [issue.entity.id],
    kind: "bugfix",
  });
  const output = { stdout: vi.fn(), stderr: vi.fn() };

  await expect(
    runDoneCommand({ args: [], output, startDirectory: projectRoot }),
  ).resolves.toBe(EXIT_CODE.success);
});

it("bypasses the gate with --no-decision and records the reason", async () => {
  const { issue, projectRoot } = await createFixture();
  const output = { stdout: vi.fn(), stderr: vi.fn() };

  await expect(
    runDoneCommand({
      args: ["--no-decision", "Trivial fixture cleanup, no design decision."],
      output,
      startDirectory: projectRoot,
    }),
  ).resolves.toBe(EXIT_CODE.success);

  const { createDecisionStore } = await import("../src/decisions/store.js");
  const { state } = await createDecisionStore(projectRoot).read();
  const skipDecision = state.data.decisions.find(
    (decision) => decision.kind === "skip-reason",
  );
  expect(skipDecision).toBeDefined();
  expect(skipDecision?.relatedWork).toContain(issue.entity.id);
  expect(skipDecision?.reasoning).toContain(
    "Trivial fixture cleanup, no design decision.",
  );
});
```

- [ ] **Step 2: Update the existing "completes work from a nested project directory" test**

That test currently completes an issue with no linked decision and will now be blocked by the gate. Insert a decision-recording step before the `runDoneCommand` call:

```typescript
it("completes work from a nested project directory", async () => {
  const {
    doctrineSessionStore,
    issue,
    projectRoot,
    sessionStore,
    workStore,
  } = await createFixture();
  const { createDecisionStore } = await import("../src/decisions/store.js");
  const { DecisionService } = await import("../src/decisions/service.js");
  await new DecisionService(createDecisionStore(projectRoot), workStore).record({
    statement: "Document the nested-directory done fixture.",
    reasoning: "Required by the documentation gate.",
    consequences: ["Recorded for test coverage."],
    scope: ["testing"],
    keywords: ["done-command"],
    relatedWork: [issue.entity.id],
  });
  const nested = path.join(projectRoot, "packages", "app");
  // ... rest of the test unchanged
```

Also check the `"preserves the lifecycle conflict when nothing is active"` test: it calls `runDoneCommand` once to complete existing active work, then again to assert a conflict. The first call will now be gated too — add the same decision-recording step before its first `runDoneCommand` call, using `createFixture()`'s returned `issue.entity.id` and `workStore`.

- [ ] **Step 3: Run tests to verify failures**

Run: `npx vitest run test/done.test.ts`
Expected: the two updated existing tests now pass (decision now exists) is not yet true — at this point the *new* "blocks"/"completes with decision"/"bypasses" tests fail because `--no-decision` is rejected as an unexpected argument (`EXIT_CODE.usage`, not `invalidState`/`success`), and the "blocks" test fails because nothing currently blocks. Confirm output shows these specific failures before proceeding.

- [ ] **Step 4: Implement the gate in `src/commands/done.ts`**

Replace the full file with:

```typescript
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { DecisionService } from "../decisions/service.js";
import { createDecisionStore } from "../decisions/store.js";
import {
  createDoctrineSessionStore,
  DoctrineSessionService,
} from "../doctrine/session.js";
import { createDoctrineStore } from "../doctrine/store.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../state/kernel.js";
import { WorkLifecycleService } from "../work/lifecycle.js";

export interface DoneCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
}

function parseDoneArguments(
  args: readonly string[],
  output: LogWriter,
): { noDecisionReason?: string } | undefined {
  if (args.length === 0) {
    return {};
  }
  if (args.length === 2 && args[0] === "--no-decision" && args[1]?.trim()) {
    return { noDecisionReason: args[1] };
  }
  output.stderr(
    'Command "done" only accepts --no-decision "<reason>", or no arguments.',
  );
  return undefined;
}

export async function runDoneCommand(
  options: DoneCommandOptions,
): Promise<ExitCode> {
  const parsedArgs = parseDoneArguments(options.args, options.output);
  if (!parsedArgs) {
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const sessionStore = createSessionStateStore(project.path);
  const doctrineSessionStore = createDoctrineSessionStore(project.path);
  const [{ state: work }, { state: session }, { state: doctrines }] =
    await Promise.all([
      workStore.read(),
      sessionStore.read(),
      createDoctrineStore(project.path).read(),
    ]);
  const sessionId = session.data.current?.id;
  if (!sessionId) {
    await new WorkLifecycleService(workStore, sessionStore).complete();
    throw new Error("Unreachable lifecycle state");
  }

  const activeWork = work.data.activeWork;
  if (activeWork && (activeWork.kind === "issue" || activeWork.kind === "task")) {
    const decisionStore = createDecisionStore(project.path);
    const { state: decisionMemory } = await decisionStore.read();
    const hasLinkedDecision = decisionMemory.data.decisions.some((decision) =>
      decision.relatedWork.includes(activeWork.id),
    );
    if (!hasLinkedDecision) {
      if (parsedArgs.noDecisionReason) {
        await new DecisionService(decisionStore, workStore).record({
          statement: `Skipped documentation for ${activeWork.id}`,
          reasoning: parsedArgs.noDecisionReason,
          consequences: [
            `${activeWork.id} was closed without a linked decision.`,
          ],
          scope: [activeWork.kind],
          keywords: ["skip-reason"],
          relatedWork: [activeWork.id],
          kind: "skip-reason",
        });
      } else {
        options.output.stderr(
          `No decision is linked to ${activeWork.id}. Run 'autoforge decide ... --work ${activeWork.id}' before closing this ${activeWork.kind}, or pass --no-decision "<reason>" to bypass.`,
        );
        return EXIT_CODE.invalidState;
      }
    }
  }

  const timestamp = (options.now ?? (() => new Date()))();
  const now = () => timestamp;
  const doctrineSession = new DoctrineSessionService(
    doctrineSessionStore,
    doctrines.data,
    work.data,
    { now },
  );
  await doctrineSession.end(sessionId);

  let result;
  try {
    result = await new WorkLifecycleService(workStore, sessionStore, {
      now,
    }).complete();
  } catch (error) {
    await doctrineSession.resume(sessionId);
    throw error;
  }
  options.output.stdout(
    `Completed ${result.completedWork.kind} ${result.completedWork.id}; ended ${result.sessionId}.`,
  );
  return EXIT_CODE.success;
}
```

Note: the "rejects command arguments" existing test in `test/done.test.ts` passes `args: ["issue.done-command"]` (a single positional argument) and expects `EXIT_CODE.usage` with stderr `'Command "done" does not accept arguments.'`. `parseDoneArguments` above returns `undefined` for that input (it's not `[]` and not the exact `["--no-decision", "<reason>"]` shape), but the stderr message text changed. Update that existing test's expected stderr string to match the new message: `'Command "done" only accepts --no-decision "<reason>", or no arguments.'`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/done.test.ts`
Expected: all PASS, including the three new tests and the two updated existing tests.

- [ ] **Step 6: Typecheck and full suite**

Run: `npm run typecheck && npm test`
Expected: clean. Pay attention to any other test file that calls `runDoneCommand` on a fixture without a linked decision — search for them:

Run: `grep -rl "runDoneCommand" test/`

For any file besides `test/done.test.ts` found by that grep, open it and add the same decision-recording step before its `runDoneCommand` calls, following the pattern from Step 2 above.

- [ ] **Step 7: Update CLI help text**

In `src/cli/help.ts`, find the `autoforge done` usage line and update it to:

```
autoforge done [--no-decision "<reason>"]
```

- [ ] **Step 8: Commit**

```bash
git add src/commands/done.ts src/cli/help.ts test/done.test.ts
git commit -m "feat: gate issue/task completion on a linked decision"
```

---

### Task 4: Build the changelog compiler core (pure function)

**Files:**
- Create: `src/changelog/compile.ts`
- Test: `test/changelog/compile.test.ts`

**Interfaces:**
- Consumes: `Decision`, `DecisionKind` types from `src/decisions/schemas.js`.
- Produces:
  ```typescript
  export interface CompileChangelogInput {
    decisions: readonly Decision[];
    sinceTimestamp: string; // ISO 8601, exclusive lower bound
  }
  export function compileChangelogSection(input: CompileChangelogInput): string;
  export function upsertChangelogSection(
    existingChangelog: string,
    compiledSection: string,
  ): string;
  ```
  `compileChangelogSection` returns a Markdown string (empty string if no qualifying decisions). `upsertChangelogSection` inserts/replaces a clearly delimited block in the existing file content without touching anything outside it.

- [ ] **Step 1: Write the failing test for `compileChangelogSection`**

Create `test/changelog/compile.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  compileChangelogSection,
  upsertChangelogSection,
} from "../../src/changelog/compile.js";
import type { Decision } from "../../src/decisions/schemas.js";

function decision(overrides: Partial<Decision>): Decision {
  return {
    id: "decision.example",
    statement: "Example statement.",
    reasoning: "Example reasoning.",
    consequences: ["Example consequence."],
    scope: ["example"],
    keywords: ["example"],
    relatedWork: [],
    supersedes: null,
    status: "active",
    kind: "architecture",
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("compileChangelogSection", () => {
  it("groups bugfix and feature-note decisions under Fixed/Added headings", () => {
    const section = compileChangelogSection({
      decisions: [
        decision({
          id: "decision.fix-enoent",
          statement: "Stores now resolve null instead of throwing ENOENT.",
          kind: "bugfix",
          createdAt: "2026-08-22T10:00:00.000Z",
        }),
        decision({
          id: "decision.add-changelog-compile",
          statement: "Add automatic changelog compilation from decisions.",
          kind: "feature-note",
          createdAt: "2026-08-22T11:00:00.000Z",
        }),
        decision({
          id: "decision.architecture-only",
          statement: "This should not appear in the changelog.",
          kind: "architecture",
          createdAt: "2026-08-22T12:00:00.000Z",
        }),
      ],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });
    expect(section).toContain("### Fixed");
    expect(section).toContain(
      "Stores now resolve null instead of throwing ENOENT.",
    );
    expect(section).toContain("### Added");
    expect(section).toContain(
      "Add automatic changelog compilation from decisions.",
    );
    expect(section).not.toContain("This should not appear in the changelog.");
  });

  it("excludes decisions created at or before sinceTimestamp", () => {
    const section = compileChangelogSection({
      decisions: [
        decision({
          statement: "Too old to include.",
          kind: "bugfix",
          createdAt: "2026-08-22T00:00:00.000Z",
        }),
      ],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });
    expect(section).toBe("");
  });

  it("returns an empty string when there are no qualifying decisions", () => {
    const section = compileChangelogSection({
      decisions: [],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });
    expect(section).toBe("");
  });
});

describe("upsertChangelogSection", () => {
  const existing = [
    "# Changelog",
    "",
    "All notable changes to this project will be documented in this file.",
    "",
    "<!-- autoforge:changelog:start -->",
    "<!-- autoforge:changelog:end -->",
    "",
    "## [0.6.0] - 2026-08-16",
    "",
    "### Major Features",
    "",
    "- Old entry that must be preserved.",
    "",
  ].join("\n");

  it("inserts the compiled section between the markers", () => {
    const result = upsertChangelogSection(existing, "### Fixed\n\n- New fix.\n");
    expect(result).toContain("<!-- autoforge:changelog:start -->");
    expect(result).toContain("### Fixed");
    expect(result).toContain("- New fix.");
    expect(result).toContain("<!-- autoforge:changelog:end -->");
    expect(result).toContain("## [0.6.0] - 2026-08-16");
    expect(result).toContain("- Old entry that must be preserved.");
  });

  it("is idempotent when re-run with the same section content", () => {
    const once = upsertChangelogSection(existing, "### Fixed\n\n- New fix.\n");
    const twice = upsertChangelogSection(once, "### Fixed\n\n- New fix.\n");
    expect(twice).toBe(once);
  });

  it("replaces prior compiled content on a subsequent run with different decisions", () => {
    const once = upsertChangelogSection(existing, "### Fixed\n\n- First fix.\n");
    const twice = upsertChangelogSection(
      once,
      "### Fixed\n\n- First fix.\n- Second fix.\n",
    );
    expect(twice).toContain("- First fix.");
    expect(twice).toContain("- Second fix.");
    // The section appears exactly once, not duplicated:
    expect(twice.split("### Fixed").length - 1).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/changelog/compile.test.ts`
Expected: FAIL — module `src/changelog/compile.ts` does not exist.

- [ ] **Step 3: Implement `src/changelog/compile.ts`**

```typescript
import type { Decision } from "../decisions/schemas.js";

export interface CompileChangelogInput {
  decisions: readonly Decision[];
  sinceTimestamp: string;
}

const KIND_HEADINGS: Record<string, string> = {
  bugfix: "### Fixed",
  "feature-note": "### Added",
};

const KIND_ORDER = ["feature-note", "bugfix"] as const;

export function compileChangelogSection(input: CompileChangelogInput): string {
  const sinceMs = Date.parse(input.sinceTimestamp);
  const qualifying = input.decisions.filter(
    (decision) =>
      (decision.kind === "bugfix" || decision.kind === "feature-note") &&
      Date.parse(decision.createdAt) > sinceMs,
  );
  if (qualifying.length === 0) {
    return "";
  }

  const sections: string[] = [];
  for (const kind of KIND_ORDER) {
    const forKind = qualifying
      .filter((decision) => decision.kind === kind)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    if (forKind.length === 0) {
      continue;
    }
    const bullets = forKind.map(
      (decision) => `- ${decision.statement} (${decision.id})`,
    );
    sections.push([KIND_HEADINGS[kind], "", ...bullets, ""].join("\n"));
  }
  return sections.join("\n");
}

const START_MARKER = "<!-- autoforge:changelog:start -->";
const END_MARKER = "<!-- autoforge:changelog:end -->";

export function upsertChangelogSection(
  existingChangelog: string,
  compiledSection: string,
): string {
  const startIndex = existingChangelog.indexOf(START_MARKER);
  const endIndex = existingChangelog.indexOf(END_MARKER);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      "CHANGELOG.md is missing the autoforge:changelog start/end markers required for compilation.",
    );
  }
  const before = existingChangelog.slice(0, startIndex + START_MARKER.length);
  const after = existingChangelog.slice(endIndex);
  const body = compiledSection.trim().length > 0 ? `\n${compiledSection.trim()}\n\n` : "\n";
  return `${before}${body}${after}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/changelog/compile.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/changelog/compile.ts test/changelog/compile.test.ts
git commit -m "feat: add pure changelog compilation and upsert functions"
```

---

### Task 5: Add the marker block to `CHANGELOG.md`

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nothing (manual documentation edit).
- Produces: `<!-- autoforge:changelog:start -->` / `<!-- autoforge:changelog:end -->` markers that `upsertChangelogSection` (Task 4) requires to exist.

This is a documentation-only task with no test cycle of its own — it is a prerequisite fixture for Task 6's command to have somewhere to write into. It is still tracked as its own task because Task 6's tests depend on this exact file shape.

- [ ] **Step 1: Insert the marker block**

Open `CHANGELOG.md`. Immediately after the existing note block (the one starting `> **Note:** Entries between 0.7.0 and 0.21.0...`) and before the `## [0.21.1] - 2026-08-22` heading, insert:

```markdown
<!-- autoforge:changelog:start -->
<!-- autoforge:changelog:end -->

```

The file should now read, in order: title, "All notable changes..." line, the historical-tracking note, the empty marker block, then the `## [0.21.1]` entry and everything below it, unchanged.

- [ ] **Step 2: Verify format**

Run: `npx prettier --check CHANGELOG.md`
Expected: passes (Markdown comments and blank lines are Prettier-neutral; if it reformats, run `npx prettier --write CHANGELOG.md` and re-check).

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add changelog compilation markers"
```

---

### Task 6: Wire `autoforge changelog compile` end-to-end

**Files:**
- Create: `src/commands/changelog.ts`
- Modify: `src/cli/router.ts`
- Modify: `src/cli/index.ts`
- Modify: `src/cli/help.ts`
- Test: `test/changelog-command.test.ts`

**Interfaces:**
- Consumes: `compileChangelogSection`, `upsertChangelogSection` from `src/changelog/compile.js` (Task 4); `createDecisionStore` from `src/decisions/store.js`; `discoverProjectRoot` from `src/core/project.js`; `execFile`/`promisify` pattern from `src/orchestration/worktrees.ts` for reading the latest git tag.
- Produces: `runChangelogCommand(options): Promise<ExitCode>` with the same `{ args, output, startDirectory }` shape as every other command; wired into `CliDependencies.commands.changelog?(args): Promise<ExitCode>` in the router, following exactly the `constitution`/`domain` pattern already in `src/cli/router.ts:120-127` and `src/cli/index.ts:254-257`.

- [ ] **Step 1: Write the failing command test**

Create `test/changelog-command.test.ts`:

```typescript
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runChangelogCommand } from "../src/commands/changelog.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createDecisionStore } from "../src/decisions/store.js";
import { DecisionService } from "../src/decisions/service.js";
import { createWorkStateStore } from "../src/state/kernel.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-changelog-"),
  );
  temporaryDirectories.push(projectRoot);
  await execFileAsync("git", ["init", "-q"], { cwd: projectRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: projectRoot,
  });
  await execFileAsync("git", ["config", "user.name", "Test"], {
    cwd: projectRoot,
  });
  await initializeProject({ projectRoot });
  await writeFile(
    path.join(projectRoot, "CHANGELOG.md"),
    [
      "# Changelog",
      "",
      "<!-- autoforge:changelog:start -->",
      "<!-- autoforge:changelog:end -->",
      "",
    ].join("\n"),
  );
  await execFileAsync("git", ["add", "-A"], { cwd: projectRoot });
  await execFileAsync(
    "git",
    ["commit", "-q", "-m", "initial", "--no-verify"],
    { cwd: projectRoot },
  );
  await execFileAsync("git", ["tag", "v0.1.0"], { cwd: projectRoot });
  return { projectRoot };
}

describe("changelog compile command", () => {
  it("writes qualifying decisions since the latest tag into CHANGELOG.md", async () => {
    const { projectRoot } = await createFixture();
    const workStore = createWorkStateStore(projectRoot);
    await new DecisionService(
      createDecisionStore(projectRoot),
      workStore,
    ).record({
      statement: "Fixed a null pointer in checkout.",
      reasoning: "Empty cart crashed the total calculation.",
      consequences: ["Guarded the calculation."],
      scope: ["checkout"],
      keywords: ["bugfix"],
      relatedWork: [],
      kind: "bugfix",
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runChangelogCommand({ args: ["compile"], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.success);

    const changelog = await readFile(
      path.join(projectRoot, "CHANGELOG.md"),
      "utf8",
    );
    expect(changelog).toContain("Fixed a null pointer in checkout.");
    expect(changelog).toContain("### Fixed");
  });

  it("produces no diff when no qualifying decisions exist since the tag", async () => {
    const { projectRoot } = await createFixture();
    const before = await readFile(
      path.join(projectRoot, "CHANGELOG.md"),
      "utf8",
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runChangelogCommand({ args: ["compile"], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.success);

    const after = await readFile(
      path.join(projectRoot, "CHANGELOG.md"),
      "utf8",
    );
    expect(after).toBe(before);
  });

  it("rejects unknown subcommands", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runChangelogCommand({ args: ["bogus"], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/changelog-command.test.ts`
Expected: FAIL — module `src/commands/changelog.ts` does not exist.

- [ ] **Step 3: Implement `src/commands/changelog.ts`**

```typescript
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { compileChangelogSection, upsertChangelogSection } from "../changelog/compile.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { createDecisionStore } from "../decisions/store.js";

const execFileAsync = promisify(execFile);

export interface ChangelogCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr("Usage: autoforge changelog compile [--since <git-tag>]");
  return EXIT_CODE.usage;
}

async function resolveSinceTimestamp(
  projectRoot: string,
  sinceTag: string | undefined,
): Promise<string> {
  try {
    const tag = sinceTag ?? (
      await execFileAsync("git", ["describe", "--tags", "--abbrev=0"], {
        cwd: projectRoot,
      })
    ).stdout.trim();
    const { stdout } = await execFileAsync(
      "git",
      ["log", "-1", "--format=%aI", tag],
      { cwd: projectRoot },
    );
    return stdout.trim();
  } catch {
    return new Date(0).toISOString();
  }
}

export async function runChangelogCommand(
  options: ChangelogCommandOptions,
): Promise<ExitCode> {
  const [action, flag, value, ...rest] = options.args;
  if (action !== "compile" || rest.length > 0) {
    return usage(options.output);
  }
  if (flag !== undefined && (flag !== "--since" || !value)) {
    return usage(options.output);
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const sinceTimestamp = await resolveSinceTimestamp(
    project.path,
    flag === "--since" ? value : undefined,
  );
  const { state } = await createDecisionStore(project.path).read();
  const section = compileChangelogSection({
    decisions: state.data.decisions,
    sinceTimestamp,
  });

  const changelogPath = path.join(project.path, "CHANGELOG.md");
  const existing = await readFile(changelogPath, "utf8");
  const updated = upsertChangelogSection(existing, section);
  await writeFile(changelogPath, updated, "utf8");

  options.output.stdout(
    section
      ? "Compiled changelog entries into CHANGELOG.md."
      : "No qualifying decisions found; CHANGELOG.md unchanged.",
  );
  return EXIT_CODE.success;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/changelog-command.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into the router**

In `src/cli/router.ts`, add to the `CliDependencies.commands` interface (alongside `constitution?`/`domain?`):

```typescript
changelog?(args: readonly string[]): Promise<ExitCode>;
```

Add a switch case (alongside the existing `case "domain":` block):

```typescript
case "changelog":
  return dependencies.commands.changelog
    ? dependencies.commands.changelog(commandArgs)
    : EXIT_CODE.usage;
```

- [ ] **Step 6: Wire into the CLI entry point**

In `src/cli/index.ts`, add the import near the other command imports:

```typescript
import { runChangelogCommand } from "../commands/changelog.js";
```

Add the wiring alongside the existing `domain:` entry:

```typescript
changelog: (commandArgs) =>
  runChangelogCommand({ args: commandArgs, output, startDirectory }),
```

- [ ] **Step 7: Update CLI help text**

In `src/cli/help.ts`, add a line near the `constitution`/`domain` usage entries:

```
autoforge changelog compile [--since <git-tag>]
```

And to the top-level command summary table, add:

```
changelog  Compile documented bugfix and feature-note decisions into CHANGELOG.md
```

- [ ] **Step 8: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: all clean. If `format:check` fails, run `npx prettier --write <listed files>` and re-check.

- [ ] **Step 9: Live CLI smoke test**

```bash
npm run build
cd /tmp && rm -rf af-changelog-smoke && mkdir af-changelog-smoke && cd af-changelog-smoke && git init -q
ABS_BIN="/Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge/bin/autoforge.js"
node "$ABS_BIN" init
node "$ABS_BIN" changelog compile
cat CHANGELOG.md 2>&1 || echo "expected: no CHANGELOG.md exists yet in a bare init, command should still exit successfully with no file written or a clear message"
cd /Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge
rm -rf /tmp/af-changelog-smoke
```

If the smoke test reveals that `runChangelogCommand` throws an uncaught `ENOENT` when `CHANGELOG.md` doesn't exist in a freshly initialized project (likely, since `readFile(changelogPath, ...)` has no guard), add a guard: catch `ENOENT` on the `readFile` call and report `EXIT_CODE.invalidState` with `"No CHANGELOG.md found in this project."` — do not silently create one. Add a corresponding test case to `test/changelog-command.test.ts` for this path, matching the graceful-empty-state convention established in this same body of work (v0.21.1).

- [ ] **Step 10: Commit**

```bash
git add src/commands/changelog.ts src/cli/router.ts src/cli/index.ts src/cli/help.ts test/changelog-command.test.ts
git commit -m "feat: add autoforge changelog compile command"
```

---

### Task 7: Document the feature and record the governing decision

**Files:**
- Create: `docs/planning/0.22-pre/DOCUMENTATION_GATE.md` (if `docs/planning/0.22/` does not yet exist as of implementation time, use `docs/planning/0.22-pre/`; if v0.22 planning has already started, place this file in `docs/planning/0.22/` instead — check `ls docs/planning/` before creating the directory)
- Modify: `README.md` (if it documents the `done`/`decide` command surface — check for an existing section first)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Check for an existing v0.22 planning directory**

Run: `ls docs/planning/ | sort -V | tail -5`

If `0.22/` exists, use it for the new file below. Otherwise create `docs/planning/0.22-pre/`.

- [ ] **Step 2: Write the feature documentation**

Create the file with this content (adjust the path prefix per Step 1's result):

```markdown
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
```

- [ ] **Step 3: Check README for command documentation needing updates**

Run: `grep -n "autoforge done\|autoforge decide" README.md`

If matches exist, update those lines to reflect the new `--kind` and `--no-decision` flags, following the exact phrasing style already used nearby in the file. If no matches exist, skip this step (README does not document per-command flags).

- [ ] **Step 4: Format check**

Run: `npx prettier --check docs/planning/**/DOCUMENTATION_GATE.md README.md`
Expected: passes, or run `--write` and re-check.

- [ ] **Step 5: Commit**

```bash
git add docs/planning/ README.md
git commit -m "docs: document the documentation gate and changelog compilation"
```

---

### Task 8: Record the governing decision and exercise the full loop

**Files:** none created/modified beyond AutoForge's own state files (`.autoforge/state/decisions.json`, `.autoforge/state/work.json`) — this task exercises the system built in Tasks 1–7 against itself.

**Interfaces:** none — this is a live-system verification task, not a code task.

- [ ] **Step 1: Register this work as an AutoForge issue**

```bash
BIN=$(node -e "console.log(require('./package.json').bin.autoforge)")
node "$BIN" add issue \
  --name "implement-documentation-gate" \
  --description "Add decision-kind tagging, a done-time documentation gate for issues/tasks, and autoforge changelog compile, per docs/superpowers/specs/2026-08-22-documentation-gate-design.md." \
  --include "src/decisions/**" \
  --include "src/commands/decide.ts" \
  --include "src/commands/done.ts" \
  --include "src/commands/changelog.ts" \
  --include "src/changelog/**" \
  --include "src/cli/**" \
  --include "test/**" \
  --include "CHANGELOG.md" \
  --include "docs/planning/**"
node "$BIN" start issue issue.implement-documentation-gate
```

(If Tasks 1–7 were already committed under a different or no tracked work item, this step still records the retrospective link — proceed regardless.)

- [ ] **Step 2: Record the governing decision, linked to this work item**

```bash
node "$BIN" decide \
  --statement "Issue and task completion requires a linked decision record or an explicit, audited skip reason" \
  --reasoning "CHANGELOG.md silently stopped tracking releases after v0.6.0 because documentation was advisory rather than enforced, and this was only discovered by manual audit across agent handoffs where no human was present to catch the omission." \
  --consequence "autoforge done blocks issue/task completion without a relatedWork-linked decision; autoforge done --no-decision <reason> bypasses it but records the reason as a skip-reason decision." \
  --consequence "autoforge changelog compile renders bugfix/feature-note decisions since the last tag into CHANGELOG.md, closing the specific gap that motivated this change." \
  --scope "documentation" --scope "governance" --scope "cli" \
  --keyword "changelog" --keyword "decision-gate" --keyword "done-command" \
  --work issue.implement-documentation-gate \
  --kind feature-note
```

- [ ] **Step 3: Close the work item through the newly built gate**

```bash
node "$BIN" done
```

Expected: succeeds (`EXIT_CODE.success`) because Step 2 recorded a linked decision — this is the gate exercising itself for the first time on real work, not a test fixture.

- [ ] **Step 4: Compile the changelog**

```bash
node "$BIN" changelog compile
git diff CHANGELOG.md
```

Expected: `CHANGELOG.md` gains a `### Added` entry containing the Step 2 decision's statement, inside the marker block, with all prior content unchanged.

- [ ] **Step 5: Full verification suite**

```bash
npm run format:check
npm run typecheck
npm test
npm run build
```

Expected: all clean.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: exercise the documentation gate on its own implementation"
```

---

## Self-Review Notes

- **Spec coverage:** Decision-kind tagging (§1) → Tasks 1–2. Completion gate (§2) → Task 3. Changelog compilation (§3) → Tasks 4–6. Deferred fixtures store (§4) → documented in Task 7, not implemented (correctly out of scope). Testing requirements from the spec's Testing section are covered: gate blocks/passes/bypass/unaffected-kinds → Task 3; changelog golden/idempotency/preservation → Task 4; schema backward compatibility → Task 1. Rollout section → Task 8.
- **Type consistency:** `DecisionKind` (Task 1) is consumed identically in `RecordDecisionInput.kind?` (Task 2), the `done.ts` gate's `DecisionService.record({ kind: "skip-reason", ... })` call (Task 3), and `compileChangelogSection`'s `decision.kind` checks (Task 4) — same string literal union throughout, no renaming drift.
- **Placeholder scan:** no TBD/TODO markers; every step shows complete code or an exact command with expected output.
