# v0.23 Product Strategy & Prioritization Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `strategy` domain that lets a human record an explainable, multi-factor, categorical assessment (alignment/value/risk/cost/evidence-strength/dependency-pressure/complexity/release-constraint) on any work item, with a `now|next|later|backlog` decision label, no blended numeric score, and a linked decision record for every assessment.

**Architecture:** A new `src/strategy/` module (schema, atomic-file store, service) mirrors `src/learning/`'s evidence domain exactly — same lazy `ensure()`-initialized `AtomicStateStore`, same slugified-id allocation, same "service validates against other stores, then writes" shape. A new `src/commands/strategy.ts` CLI command (`assess`/`list`/`show`/`history`) mirrors `learning-evidence.ts`'s argument parsing. The context packet gains a new optional (non-budgeted) `strategy` field on `ContextSelection`, rendered exactly like the existing `workflow`/`contract` fields — present-or-absent, no ranking or budget competition.

**Tech Stack:** TypeScript, Zod schemas, Vitest, the existing `AtomicStateStore` file-locking state layer.

## Global Constraints

- All new schemas use `.strict()` Zod objects, matching every existing schema in `src/learning/` and `src/decisions/`.
- `strategy-schemas.ts` must **not** import `timestampSchema`, `relatedWorkIdSchema`, or `decisionIdSchema` from `evidence-schemas.ts` — those are private (unexported) constants in that file. Redefine them locally, exactly as `hypothesis-schemas.ts` does.
- Persist strategy state at `.autoforge/learning/strategy.json`, using the lazy `ensure()`-on-first-use pattern (matching `EvidenceStore`/`HypothesisStore`/`ExperimentStore`), **not** the eager `init`-time pattern used by `decisions.json`.
- `orchestrate prioritize` (`src/orchestration/service.ts`) must not be modified. Strategy is fully additive and independent.
- Every `strategy assess` call writes a linked decision via `DecisionService.record()`, unconditionally (all four decision labels), per the approved design — do not add conditional linkage logic.
- CLI usage/error conventions (usage-error format, `EXIT_CODE`, Zod-error-to-usage-error translation) must match `src/commands/decide.ts` and `src/commands/learning-evidence.ts` exactly.
- Run `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/prettier --check <changed files>` before every commit that touches `src/` or `test/` — the `npx` wrapper in this repo can report a misleading exit code even when there is no actual output; trust the local binary.

---

## File Structure

```
src/strategy/
  strategy-schemas.ts   — new: strategyFactorLevelSchema, strategyDecisionSchema, strategyAssessmentSchema, strategyMemorySchema
  strategy-store.ts     — new: StrategyStore (mirrors EvidenceStore)
  strategy-service.ts   — new: StrategyService (mirrors EvidenceService, calls DecisionService internally)

src/commands/
  strategy.ts           — new: runStrategyCommand (assess/list/show/history)

src/cli/
  index.ts              — modify: register `strategy` command
  help.ts                — modify: add `strategy` to command list + "Strategy and prioritization" usage section

src/context/
  schemas.ts             — modify: add optional `strategy` field + `StrategyRef` type to ContextSelection
  packet.ts              — modify: add `renderStrategy`, splice into `renderPacket`, add one line to `formatContextExplanation`
  resolver.ts            — not modified (strategy lookup happens in commands/context.ts, not the ranked/budgeted resolver)

src/commands/
  context.ts             — modify: load the active work item's active strategy assessment and pass it through to the packet compiler

test/
  strategy-service.test.ts   — new
  strategy-command.test.ts   — new
  strategy-context.test.ts   — new
  context-packet.test.ts     — not modified (existing coverage untouched)
```

---

## Task 1: Strategy schemas

**Files:**

- Create: `src/strategy/strategy-schemas.ts`
- Test: `test/strategy-schemas.test.ts`

**Interfaces:**

- Produces: `strategyFactorLevelSchema` (Zod enum `"low"|"medium"|"high"|"uncertain"`), `strategyDecisionSchema` (Zod enum `"now"|"next"|"later"|"backlog"`), `strategyIdSchema`, `strategyAssessmentSchema`, `strategyMemorySchema`, and TS types `StrategyFactorLevel`, `StrategyDecision`, `StrategyAssessment`, `StrategyMemory`.

- [ ] **Step 1: Write the failing test**

Create `test/strategy-schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  strategyAssessmentSchema,
  strategyMemorySchema,
} from "../src/strategy/strategy-schemas.js";

const TIMESTAMP = "2026-08-23T00:00:00.000Z";

function validAssessment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "strategy.recruiter-messaging",
    workId: "feature.recruiter-messaging",
    factors: {
      alignment: "low",
      value: "uncertain",
      risk: "high",
      cost: "medium",
      evidenceStrength: "low",
      dependencyPressure: "low",
      complexity: "medium",
      releaseConstraint: "low",
    },
    decision: "backlog",
    rationale: "High spam risk, low alignment, thin evidence.",
    evidenceIds: [],
    resultingDecision: null,
    supersedes: null,
    status: "active",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("strategy assessment schema", () => {
  it("accepts a complete, valid assessment", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment()),
    ).not.toThrow();
  });

  it("rejects an unknown factor level", () => {
    expect(() =>
      strategyAssessmentSchema.parse(
        validAssessment({
          factors: {
            alignment: "extreme",
            value: "uncertain",
            risk: "high",
            cost: "medium",
            evidenceStrength: "low",
            dependencyPressure: "low",
            complexity: "medium",
            releaseConstraint: "low",
          },
        }),
      ),
    ).toThrow();
  });

  it("rejects an unknown decision label", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment({ decision: "urgent" })),
    ).toThrow();
  });

  it("rejects an empty rationale", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment({ rationale: "" })),
    ).toThrow();
  });

  it("rejects a malformed id", () => {
    expect(() =>
      strategyAssessmentSchema.parse(
        validAssessment({ id: "not-a-strategy-id" }),
      ),
    ).toThrow();
  });

  it("rejects a workId that is not a feature/phase/task/issue reference", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment({ workId: "sprint.7" })),
    ).toThrow();
  });
});

describe("strategy memory schema", () => {
  it("rejects duplicate assessment IDs", () => {
    const assessment = validAssessment();
    expect(() =>
      strategyMemorySchema.parse({ assessments: [assessment, assessment] }),
    ).toThrow();
  });

  it("accepts an empty memory", () => {
    expect(() => strategyMemorySchema.parse({ assessments: [] })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/strategy-schemas.test.ts`
Expected: FAIL — `Cannot find module '../src/strategy/strategy-schemas.js'`

- [ ] **Step 3: Write the schema**

Create `src/strategy/strategy-schemas.ts`:

