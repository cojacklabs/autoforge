# v0.22 Learning & Evidence Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hypothesis, experiment, and evidence as three new durable domains, closing the canonical `hypothesis → experiment → evidence → decision` chain via a new `decide --evidence` flag, and expose all three through the digital twin.

**Architecture:** Each domain (`hypothesis`, `experiment`, `evidence`) gets its own schema + `AtomicStateStore`-backed store (matching `src/decisions/` exactly, including a lazy `ensure()` self-initializer matching `src/orchestration/store.ts`'s pattern — no `init.ts` changes needed) + service + CLI command, wired under a new `autoforge learning` command family. `decide` gains a `--evidence` flag that stamps `resultingDecision` back onto referenced evidence. The twin projection gains three new node-producing inputs, reusing the existing `"evidence"` node type already declared (but unused) in `twin/schemas.ts`, plus new `"hypothesis"`/`"experiment"` node types.

**Tech Stack:** TypeScript, Zod schemas, Vitest — no new dependencies.

## Global Constraints

- Every source and test file must pass `npm run format:check` (Prettier) before commit.
- Every task must leave `npm run typecheck` and `npm test` green — no unrelated regressions.
- New stores follow the `AtomicStateStore` + lazy `ensure()` pattern from `src/orchestration/store.ts`, not `AtomicStateStore.initialize()` wired into `src/commands/init.ts` — no changes to `init.ts` in this plan.
- `metric`/`target` on `Hypothesis` are free-text strings, never a structured comparator/value pair.
- Evidence requires at least one of `experimentId`, `hypothesisId`, `relatedWork` set (not exactly one — any combination is valid) via `superRefine`.
- The new "evidence" domain (`src/learning/evidence.ts`) is entirely distinct from the existing `src/quality/evidence.ts` (gate pass/fail/skip evidence) — do not conflate names, IDs, or stores between them.
- New CLI commands/flags follow the existing router pattern: interface entry in `src/cli/router.ts`, wiring in `src/cli/index.ts`, usage text in `src/cli/help.ts`.
- Exit codes must use the existing `EXIT_CODE` constants from `src/core/errors.ts` — no new exit codes.
- Each task closes its corresponding AutoForge issue via `autoforge decide --work <issue-id> ...` followed by `autoforge done`, per the documentation-gate feature (`done` blocks without a linked decision).

---

### Task 1: Hypothesis domain (schema, store, service, command)

**Files:**
- Create: `src/learning/hypothesis-schemas.ts`
- Create: `src/learning/hypothesis-store.ts`
- Create: `src/learning/hypothesis-service.ts`
- Create: `src/commands/learning-hypothesis.ts`
- Test: `test/learning/hypothesis-schemas.test.ts`
- Test: `test/learning/hypothesis-store.test.ts`
- Test: `test/learning/hypothesis-service.test.ts`
- Test: `test/learning-hypothesis-command.test.ts`

**Interfaces:**
- Consumes: `AtomicStateStore`, `StateEnvelope`, `createStateEnvelopeSchema`, `STATE_SCHEMA_VERSION` from `src/state/store.js`/`src/state/schemas.js`; `relatedWorkIdSchema` pattern from `src/decisions/schemas.js` (do not import it directly — duplicate the regex locally, matching how `src/decisions/schemas.ts` itself defines it inline, to keep `src/learning/` self-contained per the module-boundary convention already used for `src/decisions/`, `src/planning/`, etc.).
- Produces:
  ```typescript
  // hypothesis-schemas.ts
  export const hypothesisIdSchema: z.ZodType<string>;   // /^hypothesis\.[a-z0-9][a-z0-9._-]*$/
  export const hypothesisStatusSchema: z.ZodEnum<["proposed", "testing", "confirmed", "refuted"]>;
  export const hypothesisSchema: z.ZodType<Hypothesis>;
  export const hypothesisMemorySchema: z.ZodType<HypothesisMemory>; // { hypotheses: Hypothesis[] }
  export type Hypothesis = { id: string; statement: string; expectedOutcome: string; metric: string; target: string; linkedFeature: string | null; status: HypothesisStatus; createdAt: string; updatedAt: string };
  export type HypothesisStatus = "proposed" | "testing" | "confirmed" | "refuted";
  export type HypothesisMemory = { hypotheses: Hypothesis[] };

  // hypothesis-store.ts
  export function createInitialHypothesisMemory(): HypothesisMemory;
  export class HypothesisStore {
    constructor(projectRoot: string);
    readonly state: AtomicStateStore<HypothesisMemory>;
    ensure(): Promise<void>;
  }

  // hypothesis-service.ts
  export interface RecordHypothesisInput { statement: string; expectedOutcome: string; metric: string; target: string; linkedFeature?: string };
  export interface HypothesisMutationResult { hypothesis: Hypothesis; revision: number };
  export class HypothesisService {
    constructor(store: HypothesisStore, workStore: AtomicStateStore<WorkState>, options?: { now?: () => Date });
    record(input: RecordHypothesisInput): Promise<HypothesisMutationResult>;
    setStatus(id: string, status: HypothesisStatus): Promise<HypothesisMutationResult>;
  }
  ```
- Later tasks (2, 3, 5) consume `hypothesisIdSchema`, `Hypothesis`, `HypothesisStore`, `HypothesisService.record`'s return shape.

- [ ] **Step 1: Write the failing schema test**

Create `test/learning/hypothesis-schemas.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { hypothesisSchema } from "../../src/learning/hypothesis-schemas.js";

const TIMESTAMP = "2026-08-22T00:00:00.000Z";

function baseHypothesis(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "hypothesis.faster-onboarding-increases-activation",
    statement: "A shorter onboarding flow increases activation.",
    expectedOutcome: "New users reach first value faster.",
    metric: "activation rate",
    target: ">= 40% within 7 days",
    linkedFeature: "feature.onboarding-redesign",
    status: "proposed",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("hypothesis schema", () => {
  it("accepts a fully specified hypothesis", () => {
    expect(hypothesisSchema.parse(baseHypothesis())).toMatchObject({
      status: "proposed",
      metric: "activation rate",
    });
  });

  it("accepts a null linkedFeature", () => {
    expect(
      hypothesisSchema.parse(baseHypothesis({ linkedFeature: null })),
    ).toMatchObject({ linkedFeature: null });
  });

  it("rejects an unknown status", () => {
    expect(() =>
      hypothesisSchema.parse(baseHypothesis({ status: "maybe" })),
    ).toThrow();
  });

  it("rejects an empty statement", () => {
    expect(() =>
      hypothesisSchema.parse(baseHypothesis({ statement: "" })),
    ).toThrow();
  });

  it("rejects a malformed id", () => {
    expect(() =>
      hypothesisSchema.parse(baseHypothesis({ id: "not-a-hypothesis-id" })),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/learning/hypothesis-schemas.test.ts`
Expected: FAIL — module `src/learning/hypothesis-schemas.ts` does not exist.

- [ ] **Step 3: Implement `src/learning/hypothesis-schemas.ts`**

```typescript
import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });

export const hypothesisIdSchema = z
  .string()
  .regex(
    /^hypothesis\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a hypothesis ID such as hypothesis.faster-onboarding",
  );

const relatedWorkIdSchema = z
  .string()
  .regex(
    /^(feature|phase|task|issue)\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a feature, phase, task, or issue ID",
  );

export const hypothesisStatusSchema = z.enum([
  "proposed",
  "testing",
  "confirmed",
  "refuted",
]);

export const hypothesisSchema = z
  .object({
    id: hypothesisIdSchema,
    statement: z.string().trim().min(1).max(2_000),
    expectedOutcome: z.string().trim().min(1).max(2_000),
    metric: z.string().trim().min(1).max(200),
    target: z.string().trim().min(1).max(200),
    linkedFeature: relatedWorkIdSchema.nullable(),
    status: hypothesisStatusSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((hypothesis, context) => {
    if (Date.parse(hypothesis.updatedAt) < Date.parse(hypothesis.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "A hypothesis cannot be updated before it is created",
        path: ["updatedAt"],
      });
    }
  });

export const hypothesisMemorySchema = z
  .object({
    hypotheses: z.array(hypothesisSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, hypothesis] of memory.hypotheses.entries()) {
      if (seen.has(hypothesis.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate hypothesis ID: ${hypothesis.id}`,
          path: ["hypotheses", index, "id"],
        });
      }
      seen.add(hypothesis.id);
    }
  });

export type HypothesisStatus = z.infer<typeof hypothesisStatusSchema>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
export type HypothesisMemory = z.infer<typeof hypothesisMemorySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/learning/hypothesis-schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing store test**

Create `test/learning/hypothesis-store.test.ts`, matching `test/decision-store.test.ts`'s structure but exercising the lazy `ensure()` pattern instead of `initialize()` called directly (mirror `src/orchestration/store.ts`'s own test file if one exists — check `test/orchestration-store.test.ts` first and match its `ensure()`-testing shape; if none exists, use the shape below):

```typescript
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { HypothesisStore } from "../../src/learning/hypothesis-store.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("hypothesis store", () => {
  it("lazily initializes on first ensure()", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-hypothesis-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new HypothesisStore(projectRoot);
    await store.ensure();
    await expect(store.state.read()).resolves.toMatchObject({
      state: { revision: 0, data: { hypotheses: [] } },
    });
  });

  it("ensure() is idempotent", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-hypothesis-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new HypothesisStore(projectRoot);
    await store.ensure();
    await store.state.write(
      { hypotheses: [] },
      { expectedRevision: 0 },
    );
    await store.ensure();
    await expect(store.state.read()).resolves.toMatchObject({
      state: { revision: 1 },
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run test/learning/hypothesis-store.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 7: Implement `src/learning/hypothesis-store.ts`**

```typescript
import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  hypothesisMemorySchema,
  type HypothesisMemory,
} from "./hypothesis-schemas.js";

export const hypothesisMemoryEnvelopeSchema = createStateEnvelopeSchema(
  hypothesisMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialHypothesisMemory(): HypothesisMemory {
  return hypothesisMemorySchema.parse({ hypotheses: [] });
}

export class HypothesisStore {
  readonly state: AtomicStateStore<HypothesisMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "hypotheses.json"),
      ),
      schema: hypothesisMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialHypothesisMemory());
    }
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run test/learning/hypothesis-store.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing service test**

