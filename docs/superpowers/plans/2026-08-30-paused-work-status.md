# Paused Work Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class `paused` work status plus `autoforge pause "<reason>"` / `autoforge resume <task|issue> <id>` commands, so work can stop mid-flight without being falsely marked `completed` or left stuck `active`.

**Architecture:** Extend `workStatusSchema` with `"paused"` and add a `pauseReason` field to work items. Add `pause()`/`resume()` methods to `WorkLifecycleService` that mirror the existing `complete()`/`start()` methods exactly (same conflict checks, same compensation-rollback pattern). Add two new CLI commands (`pause.ts`, `resume.ts`) that mirror `done.ts`/`start.ts` structurally. Wire both into the CLI router and help text.

**Tech Stack:** TypeScript, Zod schemas, Vitest, existing `AtomicStateStore`/`WorkLifecycleService` patterns already in the codebase.

## Global Constraints

- Every new/changed file must pass `npx tsc --noEmit` and `npx prettier --check` before commit.
- Full suite (`npx vitest run`) must stay green after every task — no regressions in existing `done`/`start`/lifecycle tests.
- Follow existing code patterns exactly (error codes via `AutoForgeError`/`lifecycleError`, `EXIT_CODE` constants, `LogWriter` output interface) — do not invent new conventions.
- No changes to `blocked` status, decision-store coupling, `autoforge status`/`recap` display, or the TUI — those are explicitly out of scope per the approved design (`docs/superpowers/specs/2026-08-30-paused-work-status-design.md`).
- Reason strings for `pause` must be required and non-blank (usage error otherwise), matching the pattern `done.ts` uses for its own argument validation.

---

### Task 1: Add `paused` status and `pauseReason` field to the work schema

**Files:**

- Modify: `src/work/schemas.ts:31-38` (status enum), `src/work/schemas.ts:59-67` (`workItemBaseSchema`)
- Test: `test/work-schemas.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `workStatusSchema` now includes `"paused"` as a valid `WorkStatus` value. `workItemBaseSchema` (and therefore `featureSchema`, `phaseSchema`, `taskSchema`, `issueSchema`) gains `pauseReason: string | null` (default `null`). Later tasks rely on this field name (`pauseReason`) exactly.

- [ ] **Step 1: Write the failing test**

Open `test/work-schemas.test.ts` and add:

```typescript
import { taskSchema, workStatusSchema } from "../src/work/schemas.js";

describe("paused work status", () => {
  it("accepts paused as a valid work status", () => {
    expect(workStatusSchema.safeParse("paused").success).toBe(true);
  });

  it("defaults pauseReason to null and accepts an explicit reason", () => {
    const base = {
      id: "task.example",
      phaseId: "phase.example",
      name: "Example",
      description: "Example task.",
      status: "paused",
      scope: { include: ["src/**"], exclude: [] },
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
    };
    expect(taskSchema.parse(base).pauseReason).toBeNull();
    expect(
      taskSchema.parse({ ...base, pauseReason: "Waiting on account access." })
        .pauseReason,
    ).toBe("Waiting on account access.");
  });

  it("rejects a blank pauseReason", () => {
    const base = {
      id: "task.example",
      phaseId: "phase.example",
      name: "Example",
      description: "Example task.",
      status: "paused",
      scope: { include: ["src/**"], exclude: [] },
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
      pauseReason: "   ",
    };
    expect(taskSchema.safeParse(base).success).toBe(false);
  });
});
```

Check the top of `test/work-schemas.test.ts` first (`head -20 test/work-schemas.test.ts`) to see what's already imported, and merge the import line into the existing import statement from `../src/work/schemas.js` rather than duplicating it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/work-schemas.test.ts`
Expected: FAIL — `workStatusSchema` rejects `"paused"`, and `pauseReason` is an unrecognized key (schema is `.strict()`).

- [ ] **Step 3: Implement the schema changes**

In `src/work/schemas.ts`, change:

```typescript
export const workStatusSchema = z.enum([
  "planned",
  "ready",
  "active",
  "blocked",
  "completed",
  "canceled",
]);
```

to:

```typescript
export const workStatusSchema = z.enum([
  "planned",
  "ready",
  "active",
  "blocked",
  "paused",
  "completed",
  "canceled",
]);
```

Then change:

```typescript
const workItemBaseSchema = z
  .object({
    name: entityNameSchema,
    description: descriptionSchema,
    status: workStatusSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
```

to:

```typescript
const workItemBaseSchema = z
  .object({
    name: entityNameSchema,
    description: descriptionSchema,
    status: workStatusSchema,
    pauseReason: z.string().trim().min(1).max(2_000).nullable().default(null),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/work-schemas.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `npx vitest run`
Expected: All existing tests still pass. If any test constructs a task/issue/feature/phase object literal directly (bypassing `WorkService`) and asserts on the full shape with something stricter than `toMatchObject` (e.g. `toEqual`), it may need `pauseReason: null` added to its expected object. Search first: `grep -rln "toEqual" test/*.test.ts | xargs grep -l "status: \"active\"\|status: \"planned\""` — fix any that break.

- [ ] **Step 6: Typecheck and format**

Run: `npx tsc --noEmit && npx prettier --check src/work/schemas.ts test/work-schemas.test.ts`
Expected: both clean. If prettier fails, run `npx prettier --write src/work/schemas.ts test/work-schemas.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/work/schemas.ts test/work-schemas.test.ts
git commit -m "feat: add paused work status and pauseReason field

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
```

---

### Task 2: Add `pause()` and `resume()` to `WorkLifecycleService`

**Files:**

- Modify: `src/work/lifecycle.ts`
- Test: `test/work-lifecycle.test.ts`

**Interfaces:**

- Consumes: `WorkStatus`, `pauseReason` field from Task 1's schema changes; existing `AtomicStateStore<WorkState>`/`AtomicStateStore<SessionState>`, `lifecycleError()`, `assertStartableStatus()` from this same file.
- Produces:
  - `PauseWorkResult` interface: `{ pausedWork: ActiveWork; sessionId: string; pausedAt: string; workRevision: number; sessionRevision: number }`
  - `WorkLifecycleService.pause(reason: string): Promise<PauseWorkResult>`
  - `WorkLifecycleService.resume(input: StartWorkInput): Promise<StartWorkResult>` (reuses the existing `StartWorkInput`/`StartWorkResult` types from `start()`)
  - `assertResumableStatus(kind, id, status)` — new private-scope function alongside `assertStartableStatus`.
  - `assertStartableStatus` now also rejects `status === "paused"`.

- [ ] **Step 1: Write the failing tests**

Add to `test/work-lifecycle.test.ts`, after the existing `describe("work completion lifecycle", ...)` block (before its closing nothing needed — just append a new top-level `describe` after it):

```typescript
describe("work pause lifecycle", () => {
  it("pauses active work, records the reason, and ends the session", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });

    await expect(
      lifecycle.pause("Waiting on account access."),
    ).resolves.toMatchObject({
      pausedWork: { kind: "task", id: task.entity.id },
      sessionId: "session.test",
      pausedAt: TIMESTAMP,
      workRevision: 6,
      sessionRevision: 2,
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          tasks: [
            {
              id: task.entity.id,
              status: "paused",
              pauseReason: "Waiting on account access.",
            },
          ],
          activeWork: null,
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: null,
          previous: [
            {
              id: "session.test",
              status: "ended",
              endedAt: TIMESTAMP,
              activeWork: { kind: "task", id: task.entity.id },
            },
          ],
        },
      },
    });
  });

  it("rejects pausing when nothing is active", async () => {
    const { lifecycle, workStore } = await createFixture();

    await expect(lifecycle.pause("No active work.")).rejects.toMatchObject({
      code: "STATE_CONFLICT",
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: { revision: 4 },
    });
  });

  it("restores active work when session archival fails during pause", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await writeFile(sessionStore.lockPath, "competing-session\n");

    await expect(lifecycle.pause("Blocked.")).rejects.toMatchObject({
      code: "STATE_CONFLICT",
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        revision: 7,
        data: {
          tasks: [{ id: task.entity.id, status: "active" }],
          activeWork: { kind: "task", id: task.entity.id },
        },
      },
    });
  });
});

describe("work resume lifecycle", () => {
  it("resumes a paused task and opens a new session", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await lifecycle.pause("Waiting on account access.");

    // Real usage generates a fresh session ID per start/resume call (see
    // src/commands/resume.ts's randomUUID()-based default). The fixture's
    // `lifecycle` was constructed with a session ID fixed at "session.test",
    // which is now archived in `previous` from the pause above — reusing it
    // for resume would collide with sessionStateSchema's cross-session
    // uniqueness invariant. Build a second service instance sharing the same
    // stores but with its own session ID, exactly as the CLI command does.
    const resumeLifecycle = new WorkLifecycleService(workStore, sessionStore, {
      now: () => new Date(TIMESTAMP),
      sessionId: () => "session.resumed",
    });

    await expect(
      resumeLifecycle.resume({ kind: "task", id: task.entity.id }),
    ).resolves.toMatchObject({
      activeWork: { kind: "task", id: task.entity.id, startedAt: TIMESTAMP },
      sessionId: "session.resumed",
      workRevision: 8,
      sessionRevision: 3,
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          tasks: [{ id: task.entity.id, status: "active", pauseReason: null }],
          activeWork: { kind: "task", id: task.entity.id },
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: {
            id: "session.resumed",
            status: "active",
            activeWork: { kind: "task", id: task.entity.id },
          },
        },
      },
    });
  });

  it("rejects resuming a task that is not paused", async () => {
    const { lifecycle, task } = await createFixture();

    await expect(
      lifecycle.resume({ kind: "task", id: task.entity.id }),
    ).rejects.toMatchObject({
      code: "STATE_CONFLICT",
      details: { status: "planned" },
    });
  });

  it("rejects resuming while other work is active", async () => {
    const { issue, lifecycle, sessionStore, task, workStore } =
      await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await lifecycle.pause("Paused for later.");
    const secondLifecycle = new WorkLifecycleService(workStore, sessionStore, {
      now: () => new Date(TIMESTAMP),
      sessionId: () => "session.second",
    });
    await secondLifecycle.start({ kind: "issue", id: issue.entity.id });

    await expect(
      secondLifecycle.resume({ kind: "task", id: task.entity.id }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });
});
```

**Note on this fixture pattern:** `WorkLifecycleService` fixes its session-ID generator at construction time (matching production usage, where each CLI invocation of `start`/`resume`/`pause`/`done` constructs a fresh service instance per process run — see `src/commands/start.ts`'s `sessionId: () => sessionId` closure, built fresh per command invocation). Tests that chain multiple session-opening calls (`start` → `pause` → `resume`, or `start` → `pause` → `start` again) must construct a new `WorkLifecycleService` instance (sharing the same `workStore`/`sessionStore`) for each call that opens a new session, with a distinct `sessionId`. Reusing one `lifecycle` instance's fixed session ID across more than one session-opening call will collide with `sessionStateSchema`'s cross-session uniqueness invariant (`src/work/schemas.ts`, the `previous`/`current` ID-uniqueness `superRefine` check) once the first session is archived into `previous`.

The test file already imports `writeFile` from `node:fs/promises` (used by the existing "restores work when the session write fails" test) — reuse it, do not re-import.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/work-lifecycle.test.ts`
Expected: FAIL — `lifecycle.pause` and `lifecycle.resume` are not functions.

- [ ] **Step 3: Implement `pause()` and `resume()`**

In `src/work/lifecycle.ts`, first update the imports and add the new result type near the top (after `CompleteWorkResult`):

```typescript
export interface PauseWorkResult {
  pausedWork: ActiveWork;
  sessionId: string;
  pausedAt: string;
  workRevision: number;
  sessionRevision: number;
}
```

Update `assertStartableStatus` to also reject `paused`:

```typescript
function assertStartableStatus(
  kind: StartableWorkKind,
  id: string,
  status: WorkStatus,
): void {
  if (status === "completed" || status === "canceled" || status === "paused") {
    throw lifecycleError(
      "STATE_CONFLICT",
      `Cannot start ${status} ${kind} ${id}`,
      { kind, id, status },
    );
  }
}
```

Add a new function right after `assertStartableStatus`:

```typescript
function assertResumableStatus(
  kind: StartableWorkKind,
  id: string,
  status: WorkStatus,
): void {
  if (status !== "paused") {
    throw lifecycleError(
      "STATE_CONFLICT",
      `Cannot resume ${kind} ${id} because it is ${status}, not paused`,
      { kind, id, status },
    );
  }
}
```

Add `pause()` to the `WorkLifecycleService` class, right after `complete()` (mirrors its structure exactly, including the compensation-rollback pattern):

```typescript
  async pause(reason: string): Promise<PauseWorkResult> {
    const [{ state: workState }, { state: sessionState }] = await Promise.all([
      this.workStore.read(),
      this.sessionStore.read(),
    ]);
    const activeWork = workState.data.activeWork;
    const currentSession = sessionState.data.current;
    if (activeWork === null && currentSession === null) {
      throw lifecycleError(
        "STATE_CONFLICT",
        "There is no active work to pause",
        {},
      );
    }
    if (
      activeWork === null ||
      currentSession === null ||
      currentSession.activeWork === null ||
      currentSession.activeWork.kind !== activeWork.kind ||
      currentSession.activeWork.id !== activeWork.id
    ) {
      throw lifecycleError(
        "INVALID_STATE",
        "Active work and the current session do not agree",
        { activeWork, currentSession },
      );
    }

    const pausedAt = this.now().toISOString();
    const nextWorkState = this.pauseActiveWork(
      workState.data,
      activeWork,
      reason,
      pausedAt,
    );
    const committedWork = await this.workStore.write(nextWorkState, {
      expectedRevision: workState.revision,
    });

    try {
      const committedSession = await this.sessionStore.write(
        {
          current: null,
          previous: [
            ...sessionState.data.previous,
            {
              ...currentSession,
              status: "ended",
              endedAt: pausedAt,
            },
          ],
        },
        { expectedRevision: sessionState.revision },
      );
      return {
        pausedWork: activeWork,
        sessionId: currentSession.id,
        pausedAt,
        workRevision: committedWork.revision,
        sessionRevision: committedSession.revision,
      };
    } catch (sessionError) {
      try {
        await this.workStore.write(workState.data, {
          expectedRevision: committedWork.revision,
        });
      } catch (compensationError) {
        throw new AutoForgeError(
          "INVALID_STATE",
          "Pausing work failed and the work state could not be restored",
          {
            cause: sessionError,
            details: {
              kind: activeWork.kind,
              id: activeWork.id,
              compensationError:
                compensationError instanceof Error
                  ? compensationError.message
                  : String(compensationError),
            },
            exitCode: EXIT_CODE.invalidState,
          },
        );
      }
      throw sessionError;
    }
  }

  async resume(input: StartWorkInput): Promise<StartWorkResult> {
    const [{ state: workState }, { state: sessionState }] = await Promise.all([
      this.workStore.read(),
      this.sessionStore.read(),
    ]);

    if (workState.data.activeWork !== null) {
      throw lifecycleError(
        "STATE_CONFLICT",
        `Work is already active: ${workState.data.activeWork.id}`,
        { activeWork: workState.data.activeWork },
      );
    }
    if (sessionState.data.current !== null) {
      throw lifecycleError(
        "STATE_CONFLICT",
        `Session is already active: ${sessionState.data.current.id}`,
        { sessionId: sessionState.data.current.id },
      );
    }

    const timestamp = this.now().toISOString();
    const activeWork: ActiveWork = {
      kind: input.kind,
      id: input.id,
      startedAt: timestamp,
    };
    const nextWorkState = this.resumeWork(workState.data, input, timestamp);
    const committedWork = await this.workStore.write(nextWorkState, {
      expectedRevision: workState.revision,
    });

    const sessionId = this.sessionId();
    try {
      const committedSession = await this.sessionStore.write(
        {
          ...sessionState.data,
          current: {
            id: sessionId,
            status: "active",
            startedAt: timestamp,
            endedAt: null,
            activeWork,
          },
        },
        { expectedRevision: sessionState.revision },
      );
      return {
        activeWork,
        sessionId,
        workRevision: committedWork.revision,
        sessionRevision: committedSession.revision,
      };
    } catch (sessionError) {
      try {
        await this.workStore.write(workState.data, {
          expectedRevision: committedWork.revision,
        });
      } catch (compensationError) {
        throw new AutoForgeError(
          "INVALID_STATE",
          "Resuming work failed and the work state could not be restored",
          {
            cause: sessionError,
            details: {
              kind: input.kind,
              id: input.id,
              compensationError:
                compensationError instanceof Error
                  ? compensationError.message
                  : String(compensationError),
            },
            exitCode: EXIT_CODE.invalidState,
          },
        );
      }
      throw sessionError;
    }
  }
```

Add the two private helper methods `pauseActiveWork` and `resumeWork` right after the existing `completeActiveWork` private method (same file, same class):

```typescript
  private pauseActiveWork(
    state: WorkState,
    activeWork: ActiveWork,
    reason: string,
    timestamp: string,
  ): WorkState {
    if (activeWork.kind === "task") {
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === activeWork.id
            ? {
                ...task,
                status: "paused",
                pauseReason: reason,
                updatedAt: timestamp,
              }
            : task,
        ),
        activeWork: null,
      };
    }

    return {
      ...state,
      issues: state.issues.map((issue) =>
        issue.id === activeWork.id
          ? {
              ...issue,
              status: "paused",
              pauseReason: reason,
              updatedAt: timestamp,
            }
          : issue,
      ),
      activeWork: null,
    };
  }

  private resumeWork(
    state: WorkState,
    input: StartWorkInput,
    timestamp: string,
  ): WorkState {
    if (input.kind === "task") {
      const task = state.tasks.find((candidate) => candidate.id === input.id);
      if (!task) {
        throw lifecycleError("INVALID_ARGUMENT", `Unknown task ${input.id}`, {
          kind: input.kind,
          id: input.id,
        });
      }
      assertResumableStatus(input.kind, input.id, task.status);
      return {
        ...state,
        tasks: state.tasks.map((candidate) =>
          candidate.id === input.id
            ? {
                ...candidate,
                status: "active",
                pauseReason: null,
                updatedAt: timestamp,
              }
            : candidate,
        ),
        activeWork: { kind: input.kind, id: input.id, startedAt: timestamp },
      };
    }

    const issue = state.issues.find((candidate) => candidate.id === input.id);
    if (!issue) {
      throw lifecycleError("INVALID_ARGUMENT", `Unknown issue ${input.id}`, {
        kind: input.kind,
        id: input.id,
      });
    }
    assertResumableStatus(input.kind, input.id, issue.status);
    return {
      ...state,
      issues: state.issues.map((candidate) =>
        candidate.id === input.id
          ? {
              ...candidate,
              status: "active",
              pauseReason: null,
              updatedAt: timestamp,
            }
          : candidate,
      ),
      activeWork: { kind: input.kind, id: input.id, startedAt: timestamp },
    };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/work-lifecycle.test.ts`
Expected: PASS (all new and existing tests).

- [ ] **Step 5: Typecheck and format**

Run: `npx tsc --noEmit && npx prettier --check src/work/lifecycle.ts test/work-lifecycle.test.ts`
Expected: clean. If prettier fails, run `npx prettier --write src/work/lifecycle.ts test/work-lifecycle.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/work/lifecycle.ts test/work-lifecycle.test.ts
git commit -m "feat: add pause and resume methods to WorkLifecycleService

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
```

---

### Task 3: Add `autoforge pause` command

**Files:**

- Create: `src/commands/pause.ts`
- Test: `test/pause.test.ts`

**Interfaces:**

- Consumes: `WorkLifecycleService.pause(reason: string): Promise<PauseWorkResult>` from Task 2; `discoverProjectRoot`, `createSessionStateStore`, `createWorkStateStore`, `createDoctrineSessionStore`, `createDoctrineStore`, `DoctrineSessionService`, `EXIT_CODE`, `LogWriter` — all exactly as used by `src/commands/done.ts`.
- Produces: `export async function runPauseCommand(options: PauseCommandOptions): Promise<ExitCode>` and `export interface PauseCommandOptions { args: readonly string[]; output: LogWriter; startDirectory: string; now?: () => Date }` — Task 5 (CLI router) imports this exact function and interface.

- [ ] **Step 1: Write the failing test**

Create `test/pause.test.ts`:

```typescript
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runPauseCommand } from "../src/commands/pause.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createInitialDoctrineRegistry } from "../src/doctrine/builtins.js";
import {
  createDoctrineSessionStore,
  DoctrineSessionService,
} from "../src/doctrine/session.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkLifecycleService } from "../src/work/lifecycle.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-pause-"));
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const workStore = createWorkStateStore(projectRoot);
  const sessionStore = createSessionStateStore(projectRoot);
  const issue = await new WorkService(workStore).createIssue({
    name: "Pause command",
    description: "Verify pause command wiring.",
    scope: { include: ["src/commands/pause.ts"], exclude: [] },
  });
  await new WorkLifecycleService(workStore, sessionStore, {
    sessionId: () => "session.pause-command",
  }).start({ kind: "issue", id: issue.entity.id });
  const doctrineSessionStore = createDoctrineSessionStore(projectRoot);
  await new DoctrineSessionService(
    doctrineSessionStore,
    createInitialDoctrineRegistry(new Date().toISOString()),
    (await workStore.read()).state.data,
  ).select({
    sessionId: "session.pause-command",
    workKind: "issue",
    workId: issue.entity.id,
  });
  return { doctrineSessionStore, issue, projectRoot, sessionStore, workStore };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("pause command", () => {
  it("pauses active work from a nested project directory", async () => {
    const {
      doctrineSessionStore,
      issue,
      projectRoot,
      sessionStore,
      workStore,
    } = await createFixture();
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPauseCommand({
        args: ["Waiting on account access."],
        output,
        startDirectory: nested,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      `Paused issue ${issue.entity.id}; ended session.pause-command.`,
    );
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          issues: [
            {
              id: issue.entity.id,
              status: "paused",
              pauseReason: "Waiting on account access.",
            },
          ],
          activeWork: null,
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: null,
          previous: [
            {
              id: "session.pause-command",
              status: "ended",
              activeWork: { kind: "issue", id: issue.entity.id },
            },
          ],
        },
      },
    });
    await expect(doctrineSessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: null,
          previous: [{ sessionId: "session.pause-command" }],
        },
      },
    });
  });

  it("rejects missing or blank reason", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPauseCommand({ args: [], output, startDirectory: process.cwd() }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      'Usage: autoforge pause "<reason>"',
    );

    await expect(
      runPauseCommand({
        args: ["   "],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("rejects extra arguments", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPauseCommand({
        args: ["reason", "extra"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("preserves the lifecycle conflict when nothing is active", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    const { projectRoot } = await createFixture();
    await runPauseCommand({
      args: ["First pause."],
      output,
      startDirectory: projectRoot,
    });

    await expect(
      runPauseCommand({
        args: ["Second pause."],
        output: { stdout: vi.fn(), stderr: vi.fn() },
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/pause.test.ts`
Expected: FAIL — `../src/commands/pause.js` does not exist.

- [ ] **Step 3: Implement `src/commands/pause.ts`**

```typescript
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
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

export interface PauseCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
}

function usage(output: LogWriter): ExitCode {
  output.stderr('Usage: autoforge pause "<reason>"');
  return EXIT_CODE.usage;
}

export async function runPauseCommand(
  options: PauseCommandOptions,
): Promise<ExitCode> {
  const [reason, ...extra] = options.args;
  if (!reason || !reason.trim() || extra.length > 0) {
    return usage(options.output);
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const sessionStore = createSessionStateStore(project.path);
  const doctrineSessionStore = createDoctrineSessionStore(project.path);
  const [{ state: session }, { state: doctrines }] = await Promise.all([
    sessionStore.read(),
    createDoctrineStore(project.path).read(),
  ]);
  const sessionId = session.data.current?.id;
  if (!sessionId) {
    await new WorkLifecycleService(workStore, sessionStore).pause(reason);
    throw new Error("Unreachable lifecycle state");
  }

  const timestamp = (options.now ?? (() => new Date()))();
  const now = () => timestamp;
  const { state: work } = await workStore.read();
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
    }).pause(reason);
  } catch (error) {
    await doctrineSession.resume(sessionId);
    throw error;
  }
  options.output.stdout(
    `Paused ${result.pausedWork.kind} ${result.pausedWork.id}; ended ${result.sessionId}.`,
  );
  return EXIT_CODE.success;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/pause.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck and format**

Run: `npx tsc --noEmit && npx prettier --check src/commands/pause.ts test/pause.test.ts`
Expected: clean. Fix with `npx prettier --write src/commands/pause.ts test/pause.test.ts` if needed.

- [ ] **Step 6: Commit**

```bash
git add src/commands/pause.ts test/pause.test.ts
git commit -m "feat: add autoforge pause command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
```

---

### Task 4: Add `autoforge resume` command

**Files:**

- Create: `src/commands/resume.ts`
- Test: `test/resume.test.ts`

**Interfaces:**

- Consumes: `WorkLifecycleService.resume(input: { kind, id }): Promise<StartWorkResult>` from Task 2; same store/doctrine imports as `src/commands/start.ts`.
- Produces: `export async function runResumeCommand(options: ResumeCommandOptions): Promise<ExitCode>` and `export interface ResumeCommandOptions { args: readonly string[]; output: LogWriter; startDirectory: string; now?: () => Date; sessionId?: () => string }` — Task 5 imports this exact function and interface.

- [ ] **Step 1: Write the failing test**

Create `test/resume.test.ts`:

```typescript
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runPauseCommand } from "../src/commands/pause.js";
import { runResumeCommand } from "../src/commands/resume.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createDoctrineSessionStore } from "../src/doctrine/session.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkLifecycleService } from "../src/work/lifecycle.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createPausedFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-resume-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const workStore = createWorkStateStore(projectRoot);
  const sessionStore = createSessionStateStore(projectRoot);
  const issue = await new WorkService(workStore).createIssue({
    name: "Resume command",
    description: "Verify resume command wiring.",
    scope: { include: ["src/commands/resume.ts"], exclude: [] },
  });
  await new WorkLifecycleService(workStore, sessionStore, {
    sessionId: () => "session.resume-setup",
  }).start({ kind: "issue", id: issue.entity.id });
  await runPauseCommand({
    args: ["Waiting on account access."],
    output: { stdout: vi.fn(), stderr: vi.fn() },
    startDirectory: projectRoot,
  });
  return { issue, projectRoot, sessionStore, workStore };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("resume command", () => {
  it("resumes a paused issue from a nested project directory", async () => {
    const { issue, projectRoot, sessionStore, workStore } =
      await createPausedFixture();
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runResumeCommand({
        args: ["issue", issue.entity.id],
        output,
        startDirectory: nested,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `^Resumed issue ${issue.entity.id} in session\\.[a-f0-9-]+\\.$`,
        ),
      ),
    );
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          issues: [
            { id: issue.entity.id, status: "active", pauseReason: null },
          ],
          activeWork: { kind: "issue", id: issue.entity.id },
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: {
            status: "active",
            activeWork: { kind: "issue", id: issue.entity.id },
          },
        },
      },
    });
    const doctrineSession =
      await createDoctrineSessionStore(projectRoot).read();
    expect(doctrineSession.state.data.current).toMatchObject({
      workKind: "issue",
      workId: issue.entity.id,
    });
  });

  it.each([
    { args: [] },
    { args: ["feature", "feature.invalid"] },
    { args: ["task"] },
    { args: ["task", "task.id", "extra"] },
  ])("rejects invalid arguments: $args", async ({ args }) => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runResumeCommand({ args, output, startDirectory: process.cwd() }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      "Usage: autoforge resume <task|issue> <id>",
    );
  });

  it("rejects resuming an issue that is not paused", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-resume-not-paused-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const workStore = createWorkStateStore(projectRoot);
    const issue = await new WorkService(workStore).createIssue({
      name: "Not paused",
      description: "Never started.",
      scope: { include: ["src/**"], exclude: [] },
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runResumeCommand({
        args: ["issue", issue.entity.id],
        output,
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/resume.test.ts`
Expected: FAIL — `../src/commands/resume.js` does not exist.

- [ ] **Step 3: Implement `src/commands/resume.ts`**

```typescript
import { randomUUID } from "node:crypto";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  createDoctrineSessionStore,
  DoctrineSessionService,
} from "../doctrine/session.js";
import { createDoctrineStore } from "../doctrine/store.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../state/kernel.js";
import {
  WorkLifecycleService,
  type StartableWorkKind,
} from "../work/lifecycle.js";

export interface ResumeCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
  sessionId?: () => string;
}

function isResumableKind(value: string): value is StartableWorkKind {
  return value === "task" || value === "issue";
}

export async function runResumeCommand(
  options: ResumeCommandOptions,
): Promise<ExitCode> {
  const [kind, id, ...extra] = options.args;
  if (!kind || !isResumableKind(kind) || !id || extra.length > 0) {
    options.output.stderr("Usage: autoforge resume <task|issue> <id>");
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const sessionStore = createSessionStateStore(project.path);
  const doctrineSessionStore = createDoctrineSessionStore(project.path);
  const [{ state: work }, { state: doctrines }] = await Promise.all([
    workStore.read(),
    createDoctrineStore(project.path).read(),
  ]);
  const timestamp = (options.now ?? (() => new Date()))();
  const now = () => timestamp;
  const sessionId = (options.sessionId ?? (() => `session.${randomUUID()}`))();
  const doctrineSession = new DoctrineSessionService(
    doctrineSessionStore,
    doctrines.data,
    work.data,
    { now },
  );
  await doctrineSession.select({ sessionId, workKind: kind, workId: id });

  let result;
  try {
    result = await new WorkLifecycleService(workStore, sessionStore, {
      now,
      sessionId: () => sessionId,
    }).resume({ kind, id });
  } catch (error) {
    await doctrineSession.cancel(sessionId);
    throw error;
  }
  options.output.stdout(
    `Resumed ${result.activeWork.kind} ${result.activeWork.id} in ${result.sessionId}.`,
  );
  return EXIT_CODE.success;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/resume.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck and format**

Run: `npx tsc --noEmit && npx prettier --check src/commands/resume.ts test/resume.test.ts`
Expected: clean. Fix with `npx prettier --write src/commands/resume.ts test/resume.test.ts` if needed.

- [ ] **Step 6: Commit**

```bash
git add src/commands/resume.ts test/resume.test.ts
git commit -m "feat: add autoforge resume command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
```

---

### Task 5: Wire `pause`/`resume` into the CLI router and help text

**Files:**

- Modify: `src/cli/index.ts` (import block near line 14/41, command router object near line 187/301)
- Modify: `apps/core-cli/src/help.ts` (command list line 17/41, "Work lifecycle" section lines 80-84)
- Test: `test/cli.test.ts` if it exists and enumerates commands (check first), otherwise rely on Tasks 3/4's own command tests plus a manual CLI smoke check in Step 4 below.

**Interfaces:**

- Consumes: `runPauseCommand` from `../commands/pause.js` (Task 3), `runResumeCommand` from `../commands/resume.js` (Task 4).
- Produces: `autoforge pause` and `autoforge resume` become reachable through the built CLI binary.

- [ ] **Step 1: Check for an existing command-enumeration test**

Run: `grep -rn "Object.keys\|router\[" test/cli*.test.ts 2>/dev/null; find test -iname "*cli*"`

If a test enumerates all router command keys (e.g. asserts a fixed list of command names), note its exact file and add `pause`/`resume` to that expected list as part of Step 5 below. If no such test exists, skip straight to Step 2.

- [ ] **Step 2: Add the imports and router entries in `src/cli/index.ts`**

Add the import next to the existing `runDoneCommand` import (alphabetical order, so it goes right after wherever `../commands/pause.js` sorts — check the surrounding import block first with `sed -n '1,50p' src/cli/index.ts` to match the existing alphabetization exactly before inserting):

```typescript
import { runPauseCommand } from "../commands/pause.js";
```

and next to `runStartCommand`:

```typescript
import { runResumeCommand } from "../commands/resume.js";
```

Add to the router object, alphabetically among the other single-word command entries (next to `orchestrate`/`projects` for `pause`, and next to `recap`/`start` for `resume` — match whatever ordering convention the file already uses; it is close to alphabetical by key but not strict, e.g. `contract`/`projects`/`attach` are not in strict order, so prioritize placing `pause` near other `p`-commands and `resume` near `recap`/`start`):

```typescript
        pause: (commandArgs) =>
          runPauseCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
```

```typescript
        resume: (commandArgs) =>
          runResumeCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
```

- [ ] **Step 3: Update `apps/core-cli/src/help.ts`**

In the `Commands:` list, add two lines. After `orchestrate` (line 28) is a reasonable spot for `pause`:

```
  pause      Pause active work and close its session
```

And after `recap` (line 40) / before `start` (line 41) is a reasonable spot for `resume`:

```
  resume     Resume paused work and open a new session
```

In the `Work lifecycle:` section (currently lines 80-84), add usage lines so it reads:

```
Work lifecycle:
  autoforge status [--json] [--view <summary|work|next>]
  autoforge start <task|issue> <id>
  autoforge recap
  autoforge done [--no-decision "<reason>"]
  autoforge pause "<reason>"
  autoforge resume <task|issue> <id>
```

- [ ] **Step 4: Rebuild and smoke-test the CLI manually**

Run:

```bash
npm run build
node dist/cli.js --help | grep -A2 "pause\|resume"
```

Expected: both new commands appear in the `Commands:` list and the `Work lifecycle:` usage section.

Then, in a scratch directory, exercise the full cycle end-to-end:

```bash
TMPDIR=$(mktemp -d) && cd "$TMPDIR" && git init -q
node /Users/coltonajackson/Code/Business/autoforge/dist/cli.js init
node /Users/coltonajackson/Code/Business/autoforge/dist/cli.js add issue --name "Smoke test" --description "Verify pause/resume end to end." --include "src/**"
ISSUE_ID=$(node /Users/coltonajackson/Code/Business/autoforge/dist/cli.js status --json | node -e "process.stdin.resume();process.stdin.on('data',d=>{const s=JSON.parse(d.toString());console.log(s.work?.issues?.[0]?.id ?? '')})")
node /Users/coltonajackson/Code/Business/autoforge/dist/cli.js start issue "$ISSUE_ID"
node /Users/coltonajackson/Code/Business/autoforge/dist/cli.js pause "Smoke-test pause."
node /Users/coltonajackson/Code/Business/autoforge/dist/cli.js resume issue "$ISSUE_ID"
node /Users/coltonajackson/Code/Business/autoforge/dist/cli.js done --no-decision "Smoke test cleanup."
cd - && rm -rf "$TMPDIR"
```

Expected: `pause` succeeds and prints `Paused issue ...; ended session....`, `resume` succeeds and prints `Resumed issue ... in session....`, `done` succeeds after. If `status --json`'s shape differs from what this script assumes, inspect its actual output first (`node dist/cli.js status --json | head -50`) and adjust the extraction accordingly — the point of this step is manual confirmation the wiring works, not a fixed script.

- [ ] **Step 5: Run the full suite, typecheck, format, and boundary checks**

Run:

```bash
npx vitest run
npx tsc --noEmit
npx prettier --check src/cli/index.ts apps/core-cli/src/help.ts
node packages/config/src/check-boundaries.mjs
```

Expected: all green. Fix formatting with `npx prettier --write src/cli/index.ts apps/core-cli/src/help.ts` if needed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/index.ts apps/core-cli/src/help.ts
git commit -m "feat: wire pause and resume commands into the CLI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
```

---

### Task 6: Update CHANGELOG, version, and release documentation

**Files:**

- Modify: `CHANGELOG.md` (fold into the existing `[0.25.3]` entry — do not add a new version section)
- Modify: `docs/planning/0.25/RELEASE_READINESS.md` if it references the exact commit/feature set of 0.25.3 (check first)

**Interfaces:**

- Consumes: nothing code-level.
- Produces: an updated changelog entry describing pause/resume; no new interfaces.

- [ ] **Step 1: Check current CHANGELOG state**

Run: `sed -n '1,25p' CHANGELOG.md`

Confirm the `[0.25.3]` section still exists as the top entry (it was added when the `contract generate` fix shipped). If the version has already moved on for any reason, stop and flag this to the user rather than guessing at the right section.

- [ ] **Step 2: Extend the `[0.25.3]` changelog entry**

Add a new subsection under the existing `## [0.25.3] - 2026-08-30` heading, after its existing `### Fixed` list, so the section reads:

```markdown
## [0.25.3] - 2026-08-30

### Fixed

- `autoforge contract generate <agent-id>` now derives `validationCommands`
  from the project's `.autoforge/config.json` `qualityGates`, matching the
  orchestration path's existing behavior, instead of unconditionally
  hardcoding `npm test`. Falls back to `npm test` only when no quality gates
  are configured.
- Validation-evidence readiness now evaluates authoritative, superseding
  gate results by gate and scope instead of treating every historical
  required failure as a current blocker (`autoforge evidence` output and
  `src/quality/readiness.ts`).
- Evidence ordering now sorts by chronological instant rather than insertion
  order.

### Added

- A `paused` work status, alongside `autoforge pause "<reason>"` and
  `autoforge resume <task|issue> <id>` commands, so a task or issue can stop
  mid-flight (session ends, status becomes `paused`, reason is recorded)
  without being marked `completed` or left misleadingly `active`. Resuming
  moves the item back to `active` and opens a new session, mirroring
  `autoforge start`'s conflict rules exactly.
```

(Preserve everything else in the file unchanged — only insert the `### Added` block.)

- [ ] **Step 3: Verify the package.json version is still `0.25.3`**

Run: `grep '"version"' package.json | head -1`
Expected: `"version": "0.25.3",` — no bump needed since this folds into the same release per the user's decision. If it shows something else, stop and flag it rather than guessing.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: record paused work status in the v0.25.3 changelog

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
```

---

### Task 7: Final verification and hand back for tag/release move

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Run the complete workspace check**

Run: `npm run workspace:check`
Expected: all 9 tasks pass (typecheck, build, test:foundation, test:legacy, format:check across root and packages, planning:check).

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: succeeds, prints a bundle size similar to the existing ~551 KB (a few KB larger is expected and fine given two new commands).

- [ ] **Step 3: Run the boundary checker one more time**

Run: `node packages/config/src/check-boundaries.mjs`
Expected: `AutoForge source and package boundaries pass (6 workspaces).`

- [ ] **Step 4: Confirm git state is clean and summarize commits made**

Run: `git status --short && git log --oneline -8`
Expected: clean working tree; the 6 commits from Tasks 1-6 visible at the top of `git log`, on top of whatever `main` looked like when this plan started.

Do not push, retag, or move the `v0.25.3` tag/GitHub Release as part of this plan — that is a separate, explicit step the user asked to do only after this implementation is verified complete. Report back that all tasks are done and verification is green, and stop.