```ts
import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });

export const strategyIdSchema = z
  .string()
  .regex(
    /^strategy\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a strategy ID such as strategy.recruiter-messaging",
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

const evidenceIdSchema = z
  .string()
  .regex(
    /^evidence\.[a-z0-9][a-z0-9._-]*$/,
    "Expected an evidence ID such as evidence.beta-cohort-3-feedback",
  );

export const strategyFactorLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "uncertain",
]);

export const strategyDecisionSchema = z.enum([
  "now",
  "next",
  "later",
  "backlog",
]);

export const strategyFactorsSchema = z
  .object({
    alignment: strategyFactorLevelSchema,
    value: strategyFactorLevelSchema,
    risk: strategyFactorLevelSchema,
    cost: strategyFactorLevelSchema,
    evidenceStrength: strategyFactorLevelSchema,
    dependencyPressure: strategyFactorLevelSchema,
    complexity: strategyFactorLevelSchema,
    releaseConstraint: strategyFactorLevelSchema,
  })
  .strict();

export const strategyAssessmentSchema = z
  .object({
    id: strategyIdSchema,
    workId: relatedWorkIdSchema,
    factors: strategyFactorsSchema,
    decision: strategyDecisionSchema,
    rationale: z.string().trim().min(1).max(4_000),
    evidenceIds: z.array(evidenceIdSchema),
    resultingDecision: decisionIdSchema.nullable(),
    supersedes: strategyIdSchema.nullable(),
    status: z.enum(["active", "superseded"]),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const strategyMemorySchema = z
  .object({
    assessments: z.array(strategyAssessmentSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, assessment] of memory.assessments.entries()) {
      if (seen.has(assessment.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate strategy assessment ID: ${assessment.id}`,
          path: ["assessments", index, "id"],
        });
      }
      seen.add(assessment.id);
    }
  });

export type StrategyFactorLevel = z.infer<typeof strategyFactorLevelSchema>;
export type StrategyDecision = z.infer<typeof strategyDecisionSchema>;
export type StrategyFactors = z.infer<typeof strategyFactorsSchema>;
export type StrategyAssessment = z.infer<typeof strategyAssessmentSchema>;
export type StrategyMemory = z.infer<typeof strategyMemorySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/strategy-schemas.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/strategy/strategy-schemas.ts test/strategy-schemas.test.ts`
Expected: no errors; "All matched files use Prettier code style!" (run `./node_modules/.bin/prettier --write` on any file it flags, then re-check)

- [ ] **Step 6: Commit**

```bash
git add src/strategy/strategy-schemas.ts test/strategy-schemas.test.ts
git commit -m "feat: add strategy assessment schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Strategy store

**Files:**

- Create: `src/strategy/strategy-store.ts`
- Test: `test/strategy-store.test.ts`

**Interfaces:**

- Consumes: `strategyMemorySchema`, `StrategyMemory` from `src/strategy/strategy-schemas.js` (Task 1).
- Produces: `StrategyStore` class with `.state: AtomicStateStore<StrategyMemory>` and `.ensure(): Promise<void>`, and `createInitialStrategyMemory(): StrategyMemory` — both consumed by Task 3 (`StrategyService`) and Task 4 (CLI command).

- [ ] **Step 1: Write the failing test**

Create `test/strategy-store.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { StrategyStore } from "../src/strategy/strategy-store.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("StrategyStore", () => {
  it("initializes an empty memory file on first ensure()", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-strategy-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new StrategyStore(projectRoot);

    await store.ensure();
    const { state } = await store.state.read();

    expect(state.data.assessments).toEqual([]);
  });

  it("does not overwrite an existing file when ensure() is called again", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-strategy-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new StrategyStore(projectRoot);

    await store.ensure();
    const { state: firstRead } = await store.state.read();
    const written = await store.state.write(
      { assessments: [] },
      { expectedRevision: firstRead.revision },
    );
    await store.ensure();
    const { state: secondRead } = await store.state.read();

    expect(secondRead.revision).toBe(written.revision);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/strategy-store.test.ts`
Expected: FAIL — `Cannot find module '../src/strategy/strategy-store.js'`

- [ ] **Step 3: Write the store**

Create `src/strategy/strategy-store.ts`:

```ts
import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  strategyMemorySchema,
  type StrategyMemory,
} from "./strategy-schemas.js";

export const strategyMemoryEnvelopeSchema = createStateEnvelopeSchema(
  strategyMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialStrategyMemory(): StrategyMemory {
  return strategyMemorySchema.parse({ assessments: [] });
}

export class StrategyStore {
  readonly state: AtomicStateStore<StrategyMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "strategy.json"),
      ),
      schema: strategyMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialStrategyMemory());
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/strategy-store.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/strategy/strategy-store.ts test/strategy-store.test.ts`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/strategy/strategy-store.ts test/strategy-store.test.ts
git commit -m "feat: add strategy assessment store

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Strategy service

**Files:**

- Create: `src/strategy/strategy-service.ts`
- Test: `test/strategy-service.test.ts`

**Interfaces:**

- Consumes:
  - `StrategyStore` (Task 2): `.state.read()`, `.state.write(data, { expectedRevision })`, `.ensure()`.
  - `strategyAssessmentSchema` (Task 1).
  - `EvidenceService.assertEvidenceExists(evidenceIds: readonly string[]): Promise<void>` — already exists at `src/learning/evidence-service.js`.
  - `DecisionService.record(input: RecordDecisionInput): Promise<DecisionMutationResult>` — already exists at `src/decisions/service.js`. `RecordDecisionInput` fields used: `statement`, `reasoning`, `consequences`, `scope`, `keywords`, `relatedWork`, `evidence`.
  - `AtomicStateStore<WorkState>` (work store) — for validating `workId` exists.