Create `test/learning/hypothesis-service.test.ts`. Inspect `test/decision-service.test.ts` first and match its exact fixture-setup pattern (it constructs stores directly against a temp `projectRoot`, with a `now`/`temporaryId` options object — see that file's `createFixture()` helper for the precise shape). Adapt for `HypothesisService`:

```typescript
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HypothesisStore } from "../../src/learning/hypothesis-store.js";
import { HypothesisService } from "../../src/learning/hypothesis-service.js";
import {
  createInitialWorkState,
  createWorkStateStore,
} from "../../src/state/kernel.js";
import { WorkService } from "../../src/work/service.js";

const TIMESTAMP = "2026-08-22T04:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-hypothesis-service-"),
  );
  temporaryDirectories.push(projectRoot);
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture() {
  const workStore = createWorkStateStore(projectRoot, {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
  await workStore.initialize(createInitialWorkState());
  const feature = await new WorkService(workStore, {
    now: () => new Date(TIMESTAMP),
  }).createFeature({
    name: "Onboarding redesign",
    description: "Shorten the first-run flow.",
  });
  const hypothesisStore = new HypothesisStore(projectRoot);
  await hypothesisStore.ensure();
  return {
    feature,
    service: new HypothesisService(hypothesisStore, workStore, {
      now: () => new Date(TIMESTAMP),
    }),
  };
}

describe("hypothesis service", () => {
  it("records a hypothesis with a generated id", async () => {
    const { feature, service } = await createFixture();
    const result = await service.record({
      statement: "A shorter onboarding flow increases activation.",
      expectedOutcome: "New users reach first value faster.",
      metric: "activation rate",
      target: ">= 40% within 7 days",
      linkedFeature: feature.entity.id,
    });
    expect(result.hypothesis.id).toBe(
      "hypothesis.a-shorter-onboarding-flow-increases-activation",
    );
    expect(result.hypothesis.status).toBe("proposed");
  });

  it("rejects a linkedFeature that does not exist", async () => {
    const { service } = await createFixture();
    await expect(
      service.record({
        statement: "Example.",
        expectedOutcome: "Example.",
        metric: "example",
        target: "example",
        linkedFeature: "feature.does-not-exist",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("transitions status via setStatus", async () => {
    const { service } = await createFixture();
    const created = await service.record({
      statement: "Example hypothesis.",
      expectedOutcome: "Example outcome.",
      metric: "example",
      target: "example",
    });
    const updated = await service.setStatus(
      created.hypothesis.id,
      "confirmed",
    );
    expect(updated.hypothesis.status).toBe("confirmed");
  });

  it("rejects setStatus for an unknown id", async () => {
    const { service } = await createFixture();
    await expect(
      service.setStatus("hypothesis.does-not-exist", "confirmed"),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run test/learning/hypothesis-service.test.ts`
Expected: FAIL — module `src/learning/hypothesis-service.ts` does not exist.

- [ ] **Step 11: Implement `src/learning/hypothesis-service.ts`**

Follow `src/decisions/service.ts`'s exact structure (`slugify`/`allocateId` helpers, `AutoForgeError` for domain errors, `AtomicStateStore.write` with `expectedRevision`):

```typescript
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AtomicStateStore } from "../state/store.js";
import type { WorkState } from "../work/schemas.js";
import {
  hypothesisSchema,
  type Hypothesis,
  type HypothesisMemory,
  type HypothesisStatus,
} from "./hypothesis-schemas.js";
import type { HypothesisStore } from "./hypothesis-store.js";

export interface RecordHypothesisInput {
  statement: string;
  expectedOutcome: string;
  metric: string;
  target: string;
  linkedFeature?: string;
}

export interface HypothesisMutationResult {
  hypothesis: Hypothesis;
  revision: number;
}

export interface HypothesisServiceOptions {
  now?: () => Date;
}

function hypothesisError(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_ARGUMENT", message, {
    details,
    exitCode: EXIT_CODE.notFound,
  });
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "hypothesis";
}

function allocateHypothesisId(
  statement: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `hypothesis.${slugify(statement)}`;
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

function workIds(state: WorkState): Set<string> {
  return new Set([
    ...state.features.map((item) => item.id),
    ...state.phases.map((item) => item.id),
    ...state.tasks.map((item) => item.id),
    ...state.issues.map((item) => item.id),
  ]);
}

export class HypothesisService {
  private readonly hypothesisStore: HypothesisStore;
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly now: () => Date;

  constructor(
    hypothesisStore: HypothesisStore,
    workStore: AtomicStateStore<WorkState>,
    options: HypothesisServiceOptions = {},
  ) {
    this.hypothesisStore = hypothesisStore;
    this.workStore = workStore;
    this.now = options.now ?? (() => new Date());
  }

  async record(
    input: RecordHypothesisInput,
  ): Promise<HypothesisMutationResult> {
    await this.hypothesisStore.ensure();
    const [{ state: memoryState }, { state: workState }] = await Promise.all([
      this.hypothesisStore.state.read(),
      this.workStore.read(),
    ]);
    if (input.linkedFeature) {
      const known = workIds(workState.data);
      if (!known.has(input.linkedFeature)) {
        throw hypothesisError("Hypothesis references unknown work", {
          linkedFeature: input.linkedFeature,
        });
      }
    }
    const timestamp = this.now().toISOString();
    const hypothesis = hypothesisSchema.parse({
      id: allocateHypothesisId(
        input.statement,
        new Set(memoryState.data.hypotheses.map((item) => item.id)),
      ),
      statement: input.statement,
      expectedOutcome: input.expectedOutcome,
      metric: input.metric,
      target: input.target,
      linkedFeature: input.linkedFeature ?? null,
      status: "proposed",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.hypothesisStore.state.write(
      {
        hypotheses: [...memoryState.data.hypotheses, hypothesis],
      },
      { expectedRevision: memoryState.revision },
    );
    return { hypothesis, revision: committed.revision };
  }

  async setStatus(
    id: string,
    status: HypothesisStatus,
  ): Promise<HypothesisMutationResult> {
    await this.hypothesisStore.ensure();
    const { state: memoryState } = await this.hypothesisStore.state.read();
    const existing = memoryState.data.hypotheses.find(
      (candidate) => candidate.id === id,
    );
    if (!existing) {
      throw hypothesisError(`Unknown hypothesis ${id}`, { id });
    }
    const timestamp = this.now().toISOString();
    const updated: Hypothesis = { ...existing, status, updatedAt: timestamp };
    const hypotheses: HypothesisMemory["hypotheses"] =
      memoryState.data.hypotheses.map((candidate) =>
        candidate.id === id ? updated : candidate,
      );
    const committed = await this.hypothesisStore.state.write(
      { hypotheses },
      { expectedRevision: memoryState.revision },
    );
    return { hypothesis: updated, revision: committed.revision };
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run test/learning/hypothesis-service.test.ts`
Expected: PASS.

- [ ] **Step 13: Write the failing command test**

Create `test/learning-hypothesis-command.test.ts`. Inspect `test/decide.test.ts` first for its exact fixture/`initializeProject` pattern and match it:

```typescript
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runLearningHypothesisCommand } from "../src/commands/learning-hypothesis.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-learning-hypothesis-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return { projectRoot };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("learning hypothesis command", () => {
  it("adds, lists, and shows a hypothesis", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: [
          "add",
          "--statement",
          "A shorter onboarding flow increases activation.",
          "--expected-outcome",
          "New users reach first value faster.",
          "--metric",
          "activation rate",
          "--target",
          ">= 40% within 7 days",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const listOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: ["list"],
        output: listOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(listOutput.stdout.mock.calls[0]?.[0]).toContain(
      "hypothesis.a-shorter-onboarding-flow-increases-activation",
    );

    const showOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: [
          "show",
          "hypothesis.a-shorter-onboarding-flow-increases-activation",
        ],
        output: showOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(showOutput.stdout.mock.calls[0]?.[0] ?? "{}").status,
    ).toBe("proposed");
  });

  it("sets hypothesis status", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runLearningHypothesisCommand({
      args: [
        "add",
        "--statement",
        "Example.",
        "--expected-outcome",
        "Example.",
        "--metric",
        "example",
        "--target",
        "example",
      ],
      output,
      startDirectory: projectRoot,
    });
    await expect(
      runLearningHypothesisCommand({
        args: [
          "status",
          "hypothesis.example",
          "--status",
          "confirmed",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("rejects unknown subcommands", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: ["bogus"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists nothing gracefully before any hypothesis exists", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: ["list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });
});
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npx vitest run test/learning-hypothesis-command.test.ts`
Expected: FAIL — module `src/commands/learning-hypothesis.ts` does not exist.

- [ ] **Step 15: Implement `src/commands/learning-hypothesis.ts`**

```typescript
import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { HypothesisService } from "../learning/hypothesis-service.js";
import { hypothesisStatusSchema } from "../learning/hypothesis-schemas.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
import { createWorkStateStore } from "../state/kernel.js";

export interface LearningHypothesisCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <id>] | hypothesis list [--status <status>] | hypothesis show <id> | hypothesis status <id> --status <proposed|testing|confirmed|refuted>",
  );
  return EXIT_CODE.usage;
}

function parseFlags(
  args: readonly string[],
  known: ReadonlySet<string>,
): Map<string, string> | undefined {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !known.has(flag) || !value || value.startsWith("--")) {
      return undefined;
    }
    values.set(flag, value);
  }
  return values;
}

export async function runLearningHypothesisCommand(
  options: LearningHypothesisCommandOptions,
): Promise<ExitCode> {
  const [action, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const hypothesisStore = new HypothesisStore(project.path);
  const service = new HypothesisService(
    hypothesisStore,
    createWorkStateStore(project.path),
  );

  try {
    if (action === "add") {
      const flags = parseFlags(
        rest,
        new Set([
          "--statement",
          "--expected-outcome",
          "--metric",
          "--target",
          "--work",
        ]),
      );
      const statement = flags?.get("--statement");
      const expectedOutcome = flags?.get("--expected-outcome");
      const metric = flags?.get("--metric");
      const target = flags?.get("--target");
      if (!flags || !statement || !expectedOutcome || !metric || !target) {
        return usage(options.output);
      }
      const linkedFeature = flags.get("--work");
      const result = await service.record({
        statement,
        expectedOutcome,
        metric,
        target,
        ...(linkedFeature ? { linkedFeature } : {}),
      });
      options.output.stdout(
        `Recorded hypothesis ${result.hypothesis.id} (revision ${result.revision}).`,
      );
      return EXIT_CODE.success;
    }
    if (action === "list") {
      await hypothesisStore.ensure();
      const { state } = await hypothesisStore.state.read();
      const statusFilter = rest[0] === "--status" ? rest[1] : undefined;
      const rows = state.data.hypotheses
        .filter(
          (hypothesis) => !statusFilter || hypothesis.status === statusFilter,
        )
        .map(
          (hypothesis) =>
            `${hypothesis.id} [${hypothesis.status}] — ${hypothesis.statement}`,
        )
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }
    if (action === "show" && rest[0]) {
      await hypothesisStore.ensure();
      const { state } = await hypothesisStore.state.read();
      const found = state.data.hypotheses.find(
        (hypothesis) => hypothesis.id === rest[0],
      );
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }
    if (action === "status" && rest[0] === undefined) {
      return usage(options.output);
    }
    if (action === "status") {
      const [id, flag, statusValue] = rest;
      if (flag !== "--status" || !statusValue) return usage(options.output);
      const status = hypothesisStatusSchema.parse(statusValue);
      const result = await service.setStatus(id!, status);
      options.output.stdout(
        `Updated hypothesis ${result.hypothesis.id} to ${result.hypothesis.status}.`,
      );
      return EXIT_CODE.success;
    }
    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      options.output.stderr(
        error.issues[0]?.message ?? "Invalid hypothesis input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run test/learning-hypothesis-command.test.ts`
Expected: PASS.

- [ ] **Step 17: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: clean. Note this task does NOT wire the CLI router/index — that happens in Task 4 once all three domains exist, to keep the router-wiring diff in one place.

- [ ] **Step 18: Commit**

```bash
git add src/learning/hypothesis-schemas.ts src/learning/hypothesis-store.ts src/learning/hypothesis-service.ts src/commands/learning-hypothesis.ts test/learning/hypothesis-schemas.test.ts test/learning/hypothesis-store.test.ts test/learning/hypothesis-service.test.ts test/learning-hypothesis-command.test.ts
git commit -m "feat: add hypothesis domain (schema, store, service, command)"
```

---

### Task 2: Experiment domain (schema, store, service, command)

**Files:**
- Create: `src/learning/experiment-schemas.ts`
- Create: `src/learning/experiment-store.ts`
- Create: `src/learning/experiment-service.ts`
- Create: `src/commands/learning-experiment.ts`
- Test: `test/learning/experiment-schemas.test.ts`
- Test: `test/learning/experiment-store.test.ts`
- Test: `test/learning/experiment-service.test.ts`
- Test: `test/learning-experiment-command.test.ts`

**Interfaces:**
- Consumes: `hypothesisIdSchema`, `Hypothesis` from Task 1 (`src/learning/hypothesis-schemas.js`); `HypothesisStore` from Task 1 to validate `hypothesisIds` reference real hypotheses (same "validate against a related store" pattern as `DecisionService` validating `relatedWork` against `WorkState`).
- Produces:
  ```typescript
  // experiment-schemas.ts
  export const experimentIdSchema: z.ZodType<string>;   // /^experiment\.[a-z0-9][a-z0-9._-]*$/
  export const experimentStatusSchema: z.ZodEnum<["planned", "running", "completed", "abandoned"]>;
  export const experimentSchema: z.ZodType<Experiment>;
  export const experimentMemorySchema: z.ZodType<ExperimentMemory>;
  export type Experiment = { id: string; hypothesisIds: string[]; method: string; status: ExperimentStatus; startedAt: string; endedAt: string | null; createdAt: string; updatedAt: string };
  export type ExperimentStatus = "planned" | "running" | "completed" | "abandoned";
  export type ExperimentMemory = { experiments: Experiment[] };

  // experiment-store.ts — same shape as HypothesisStore
  export class ExperimentStore { readonly state: AtomicStateStore<ExperimentMemory>; ensure(): Promise<void>; }

  // experiment-service.ts
  export interface RecordExperimentInput { hypothesisIds: string[]; method: string };
  export class ExperimentService {
    record(input: RecordExperimentInput): Promise<{ experiment: Experiment; revision: number }>;
    complete(id: string): Promise<{ experiment: Experiment; revision: number }>;
  }
  ```
- Task 3 (evidence) consumes `experimentIdSchema`, `ExperimentStore` to validate `experimentId` references.

- [ ] **Step 1: Write the failing schema test**

Create `test/learning/experiment-schemas.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { experimentSchema } from "../../src/learning/experiment-schemas.js";

const TIMESTAMP = "2026-08-22T00:00:00.000Z";

function baseExperiment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "experiment.onboarding-ab-test",
    hypothesisIds: ["hypothesis.faster-onboarding-increases-activation"],
    method: "A/B test",
    status: "planned",
    startedAt: TIMESTAMP,
    endedAt: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("experiment schema", () => {
  it("accepts a fully specified experiment", () => {
    expect(experimentSchema.parse(baseExperiment())).toMatchObject({
      status: "planned",
      method: "A/B test",
    });
  });

  it("accepts multiple hypothesisIds", () => {
    expect(
      experimentSchema.parse(
        baseExperiment({
          hypothesisIds: ["hypothesis.a", "hypothesis.b"],
        }),
      ),
    ).toMatchObject({ hypothesisIds: ["hypothesis.a", "hypothesis.b"] });
  });

  it("rejects an empty hypothesisIds array", () => {
    expect(() =>
      experimentSchema.parse(baseExperiment({ hypothesisIds: [] })),
    ).toThrow();
  });

  it("rejects duplicate hypothesisIds", () => {
    expect(() =>
      experimentSchema.parse(
        baseExperiment({
          hypothesisIds: [
            "hypothesis.faster-onboarding-increases-activation",
            "hypothesis.faster-onboarding-increases-activation",
          ],
        }),
      ),
    ).toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      experimentSchema.parse(baseExperiment({ status: "done" })),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/learning/experiment-schemas.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/learning/experiment-schemas.ts`**

```typescript
import { z } from "zod";

import { hypothesisIdSchema } from "./hypothesis-schemas.js";

const timestampSchema = z.string().datetime({ offset: true });

export const experimentIdSchema = z
  .string()
  .regex(
    /^experiment\.[a-z0-9][a-z0-9._-]*$/,
    "Expected an experiment ID such as experiment.onboarding-ab-test",
  );

export const experimentStatusSchema = z.enum([
  "planned",
  "running",
  "completed",
  "abandoned",
]);

export const experimentSchema = z
  .object({
    id: experimentIdSchema,
    hypothesisIds: z.array(hypothesisIdSchema).min(1),
    method: z.string().trim().min(1).max(500),
    status: experimentStatusSchema,
    startedAt: timestampSchema,
    endedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((experiment, context) => {
    if (new Set(experiment.hypothesisIds).size !== experiment.hypothesisIds.length) {
      context.addIssue({
        code: "custom",
        message: "hypothesisIds values must be unique",
        path: ["hypothesisIds"],
      });
    }
    if (Date.parse(experiment.updatedAt) < Date.parse(experiment.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "An experiment cannot be updated before it is created",
        path: ["updatedAt"],
      });
    }
    if (
      experiment.endedAt &&
      Date.parse(experiment.endedAt) < Date.parse(experiment.startedAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "An experiment cannot end before it starts",
        path: ["endedAt"],
      });
    }
  });

export const experimentMemorySchema = z
  .object({
    experiments: z.array(experimentSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, experiment] of memory.experiments.entries()) {
      if (seen.has(experiment.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate experiment ID: ${experiment.id}`,
          path: ["experiments", index, "id"],
        });
      }
      seen.add(experiment.id);
    }
  });