- Produces:
  - `RecordStrategyAssessmentInput` interface (consumed by Task 4's CLI command).
  - `StrategyMutationResult { assessment: StrategyAssessment; revision: number }`.
  - `StrategyService` class with:
    - `assess(input: RecordStrategyAssessmentInput): Promise<StrategyMutationResult>`
    - `history(workId: string): Promise<StrategyAssessment[]>` — newest first, consumed by Task 4's `history` command.

- [ ] **Step 1: Write the failing test**

Create `test/strategy-service.test.ts`:

```ts
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { createDecisionStore } from "../src/decisions/store.js";
import { DecisionService } from "../src/decisions/service.js";
import { EvidenceService } from "../src/learning/evidence-service.js";
import { EvidenceStore } from "../src/learning/evidence-store.js";
import { ExperimentStore } from "../src/learning/experiment-store.js";
import { HypothesisStore } from "../src/learning/hypothesis-store.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { StrategyService } from "../src/strategy/strategy-service.js";
import { StrategyStore } from "../src/strategy/strategy-store.js";
import { WorkService } from "../src/work/service.js";

const TIMESTAMP = "2026-08-23T00:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-strategy-service-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });

  const workStore = createWorkStateStore(projectRoot);
  const feature = await new WorkService(workStore).createFeature({
    name: "Recruiter Messaging",
    description: "Let recruiters message candidates directly.",
  });

  const evidenceStore = new EvidenceStore(projectRoot);
  const evidenceService = new EvidenceService(
    evidenceStore,
    new ExperimentStore(projectRoot),
    new HypothesisStore(projectRoot),
    workStore,
    { now: () => new Date(TIMESTAMP) },
  );

  const decisionService = new DecisionService(
    createDecisionStore(projectRoot),
    workStore,
    { evidenceService, now: () => new Date(TIMESTAMP) },
  );

  const strategyStore = new StrategyStore(projectRoot);
  const service = new StrategyService(
    strategyStore,
    decisionService,
    evidenceService,
    workStore,
    { now: () => new Date(TIMESTAMP) },
  );

  return {
    projectRoot,
    feature,
    service,
    strategyStore,
    evidenceService,
    evidenceStore,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const FACTORS = {
  alignment: "low" as const,
  value: "uncertain" as const,
  risk: "high" as const,
  cost: "medium" as const,
  evidenceStrength: "low" as const,
  dependencyPressure: "low" as const,
  complexity: "medium" as const,
  releaseConstraint: "low" as const,
};

describe("StrategyService.assess", () => {
  it("rejects an unknown work item", async () => {
    const { service } = await createFixture();

    await expect(
      service.assess({
        workId: "feature.does-not-exist",
        factors: FACTORS,
        decision: "backlog",
        rationale: "No such feature.",
        evidenceIds: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects an unknown evidence id", async () => {
    const { service, feature } = await createFixture();

    await expect(
      service.assess({
        workId: feature.entity.id,
        factors: FACTORS,
        decision: "backlog",
        rationale: "Referencing evidence that does not exist.",
        evidenceIds: ["evidence.does-not-exist"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("persists an assessment and writes a linked decision", async () => {
    const { service, feature, strategyStore } = await createFixture();

    const result = await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "High spam risk, low alignment, thin evidence.",
      evidenceIds: [],
    });

    expect(result.assessment.status).toBe("active");
    expect(result.assessment.resultingDecision).not.toBeNull();

    const { state } = await strategyStore.state.read();
    expect(state.data.assessments).toHaveLength(1);
    expect(state.data.assessments[0]?.id).toBe(result.assessment.id);
  });

  it("stamps resultingDecision onto referenced evidence via the linked decision", async () => {
    const { service, feature, evidenceService, evidenceStore } =
      await createFixture();

    const evidence = await evidenceService.record({
      kind: "beta-feedback",
      summary: "Beta cohort reported concern about unsolicited messages.",
      source: "Beta survey.",
      relatedWork: feature.entity.id,
    });

    await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "Evidence indicates spam risk.",
      evidenceIds: [evidence.evidence.id],
    });

    const { state } = await evidenceStore.state.read();
    const stamped = state.data.evidence.find(
      (item) => item.id === evidence.evidence.id,
    );
    expect(stamped?.resultingDecision).not.toBeNull();
  });

  it("supersedes a prior assessment for the same work item", async () => {
    const { service, feature } = await createFixture();

    const first = await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "Initial read: too risky.",
      evidenceIds: [],
    });

    const second = await service.assess({
      workId: feature.entity.id,
      factors: { ...FACTORS, risk: "low", alignment: "high" },
      decision: "now",
      rationale: "Spam controls shipped; risk is now low.",
      evidenceIds: [],
      supersedes: first.assessment.id,
    });

    const history = await service.history(feature.entity.id);
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe(second.assessment.id);
    expect(history[0]?.status).toBe("active");
    expect(history[1]?.id).toBe(first.assessment.id);
    expect(history[1]?.status).toBe("superseded");
  });

  it("rejects superseding an already-superseded assessment", async () => {
    const { service, feature } = await createFixture();

    const first = await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "Initial read.",
      evidenceIds: [],
    });
    await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "next",
      rationale: "Re-assessed.",
      evidenceIds: [],
      supersedes: first.assessment.id,
    });

    await expect(
      service.assess({
        workId: feature.entity.id,
        factors: FACTORS,
        decision: "now",
        rationale: "Third pass.",
        evidenceIds: [],
        supersedes: first.assessment.id,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });

  it("rejects superseding an unknown assessment id", async () => {
    const { service, feature } = await createFixture();

    await expect(
      service.assess({
        workId: feature.entity.id,
        factors: FACTORS,
        decision: "now",
        rationale: "Referencing a nonexistent assessment.",
        evidenceIds: [],
        supersedes: "strategy.does-not-exist",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/strategy-service.test.ts`
Expected: FAIL — `Cannot find module '../src/strategy/strategy-service.js'`

- [ ] **Step 3: Write the service**

Create `src/strategy/strategy-service.ts`:

```ts
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { DecisionService } from "../decisions/service.js";
import type { EvidenceService } from "../learning/evidence-service.js";
import type { AtomicStateStore } from "../state/store.js";
import type { WorkState } from "../work/schemas.js";
import {
  strategyAssessmentSchema,
  type StrategyAssessment,
  type StrategyDecision,
  type StrategyFactors,
} from "./strategy-schemas.js";
import type { StrategyStore } from "./strategy-store.js";

export interface RecordStrategyAssessmentInput {
  workId: string;
  factors: StrategyFactors;
  decision: StrategyDecision;
  rationale: string;
  evidenceIds: string[];
  supersedes?: string;
}

export interface StrategyMutationResult {
  assessment: StrategyAssessment;
  revision: number;
}

export interface StrategyServiceOptions {
  now?: () => Date;
}

function strategyError(
  message: string,
  details: Readonly<Record<string, unknown>>,
  conflict = false,
): AutoForgeError {
  return new AutoForgeError(
    conflict ? "STATE_CONFLICT" : "INVALID_ARGUMENT",
    message,
    {
      details,
      exitCode: conflict ? EXIT_CODE.conflict : EXIT_CODE.notFound,
    },
  );
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "assessment";
}

function allocateStrategyId(
  workId: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `strategy.${slugify(workId)}`;
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

function factorSummary(factors: StrategyFactors): string {
  return Object.entries(factors)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export class StrategyService {
  private readonly strategyStore: StrategyStore;
  private readonly decisionService: DecisionService;
  private readonly evidenceService: EvidenceService;
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly now: () => Date;

  constructor(
    strategyStore: StrategyStore,
    decisionService: DecisionService,
    evidenceService: EvidenceService,
    workStore: AtomicStateStore<WorkState>,
    options: StrategyServiceOptions = {},
  ) {
    this.strategyStore = strategyStore;
    this.decisionService = decisionService;
    this.evidenceService = evidenceService;
    this.workStore = workStore;
    this.now = options.now ?? (() => new Date());
  }

  async assess(
    input: RecordStrategyAssessmentInput,
  ): Promise<StrategyMutationResult> {
    const { state: workState } = await this.workStore.read();
    const knownWorkIds = workIds(workState.data);
    if (!knownWorkIds.has(input.workId)) {
      throw strategyError("Strategy assessment references unknown work", {
        workId: input.workId,
      });
    }

    if (input.evidenceIds.length > 0) {
      await this.evidenceService.assertEvidenceExists(input.evidenceIds);
    }

    await this.strategyStore.ensure();
    const { state: memoryState } = await this.strategyStore.state.read();

    const target = input.supersedes
      ? memoryState.data.assessments.find(
          (assessment) => assessment.id === input.supersedes,
        )
      : undefined;
    if (input.supersedes && !target) {
      throw strategyError(`Unknown strategy assessment ${input.supersedes}`, {
        id: input.supersedes,
      });
    }
    if (target && target.status !== "active") {
      throw strategyError(
        `Strategy assessment ${target.id} cannot be superseded from ${target.status} status`,
        { id: target.id, status: target.status },
        true,
      );
    }

    const timestamp = this.now().toISOString();
    const decisionResult = await this.decisionService.record({
      statement: `${input.workId}: strategic assessment recommends ${input.decision}`,
      reasoning: input.rationale,
      consequences: [factorSummary(input.factors)],
      scope: ["strategy"],
      keywords: ["strategy", input.decision],
      relatedWork: [input.workId],
      kind: "feature-note",
      ...(input.evidenceIds.length > 0 ? { evidence: input.evidenceIds } : {}),
    });

    const assessment = strategyAssessmentSchema.parse({
      id: allocateStrategyId(
        input.workId,
        new Set(memoryState.data.assessments.map((item) => item.id)),
      ),
      workId: input.workId,
      factors: input.factors,
      decision: input.decision,
      rationale: input.rationale,
      evidenceIds: input.evidenceIds,
      resultingDecision: decisionResult.decision.id,
      supersedes: target?.id ?? null,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const assessments = target
      ? [
          ...memoryState.data.assessments.map((candidate) =>
            candidate.id === target.id
              ? {
                  ...candidate,
                  status: "superseded" as const,
                  updatedAt: timestamp,
                }
              : candidate,
          ),
          assessment,
        ]
      : [...memoryState.data.assessments, assessment];

    const committed = await this.strategyStore.state.write(
      { assessments },
      { expectedRevision: memoryState.revision },
    );

    return { assessment, revision: committed.revision };
  }

  async history(workId: string): Promise<StrategyAssessment[]> {
    await this.strategyStore.ensure();
    const { state } = await this.strategyStore.state.read();
    return state.data.assessments
      .filter((assessment) => assessment.workId === workId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/strategy-service.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/strategy/strategy-service.ts test/strategy-service.test.ts`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/strategy/strategy-service.ts test/strategy-service.test.ts
git commit -m "feat: add strategy assessment service with linked-decision writes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `autoforge strategy` CLI command

**Files:**

- Create: `src/commands/strategy.ts`
- Modify: `src/cli/index.ts:262-264` (insert `strategy` route directly after the `learning` route)
- Modify: `src/cli/help.ts` (add `strategy` to the command table and a "Strategy and prioritization" usage section, directly after "Learning and evidence")
- Test: `test/strategy-command.test.ts`

**Interfaces:**

- Consumes:
  - `StrategyService.assess(input): Promise<StrategyMutationResult>`, `.history(workId): Promise<StrategyAssessment[]>` (Task 3).
  - `StrategyStore` (Task 2), for direct reads in `list`/`show`.
  - `strategyFactorLevelSchema`, `strategyDecisionSchema` (Task 1) — for CLI-side enum validation.
  - `createDecisionStore`, `DecisionService`, `EvidenceService`, `EvidenceStore`, `ExperimentStore`, `HypothesisStore`, `createWorkStateStore` — existing constructors, wired exactly as `decide.ts` wires them.
- Produces: `runStrategyCommand(options: { args: readonly string[]; output: LogWriter; startDirectory: string }): Promise<ExitCode>`, registered in the CLI router as `strategy`.

- [ ] **Step 1: Write the failing test**

Create `test/strategy-command.test.ts`:

```ts
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runStrategyCommand } from "../src/commands/strategy.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-strategy-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const feature = await new WorkService(
    createWorkStateStore(projectRoot),
  ).createFeature({
    name: "Recruiter Messaging",
    description: "Let recruiters message candidates directly.",
  });
  return { feature, projectRoot };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

// `overrides` replaces a base factor/decision value by flag name; `extra` appends
// additional flags (e.g. --supersedes) after the base set. This split keeps the
// parser's "a flag may only be provided once" rule from ever being triggered by
// the test helper itself — overriding --decision does not also duplicate it.
function assessArgs(
  workId: string,
  extra: string[] = [],
  overrides: Record<string, string> = {},
): string[] {
  const flags: Record<string, string> = {
    "--alignment": "low",
    "--value": "uncertain",
    "--risk": "high",
    "--cost": "medium",
    "--evidence-strength": "low",
    "--dependency-pressure": "low",
    "--complexity": "medium",
    "--release-constraint": "low",
    "--decision": "backlog",
    "--rationale": "High spam risk, low alignment, thin evidence.",
    ...overrides,
  };
  return [
    "assess",
    workId,
    ...Object.entries(flags).flatMap(([flag, value]) => [flag, value]),
    ...extra,
  ];
}

describe("strategy command", () => {
  it("records an assessment and reports the linked decision", async () => {
    const { feature, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runStrategyCommand({
        args: assessArgs(feature.entity.id),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Recorded strategy assessment",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain("linked decision");
  });

  it("rejects an invalid factor value", async () => {
    const { feature, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runStrategyCommand({
        args: assessArgs(feature.entity.id, ["--alignment", "extreme"]),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it.each([
    ["--alignment"],
    ["--value"],
    ["--risk"],
    ["--cost"],
    ["--evidence-strength"],
    ["--dependency-pressure"],
    ["--complexity"],
    ["--release-constraint"],
    ["--decision"],
    ["--rationale"],
  ])("rejects a missing required flag %s", async (missingFlag) => {
    const { feature, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    const fullArgs = assessArgs(feature.entity.id);
    const flagIndex = fullArgs.indexOf(missingFlag);
    const args = [
      ...fullArgs.slice(0, flagIndex),
      ...fullArgs.slice(flagIndex + 2),
    ];

    await expect(
      runStrategyCommand({ args, output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists only active assessments, filterable by decision", async () => {
    const { feature, projectRoot } = await createFixture();
    const assessOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: assessArgs(feature.entity.id),
      output: assessOutput,
      startDirectory: projectRoot,
    });

    const listOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runStrategyCommand({
        args: ["list"],
        output: listOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(listOutput.stdout.mock.calls[0]?.[0]).toContain(feature.entity.id);

    const filteredOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: ["list", "--decision", "now"],
      output: filteredOutput,
      startDirectory: projectRoot,
    });
    expect(filteredOutput.stdout.mock.calls[0]?.[0]).toBe("");
  });

  it("shows one assessment by id", async () => {
    const { feature, projectRoot } = await createFixture();
    const assessOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: assessArgs(feature.entity.id),
      output: assessOutput,
      startDirectory: projectRoot,
    });
    const id = /strategy\.[a-z0-9.-]+/.exec(
      assessOutput.stdout.mock.calls[0]?.[0] ?? "",
    )?.[0];
    expect(id).toBeDefined();

    const showOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runStrategyCommand({
        args: ["show", id!],
        output: showOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(showOutput.stdout.mock.calls[0]?.[0]).toContain("backlog");
  });

  it("returns history newest first after a supersede", async () => {
    const { feature, projectRoot } = await createFixture();
    const firstOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: assessArgs(feature.entity.id),
      output: firstOutput,
      startDirectory: projectRoot,
    });
    const firstId = /strategy\.[a-z0-9.-]+/.exec(
      firstOutput.stdout.mock.calls[0]?.[0] ?? "",
    )?.[0]!;

    await runStrategyCommand({
      args: assessArgs(feature.entity.id, ["--supersedes", firstId], {
        "--decision": "now",
      }),
      output: { stdout: vi.fn(), stderr: vi.fn() },
      startDirectory: projectRoot,
    });

    const historyOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runStrategyCommand({
        args: ["history", feature.entity.id],
        output: historyOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    const lines = (historyOutput.stdout.mock.calls[0]?.[0] ?? "").split("\n");
    expect(lines[0]).toContain("now");
    expect(lines[1]).toContain("backlog");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/strategy-command.test.ts`
Expected: FAIL — `Cannot find module '../src/commands/strategy.js'`

- [ ] **Step 3: Write the command**

Create `src/commands/strategy.ts`:

```ts
import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { createDecisionStore } from "../decisions/store.js";
import { DecisionService } from "../decisions/service.js";
import { EvidenceService } from "../learning/evidence-service.js";
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
import { createWorkStateStore } from "../state/kernel.js";
import {
  strategyDecisionSchema,
  strategyFactorLevelSchema,
} from "../strategy/strategy-schemas.js";
import { StrategyService } from "../strategy/strategy-service.js";
import { StrategyStore } from "../strategy/strategy-store.js";

export interface StrategyCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

const FACTOR_FLAGS = {
  "--alignment": "alignment",
  "--value": "value",
  "--risk": "risk",
  "--cost": "cost",
  "--evidence-strength": "evidenceStrength",
  "--dependency-pressure": "dependencyPressure",
  "--complexity": "complexity",
  "--release-constraint": "releaseConstraint",
} as const;

const SINGLE_FLAGS = new Set([
  ...Object.keys(FACTOR_FLAGS),
  "--decision",
  "--rationale",
  "--supersedes",
]);
const REPEATABLE_FLAGS = new Set(["--evidence"]);

function usageError(output: LogWriter, message: string): undefined {
  output.stderr(message);
  output.stderr('Run "autoforge help" for usage.');
  return undefined;
}

interface ParsedAssessArguments {
  workId: string;
  factors: Record<(typeof FACTOR_FLAGS)[keyof typeof FACTOR_FLAGS], string>;
  decision: string;
  rationale: string;
  evidenceIds: string[];
  supersedes?: string;
}

function parseAssessArguments(
  workId: string | undefined,
  rest: readonly string[],
  output: LogWriter,
): ParsedAssessArguments | undefined {
  if (!workId) {
    return usageError(
      output,
      "A work item id is required for strategy assess.",
    );
  }
  const singleValues = new Map<string, string>();
  const repeatableValues = new Map<string, string[]>(
    [...REPEATABLE_FLAGS].map((flag) => [flag, []]),
  );
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag || (!SINGLE_FLAGS.has(flag) && !REPEATABLE_FLAGS.has(flag))) {
      return usageError(
        output,
        `Unknown strategy option: ${flag ?? "<missing>"}`,
      );
    }
    if (!value || value.startsWith("--")) {
      return usageError(output, `Option ${flag} requires a value.`);
    }
    if (SINGLE_FLAGS.has(flag)) {
      if (singleValues.has(flag)) {
        return usageError(output, `Option ${flag} may only be provided once.`);
      }
      singleValues.set(flag, value);
    } else {
      repeatableValues.get(flag)?.push(value);
    }
  }

  const factors: Record<string, string> = {};
  for (const [flag, key] of Object.entries(FACTOR_FLAGS)) {
    const value = singleValues.get(flag);
    if (!value) {
      return usageError(output, `Option ${flag} is required.`);
    }
    const parsedLevel = strategyFactorLevelSchema.safeParse(value);
    if (!parsedLevel.success) {
      return usageError(
        output,
        `Option ${flag} must be one of: low, medium, high, uncertain.`,
      );
    }
    factors[key] = parsedLevel.data;
  }

  const decision = singleValues.get("--decision");
  const rationale = singleValues.get("--rationale");
  if (!decision) {
    return usageError(output, "Option --decision is required.");
  }
  if (!strategyDecisionSchema.safeParse(decision).success) {
    return usageError(
      output,
      "Option --decision must be one of: now, next, later, backlog.",
    );
  }
  if (!rationale) {
    return usageError(output, "Option --rationale is required.");
  }

  const supersedes = singleValues.get("--supersedes");
  return {
    workId,
    factors: factors as ParsedAssessArguments["factors"],
    decision,
    rationale,
    evidenceIds: repeatableValues.get("--evidence") ?? [],
    ...(supersedes ? { supersedes } : {}),
  };
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge strategy assess <work-id> --alignment <low|medium|high|uncertain> --value <..> --risk <..> --cost <..> --evidence-strength <..> --dependency-pressure <..> --complexity <..> --release-constraint <..> --decision <now|next|later|backlog> --rationale <text> [--evidence <evidence-id>] [--supersedes <strategy-id>] | strategy list [--decision <label>] [--work <work-id>] | strategy show <id> | strategy history <work-id>",
  );
  return EXIT_CODE.usage;
}

export async function runStrategyCommand(
  options: StrategyCommandOptions,
): Promise<ExitCode> {
  const [action, target, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const strategyStore = new StrategyStore(project.path);
  const evidenceService = new EvidenceService(
    new EvidenceStore(project.path),
    new ExperimentStore(project.path),
    new HypothesisStore(project.path),
    workStore,
  );
  const decisionService = new DecisionService(
    createDecisionStore(project.path),
    workStore,
    { evidenceService },
  );
  const service = new StrategyService(
    strategyStore,
    decisionService,
    evidenceService,
    workStore,
  );

  try {
    if (action === "assess") {
      const parsed = parseAssessArguments(target, rest, options.output);
      if (!parsed) {
        return EXIT_CODE.usage;
      }
      const { workId, factors, decision, rationale, evidenceIds, supersedes } =
        parsed;
      const result = await service.assess({
        workId,
        factors:
          factors as unknown as import("../strategy/strategy-schemas.js").StrategyFactors,
        decision:
          decision as import("../strategy/strategy-schemas.js").StrategyDecision,
        rationale,
        evidenceIds,
        ...(supersedes ? { supersedes } : {}),
      });
      options.output.stdout(
        `Recorded strategy assessment ${result.assessment.id} (revision ${result.revision}); linked decision ${result.assessment.resultingDecision}.`,
      );
      return EXIT_CODE.success;
    }

    if (action === "list") {
      await strategyStore.ensure();
      const { state } = await strategyStore.state.read();
      const decisionFilter = target === "--decision" ? rest[0] : undefined;
      const workFilter = target === "--work" ? rest[0] : undefined;
      const rows = state.data.assessments
        .filter((assessment) => assessment.status === "active")
        .filter(
          (assessment) =>
            !decisionFilter || assessment.decision === decisionFilter,
        )
        .filter((assessment) => !workFilter || assessment.workId === workFilter)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map(
          (assessment) =>
            `${assessment.id} [${assessment.decision}] ${assessment.workId} — ${assessment.rationale}`,
        )
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }

    if (action === "show" && target) {
      await strategyStore.ensure();
      const { state } = await strategyStore.state.read();
      const found = state.data.assessments.find((item) => item.id === target);
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }

    if (action === "history" && target) {
      const results = await service.history(target);
      options.output.stdout(
        results
          .map(
            (assessment) =>
              `${assessment.id} [${assessment.decision}] (${assessment.status}) — ${assessment.rationale}`,
          )
          .join("\n"),
      );
      return EXIT_CODE.success;
    }

    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      usageError(
        options.output,
        error.issues[0]?.message ?? "Invalid strategy input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/strategy-command.test.ts`
Expected: PASS (15 tests: 1 record + 1 invalid-factor + 10 missing-flag + 1 list + 1 show + 1 history)

- [ ] **Step 5: Register the command in the CLI router**

Modify `src/cli/index.ts`. First add the import near the other command imports (find the line `import { runWhyCommand } from "../commands/why.js";` and add directly after it):

```ts
import { runStrategyCommand } from "../commands/strategy.js";
```

Then find this block (currently around line 262-263):

```ts
        learning: (commandArgs) =>
          runLearningCommand({ args: commandArgs, output, startDirectory }),
```

Add directly after it:

```ts
        strategy: (commandArgs) =>
          runStrategyCommand({ args: commandArgs, output, startDirectory }),
```

- [ ] **Step 6: Update the help text**

Modify `src/cli/help.ts`. In the `Commands:` list, find the line:

```
  learning   Record hypotheses, experiments, and product evidence
```

Add directly after it:

```
  strategy   Record explainable strategy assessments and their decision label
```

Then find the `Learning and evidence:` section and its four `autoforge learning ...` lines. Add a new section directly after that block:

```

Strategy and prioritization:
  autoforge strategy assess <work-id> --alignment <low|medium|high|uncertain> --value <low|medium|high|uncertain> --risk <low|medium|high|uncertain> --cost <low|medium|high|uncertain> --evidence-strength <low|medium|high|uncertain> --dependency-pressure <low|medium|high|uncertain> --complexity <low|medium|high|uncertain> --release-constraint <low|medium|high|uncertain> --decision <now|next|later|backlog> --rationale <text> [--evidence <evidence-id>] [--supersedes <strategy-id>]
  autoforge strategy list [--decision <now|next|later|backlog>] [--work <work-id>]
  autoforge strategy show <id>
  autoforge strategy history <work-id>
```

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `./node_modules/.bin/vitest run`
Expected: all tests pass, including the new `strategy-command.test.ts`, plus any existing CLI-registration/help-text test (search first: `grep -rl "AUTOFORGE_HELP" test/` — if a test asserts an exact command count or exact list of commands, update its expected list to include `strategy`).

- [ ] **Step 8: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/commands/strategy.ts src/cli/index.ts src/cli/help.ts test/strategy-command.test.ts`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/commands/strategy.ts src/cli/index.ts src/cli/help.ts test/strategy-command.test.ts
git commit -m "feat: add autoforge strategy CLI command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Context packet integration

**Files:**

- Modify: `src/context/schemas.ts` (add `strategyAssessmentRefSchema` / optional `strategy` field to `contextSelectionSchema`)
- Modify: `src/context/packet.ts` (add `renderStrategy`, splice into `renderPacket`, add a line to `formatContextExplanation`)
- Modify: `src/commands/context.ts` (`compileProjectContext` loads the active work item's active strategy assessment and passes it through)
- Test: `test/strategy-context.test.ts`

**Interfaces:**

- Consumes: `strategyAssessmentSchema`, `StrategyAssessment` (Task 1); `StrategyStore` (Task 2).
- Produces: `ContextSelection.strategy?: StrategyAssessment` (new optional field), consumed by `ContextPacketCompiler.compile()` and `formatContextExplanation()`.

- [ ] **Step 1: Write the failing test**

Create `test/strategy-context.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ContextPacketCompiler } from "../src/context/packet.js";
import { contextSelectionSchema } from "../src/context/schemas.js";

function baseSelection(overrides: Record<string, unknown> = {}) {
  return {
    work: {
      kind: "task",
      item: {
        id: "task.strategy",
        phaseId: "phase.strategy",
        name: "Strategy",
        description: "Strategy task.",
        status: "active",
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:00:00Z",
        scope: { include: ["src/strategy/**"], exclude: [] },
      },
      phase: {
        id: "phase.strategy",
        featureId: "feature.strategy",
        sequence: 1,
        name: "Strategy",
        description: "Strategy.",
        status: "active",
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:00:00Z",
      },
      feature: {
        id: "feature.strategy",
        name: "Strategy",
        description: "Strategy.",
        status: "active",
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:00:00Z",
      },
      startedAt: "2026-08-23T00:00:00Z",
      objective: "Use strategy",
      reasons: ["test"],
      estimatedTokens: 10,
    },
    doctrines: [],
    decisions: [],
    specs: [],
    exclusions: [],
    budget: {
      maxTokens: 100,
      usedTokens: 10,
      remainingTokens: 90,
      exceeded: false,
    },
    ...overrides,
  };
}

const ASSESSMENT = {
  id: "strategy.recruiter-messaging",
  workId: "feature.strategy",
  factors: {
    alignment: "low",
    value: "uncertain",
    risk: "high",
    cost: "medium",
    evidenceStrength: "low",
    dependencyPressure: "low",
    complexity: "medium",
    releaseConstraint: "low",
  },
  decision: "backlog",
  rationale: "High spam risk, low alignment, thin evidence.",
  evidenceIds: [],
  resultingDecision: "decision.strategic-assessment-recommends-backlog",
  supersedes: null,
  status: "active",
  createdAt: "2026-08-23T00:00:00Z",
  updatedAt: "2026-08-23T00:00:00Z",
};