export type ExperimentStatus = z.infer<typeof experimentStatusSchema>;
export type Experiment = z.infer<typeof experimentSchema>;
export type ExperimentMemory = z.infer<typeof experimentMemorySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/learning/experiment-schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing store test**

Create `test/learning/experiment-store.test.ts`, same shape as Task 1 Step 5 adapted for `ExperimentStore`/`experiments: []`.

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run test/learning/experiment-store.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 7: Implement `src/learning/experiment-store.ts`**

Identical shape to `src/learning/hypothesis-store.ts` (Task 1 Step 7), substituting `experimentMemorySchema`/`ExperimentMemory`/`createInitialExperimentMemory` and file path `.autoforge/learning/experiments.json`:

```typescript
import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  experimentMemorySchema,
  type ExperimentMemory,
} from "./experiment-schemas.js";

export const experimentMemoryEnvelopeSchema = createStateEnvelopeSchema(
  experimentMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialExperimentMemory(): ExperimentMemory {
  return experimentMemorySchema.parse({ experiments: [] });
}

export class ExperimentStore {
  readonly state: AtomicStateStore<ExperimentMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "experiments.json"),
      ),
      schema: experimentMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialExperimentMemory());
    }
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run test/learning/experiment-store.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing service test**

Create `test/learning/experiment-service.test.ts`. Build a fixture that first records a hypothesis (via `HypothesisService`, Task 1), then tests `ExperimentService.record` referencing it:

```typescript
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HypothesisService } from "../../src/learning/hypothesis-service.js";
import { HypothesisStore } from "../../src/learning/hypothesis-store.js";
import { ExperimentService } from "../../src/learning/experiment-service.js";
import { ExperimentStore } from "../../src/learning/experiment-store.js";
import {
  createInitialWorkState,
  createWorkStateStore,
} from "../../src/state/kernel.js";