describe("strategy context delivery", () => {
  it("renders the strategy assessment in the context packet when present", () => {
    const selection = contextSelectionSchema.parse(
      baseSelection({ strategy: ASSESSMENT }),
    );
    const content = new ContextPacketCompiler().compile(selection).content;

    expect(content).toContain("## Strategy Assessment");
    expect(content).toContain("strategy.recruiter-messaging");
    expect(content).toContain("backlog");
    expect(content).toContain("High spam risk, low alignment, thin evidence.");
  });

  it("omits the strategy section when no assessment is present", () => {
    const selection = contextSelectionSchema.parse(baseSelection());
    const content = new ContextPacketCompiler().compile(selection).content;

    expect(content).not.toContain("## Strategy Assessment");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/strategy-context.test.ts`
Expected: FAIL — `strategy` is not a recognized key (schema rejects unknown key because `contextSelectionSchema` is `.strict()`), or the packet content does not contain `## Strategy Assessment`.

- [ ] **Step 3: Add the schema field**

Modify `src/context/schemas.ts`. Add the import at the top, alongside the other domain imports:

```ts
import { strategyAssessmentSchema } from "../strategy/strategy-schemas.js";
```

Add a new exported schema directly after `specificationRefSchema` (around line 58):

```ts
export const strategyAssessmentRefSchema = strategyAssessmentSchema;
```

Add `strategy` as an optional field to `contextSelectionSchema`, directly after the `domain` field:

```ts
    domain: z.array(domainConceptSchema).optional(),
    strategy: strategyAssessmentRefSchema.optional(),
```

Add the type export at the bottom, alongside the other type exports:

```ts
export type StrategyAssessmentRef = z.infer<typeof strategyAssessmentRefSchema>;
```

- [ ] **Step 4: Add the render function**

Modify `src/context/packet.ts`. Add `renderStrategy` directly after `renderDomain` (around line 357):

```ts
function renderStrategy(selection: ContextSelection): string[] {
  const assessment = selection.strategy;
  if (!assessment) return [];
  const factorLine = Object.entries(assessment.factors)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  return [
    "## Strategy Assessment",
    "",
    `- **Decision:** ${assessment.decision}`,
    `- **Factors:** ${factorLine}`,
    `- **Rationale:** ${inlineText(assessment.rationale)}`,
    `- **Evidence:** ${assessment.evidenceIds.join(", ") || "(none)"}`,
    "",
  ];
}
```

Splice it into `renderPacket`, directly after `...renderDomain(selection),`:

```ts
    ...renderDomain(selection),
    ...renderStrategy(selection),
```

Add one line to `formatContextExplanation`'s "Execution Contract" section, directly after the `Agent contract` line:

```ts
    `- **Strategy assessment:** ${selection.strategy ? `${selection.strategy.id} (${selection.strategy.decision})` : "(not provided)"}`,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/strategy-context.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Wire the active work item's assessment into `compileProjectContext`**

Modify `src/commands/context.ts`. Add the import at the top:

```ts
import { StrategyStore } from "../strategy/strategy-store.js";
```

Modify `compileProjectContext` — after `const selection = await new ContextResolver().resolve({...});` and before `const packet = new ContextPacketCompiler().compile(selection);`, insert a lookup for the active work item's active strategy assessment and re-parse the selection with it attached:

```ts
const selection = await new ContextResolver().resolve({
  work: installation.work.data,
  decisions: installation.decisions.data,
  doctrines: installation.doctrines.data,
  doctrineSessions: installation.doctrineSession.data,
  specifications,
  config: installation.config,
});

const strategyStore = new StrategyStore(projectRoot);
await strategyStore.ensure();
const { state: strategyState } = await strategyStore.state.read();
const activeAssessment = strategyState.data.assessments.find(
  (assessment) =>
    assessment.status === "active" &&
    assessment.workId === selection.work.item.id,
);

const enrichedSelection = activeAssessment
  ? { ...selection, strategy: activeAssessment }
  : selection;

const packet = new ContextPacketCompiler().compile(enrichedSelection);
return { packet, selection: enrichedSelection };
```

Replace the existing two lines (`const packet = new ContextPacketCompiler().compile(selection); return { packet, selection };`) with the block above.

- [ ] **Step 7: Write an integration test for the wired-in behavior**

Add to `test/strategy-context.test.ts` a new `describe` block using the real command layer (this exercises `compileProjectContext`, not just the packet compiler in isolation). Active work in this codebase is set by starting an issue via `runStartCommand` (see `test/start.test.ts` for the reference pattern: `WorkService.createIssue()` + `runStartCommand({ args: ["issue", id], ... })`), which is simpler than the feature/phase/task chain since issues don't require a parent phase:

```ts
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";

import { compileProjectContext } from "../src/commands/context.js";
import { runStartCommand } from "../src/commands/start.js";
import { initializeProject } from "../src/commands/init.js";
import { createDecisionStore } from "../src/decisions/store.js";
import { DecisionService } from "../src/decisions/service.js";
import { EvidenceService } from "../src/learning/evidence-service.js";
import { EvidenceStore } from "../src/learning/evidence-store.js";
import { ExperimentStore } from "../src/learning/experiment-store.js";
import { HypothesisStore } from "../src/learning/hypothesis-store.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { StrategyService } from "../src/strategy/strategy-service.js";
import { StrategyStore } from "../src/strategy/strategy-store.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("compileProjectContext strategy wiring", () => {
  it("includes the active work item's active strategy assessment", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-strategy-context-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });

    const workStore = createWorkStateStore(projectRoot);
    const workService = new WorkService(workStore);
    const issue = await workService.createIssue({
      name: "Recruiter Messaging",
      description: "Let recruiters message candidates directly.",
      scope: { include: ["src/messaging/**"], exclude: [] },
    });

    const evidenceService = new EvidenceService(
      new EvidenceStore(projectRoot),
      new ExperimentStore(projectRoot),
      new HypothesisStore(projectRoot),
      workStore,
    );
    const decisionService = new DecisionService(
      createDecisionStore(projectRoot),
      workStore,
      { evidenceService },
    );
    const strategyService = new StrategyService(
      new StrategyStore(projectRoot),
      decisionService,
      evidenceService,
      workStore,
    );
    await strategyService.assess({
      workId: issue.entity.id,
      factors: {
        alignment: "high",
        value: "high",
        risk: "low",
        cost: "medium",
        evidenceStrength: "high",
        dependencyPressure: "low",
        complexity: "medium",
        releaseConstraint: "low",
      },
      decision: "now",
      rationale: "Clear evidence, low risk.",
      evidenceIds: [],
    });

    const startOutput = { stdout: () => {}, stderr: () => {} };
    await runStartCommand({
      args: ["issue", issue.entity.id],
      output: startOutput,
      startDirectory: projectRoot,
    });

    const { packet } = await compileProjectContext(projectRoot);
    expect(packet.content).toContain("## Strategy Assessment");
    expect(packet.content).toContain("now");
  });
});
```

`LogWriter` (`src/core/logger.ts`) requires exactly `stdout(message: string): void` and `stderr(message: string): void` — the `{ stdout: () => {}, stderr: () => {} }` stub above satisfies it. `CreateIssueInput`'s `scope: { include, exclude }` shape matches `test/start.test.ts`'s fixture exactly.

- [ ] **Step 8: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/strategy-context.test.ts`
Expected: PASS (3 tests total)

- [ ] **Step 9: Run the full test suite**

Run: `./node_modules/.bin/vitest run`
Expected: all tests pass — this touches shared schemas (`context/schemas.ts`) and rendering (`context/packet.ts`), so check specifically for regressions in `test/context-packet.test.ts`, `test/context-resolver.test.ts`, `test/governance-context.test.ts`, `test/domain-context.test.ts`, `test/workflow-context-policy.test.ts`, and `test/orchestration-context.test.ts`.

- [ ] **Step 10: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/context/schemas.ts src/context/packet.ts src/commands/context.ts test/strategy-context.test.ts`
Expected: no errors

- [ ] **Step 11: Commit**

```bash
git add src/context/schemas.ts src/context/packet.ts src/commands/context.ts test/strategy-context.test.ts
git commit -m "feat: surface active strategy assessment in context packets

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Documentation

**Files:**

- Modify: `docs/AUTOFORGE_CLI_REFERENCE.md`

**Interfaces:**

- Consumes: nothing new — this is prose only, describing the command surface built in Tasks 1-5.
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Add the `strategy` command family to the CLI reference**

Read `docs/AUTOFORGE_CLI_REFERENCE.md` and find the `## Memory and Planning` section (it currently ends with `autoforge planning handoff --schema`). Add a new section directly after it:

````markdown
## Strategy and Prioritization

```bash
autoforge strategy assess <work-id> --alignment <low|medium|high|uncertain> --value <low|medium|high|uncertain> --risk <low|medium|high|uncertain> --cost <low|medium|high|uncertain> --evidence-strength <low|medium|high|uncertain> --dependency-pressure <low|medium|high|uncertain> --complexity <low|medium|high|uncertain> --release-constraint <low|medium|high|uncertain> --decision <now|next|later|backlog> --rationale <text> [--evidence <evidence-id>] [--supersedes <strategy-id>]
autoforge strategy list [--decision <now|next|later|backlog>] [--work <work-id>]
autoforge strategy show <id>
autoforge strategy history <work-id>
```
````

`strategy assess` records an explainable, multi-factor judgment on any
feature, phase, task, or issue — no blended numeric score, only
categorical factors and a human-assigned `now`/`next`/`later`/`backlog`
decision label. Every assessment writes a linked decision record via
`autoforge decide`'s underlying service, so `autoforge why` also
surfaces strategy calls. `strategy assess` is independent from
`autoforge orchestrate prioritize`, which remains a narrow 0-100
scheduling tiebreaker for work already inside an active orchestration
plan.

````

This project's `CHANGELOG.md` entries between `<!-- autoforge:changelog:start -->` and `<!-- autoforge:changelog:end -->` are generated by `autoforge changelog compile`, which renders documented bugfix/feature-note decisions since the last release tag — confirmed by inspecting the `v0.22.0`/`v0.22.1` release commits, both plain `chore: bump version`/`chore: release` commits with no manual `CHANGELOG.md` edit alongside them. Do not hand-edit `CHANGELOG.md`. Task 7 below records a `feature-note` decision for each implementation task; those decisions are what `autoforge changelog compile` will pick up at actual release time.