const TIMESTAMP = "2026-08-22T05:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-experiment-service-"),
  );
  temporaryDirectories.push(projectRoot);
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture() {
  const workStore = createWorkStateStore(projectRoot, {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
  await workStore.initialize(createInitialWorkState());
  const hypothesisStore = new HypothesisStore(projectRoot);
  await hypothesisStore.ensure();
  const hypothesisResult = await new HypothesisService(
    hypothesisStore,
    workStore,
    { now: () => new Date(TIMESTAMP) },
  ).record({
    statement: "Example hypothesis.",
    expectedOutcome: "Example outcome.",
    metric: "example",
    target: "example",
  });
  const experimentStore = new ExperimentStore(projectRoot);
  await experimentStore.ensure();
  return {
    hypothesis: hypothesisResult.hypothesis,
    service: new ExperimentService(experimentStore, hypothesisStore, {
      now: () => new Date(TIMESTAMP),
    }),
  };
}

describe("experiment service", () => {
  it("records an experiment testing an existing hypothesis", async () => {
    const { hypothesis, service } = await createFixture();
    const result = await service.record({
      hypothesisIds: [hypothesis.id],
      method: "A/B test",
    });
    expect(result.experiment.status).toBe("planned");
    expect(result.experiment.hypothesisIds).toEqual([hypothesis.id]);
  });

  it("rejects an unknown hypothesisId", async () => {
    const { service } = await createFixture();
    await expect(
      service.record({
        hypothesisIds: ["hypothesis.does-not-exist"],
        method: "A/B test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("marks an experiment completed", async () => {
    const { hypothesis, service } = await createFixture();
    const created = await service.record({
      hypothesisIds: [hypothesis.id],
      method: "A/B test",
    });
    const completed = await service.complete(created.experiment.id);
    expect(completed.experiment.status).toBe("completed");
    expect(completed.experiment.endedAt).not.toBeNull();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run test/learning/experiment-service.test.ts`
Expected: FAIL — module `src/learning/experiment-service.ts` does not exist.

- [ ] **Step 11: Implement `src/learning/experiment-service.ts`**

```typescript
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import {
  experimentSchema,
  type Experiment,
} from "./experiment-schemas.js";
import type { ExperimentStore } from "./experiment-store.js";
import type { HypothesisStore } from "./hypothesis-store.js";

export interface RecordExperimentInput {
  hypothesisIds: string[];
  method: string;
}

export interface ExperimentMutationResult {
  experiment: Experiment;
  revision: number;
}

export interface ExperimentServiceOptions {
  now?: () => Date;
}

function experimentError(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_ARGUMENT", message, {
    details,
    exitCode: EXIT_CODE.notFound,
  });
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "experiment";
}

function allocateExperimentId(
  method: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `experiment.${slugify(method)}`;
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export class ExperimentService {
  private readonly experimentStore: ExperimentStore;
  private readonly hypothesisStore: HypothesisStore;
  private readonly now: () => Date;

  constructor(
    experimentStore: ExperimentStore,
    hypothesisStore: HypothesisStore,
    options: ExperimentServiceOptions = {},
  ) {
    this.experimentStore = experimentStore;
    this.hypothesisStore = hypothesisStore;
    this.now = options.now ?? (() => new Date());
  }

  async record(
    input: RecordExperimentInput,
  ): Promise<ExperimentMutationResult> {
    await this.experimentStore.ensure();
    await this.hypothesisStore.ensure();
    const [{ state: memoryState }, { state: hypothesisState }] =
      await Promise.all([
        this.experimentStore.state.read(),
        this.hypothesisStore.state.read(),
      ]);
    const knownHypotheses = new Set(
      hypothesisState.data.hypotheses.map((item) => item.id),
    );
    const unknown = input.hypothesisIds.filter(
      (id) => !knownHypotheses.has(id),
    );
    if (unknown.length > 0) {
      throw experimentError("Experiment references unknown hypothesis", {
        unknownHypothesisIds: unknown,
      });
    }
    const timestamp = this.now().toISOString();
    const experiment = experimentSchema.parse({
      id: allocateExperimentId(
        input.method,
        new Set(memoryState.data.experiments.map((item) => item.id)),
      ),
      hypothesisIds: input.hypothesisIds,
      method: input.method,
      status: "planned",
      startedAt: timestamp,
      endedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.experimentStore.state.write(
      {
        experiments: [...memoryState.data.experiments, experiment],
      },
      { expectedRevision: memoryState.revision },
    );
    return { experiment, revision: committed.revision };
  }

  async complete(id: string): Promise<ExperimentMutationResult> {
    await this.experimentStore.ensure();
    const { state: memoryState } = await this.experimentStore.state.read();
    const existing = memoryState.data.experiments.find(
      (candidate) => candidate.id === id,
    );
    if (!existing) {
      throw experimentError(`Unknown experiment ${id}`, { id });
    }
    const timestamp = this.now().toISOString();
    const updated: Experiment = {
      ...existing,
      status: "completed",
      endedAt: timestamp,
      updatedAt: timestamp,
    };
    const experiments = memoryState.data.experiments.map((candidate) =>
      candidate.id === id ? updated : candidate,
    );
    const committed = await this.experimentStore.state.write(
      { experiments },
      { expectedRevision: memoryState.revision },
    );
    return { experiment: updated, revision: committed.revision };
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run test/learning/experiment-service.test.ts`
Expected: PASS.

- [ ] **Step 13: Write the failing command test**

Create `test/learning-experiment-command.test.ts`, mirroring Task 1 Step 13's structure exactly, but first recording a hypothesis via a direct `runLearningHypothesisCommand` call (import from Task 1) before testing `runLearningExperimentCommand add --hypothesis <id> --method <text>`, `list`, `show`, `complete`.

- [ ] **Step 14: Run test to verify it fails**

Run: `npx vitest run test/learning-experiment-command.test.ts`
Expected: FAIL — module `src/commands/learning-experiment.ts` does not exist.

- [ ] **Step 15: Implement `src/commands/learning-experiment.ts`**

Mirror `src/commands/learning-hypothesis.ts`'s structure exactly. Key differences: `add` accepts a repeatable `--hypothesis <id>` flag (parse like `decide`'s `--work`/`--consequence` repeatable-flag loop, not the single-flags `Map` used in Task 1 — combine both patterns: repeatable `--hypothesis`, single `--method`) and a `complete <id>` verb instead of `status <id> --status <value>`:

```typescript
import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { ExperimentService } from "../learning/experiment-service.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";

export interface LearningExperimentCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text> | experiment list [--status <status>] | experiment show <id> | experiment complete <id>",
  );
  return EXIT_CODE.usage;
}

function parseAddArguments(
  args: readonly string[],
): { hypothesisIds: string[]; method: string } | undefined {
  const hypothesisIds: string[] = [];
  let method: string | undefined;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if ((flag !== "--hypothesis" && flag !== "--method") || !value) {
      return undefined;
    }
    if (flag === "--hypothesis") hypothesisIds.push(value);
    else method = value;
  }
  if (hypothesisIds.length === 0 || !method) return undefined;
  return { hypothesisIds, method };
}

export async function runLearningExperimentCommand(
  options: LearningExperimentCommandOptions,
): Promise<ExitCode> {
  const [action, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const experimentStore = new ExperimentStore(project.path);
  const hypothesisStore = new HypothesisStore(project.path);
  const service = new ExperimentService(experimentStore, hypothesisStore);

  try {
    if (action === "add") {
      const parsed = parseAddArguments(rest);
      if (!parsed) return usage(options.output);
      const result = await service.record(parsed);
      options.output.stdout(
        `Recorded experiment ${result.experiment.id} (revision ${result.revision}).`,
      );
      return EXIT_CODE.success;
    }
    if (action === "list") {
      await experimentStore.ensure();
      const { state } = await experimentStore.state.read();
      const statusFilter = rest[0] === "--status" ? rest[1] : undefined;
      const rows = state.data.experiments
        .filter(
          (experiment) => !statusFilter || experiment.status === statusFilter,
        )
        .map(
          (experiment) =>
            `${experiment.id} [${experiment.status}] — ${experiment.method}`,
        )
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }
    if (action === "show" && rest[0]) {
      await experimentStore.ensure();
      const { state } = await experimentStore.state.read();
      const found = state.data.experiments.find(
        (experiment) => experiment.id === rest[0],
      );
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }
    if (action === "complete" && rest[0] && rest.length === 1) {
      const result = await service.complete(rest[0]);
      options.output.stdout(
        `Completed experiment ${result.experiment.id}.`,
      );
      return EXIT_CODE.success;
    }
    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      options.output.stderr(
        error.issues[0]?.message ?? "Invalid experiment input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run test/learning-experiment-command.test.ts`
Expected: PASS.

- [ ] **Step 17: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: clean.

- [ ] **Step 18: Commit**

```bash
git add src/learning/experiment-schemas.ts src/learning/experiment-store.ts src/learning/experiment-service.ts src/commands/learning-experiment.ts test/learning/experiment-schemas.test.ts test/learning/experiment-store.test.ts test/learning/experiment-service.test.ts test/learning-experiment-command.test.ts
git commit -m "feat: add experiment domain (schema, store, service, command)"
```

---

### Task 3: Evidence domain (schema, store, service, command)

**Files:**
- Create: `src/learning/evidence-schemas.ts`
- Create: `src/learning/evidence-store.ts`
- Create: `src/learning/evidence-service.ts`
- Create: `src/commands/learning-evidence.ts`
- Test: `test/learning/evidence-schemas.test.ts`
- Test: `test/learning/evidence-store.test.ts`
- Test: `test/learning/evidence-service.test.ts`
- Test: `test/learning-evidence-command.test.ts`

**Interfaces:**
- Consumes: `hypothesisIdSchema` (Task 1), `experimentIdSchema` (Task 2), `HypothesisStore` (Task 1), `ExperimentStore` (Task 2).
- Produces:
  ```typescript
  // evidence-schemas.ts
  export const evidenceIdSchema: z.ZodType<string>;   // /^evidence\.[a-z0-9][a-z0-9._-]*$/
  export const evidenceKindSchema: z.ZodEnum<[
    "analytics", "beta-feedback", "support-ticket", "bug-report",
    "usability-study", "experiment-result", "performance-metric",
    "interview", "ai-evaluation",
  ]>;
  export const evidenceSchema: z.ZodType<Evidence>;
  export const evidenceMemorySchema: z.ZodType<EvidenceMemory>;
  export type Evidence = { id: string; kind: EvidenceKind; summary: string; source: string; experimentId: string | null; hypothesisId: string | null; relatedWork: string | null; resultingDecision: string | null; capturedAt: string };
  export type EvidenceKind = "analytics" | "beta-feedback" | "support-ticket" | "bug-report" | "usability-study" | "experiment-result" | "performance-metric" | "interview" | "ai-evaluation";
  export type EvidenceMemory = { evidence: Evidence[] };

  // evidence-store.ts — same shape as HypothesisStore/ExperimentStore
  export class EvidenceStore { readonly state: AtomicStateStore<EvidenceMemory>; ensure(): Promise<void>; }

  // evidence-service.ts
  export interface RecordEvidenceInput { kind: EvidenceKind; summary: string; source: string; experimentId?: string; hypothesisId?: string; relatedWork?: string };
  export class EvidenceService {
    record(input: RecordEvidenceInput): Promise<{ evidence: Evidence; revision: number }>;
    stampResultingDecision(evidenceIds: string[], decisionId: string): Promise<void>;
  }
  ```
- Task 5 (`decide --evidence`) consumes `EvidenceStore`, `EvidenceService.stampResultingDecision`.
- Task 6 (twin integration) consumes `Evidence`, `EvidenceStore`.

- [ ] **Step 1: Write the failing schema test**

Create `test/learning/evidence-schemas.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { evidenceSchema } from "../../src/learning/evidence-schemas.js";

const TIMESTAMP = "2026-08-22T00:00:00.000Z";

function baseEvidence(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "evidence.beta-cohort-3-onboarding-feedback",
    kind: "beta-feedback",
    summary: "Beta users reached activation 30% faster with the new flow.",
    source: "Beta cohort #3",
    experimentId: "experiment.onboarding-ab-test",
    hypothesisId: null,
    relatedWork: null,
    resultingDecision: null,
    capturedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("evidence schema", () => {
  it("accepts evidence linked to an experiment", () => {
    expect(evidenceSchema.parse(baseEvidence())).toMatchObject({
      kind: "beta-feedback",
    });
  });

  it("accepts evidence linked directly to a hypothesis with no experiment", () => {
    expect(
      evidenceSchema.parse(
        baseEvidence({
          experimentId: null,
          hypothesisId: "hypothesis.faster-onboarding-increases-activation",
        }),
      ),
    ).toMatchObject({ experimentId: null });
  });

  it("accepts evidence linked directly to related work with no experiment or hypothesis", () => {
    expect(
      evidenceSchema.parse(
        baseEvidence({
          experimentId: null,
          relatedWork: "issue.onboarding-drop-off",
        }),
      ),
    ).toMatchObject({ relatedWork: "issue.onboarding-drop-off" });
  });

  it("accepts evidence linked to more than one of experiment/hypothesis/relatedWork simultaneously", () => {
    expect(
      evidenceSchema.parse(
        baseEvidence({
          hypothesisId: "hypothesis.faster-onboarding-increases-activation",
          relatedWork: "issue.onboarding-drop-off",
        }),
      ),
    ).toMatchObject({
      experimentId: "experiment.onboarding-ab-test",
      hypothesisId: "hypothesis.faster-onboarding-increases-activation",
      relatedWork: "issue.onboarding-drop-off",
    });
  });

  it("rejects evidence with no experiment, hypothesis, or related work", () => {
    expect(() =>
      evidenceSchema.parse(
        baseEvidence({ experimentId: null, hypothesisId: null, relatedWork: null }),
      ),
    ).toThrow();
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      evidenceSchema.parse(baseEvidence({ kind: "rumor" })),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/learning/evidence-schemas.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/learning/evidence-schemas.ts`**

```typescript
import { z } from "zod";

import { experimentIdSchema } from "./experiment-schemas.js";
import { hypothesisIdSchema } from "./hypothesis-schemas.js";

const timestampSchema = z.string().datetime({ offset: true });

export const evidenceIdSchema = z
  .string()
  .regex(
    /^evidence\.[a-z0-9][a-z0-9._-]*$/,
    "Expected an evidence ID such as evidence.beta-cohort-3-feedback",
  );

const relatedWorkIdSchema = z
  .string()
  .regex(
    /^(feature|phase|task|issue)\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a feature, phase, task, or issue ID",
  );

const decisionIdSchema = z
  .string()
  .regex(
    /^decision\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a decision ID such as decision.use-postgres",
  );

export const evidenceKindSchema = z.enum([
  "analytics",
  "beta-feedback",
  "support-ticket",
  "bug-report",
  "usability-study",
  "experiment-result",
  "performance-metric",
  "interview",
  "ai-evaluation",
]);

export const evidenceSchema = z
  .object({
    id: evidenceIdSchema,
    kind: evidenceKindSchema,
    summary: z.string().trim().min(1).max(4_000),
    source: z.string().trim().min(1).max(500),
    experimentId: experimentIdSchema.nullable(),
    hypothesisId: hypothesisIdSchema.nullable(),
    relatedWork: relatedWorkIdSchema.nullable(),
    resultingDecision: decisionIdSchema.nullable(),
    capturedAt: timestampSchema,
  })
  .strict()
  .superRefine((evidence, context) => {
    if (
      !evidence.experimentId &&
      !evidence.hypothesisId &&
      !evidence.relatedWork
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Evidence must reference at least one of experimentId, hypothesisId, or relatedWork",
        path: ["experimentId"],
      });
    }
  });

export const evidenceMemorySchema = z
  .object({
    evidence: z.array(evidenceSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, record] of memory.evidence.entries()) {
      if (seen.has(record.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate evidence ID: ${record.id}`,
          path: ["evidence", index, "id"],
        });
      }
      seen.add(record.id);
    }
  });

export type EvidenceKind = z.infer<typeof evidenceKindSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type EvidenceMemory = z.infer<typeof evidenceMemorySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/learning/evidence-schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing store test**

Create `test/learning/evidence-store.test.ts`, same shape as Task 1 Step 5, adapted for `EvidenceStore`/`evidence: []`.

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run test/learning/evidence-store.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 7: Implement `src/learning/evidence-store.ts`**

Identical shape to Task 1 Step 7 / Task 2 Step 7, substituting `evidenceMemorySchema`/`EvidenceMemory`/`createInitialEvidenceMemory`, file path `.autoforge/learning/evidence.json`:

```typescript
import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  evidenceMemorySchema,
  type EvidenceMemory,
} from "./evidence-schemas.js";

export const evidenceMemoryEnvelopeSchema = createStateEnvelopeSchema(
  evidenceMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialEvidenceMemory(): EvidenceMemory {
  return evidenceMemorySchema.parse({ evidence: [] });
}

export class EvidenceStore {
  readonly state: AtomicStateStore<EvidenceMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "evidence.json"),
      ),
      schema: evidenceMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialEvidenceMemory());
    }
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run test/learning/evidence-store.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing service test**

Create `test/learning/evidence-service.test.ts`, following the fixture pattern from Task 2 Step 9 (build hypothesis, then experiment referencing it, then evidence):

```typescript
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HypothesisService } from "../../src/learning/hypothesis-service.js";
import { HypothesisStore } from "../../src/learning/hypothesis-store.js";
import { ExperimentService } from "../../src/learning/experiment-service.js";
import { ExperimentStore } from "../../src/learning/experiment-store.js";
import { EvidenceService } from "../../src/learning/evidence-service.js";
import { EvidenceStore } from "../../src/learning/evidence-store.js";
import {
  createInitialWorkState,
  createWorkStateStore,
} from "../../src/state/kernel.js";

const TIMESTAMP = "2026-08-22T06:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-evidence-service-"),
  );
  temporaryDirectories.push(projectRoot);
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture() {
  const workStore = createWorkStateStore(projectRoot, {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
  await workStore.initialize(createInitialWorkState());
  const hypothesisStore = new HypothesisStore(projectRoot);
  await hypothesisStore.ensure();
  const hypothesisResult = await new HypothesisService(
    hypothesisStore,
    workStore,
    { now: () => new Date(TIMESTAMP) },
  ).record({
    statement: "Example hypothesis.",
    expectedOutcome: "Example outcome.",
    metric: "example",
    target: "example",
  });
  const experimentStore = new ExperimentStore(projectRoot);
  await experimentStore.ensure();
  const experimentResult = await new ExperimentService(
    experimentStore,
    hypothesisStore,
    { now: () => new Date(TIMESTAMP) },
  ).record({
    hypothesisIds: [hypothesisResult.hypothesis.id],
    method: "A/B test",
  });
  const evidenceStore = new EvidenceStore(projectRoot);
  await evidenceStore.ensure();
  return {
    hypothesis: hypothesisResult.hypothesis,
    experiment: experimentResult.experiment,
    service: new EvidenceService(
      evidenceStore,
      experimentStore,
      hypothesisStore,
      { now: () => new Date(TIMESTAMP) },
    ),
    evidenceStore,
  };
}

describe("evidence service", () => {
  it("records evidence linked to an experiment", async () => {
    const { experiment, service } = await createFixture();
    const result = await service.record({
      kind: "beta-feedback",
      summary: "Beta users onboarded faster.",
      source: "Beta cohort #3",
      experimentId: experiment.id,
    });
    expect(result.evidence.experimentId).toBe(experiment.id);
    expect(result.evidence.resultingDecision).toBeNull();
  });

  it("records evidence linked directly to a hypothesis with no experiment", async () => {
    const { hypothesis, service } = await createFixture();
    const result = await service.record({
      kind: "support-ticket",
      summary: "User confused by onboarding step 3.",
      source: "Support ticket #4821",
      hypothesisId: hypothesis.id,
    });
    expect(result.evidence.hypothesisId).toBe(hypothesis.id);
    expect(result.evidence.experimentId).toBeNull();
  });

  it("rejects an unknown experimentId", async () => {
    const { service } = await createFixture();
    await expect(
      service.record({
        kind: "bug-report",
        summary: "Example.",
        source: "Example.",
        experimentId: "experiment.does-not-exist",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("stamps resultingDecision on referenced evidence", async () => {
    const { experiment, service, evidenceStore } = await createFixture();
    const recorded = await service.record({
      kind: "beta-feedback",
      summary: "Example.",
      source: "Example.",
      experimentId: experiment.id,
    });
    await service.stampResultingDecision(
      [recorded.evidence.id],
      "decision.example-decision",
    );
    const { state } = await evidenceStore.state.read();
    expect(
      state.data.evidence.find((item) => item.id === recorded.evidence.id)
        ?.resultingDecision,
    ).toBe("decision.example-decision");
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run test/learning/evidence-service.test.ts`
Expected: FAIL — module `src/learning/evidence-service.ts` does not exist.

- [ ] **Step 11: Implement `src/learning/evidence-service.ts`**

```typescript
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { evidenceSchema, type Evidence } from "./evidence-schemas.js";
import type { EvidenceStore } from "./evidence-store.js";
import type { ExperimentStore } from "./experiment-store.js";
import type { HypothesisStore } from "./hypothesis-store.js";

export interface RecordEvidenceInput {
  kind: Evidence["kind"];
  summary: string;
  source: string;
  experimentId?: string;
  hypothesisId?: string;
  relatedWork?: string;
}

export interface EvidenceMutationResult {
  evidence: Evidence;
  revision: number;
}

export interface EvidenceServiceOptions {
  now?: () => Date;
}

function evidenceError(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_ARGUMENT", message, {
    details,
    exitCode: EXIT_CODE.notFound,
  });
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "evidence";
}

function allocateEvidenceId(
  summary: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `evidence.${slugify(summary)}`;
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export class EvidenceService {
  private readonly evidenceStore: EvidenceStore;
  private readonly experimentStore: ExperimentStore;
  private readonly hypothesisStore: HypothesisStore;
  private readonly now: () => Date;

  constructor(
    evidenceStore: EvidenceStore,
    experimentStore: ExperimentStore,
    hypothesisStore: HypothesisStore,
    options: EvidenceServiceOptions = {},
  ) {
    this.evidenceStore = evidenceStore;
    this.experimentStore = experimentStore;
    this.hypothesisStore = hypothesisStore;
    this.now = options.now ?? (() => new Date());
  }

  async record(input: RecordEvidenceInput): Promise<EvidenceMutationResult> {
    await this.evidenceStore.ensure();
    const { state: memoryState } = await this.evidenceStore.state.read();

    if (input.experimentId) {
      await this.experimentStore.ensure();
      const { state: experimentState } = await this.experimentStore.state.read();
      const known = new Set(
        experimentState.data.experiments.map((item) => item.id),
      );
      if (!known.has(input.experimentId)) {
        throw evidenceError("Evidence references unknown experiment", {
          experimentId: input.experimentId,
        });
      }
    }
    if (input.hypothesisId) {
      await this.hypothesisStore.ensure();
      const { state: hypothesisState } = await this.hypothesisStore.state.read();
      const known = new Set(
        hypothesisState.data.hypotheses.map((item) => item.id),
      );
      if (!known.has(input.hypothesisId)) {
        throw evidenceError("Evidence references unknown hypothesis", {
          hypothesisId: input.hypothesisId,
        });
      }
    }

    const timestamp = this.now().toISOString();
    const evidence = evidenceSchema.parse({
      id: allocateEvidenceId(
        input.summary,
        new Set(memoryState.data.evidence.map((item) => item.id)),
      ),
      kind: input.kind,
      summary: input.summary,
      source: input.source,
      experimentId: input.experimentId ?? null,
      hypothesisId: input.hypothesisId ?? null,
      relatedWork: input.relatedWork ?? null,
      resultingDecision: null,
      capturedAt: timestamp,
    });
    const committed = await this.evidenceStore.state.write(
      {
        evidence: [...memoryState.data.evidence, evidence],
      },
      { expectedRevision: memoryState.revision },
    );
    return { evidence, revision: committed.revision };
  }

  async stampResultingDecision(
    evidenceIds: readonly string[],
    decisionId: string,
  ): Promise<void> {
    if (evidenceIds.length === 0) return;
    await this.evidenceStore.ensure();
    const { state: memoryState } = await this.evidenceStore.state.read();
    const targetIds = new Set(evidenceIds);
    const unknown = [...targetIds].filter(
      (id) => !memoryState.data.evidence.some((item) => item.id === id),
    );
    if (unknown.length > 0) {
      throw evidenceError("Unknown evidence id", { unknownEvidenceIds: unknown });
    }
    const evidence = memoryState.data.evidence.map((item) =>
      targetIds.has(item.id)
        ? { ...item, resultingDecision: decisionId }
        : item,
    );
    await this.evidenceStore.state.write(
      { evidence },
      { expectedRevision: memoryState.revision },
    );
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run test/learning/evidence-service.test.ts`
Expected: PASS.

- [ ] **Step 13: Write the failing command test**

Create `test/learning-evidence-command.test.ts`, mirroring Task 1 Step 13's pattern. Test `add --kind <kind> --summary <text> --source <text> --experiment <id>` (or `--hypothesis`/`--work`), `list`, `list --kind <kind>`, `show`.

- [ ] **Step 14: Run test to verify it fails**

Run: `npx vitest run test/learning-evidence-command.test.ts`
Expected: FAIL — module `src/commands/learning-evidence.ts` does not exist.

- [ ] **Step 15: Implement `src/commands/learning-evidence.ts`**

```typescript
import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { evidenceKindSchema } from "../learning/evidence-schemas.js";
import { EvidenceService } from "../learning/evidence-service.js";
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";

export interface LearningEvidenceCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <id>] | evidence list [--kind <kind>] | evidence show <id>",
  );
  return EXIT_CODE.usage;
}

const SINGLE_FLAGS = new Set([
  "--kind",
  "--summary",
  "--source",
  "--experiment",
  "--hypothesis",
  "--work",
]);

function parseAddArguments(
  args: readonly string[],
): Map<string, string> | undefined {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !SINGLE_FLAGS.has(flag) || !value || value.startsWith("--")) {
      return undefined;
    }
    values.set(flag, value);
  }
  return values;
}

export async function runLearningEvidenceCommand(
  options: LearningEvidenceCommandOptions,
): Promise<ExitCode> {
  const [action, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const evidenceStore = new EvidenceStore(project.path);
  const experimentStore = new ExperimentStore(project.path);
  const hypothesisStore = new HypothesisStore(project.path);
  const service = new EvidenceService(
    evidenceStore,
    experimentStore,
    hypothesisStore,
  );

  try {
    if (action === "add") {
      const flags = parseAddArguments(rest);
      const kind = flags?.get("--kind");
      const summary = flags?.get("--summary");
      const source = flags?.get("--source");
      if (!flags || !kind || !summary || !source) return usage(options.output);
      const parsedKind = evidenceKindSchema.parse(kind);
      const experimentId = flags.get("--experiment");
      const hypothesisId = flags.get("--hypothesis");
      const relatedWork = flags.get("--work");
      const result = await service.record({
        kind: parsedKind,
        summary,
        source,
        ...(experimentId ? { experimentId } : {}),
        ...(hypothesisId ? { hypothesisId } : {}),
        ...(relatedWork ? { relatedWork } : {}),
      });
      options.output.stdout(
        `Recorded evidence ${result.evidence.id} (revision ${result.revision}).`,
      );
      return EXIT_CODE.success;
    }
    if (action === "list") {
      await evidenceStore.ensure();
      const { state } = await evidenceStore.state.read();
      const kindFilter = rest[0] === "--kind" ? rest[1] : undefined;
      const rows = state.data.evidence
        .filter((record) => !kindFilter || record.kind === kindFilter)
        .map((record) => `${record.id} [${record.kind}] — ${record.summary}`)
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }
    if (action === "show" && rest[0]) {
      await evidenceStore.ensure();
      const { state } = await evidenceStore.state.read();
      const found = state.data.evidence.find(
        (record) => record.id === rest[0],
      );
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }
    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      options.output.stderr(
        error.issues[0]?.message ?? "Invalid evidence input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run test/learning-evidence-command.test.ts`
Expected: PASS.

- [ ] **Step 17: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: clean.

- [ ] **Step 18: Commit**

```bash
git add src/learning/evidence-schemas.ts src/learning/evidence-store.ts src/learning/evidence-service.ts src/commands/learning-evidence.ts test/learning/evidence-schemas.test.ts test/learning/evidence-store.test.ts test/learning/evidence-service.test.ts test/learning-evidence-command.test.ts
git commit -m "feat: add evidence domain (schema, store, service, command)"
```

---

### Task 4: Wire `autoforge learning` into the CLI router

**Files:**
- Modify: `src/cli/router.ts`
- Modify: `src/cli/index.ts`
- Modify: `src/cli/help.ts`
- Modify: `src/commands/learning-hypothesis.ts` (add a dispatching wrapper — see below)
- Test: `test/learning-command.test.ts`

**Interfaces:**
- Consumes: `runLearningHypothesisCommand` (Task 1), `runLearningExperimentCommand` (Task 2), `runLearningEvidenceCommand` (Task 3).
- Produces: a single `runLearningCommand(options): Promise<ExitCode>` dispatcher (new file `src/commands/learning.ts`) that routes `autoforge learning hypothesis|experiment|evidence <rest>` to the three sub-commands, wired into `CliDependencies.commands.learning?(args): Promise<ExitCode>` following exactly the `changelog` pattern already in `src/cli/router.ts` and `src/cli/index.ts`.

- [ ] **Step 1: Write the failing dispatcher test**

Create `test/learning-command.test.ts`:

```typescript
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runLearningCommand } from "../src/commands/learning.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("learning dispatcher", () => {
  it("routes to the hypothesis sub-command", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-learning-dispatch-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["hypothesis", "list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("routes to the experiment sub-command", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-learning-dispatch-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["experiment", "list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("routes to the evidence sub-command", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-learning-dispatch-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["evidence", "list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("rejects an unknown sub-command", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["bogus"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/learning-command.test.ts`
Expected: FAIL — module `src/commands/learning.ts` does not exist.

- [ ] **Step 3: Implement `src/commands/learning.ts`**

```typescript
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { runLearningEvidenceCommand } from "./learning-evidence.js";
import { runLearningExperimentCommand } from "./learning-experiment.js";
import { runLearningHypothesisCommand } from "./learning-hypothesis.js";

export interface LearningCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning hypothesis|experiment|evidence <subcommand> ...",
  );
  return EXIT_CODE.usage;
}

export async function runLearningCommand(
  options: LearningCommandOptions,
): Promise<ExitCode> {
  const [domain, ...rest] = options.args;
  const commandOptions = {
    args: rest,
    output: options.output,
    startDirectory: options.startDirectory,
  };
  if (domain === "hypothesis") {
    return runLearningHypothesisCommand(commandOptions);
  }
  if (domain === "experiment") {
    return runLearningExperimentCommand(commandOptions);
  }
  if (domain === "evidence") {
    return runLearningEvidenceCommand(commandOptions);
  }
  return usage(options.output);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/learning-command.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into the router**

In `src/cli/router.ts`, add to the `CliDependencies.commands` interface (alongside `changelog?`):

```typescript
learning?(args: readonly string[]): Promise<ExitCode>;
```

Add a switch case (alongside the existing `case "changelog":` block):

```typescript
case "learning":
  return dependencies.commands.learning
    ? dependencies.commands.learning(commandArgs)
    : EXIT_CODE.usage;
```

- [ ] **Step 6: Wire into the CLI entry point**

In `src/cli/index.ts`, add the import near the other command imports:

```typescript
import { runLearningCommand } from "../commands/learning.js";
```

Add the wiring alongside the existing `changelog:` entry:

```typescript
learning: (commandArgs) =>
  runLearningCommand({ args: commandArgs, output, startDirectory }),
```

- [ ] **Step 7: Update CLI help text**

In `src/cli/help.ts`, add a new section (place it near the `Decision memory:` section, since evidence/hypothesis/experiment conceptually sit alongside decisions):

```
Learning and evidence:
  autoforge learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <work-id>]
  autoforge learning hypothesis list [--status <proposed|testing|confirmed|refuted>]
  autoforge learning hypothesis show <id>
  autoforge learning hypothesis status <id> --status <proposed|testing|confirmed|refuted>
  autoforge learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text>
  autoforge learning experiment list [--status <planned|running|completed|abandoned>]
  autoforge learning experiment show <id>
  autoforge learning experiment complete <id>
  autoforge learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <work-id>]
  autoforge learning evidence list [--kind <kind>]
  autoforge learning evidence show <id>
```

Also add a one-line entry to the top-level command summary table (matching the `changelog` row's placement/style):

```
learning   Record hypotheses, experiments, and product evidence
```

- [ ] **Step 8: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: clean.

- [ ] **Step 9: Live CLI smoke test**

```bash
npm run build
cd /tmp && rm -rf af-learning-smoke && mkdir af-learning-smoke && cd af-learning-smoke && git init -q
ABS_BIN="/Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge/bin/autoforge.js"
node "$ABS_BIN" init
node "$ABS_BIN" learning hypothesis add --statement "Shorter onboarding increases activation." --expected-outcome "Faster time to first value." --metric "activation rate" --target ">= 40% within 7 days"
node "$ABS_BIN" learning hypothesis list
node "$ABS_BIN" learning experiment add --hypothesis hypothesis.shorter-onboarding-increases-activation --method "A/B test"
node "$ABS_BIN" learning experiment list
node "$ABS_BIN" learning evidence add --kind beta-feedback --summary "Beta cohort activated faster." --source "Beta cohort 1" --experiment experiment.a-b-test
node "$ABS_BIN" learning evidence list
cd /Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge
rm -rf /tmp/af-learning-smoke
```

Expected: every command succeeds; `hypothesis list`/`experiment list`/`evidence list` each show the recorded record.

- [ ] **Step 10: Commit**

```bash
git add src/commands/learning.ts src/cli/router.ts src/cli/index.ts src/cli/help.ts test/learning-command.test.ts
git commit -m "feat: wire autoforge learning command family into the CLI"
```

---

### Task 5: Close the loop — `decide --evidence`

**Files:**
- Modify: `src/decisions/service.ts`
- Modify: `src/commands/decide.ts`
- Modify: `src/cli/help.ts`
- Test: `test/decision-service.test.ts`
- Test: `test/decide.test.ts`

**Interfaces:**
- Consumes: `EvidenceStore`, `EvidenceService.stampResultingDecision` (Task 3).
- Produces: `DecisionService.record()` accepts a new optional `evidence?: string[]` field on `RecordDecisionInput`; after committing the decision, it stamps `resultingDecision` on each referenced evidence record. `autoforge decide` gains a repeatable `--evidence <id>` flag.

- [ ] **Step 1: Write the failing service test**

Add to `test/decision-service.test.ts`. The file's existing `createFixture()` (async, returns `{ decisionStore, feature, service }`) constructs its `service` WITHOUT an `evidenceService` option — that fixture is reused as-is by every existing test and must not change shape, since changing it would ripple through every pre-existing test in the file. Instead, build a second, separate `DecisionService` instance locally inside each new test that needs evidence stamping, constructed the same way `createFixture()` builds its own but with `evidenceService` added. Reuse the file's existing `TIMESTAMP` constant and top-level `projectRoot` variable (set in `beforeEach`) exactly as they already exist:

```typescript
it("stamps resultingDecision on referenced evidence", async () => {
  const { decisionStore, service: baseService } = await createFixture();
  const { EvidenceStore } = await import("../src/learning/evidence-store.js");
  const { EvidenceService } = await import(
    "../src/learning/evidence-service.js"
  );
  const { ExperimentStore } = await import(
    "../src/learning/experiment-store.js"
  );
  const { HypothesisStore } = await import(
    "../src/learning/hypothesis-store.js"
  );
  const evidenceStore = new EvidenceStore(projectRoot);
  await evidenceStore.ensure();
  const evidenceResult = await new EvidenceService(
    evidenceStore,
    new ExperimentStore(projectRoot),
    new HypothesisStore(projectRoot),
  ).record({
    kind: "bug-report",
    summary: "Example bug report.",
    source: "Example.",
    relatedWork: "feature.decision-memory",
  });

  const workStore = createWorkStateStore(projectRoot, {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
  const decisionServiceWithEvidence = new DecisionService(
    decisionStore,
    workStore,
    {
      now: () => new Date(TIMESTAMP),
      evidenceService: new EvidenceService(
        evidenceStore,
        new ExperimentStore(projectRoot),
        new HypothesisStore(projectRoot),
      ),
    },
  );

  const result = await decisionServiceWithEvidence.record(
    input({ evidence: [evidenceResult.evidence.id] }),
  );

  const { state } = await evidenceStore.state.read();
  expect(
    state.data.evidence.find((item) => item.id === evidenceResult.evidence.id)
      ?.resultingDecision,
  ).toBe(result.decision.id);
  void baseService; // unused in this test, keeps createFixture()'s destructure minimal elsewhere
});

it("does not require evidenceService when no --evidence is provided", async () => {
  const { service } = await createFixture();
  await expect(service.record(input())).resolves.toMatchObject({
    decision: { status: "active" },
  });
});

it("rejects evidence references when no evidenceService is configured", async () => {
  const { service } = await createFixture();
  await expect(
    service.record(input({ evidence: ["evidence.anything"] })),
  ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
});
```

Drop the `void baseService;` line and instead simply not destructure `service` at all in that first test (`const { decisionStore } = await createFixture();`) if TypeScript flags the unused destructured binding as a lint error — check the project's lint/typecheck output after Step 2 and adjust to whichever is clean; both are equivalent in behavior, this is a cosmetic choice with no functional impact.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/decision-service.test.ts`
Expected: FAIL — `RecordDecisionInput` has no `evidence` field yet, so `resultingDecision` never gets stamped.

- [ ] **Step 3: Update `src/decisions/service.ts`**

Add `evidence?: string[];` to `RecordDecisionInput`:

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
  evidence?: string[];
}
```

Update the `DecisionService` constructor to accept an `EvidenceService` (or lazily construct one from the same `projectRoot`-derived stores — prefer constructor injection to keep the service testable, matching how `workStore` is already injected):

```typescript
import type { EvidenceService } from "../learning/evidence-service.js";
```

```typescript
export class DecisionService {
  private readonly decisionStore: AtomicStateStore<DecisionMemory>;
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly evidenceService: EvidenceService | undefined;
  private readonly now: () => Date;

  constructor(
    decisionStore: AtomicStateStore<DecisionMemory>,
    workStore: AtomicStateStore<WorkState>,
    options: DecisionServiceOptions & { evidenceService?: EvidenceService } = {},
  ) {
    this.decisionStore = decisionStore;
    this.workStore = workStore;
    this.evidenceService = options.evidenceService;
    this.now = options.now ?? (() => new Date());
  }
```

After the decision is committed (end of `record()`, before `return`), add:

```typescript
    if (input.evidence && input.evidence.length > 0) {
      if (!this.evidenceService) {
        throw decisionError(
          "Decision references evidence but no evidence service is configured",
          { evidence: input.evidence },
        );
      }
      await this.evidenceService.stampResultingDecision(
        input.evidence,
        decision.id,
      );
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/decision-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing CLI test**

Add to `test/decide.test.ts`, inside the existing `describe("decide command", ...)` block. The file's `createFixture()` returns `{ feature, projectRoot }` — `feature.entity.id` is the generated ID (NOT the literal string `"feature.decision-memory"` — that string only appears in the unrelated `test/decision-service.test.ts` fixture; do not confuse the two files). Its `decisionArgs(extra)` helper builds base decide flags. Record evidence via a direct `runLearningEvidenceCommand` call, referencing `feature.entity.id`, then test `decide --evidence`:

```typescript
it("stamps resultingDecision when --evidence is provided", async () => {
  const { feature, projectRoot } = await createFixture();
  const { runLearningEvidenceCommand } = await import(
    "../src/commands/learning-evidence.js"
  );
  const evidenceOutput = { stdout: vi.fn(), stderr: vi.fn() };
  await runLearningEvidenceCommand({
    args: [
      "add",
      "--kind",
      "bug-report",
      "--summary",
      "Example bug report.",
      "--source",
      "Example.",
      "--work",
      feature.entity.id,
    ],
    output: evidenceOutput,
    startDirectory: projectRoot,
  });

  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runDecideCommand({
      args: [
        ...decisionArgs(),
        "--evidence",
        "evidence.example-bug-report",
      ],
      output,
      startDirectory: projectRoot,
    }),
  ).resolves.toBe(EXIT_CODE.success);

  const { EvidenceStore } = await import("../src/learning/evidence-store.js");
  const evidenceStore = new EvidenceStore(projectRoot);
  const { state } = await evidenceStore.state.read();
  expect(
    state.data.evidence.find((item) => item.id === "evidence.example-bug-report")
      ?.resultingDecision,
  ).toBe("decision.use-deterministic-search");
});

it("rejects an unknown --evidence id", async () => {
  const { projectRoot } = await createFixture();
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runDecideCommand({
      args: [...decisionArgs(), "--evidence", "evidence.does-not-exist"],
      output,
      startDirectory: projectRoot,
    }),
  ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
});
```

`"decision.use-deterministic-search"` in the first test matches `decisionArgs()`'s hardcoded `--statement "Use deterministic search"`, per the file's existing slugification convention already visible in its other tests (e.g. `"records a decision linked to work from a nested directory"`) — do not change `decisionArgs()`'s statement text, since that would break every other test in the file relying on that exact generated ID.

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run test/decide.test.ts`
Expected: FAIL — `--evidence` is rejected as an unknown decide option.

- [ ] **Step 7: Update `src/commands/decide.ts`**

Add `"--evidence"` to `REPEATABLE_FLAGS`:

```typescript
const REPEATABLE_FLAGS = new Set([
  "--consequence",
  "--scope",
  "--keyword",
  "--work",
  "--evidence",
]);
```

Add `evidence: string[];` to `ParsedDecideArguments` and return it from `parseDecideArguments`:

```typescript
interface ParsedDecideArguments {
  statement: string;
  reasoning: string;
  consequences: string[];
  scope: string[];
  keywords: string[];
  relatedWork: string[];
  evidence: string[];
  supersedes?: string;
  kind?: string;
}
```

```typescript
  return {
    statement,
    reasoning,
    consequences,
    scope,
    keywords,
    relatedWork: repeatableValues.get("--work") ?? [],
    evidence: repeatableValues.get("--evidence") ?? [],
    ...(supersedes ? { supersedes } : {}),
    ...(kind ? { kind } : {}),
  };
```

In `runDecideCommand`, construct the `DecisionService` with an `EvidenceService`:

```typescript
import { EvidenceService } from "../learning/evidence-service.js";
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
```

```typescript
  const service = new DecisionService(
    createDecisionStore(project.path),
    createWorkStateStore(project.path),
    {
      evidenceService: new EvidenceService(
        new EvidenceStore(project.path),
        new ExperimentStore(project.path),
        new HypothesisStore(project.path),
      ),
    },
  );
```

Update the `service.record({...rest, ...})` call to include `evidence: rest.evidence`:

```typescript
    const { kind, ...rest } = parsed;
    const result = await service.record({
      ...rest,
      ...(kind
        ? { kind: kind as import("../decisions/schemas.js").DecisionKind }
        : {}),
    });
```

(`rest` already includes `evidence` since it's spread from `parsed` — no change needed here beyond what's shown, since `evidence` is already a top-level field on `ParsedDecideArguments` after Step 7's earlier edit. Verify this is genuinely a no-op by checking the spread includes it; if TypeScript flags a mismatch against `RecordDecisionInput`, the field names already match (`evidence: string[]` on both sides), so no additional mapping should be required.)

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run test/decide.test.ts`
Expected: PASS.

- [ ] **Step 9: Update CLI help text**

In `src/cli/help.ts`, update the `autoforge decide` usage line to append `[--evidence <evidence-id>]`:

```
autoforge decide --statement <text> --reasoning <text> --consequence <text> --scope <tag> --keyword <tag> [--consequence <text>] [--scope <tag>] [--keyword <tag>] [--work <work-id>] [--supersedes <decision-id>] [--kind <architecture|bugfix|feature-note>] [--evidence <evidence-id>]
```

- [ ] **Step 10: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: clean. Search for any OTHER caller of `new DecisionService(...)` that would now need an `evidenceService` option (it's optional, so this should be backward compatible, but confirm with `grep -rn "new DecisionService" src/`).

- [ ] **Step 11: Commit**

```bash
git add src/decisions/service.ts src/commands/decide.ts src/cli/help.ts test/decision-service.test.ts test/decide.test.ts
git commit -m "feat: close the evidence-to-decision loop via decide --evidence"
```

---

### Task 6: Twin projection integration

**Files:**
- Modify: `src/twin/schemas.ts`
- Modify: `src/twin/from-state.ts`
- Modify: `src/commands/twin.ts`
- Modify: `test/twin-schemas.test.ts`
- Modify: `test/twin-from-state.test.ts` (its existing test calls `projectStateToTwin` without `hypotheses`/`experiments`/`evidence` and asserts an exact node/edge list — this WILL fail to typecheck once `TwinStateInput` requires the three new fields, and its exact-array assertions will need the new empty collections added to keep the existing assertion true)
- Modify: `test/twin-command.test.ts`

**Interfaces:**
- Consumes: `Hypothesis`/`HypothesisStore` (Task 1), `Experiment`/`ExperimentStore` (Task 2), `Evidence`/`EvidenceStore` (Task 3).
- Produces: `twinNodeTypeSchema` gains `"hypothesis"` and `"experiment"` (`"evidence"` already exists in the enum, unused until now). `TwinStateInput` gains `hypotheses: HypothesisMemory`, `experiments: ExperimentMemory`, `evidence: EvidenceMemory` fields; `projectStateToTwin` produces nodes/edges for all three.

- [ ] **Step 1: Fix the now-broken existing `test/twin-from-state.test.ts` test first**

Its one existing test (`"projects work hierarchy and decision relationships"`) calls `projectStateToTwin({...})` without `hypotheses`/`experiments`/`evidence` fields. Once Step 8 makes those fields required on `TwinStateInput`, this call stops typechecking. Add empty collections to the existing call now, before writing any new test, so the baseline stays green throughout this task:

```typescript
      decisions: {
        decisions: [ /* ...unchanged existing content... */ ],
      },
      hypotheses: { hypotheses: [] },
      experiments: { experiments: [] },
      evidence: { evidence: [] },
    });
```

Run `npx vitest run test/twin-from-state.test.ts` now — it will still FAIL at this point (TypeScript doesn't know the new fields yet since Step 8 hasn't run), which is expected; this edit is staged ahead so Step 9's assertions land on a clean file.

- [ ] **Step 2: Write the failing schema test**

In `test/twin-schemas.test.ts`, add the missing `twinNodeTypeSchema` import and a new test:

Add the import at the top of the file (it currently imports `twinEdgeSchema`, `twinProjectionSchema`, `twinQuerySchema` but not `twinNodeTypeSchema`):

```typescript
import {
  twinEdgeSchema,
  twinNodeTypeSchema,
  twinProjectionSchema,
  twinQuerySchema,
} from "../src/twin/schemas.js";
```

Add a new test inside the existing `describe` block:

```typescript
it("accepts hypothesis, experiment, and evidence node types", () => {
  expect(() => twinNodeTypeSchema.parse("hypothesis")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("experiment")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("evidence")).not.toThrow();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/twin-schemas.test.ts`
Expected: FAIL for `"hypothesis"`/`"experiment"` (not yet in the enum); `"evidence"` should already pass since it's already declared.

- [ ] **Step 4: Update `src/twin/schemas.ts`**

Add `"hypothesis"` and `"experiment"` to `twinNodeTypeSchema`'s enum array (place them near `"evidence"` for readability):

```typescript
export const twinNodeTypeSchema = z.enum([
  "vision",
  "constitution",
  "release",
  "domain",
  "feature",
  "story",
  "flow",
  "screen",
  "component",
  "api",
  "architecture",
  "permission",
  "test",
  "decision",
  "risk",
  "hypothesis",
  "experiment",
  "evidence",
  "work",
]);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/twin-schemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing from-state test**

In `test/twin-from-state.test.ts`, add a new test (leave the existing `"projects work hierarchy and decision relationships"` test as fixed in Step 1) that passes `hypotheses`/`experiments`/`evidence` into `projectStateToTwin` and asserts nodes of each new type appear, plus edges connecting evidence→experiment/hypothesis/work and experiment→hypothesis:

```typescript
it("projects hypotheses, experiments, and evidence as nodes with edges", () => {
  const hypothesis = {
    id: "hypothesis.example",
    statement: "Example hypothesis.",
    expectedOutcome: "Example outcome.",
    metric: "example",
    target: "example",
    linkedFeature: null,
    status: "proposed" as const,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  };
  const experiment = {
    id: "experiment.example",
    hypothesisIds: [hypothesis.id],
    method: "A/B test",
    status: "planned" as const,
    startedAt: "2026-08-22T00:00:00.000Z",
    endedAt: null,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  };
  const evidence = {
    id: "evidence.example",
    kind: "beta-feedback" as const,
    summary: "Example evidence.",
    source: "Example.",
    experimentId: experiment.id,
    hypothesisId: null,
    relatedWork: null,
    resultingDecision: null,
    capturedAt: "2026-08-22T00:00:00.000Z",
  };

  const projection = projectStateToTwin({
    projectId: "test-project",
    generatedAt: "2026-08-22T00:00:00.000Z",
    work: { features: [], phases: [], tasks: [], issues: [], activeWork: null },
    decisions: { decisions: [] },
    hypotheses: { hypotheses: [hypothesis] },
    experiments: { experiments: [experiment] },
    evidence: { evidence: [evidence] },
  });

  expect(
    projection.nodes.find((node) => node.id === hypothesis.id)?.type,
  ).toBe("hypothesis");
  expect(
    projection.nodes.find((node) => node.id === experiment.id)?.type,
  ).toBe("experiment");
  expect(
    projection.nodes.find((node) => node.id === evidence.id)?.type,
  ).toBe("evidence");
  expect(projection.edges).toContainEqual({
    sourceId: experiment.id,
    targetId: hypothesis.id,
    relationship: "tests",
  });
  expect(projection.edges).toContainEqual({
    sourceId: evidence.id,
    targetId: experiment.id,
    relationship: "produced-by",
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run test/twin-from-state.test.ts`
Expected: FAIL — `TwinStateInput` has no `hypotheses`/`experiments`/`evidence` fields yet (the new test fails; the existing test from Step 1 also still fails until Step 8 lands, since both depend on the same type change).

- [ ] **Step 8: Update `src/twin/from-state.ts`**

```typescript
import type { EvidenceMemory } from "../learning/evidence-schemas.js";
import type { ExperimentMemory } from "../learning/experiment-schemas.js";
import type { HypothesisMemory } from "../learning/hypothesis-schemas.js";
```

Add to `TwinStateInput`:

```typescript
export interface TwinStateInput {
  projectId: string;
  generatedAt: string;
  work: WorkState;
  decisions: DecisionMemory;
  hypotheses: HypothesisMemory;
  experiments: ExperimentMemory;
  evidence: EvidenceMemory;
}
```

Add to the `nodes` array in `projectStateToTwin`:

```typescript
    ...input.hypotheses.hypotheses.map((hypothesis) => ({
      id: hypothesis.id,
      type: "hypothesis" as const,
      title: hypothesis.statement,
      source: ".autoforge/learning/hypotheses.json",
      updatedAt: hypothesis.updatedAt,
    })),
    ...input.experiments.experiments.map((experiment) => ({
      id: experiment.id,
      type: "experiment" as const,
      title: `${experiment.method} (${experiment.status})`,
      source: ".autoforge/learning/experiments.json",
      updatedAt: experiment.updatedAt,
    })),
    ...input.evidence.evidence.map((record) => ({
      id: record.id,
      type: "evidence" as const,
      title: record.summary,
      source: ".autoforge/learning/evidence.json",
      updatedAt: record.capturedAt,
    })),
```

Add to the `edges` array:

```typescript
    ...input.experiments.experiments.flatMap((experiment) =>
      experiment.hypothesisIds.map((hypothesisId) => ({
        sourceId: experiment.id,
        targetId: hypothesisId,
        relationship: "tests",
      })),
    ),
    ...input.evidence.evidence.flatMap((record) => {
      const links: { sourceId: string; targetId: string; relationship: string }[] = [];
      if (record.experimentId) {
        links.push({
          sourceId: record.id,
          targetId: record.experimentId,
          relationship: "produced-by",
        });
      }
      if (record.hypothesisId) {
        links.push({
          sourceId: record.id,
          targetId: record.hypothesisId,
          relationship: "informs",
        });
      }
      if (record.relatedWork) {
        links.push({
          sourceId: record.id,
          targetId: record.relatedWork,
          relationship: "informs",
        });
      }
      if (record.resultingDecision) {
        links.push({
          sourceId: record.id,
          targetId: record.resultingDecision,
          relationship: "resulted-in",
        });
      }
      return links;
    }),
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run test/twin-from-state.test.ts`
Expected: PASS — both the Step 1 fix and the new Step 6 test pass.

- [ ] **Step 10: Update `src/commands/twin.ts`'s `generate` action**

Read the three new stores and pass their data into `projectStateToTwin`:

```typescript
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
```

In the `action === "generate"` branch, before calling `projectStateToTwin`:

```typescript
    const hypothesisStore = new HypothesisStore(project.path);
    const experimentStore = new ExperimentStore(project.path);
    const evidenceStore = new EvidenceStore(project.path);
    await Promise.all([
      hypothesisStore.ensure(),
      experimentStore.ensure(),
      evidenceStore.ensure(),
    ]);
    const [
      { state: work },
      { state: decisions },
      { state: hypotheses },
      { state: experiments },
      { state: evidence },
    ] = await Promise.all([
      createWorkStateStore(project.path).read(),
      createDecisionStore(project.path).read(),
      hypothesisStore.state.read(),
      experimentStore.state.read(),
      evidenceStore.state.read(),
    ]);
    const projection = await store.write(
      projectStateToTwin({
        projectId: path.resolve(project.path),
        generatedAt,
        work: work.data,
        decisions: decisions.data,
        hypotheses: hypotheses.data,
        experiments: experiments.data,
        evidence: evidence.data,
      }),
    );
```

(Replace the existing `Promise.all`/`projectStateToTwin` call block entirely with this — do not leave the old two-store version alongside it.)

- [ ] **Step 11: Extend the twin command test**

In `test/twin-command.test.ts`, add a new test in the existing `describe("twin command", ...)` block: first record a hypothesis via `runLearningHypothesisCommand` (import from `../src/commands/learning-hypothesis.js`), then run `runTwinCommand({ args: ["generate", "--json"], ... })` and assert the parsed JSON's `nodes` array contains an entry with `type: "hypothesis"`.

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run test/twin-command.test.ts`
Expected: PASS.

- [ ] **Step 13: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: clean.

- [ ] **Step 14: Live CLI smoke test**

```bash
npm run build
cd /tmp && rm -rf af-twin-smoke && mkdir af-twin-smoke && cd af-twin-smoke && git init -q
ABS_BIN="/Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge/bin/autoforge.js"
node "$ABS_BIN" init
node "$ABS_BIN" learning hypothesis add --statement "Example." --expected-outcome "Example." --metric "example" --target "example"
node "$ABS_BIN" twin generate --json
cd /Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge
rm -rf /tmp/af-twin-smoke
```

Expected: `twin generate --json` output includes a node with `"type": "hypothesis"`.

- [ ] **Step 15: Commit**

```bash
git add src/twin/schemas.ts src/twin/from-state.ts src/commands/twin.ts test/twin-schemas.test.ts test/twin-from-state.test.ts test/twin-command.test.ts
git commit -m "feat: expose hypothesis, experiment, and evidence in the digital twin"
```

---

### Task 7: Exercise the full chain against AutoForge's own live state

**Files:** none created/modified beyond AutoForge's own state files (`.autoforge/learning/*.json`, `.autoforge/state/decisions.json`, `.autoforge/state/work.json`) — this task exercises the system built in Tasks 1–6 against itself.

**Interfaces:** none — this is a live-system verification task, not a code task.

- [ ] **Step 1: Register this work as an AutoForge issue**

```bash
node bin/autoforge.js add issue \
  --name "implement-v0-22-learning-evidence-engine" \
  --description "Add hypothesis, experiment, and evidence domains, close the loop via decide --evidence, and expose all three through the digital twin, per docs/superpowers/specs/2026-08-22-v0-22-learning-evidence-design.md." \
  --include "src/learning/**" \
  --include "src/commands/learning*.ts" \
  --include "src/decisions/service.ts" \
  --include "src/commands/decide.ts" \
  --include "src/twin/**" \
  --include "src/commands/twin.ts" \
  --include "src/cli/**" \
  --include "test/**"
node bin/autoforge.js start issue issue.implement-v0-22-learning-evidence-engine
```

- [ ] **Step 2: Exercise the real chain end-to-end**

```bash
node bin/autoforge.js learning hypothesis add \
  --statement "A documentation gate with a real changelog compile improves release hygiene." \
  --expected-outcome "Future releases ship with an accurate, non-stale CHANGELOG.md." \
  --metric "changelog staleness" \
  --target "zero undocumented releases after v0.21.1"

node bin/autoforge.js learning experiment add \
  --hypothesis hypothesis.a-documentation-gate-with-a-real-changelog-compile-improves-release-hygiene \
  --method "Self-hosted dogfooding across v0.21.1 and v0.21.2"

node bin/autoforge.js learning experiment complete \
  experiment.self-hosted-dogfooding-across-v0-21-1-and-v0-21-2

node bin/autoforge.js learning evidence add \
  --kind ai-evaluation \
  --summary "v0.21.1 and v0.21.2 both shipped with accurate, auto-compiled CHANGELOG.md entries; the documentation gate has not been bypassed without an audited reason since it shipped." \
  --source "This session's own release history" \
  --experiment experiment.self-hosted-dogfooding-across-v0-21-1-and-v0-21-2
```

Note: the exact generated IDs depend on `slugify()`'s output — run `learning hypothesis list` / `learning experiment list` after each `add` to confirm the real generated ID before using it in the next command, rather than assuming the ID shown above is exact.

- [ ] **Step 3: Close the loop with a real decision**

```bash
node bin/autoforge.js decide \
  --statement "The documentation gate genuinely improved release hygiene across v0.21.1 and v0.21.2" \
  --reasoning "Both releases shipped with accurate CHANGELOG.md entries auto-compiled from linked decisions, closing the exact gap that motivated the documentation-gate feature." \
  --consequence "Confirms the hypothesis; no further changes needed to the documentation gate itself." \
  --scope "learning" --scope "release-hygiene" \
  --keyword "v0-22" --keyword "dogfooding" \
  --work issue.implement-v0-22-learning-evidence-engine \
  --evidence <the-real-evidence-id-from-step-2> \
  --kind feature-note
```

- [ ] **Step 4: Verify the chain is mechanically traceable**

```bash
node bin/autoforge.js learning evidence show <the-real-evidence-id>
```

Expected: `resultingDecision` is populated with the decision ID from Step 3.

```bash
node bin/autoforge.js twin generate --json | grep -A2 "hypothesis\."
```

Expected: the hypothesis/experiment/evidence nodes and their edges appear in the twin projection.

- [ ] **Step 5: Close the work item**

```bash
node bin/autoforge.js done
```

Expected: succeeds — the decision recorded in Step 3 is already linked via `--work`.

- [ ] **Step 6: Full verification suite**

```bash
npm run format:check
npm run typecheck
npm test
npm run build
```

Expected: all clean.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: exercise the v0.22 learning and evidence engine on its own implementation"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (three domains) → Tasks 1–3. §2 (evidence→decision loop) → Task 5. §3 (CLI surface) → Tasks 1–4. §4 (twin integration) → Task 6. Testing section's five bullet categories are covered 1:1 by each task's test steps (schema/store/command/integration/twin). Rollout section (self-hosted exercise) → Task 7.
- **Type consistency:** `Hypothesis`/`HypothesisStatus` (Task 1) are consumed identically by `Experiment.hypothesisIds` validation (Task 2) and `Evidence.hypothesisId` validation (Task 3). `Experiment`/`ExperimentStatus` (Task 2) consumed identically by `Evidence.experimentId` (Task 3) and the twin's `"tests"` edge (Task 6). `EvidenceService.stampResultingDecision` (Task 3) is consumed identically by `DecisionService.record()`'s new evidence-stamping step (Task 5) — same method name, same `(evidenceIds, decisionId)` parameter order throughout.
- **Placeholder scan:** no TBD/TODO; every step has complete code or an exact command with expected output. All test-file names, existing fixture helper names/return shapes (`test/decision-service.test.ts`'s `createFixture()` returning `{ decisionStore, feature, service }`; `test/decide.test.ts`'s `createFixture()` returning `{ feature, projectRoot }` and its `decisionArgs()` helper; `test/twin-schemas.test.ts`/`test/twin-from-state.test.ts`/`test/twin-command.test.ts`) were confirmed by reading the live repo during plan-writing and are used exactly as verified — no task defers file/helper discovery to its implementer. Task 5 Step 1's `void baseService;` vs. non-destructuring choice is the one remaining cosmetic branch point, with both outcomes fully specified and functionally identical.