- [ ] **Step 2: Typecheck and format**

Run: `./node_modules/.bin/prettier --check docs/AUTOFORGE_CLI_REFERENCE.md`
Expected: no errors (run `./node_modules/.bin/prettier --write` on the file if flagged)

- [ ] **Step 3: Run the full test suite one final time**

Run: `./node_modules/.bin/vitest run`
Expected: all tests pass (this is a documentation-only change, but running the full suite confirms no earlier task left a regression)

- [ ] **Step 4: Commit**

```bash
git add docs/AUTOFORGE_CLI_REFERENCE.md
git commit -m "docs: document the strategy command family

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
````

---

## Task 7: Record the AutoForge decision and register the work

This closes the loop with AutoForge's own governance, per this repository's own doctrine (every issue/task completion requires a linked decision record).

- [ ] **Step 1: Register the feature/phase/task in AutoForge's own work tracker**

```bash
autoforge --project "$PWD" add feature --name "Product Strategy and Prioritization Engine" --description "v0.23 north-star milestone: explainable, multi-factor strategy assessments with a human-assigned decision label, independent of orchestrate prioritize."
```

Note the returned `feature.<id>`, then:

```bash
autoforge --project "$PWD" add phase --feature <feature-id> --name "Strategy domain implementation" --description "Schema, store, service, CLI, and context integration for the strategy assessment domain."
```

Note the returned `phase.<id>`, then create one task per implementation task above (Tasks 1-6), each scoped to the files that task touches, e.g.:

```bash
autoforge --project "$PWD" add task --phase <phase-id> --name "Strategy schema, store, and service" --description "src/strategy/ module: schema, atomic-file store, and service with linked-decision writes." --include "src/strategy/**" --include "test/strategy-schemas.test.ts" --include "test/strategy-store.test.ts" --include "test/strategy-service.test.ts"

autoforge --project "$PWD" add task --phase <phase-id> --name "Strategy CLI command" --description "autoforge strategy assess/list/show/history, registered in the CLI router and help text." --include "src/commands/strategy.ts" --include "src/cli/index.ts" --include "src/cli/help.ts" --include "test/strategy-command.test.ts"

autoforge --project "$PWD" add task --phase <phase-id> --name "Strategy context packet integration" --description "Surface the active work item's active strategy assessment in context packets." --include "src/context/schemas.ts" --include "src/context/packet.ts" --include "src/commands/context.ts" --include "test/strategy-context.test.ts"

autoforge --project "$PWD" add task --phase <phase-id> --name "Strategy documentation" --description "Document the strategy command family in the CLI reference." --include "docs/AUTOFORGE_CLI_REFERENCE.md"
```

- [ ] **Step 2: Start and complete each task as it finishes**

As each of Tasks 1-6 above completes (ideally right after that task's own commit), run:

```bash
autoforge --project "$PWD" start task <task-id>
# ... (the task's implementation happens, already committed per its own steps)
autoforge --project "$PWD" decide --statement "<one-sentence statement of what this task implemented>" --reasoning "<why>" --consequence "<one-line consequence>" --scope strategy --keyword strategy --work <task-id> --kind feature-note
autoforge --project "$PWD" done
```

This mirrors how `issue.surface-evidence-in-why-search` and `issue.projects-list-json-output` were closed out earlier in this project's history — a decision linked to the work item, then `autoforge done`.

- [ ] **Step 3: Final verification**

```bash
autoforge --project "$PWD" recap
```

Expected: the new feature/phase/tasks show as `completed`, and `autoforge --project "$PWD" why --query strategy` surfaces the decisions recorded in Step 2 above.

---

## Plan Self-Review Notes

- **Spec coverage:** Data model (Task 1), store persistence location (Task 2), service linked-decision behavior including the "always link, no conditional logic" rule (Task 3), full CLI surface `assess`/`list`/`show`/`history` (Task 4), context packet integration (Task 5), and documentation impact (Task 6) are all covered. The design's "Out of Scope" items (no numeric score, no auto re-scoring, no autonomous ranking) are respected by omission — no task builds any of them.
- **Type consistency:** `StrategyFactors`, `StrategyDecision`, `StrategyAssessment`, `RecordStrategyAssessmentInput`, and `StrategyMutationResult` are defined once in Tasks 1 and 3 and referenced by exact name in every later task (4 and 5) — no renamed duplicates.
- **Verified during planning, not left as a runtime guess:** confirmed `WorkService` has no `startTask`/`createPhase`-then-`createTask` shortcut is unnecessary for this test — used `WorkService.createIssue()` + `runStartCommand({ args: ["issue", id], ... })` instead, matching the exact pattern in `test/start.test.ts`. Confirmed `LogWriter`'s exact two-method shape in `src/core/logger.ts`. Confirmed `CHANGELOG.md` entries are generated by `autoforge changelog compile` from linked decisions (not hand-authored per feature) by inspecting the `v0.22.0`/`v0.22.1` release commits — Task 6 no longer touches `CHANGELOG.md`.
