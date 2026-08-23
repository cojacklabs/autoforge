# Live Issue Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 4 genuinely-live defects/gaps found during backlog triage: missing `data`/`security` work kinds, silent planning-artifact overwrite, an inconsistent project-lifecycle mutation gate, and low-quality generated user-stories.

**Architecture:** Four independent, small changes with no shared code paths: (1) extend the shared vocabulary module plus workflow definitions and the readiness evidence-profile map; (2) change `PlanningArtifactStore`'s on-disk layout to namespace by source fingerprint, adding a `listVersions` method for `planning list`; (3) default new project registrations to `lifecycle: "active"` and add the fix command to the blocked-mutation error; (4) clean up the `user-stories` render template.

**Tech Stack:** TypeScript, Zod schemas, Vitest — no new dependencies.

## Global Constraints

- Every source and test file must pass `npm run format:check` (Prettier) before commit.
- Every task must leave `npm run typecheck` and `npm test` green — no unrelated regressions.
- `data`/`security` additions to `READINESS_WORK_KINDS` must keep `PROFILES` in `src/intent/readiness.ts` exhaustive — TypeScript's `Record<ReadinessWorkKind, ...>` will fail to compile otherwise; this is not optional cleanup, it is required for the build to pass.
- Planning-artifact namespacing is a clean break (no migration path) per the design spec — do not add backward-compatible flat-path reading.
- Each task closes its corresponding pre-existing AutoForge issue via `autoforge decide --work <issue-id> ...` followed by `autoforge done`, per the documentation gate shipped earlier this session — `done` will block without a linked decision.
- Exit codes must use the existing `EXIT_CODE` constants from `src/core/errors.ts` — no new exit codes.

---

### Task 1: Add `data` and `security` work kinds

**Files:**
- Modify: `src/core/vocabularies.ts`
- Modify: `src/workflows/definitions.ts`
- Modify: `src/intent/readiness.ts`
- Modify: `src/commands/intent.ts:28` (usage string)
- Test: `test/vocabularies.test.ts`
- Test: `test/workflow-definitions.test.ts`
- Test: `test/intent/readiness.test.ts`

**Interfaces:**
- Consumes: nothing new from other tasks (this task is fully self-contained).
- Produces: `READINESS_WORK_KINDS` gains `"data"` and `"security"`; `WORKFLOW_KINDS` gains `"data-change"` and `"security-change"`; `INTENT_TO_WORKFLOW_KINDS`/`WORKFLOW_KIND_ALIASES` map `data`→`data-change`, `security`→`security-change`; `PROFILES` in `readiness.ts` gains entries for both.

- [ ] **Step 1: Write the failing vocabularies test**

Add to `test/vocabularies.test.ts` (inside the existing `describe` block, after the existing two `it`s):

```typescript
it("includes data and security work kinds with dedicated workflow kinds", () => {
  expect(READINESS_WORK_KINDS).toContain("data");
  expect(READINESS_WORK_KINDS).toContain("security");
  expect(WORKFLOW_KINDS).toContain("data-change");
  expect(WORKFLOW_KINDS).toContain("security-change");
  expect(normalizeWorkflowKind("data")).toBe("data-change");
  expect(normalizeWorkflowKind("security")).toBe("security-change");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/vocabularies.test.ts`
Expected: FAIL — `READINESS_WORK_KINDS` does not contain `"data"`/`"security"` yet.

- [ ] **Step 3: Update `src/core/vocabularies.ts`**

```typescript
export const READINESS_WORK_KINDS = [
  "implementation",
  "research",
  "architecture",
  "design",
  "planning",
  "data",
  "security",
] as const;

export const WORKFLOW_KINDS = [
  "feature-development",
  "bug-fix",
  "research",
  "design-create",
  "design-critique",
  "architecture-change",
  "data-change",
  "security-change",
  "validation",
] as const;
```

Update `INTENT_TO_WORKFLOW_KINDS`:

```typescript
export const INTENT_TO_WORKFLOW_KINDS: Readonly<
  Record<ReadinessWorkKindVocabulary, readonly WorkflowKindVocabulary[]>
> = {
  implementation: ["feature-development", "bug-fix"],
  research: ["research"],
  architecture: ["architecture-change"],
  design: ["design-create", "design-critique"],
  planning: ["feature-development", "architecture-change", "design-create"],
  data: ["data-change"],
  security: ["security-change"],
};
```

Update `WORKFLOW_KIND_ALIASES`:

```typescript
const WORKFLOW_KIND_ALIASES: Readonly<
  Record<ReadinessWorkKindVocabulary, WorkflowKindVocabulary>
> = {
  implementation: "feature-development",
  research: "research",
  architecture: "architecture-change",
  design: "design-create",
  planning: "feature-development",
  data: "data-change",
  security: "security-change",
};
```

Update `workflowKindHelp()`:

```typescript
export function workflowKindHelp(): string {
  return `Valid workflow kinds: ${WORKFLOW_KINDS.join(", ")}. Intent aliases: architecture→architecture-change, design→design-create, implementation→feature-development, planning→feature-development, data→data-change, security→security-change.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/vocabularies.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck to find the now-required PROFILES fix**

Run: `npm run typecheck`
Expected: FAIL — `src/intent/readiness.ts`'s `PROFILES: Record<ReadinessWorkKind, ...>` is no longer exhaustive (missing `data` and `security` keys). This is expected; proceed to Step 6.

- [ ] **Step 6: Write the failing readiness test**

Add to `test/intent/readiness.test.ts`, inside the `describe` block:

```typescript
it("uses a distinct evidence profile for data work", () => {
  expect(
    evaluateReadiness(
      { ...base, constraints: ["Schema must be backward compatible."] },
      "data",
    ),
  ).toMatchObject({
    workKind: "data",
    level: "ready",
  });
});

it("uses a distinct evidence profile for security work", () => {
  expect(
    evaluateReadiness(
      { ...base, constraints: ["Must pass a security review."] },
      "security",
    ),
  ).toMatchObject({
    workKind: "security",
    level: "ready",
  });
});
```

- [ ] **Step 7: Update `PROFILES` and `FIELD_LABELS` in `src/intent/readiness.ts`**

Add to `PROFILES` (matching the `architecture` profile shape, since data and security both hinge on objective/requirements/constraints):

```typescript
const PROFILES: Record<ReadinessWorkKind, readonly EvidenceField[]> = {
  implementation: ["objective", "requirements", "acceptanceCriteria"],
  research: ["objective", "unknowns"],
  architecture: ["objective", "requirements", "constraints"],
  design: ["objective", "requirements", "acceptanceCriteria"],
  planning: ["objective", "requirements"],
  data: ["objective", "requirements", "constraints"],
  security: ["objective", "requirements", "constraints"],
};
```

`FIELD_LABELS` requires no change — `objective`, `requirements`, `constraints` already have labels.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run test/intent/readiness.test.ts test/vocabularies.test.ts`
Expected: PASS.

- [ ] **Step 9: Run typecheck to confirm PROFILES is exhaustive**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 10: Write the failing workflow-definitions test**

Add to `test/workflow-definitions.test.ts`:

```typescript
it("registers data-change and security-change with an implementation stage", () => {
  const dataChange = getWorkflowDefinition("data-change");
  expect(dataChange.stages.map((stage) => stage.id)).toEqual([
    "research",
    "planning",
    "implementation",
    "validation",
  ]);
  expect(
    dataChange.stages.find((stage) => stage.id === "research")?.required,
  ).toBe(false);
  expect(
    dataChange.stages.filter((stage) => stage.id !== "research"),
  ).toSatisfy((stages: { required: boolean }[]) =>
    stages.every((stage) => stage.required),
  );

  const securityChange = getWorkflowDefinition("security-change");
  expect(securityChange.stages.map((stage) => stage.id)).toEqual([
    "research",
    "planning",
    "implementation",
    "validation",
  ]);
});
```

Also update the existing `"registers every v0.9 core workflow"` test's exact-order array to include the two new kinds in the position they'll be added (immediately after `architecture-change`, matching `WORKFLOW_KINDS`'s declaration order from Step 3):

```typescript
expect(
  listWorkflowDefinitions().map((definition) => definition.kind),
).toEqual([
  "feature-development",
  "bug-fix",
  "research",
  "design-create",
  "design-critique",
  "architecture-change",
  "data-change",
  "security-change",
  "validation",
]);
```

- [ ] **Step 11: Run test to verify it fails**

Run: `npx vitest run test/workflow-definitions.test.ts`
Expected: FAIL — `getWorkflowDefinition("data-change")` returns `undefined` (no matching definition yet), and the exact-order test fails since the two new kinds aren't registered.

- [ ] **Step 12: Add the two definitions in `src/workflows/definitions.ts`**

Insert into the `definitions` array, immediately after the `"architecture-change"` entry and before `"validation"`:

```typescript
{
  kind: "data-change",
  version: "0.9.0",
  description: "Design, migrate, and validate a data model or schema change.",
  stages: [
    { id: "research", label: "Research", required: false },
    { id: "planning", label: "Planning", required: true },
    { id: "implementation", label: "Implementation", required: true },
    { id: "validation", label: "Validation", required: true },
  ],
},
{
  kind: "security-change",
  version: "0.9.0",
  description: "Design, implement, and validate a security or authorization change.",
  stages: [
    { id: "research", label: "Research", required: false },
    { id: "planning", label: "Planning", required: true },
    { id: "implementation", label: "Implementation", required: true },
    { id: "validation", label: "Validation", required: true },
  ],
},
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npx vitest run test/workflow-definitions.test.ts`
Expected: PASS.

- [ ] **Step 14: Update the `intent assess` usage string**

In `src/commands/intent.ts`, line 28, change:

```typescript
"Usage: autoforge intent assess <json-file> --kind <implementation|research|architecture|design|planning> [--artifact <kind>] [--persist]",
```

to:

```typescript
"Usage: autoforge intent assess <json-file> --kind <implementation|research|architecture|design|planning|data|security> [--artifact <kind>] [--persist]",
```

- [ ] **Step 15: Audit `src/orchestration/context.ts`'s `workflowKind()` for a needed role mapping**

Read the function (around line 73-79). It maps `OrchestrationNode.stage`/`.role` to a `WorkflowKind`, not `ReadinessWorkKind` — confirm `data`/`security` are not among the defined `OrchestrationRole` values (`product`, `architecture`, `design`, `frontend`, `backend`, `security`, `qa`, `research`, `general` — check `src/orchestration/schemas.ts` for the authoritative list). Note that `"security"` already exists as an orchestration **role** distinct from the new `ReadinessWorkKind`. Since this function has no `role === "security"` branch today and the design spec says this may be a no-op, verify by reading only — do not add a branch unless `npm test` surfaces a real failure tied to this function after Step 16's full-suite run. If no failure appears, leave `workflowKind()` unchanged and note that explicitly in your task report.

- [ ] **Step 16: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: all clean. If `format:check` fails, run `npx prettier --write <listed files>` and re-check.

- [ ] **Step 17: Live CLI smoke test**

```bash
npm run build
cd /tmp && rm -rf af-datasec-smoke && mkdir af-datasec-smoke && cd af-datasec-smoke && git init -q
ABS_BIN="/Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge/bin/autoforge.js"
node "$ABS_BIN" init
echo '{"raw":"Add a users table.","objective":"Store user records.","requirements":["Email must be unique."],"assumptions":[],"unknowns":[],"constraints":["Must support migration rollback."],"acceptanceCriteria":["Schema is reviewed."]}' > intent.json
node "$ABS_BIN" intent assess intent.json --kind data
node "$ABS_BIN" workflow start run.data-smoke data-change
cd /Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge
rm -rf /tmp/af-datasec-smoke
```

Expected: `intent assess` succeeds with `workKind: "data"`; `workflow start` succeeds and prints a run with stages `research, planning, implementation, validation`.

- [ ] **Step 18: Close the corresponding issue**

```bash
node bin/autoforge.js start issue issue.add-data-and-security-work-kinds-to-intent-and-workflow
node bin/autoforge.js decide \
  --statement "Added dedicated data and security work kinds to the shared intent/workflow vocabulary" \
  --reasoning "Bootstrap's gate list requires data and security artifacts but no correctly-labeled intent or workflow kind existed for either; users had to mislabel this work as architecture." \
  --consequence "READINESS_WORK_KINDS and WORKFLOW_KINDS gained data/data-change and security/security-change; both have dedicated workflow definitions with research(optional)->planning->implementation->validation(required) stages." \
  --scope "intent" --scope "workflow" --keyword "data" --keyword "security" \
  --work issue.add-data-and-security-work-kinds-to-intent-and-workflow \
  --kind bugfix
node bin/autoforge.js done
```

- [ ] **Step 19: Commit**

```bash
git add src/core/vocabularies.ts src/workflows/definitions.ts src/intent/readiness.ts src/commands/intent.ts test/vocabularies.test.ts test/workflow-definitions.test.ts test/intent/readiness.test.ts
git commit -m "feat: add data and security work kinds to intent/workflow vocabulary"
```

---

### Task 2: Namespace persisted planning artifacts by source fingerprint

**Files:**
- Modify: `src/planning/store.ts`
- Modify: `src/commands/planning.ts`
- Test: `test/planning/store.test.ts`
- Test: `test/planning-command.test.ts`

**Interfaces:**
- Consumes: `PlanningArtifact` (`sourceFingerprint`, `generatedAt`, `kind` fields) from `src/planning/artifacts.js` — unchanged from Task 1's scope, no dependency on Task 1.
- Produces: `PlanningArtifactStore.write()` returns a fingerprint-namespaced relative path; `PlanningArtifactStore.read(kind, fingerprint?)` — `fingerprint` is a new optional second parameter; new method `PlanningArtifactStore.listVersions(kind): Promise<PlanningArtifact[]>` returning every stored version of a kind, newest first by `generatedAt`.

- [ ] **Step 1: Write the failing store tests**

Replace the first test in `test/planning/store.test.ts` (the path-assertion changes) and add new ones. Full replacement content for the file:

```typescript
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { generatePlanningArtifact } from "../../src/planning/artifacts.js";
import { PlanningArtifactStore } from "../../src/planning/store.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const baseIntent = {
  raw: "Build checkout.",
  objective: "Allow payment.",
  requirements: ["Support cards"],
  assumptions: [],
  unknowns: [],
  constraints: [],
  acceptanceCriteria: [],
};

describe("planning artifact store", () => {
  it("persists to a fingerprint-namespaced path, reads, and checks freshness", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const artifact = generatePlanningArtifact(baseIntent, "feature-brief");
    const store = new PlanningArtifactStore(projectRoot);
    const writtenPath = await store.write(artifact);
    expect(writtenPath).toBe(
      `.autoforge/planning/feature-brief/${artifact.sourceFingerprint}.json`,
    );
    await expect(store.read("feature-brief")).resolves.toEqual(artifact);
    await expect(
      store.read("feature-brief", artifact.sourceFingerprint),
    ).resolves.toEqual(artifact);
    await expect(
      store.isFresh("feature-brief", artifact.sourceFingerprint),
    ).resolves.toBe(true);
    await expect(store.isFresh("feature-brief", "0".repeat(64))).resolves.toBe(
      false,
    );
  });

  it("returns null when an artifact kind has not been generated", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    await expect(store.read("feature-brief")).resolves.toBeNull();
    await expect(
      store.read("feature-brief", "0".repeat(64)),
    ).resolves.toBeNull();
    await expect(
      store.isFresh("feature-brief", "0".repeat(64)),
    ).resolves.toBe(false);
  });

  it("does not overwrite a prior artifact of the same kind with a different source", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    const first = generatePlanningArtifact(
      baseIntent,
      "feature-brief",
      new Date("2026-08-22T00:00:00.000Z"),
    );
    const second = generatePlanningArtifact(
      { ...baseIntent, objective: "Allow refunds." },
      "feature-brief",
      new Date("2026-08-22T01:00:00.000Z"),
    );
    await store.write(first);
    await store.write(second);
    await expect(
      store.read("feature-brief", first.sourceFingerprint),
    ).resolves.toEqual(first);
    await expect(
      store.read("feature-brief", second.sourceFingerprint),
    ).resolves.toEqual(second);
  });

  it("read without a fingerprint returns the most recently generated version", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    const older = generatePlanningArtifact(
      baseIntent,
      "feature-brief",
      new Date("2026-08-22T00:00:00.000Z"),
    );
    const newer = generatePlanningArtifact(
      { ...baseIntent, objective: "Allow refunds." },
      "feature-brief",
      new Date("2026-08-22T02:00:00.000Z"),
    );
    await store.write(older);
    await store.write(newer);
    await expect(store.read("feature-brief")).resolves.toEqual(newer);
  });

  it("listVersions returns every stored version of a kind, newest first", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    const older = generatePlanningArtifact(
      baseIntent,
      "feature-brief",
      new Date("2026-08-22T00:00:00.000Z"),
    );
    const newer = generatePlanningArtifact(
      { ...baseIntent, objective: "Allow refunds." },
      "feature-brief",
      new Date("2026-08-22T02:00:00.000Z"),
    );
    await store.write(older);
    await store.write(newer);
    await expect(store.listVersions("feature-brief")).resolves.toEqual([
      newer,
      older,
    ]);
  });

  it("listVersions returns an empty array for an ungenerated kind", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    await expect(store.listVersions("feature-brief")).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/planning/store.test.ts`
Expected: FAIL — `write()` still returns the old flat path; `read(kind, fingerprint)` doesn't accept a second argument; `listVersions` doesn't exist.

- [ ] **Step 3: Rewrite `src/planning/store.ts`**

```typescript
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { planningArtifactSchema, type PlanningArtifact } from "./artifacts.js";

export const DEFAULT_PLANNING_DIRECTORY = ".autoforge/planning";

export class PlanningArtifactStore {
  private readonly projectRoot: string;
  private readonly directory: string;

  constructor(projectRoot: string, directory = DEFAULT_PLANNING_DIRECTORY) {
    this.projectRoot = projectRoot;
    this.directory = path.join(projectRoot, directory);
  }

  private kindDirectory(kind: PlanningArtifact["kind"]): string {
    return path.join(this.directory, kind);
  }

  private filePath(
    kind: PlanningArtifact["kind"],
    sourceFingerprint: string,
  ): string {
    return path.join(this.kindDirectory(kind), `${sourceFingerprint}.json`);
  }

  async write(artifact: PlanningArtifact): Promise<string> {
    const validated = planningArtifactSchema.parse(artifact);
    const kindDirectory = this.kindDirectory(validated.kind);
    await mkdir(kindDirectory, { recursive: true });
    const destination = this.filePath(
      validated.kind,
      validated.sourceFingerprint,
    );
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(
      temporary,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporary, destination);
    return path
      .relative(this.projectRoot, destination)
      .replaceAll(path.sep, "/");
  }

  async listVersions(
    kind: PlanningArtifact["kind"],
  ): Promise<PlanningArtifact[]> {
    let entries: string[];
    try {
      entries = await readdir(this.kindDirectory(kind));
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return [];
      }
      throw error;
    }
    const artifacts = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) =>
          planningArtifactSchema.parse(
            JSON.parse(
              await readFile(
                path.join(this.kindDirectory(kind), entry),
                "utf8",
              ),
            ) as unknown,
          ),
        ),
    );
    return artifacts.sort(
      (a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt),
    );
  }

  async read(
    kind: PlanningArtifact["kind"],
    sourceFingerprint?: string,
  ): Promise<PlanningArtifact | null> {
    if (sourceFingerprint) {
      try {
        return planningArtifactSchema.parse(
          JSON.parse(
            await readFile(this.filePath(kind, sourceFingerprint), "utf8"),
          ) as unknown,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return null;
        }
        throw error;
      }
    }
    const versions = await this.listVersions(kind);
    return versions[0] ?? null;
  }

  async isFresh(
    kind: PlanningArtifact["kind"],
    sourceFingerprint: string,
  ): Promise<boolean> {
    const artifact = await this.read(kind, sourceFingerprint);
    return artifact?.sourceFingerprint === sourceFingerprint;
  }
}
```

Note: `isFresh` now reads the exact fingerprinted file directly (via the new `sourceFingerprint` parameter to `read`) rather than reading "the latest" and comparing — this is a behavior improvement, not just a refactor: previously, if a newer artifact of the same kind existed, `isFresh` would compare against the wrong (most recent, not the one being asked about) artifact. Confirm this against the existing "detects stale artifacts" test in `test/planning/artifacts.test.ts` (that test uses `isPlanningArtifactFresh` from `artifacts.ts`, a different, pure function — unaffected by this change).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/planning/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing command test for `planning list`**

Add to `test/planning-command.test.ts` (inspect the file's existing fixture pattern first — it uses `initializeProject`/`mkdtemp` per-test, matching the pattern already used elsewhere in the file):

```typescript
it("lists every stored version per kind, not just the latest", async () => {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-planning-versions-"),
  );
  directories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const store = new PlanningArtifactStore(projectRoot);
  const older = generatePlanningArtifact(
    intent,
    "feature-brief",
    new Date("2026-08-22T00:00:00.000Z"),
  );
  const newer = generatePlanningArtifact(
    { ...intent, objective: "Allow refunds." },
    "feature-brief",
    new Date("2026-08-22T01:00:00.000Z"),
  );
  await store.write(older);
  await store.write(newer);
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runPlanningCommand({
      args: ["list"],
      output,
      startDirectory: projectRoot,
    }),
  ).resolves.toBe(EXIT_CODE.success);
  const rows = JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "[]");
  const featureBriefRows = rows.filter(
    (row: { kind: string }) => row.kind === "feature-brief",
  );
  expect(featureBriefRows).toHaveLength(2);
  expect(
    featureBriefRows.map((row: { sourceFingerprint: string }) =>
      row.sourceFingerprint,
    ),
  ).toEqual(
    expect.arrayContaining([
      older.sourceFingerprint,
      newer.sourceFingerprint,
    ]),
  );
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run test/planning-command.test.ts`
Expected: FAIL — `planning list` currently returns one row per kind (not per version), so `featureBriefRows` has length 1.

- [ ] **Step 7: Update `runPlanningCommand`'s list loop in `src/commands/planning.ts`**

Replace the `list`-branch loop (currently `for (const kind of KINDS) { const artifact = await store.read(kind); ... }`) with:

```typescript
const artifacts = [];
for (const kind of KINDS) {
  const versions = await store.listVersions(kind);
  for (const artifact of versions) {
    artifacts.push({
      kind,
      sourceFingerprint: artifact.sourceFingerprint,
      generatedAt: artifact.generatedAt,
      fresh: intent
        ? await store.isFresh(kind, artifact.sourceFingerprint)
        : null,
    });
  }
}
options.output.stdout(JSON.stringify(artifacts, null, 2));
return EXIT_CODE.success;
```

The `show` and `handoff` branches keep calling `store.read(kind)` unchanged — both correctly get "the latest" per the design's "most recent wins" default, no fingerprint argument needed there.

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run test/planning-command.test.ts`
Expected: PASS.

- [ ] **Step 9: Full regression check**

Run: `npm run typecheck && npm test`
Expected: clean. Pay particular attention to `test/planning-command.test.ts`'s existing `"lists artifacts and reports freshness"` test — it asserts `toHaveLength(1)` on a single-artifact list; confirm it still passes since only one version exists in that test's fixture (it should, since the new loop still produces one row when only one version exists per kind).

- [ ] **Step 10: Live CLI smoke test**

```bash
npm run build
cd /tmp && rm -rf af-planning-smoke && mkdir af-planning-smoke && cd af-planning-smoke && git init -q
ABS_BIN="/Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge/bin/autoforge.js"
node "$ABS_BIN" init
echo '{"raw":"Add checkout.","objective":"Allow card payments.","requirements":["Support cards"],"assumptions":[],"unknowns":[],"constraints":[],"acceptanceCriteria":[]}' > intent1.json
echo '{"raw":"Add refunds.","objective":"Allow refunds.","requirements":["Support refunds"],"assumptions":[],"unknowns":[],"constraints":[],"acceptanceCriteria":[]}' > intent2.json
node "$ABS_BIN" intent assess intent1.json --kind implementation --artifact feature-brief --persist
node "$ABS_BIN" intent assess intent2.json --kind implementation --artifact feature-brief --persist
find .autoforge/planning -type f
node "$ABS_BIN" planning list
cd /Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge
rm -rf /tmp/af-planning-smoke
```

Expected: `find` shows two separate `.json` files under `.autoforge/planning/feature-brief/` (not one overwriting the other); `planning list` shows two `feature-brief` rows.

- [ ] **Step 11: Close the corresponding issue**

```bash
node bin/autoforge.js start issue issue.namespace-persisted-planning-artifacts-to-avoid-silent-overwrite
node bin/autoforge.js decide \
  --statement "Persisted planning artifacts are now namespaced by source fingerprint instead of a flat kind-only path" \
  --reasoning "intent assess --artifact <kind> --persist previously wrote to a fixed .autoforge/planning/<kind>.json path, silently overwriting any prior artifact of the same kind with no warning." \
  --consequence "PlanningArtifactStore stores artifacts at .autoforge/planning/<kind>/<sourceFingerprint>.json; read(kind) with no fingerprint returns the most recent version; a new listVersions(kind) method and updated planning list surface every stored version." \
  --scope "planning" --keyword "namespacing" --keyword "data-loss" \
  --work issue.namespace-persisted-planning-artifacts-to-avoid-silent-overwrite \
  --kind bugfix
node bin/autoforge.js done
```

- [ ] **Step 12: Commit**

```bash
git add src/planning/store.ts src/commands/planning.ts test/planning/store.test.ts test/planning-command.test.ts
git commit -m "fix: namespace persisted planning artifacts by source fingerprint"
```

---

### Task 3: Fix the `use` command project lifecycle mutation gate

**Files:**
- Modify: `src/workspace/global-store.ts`
- Modify: `src/cli/index.ts`
- Test: `test/global-workspace-store.test.ts`
- Test: `test/project-lifecycle.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `GlobalWorkspaceStore.registerProject()` sets `lifecycle: "active"` on new registrations. The blocked-mutation stderr message in `src/cli/index.ts` gains the fix command.

- [ ] **Step 1: Write the failing store test**

Add to `test/global-workspace-store.test.ts`, inside the `describe("global workspace store", ...)` block. This file's existing pattern (see the `"registers projects in a user-scoped config"` test) creates a temp home via `mkdtemp`, pushes it to the shared `directories` array for cleanup, and constructs `new GlobalWorkspaceStore(home)`:

```typescript
it("registers a new project with an explicit active lifecycle", async () => {
  const home = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-global-workspace-"),
  );
  directories.push(home);
  const store = new GlobalWorkspaceStore(home);
  await store.registerProject("/tmp/project-lifecycle-check");
  const config = await store.read();
  expect(
    config.projectMetadata?.[path.resolve("/tmp/project-lifecycle-check")]
      ?.lifecycle,
  ).toBe("active");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/global-workspace-store.test.ts`
Expected: FAIL — `lifecycle` is `undefined` on a freshly registered project.

- [ ] **Step 3: Update `registerProject` in `src/workspace/global-store.ts`**

In the `projectMetadata` object construction (around line 159-166):

```typescript
const projectMetadata = {
  ...(current.projectMetadata ?? {}),
  [project]: {
    name: path.basename(project),
    lastSeen: new Date().toISOString(),
    ...(projectId ? { projectId } : {}),
  },
};
```

Note this replaces the entire `[project]` entry on every call, including re-registration — an existing `lifecycle` (or any other previously-set field, e.g. `aliases`) set by a prior `projects update` is already silently dropped on re-registration today, independent of this fix. That pre-existing behavior is out of scope for this task (the spec asks only for a default on first registration, not a general re-registration-preserves-metadata fix) — do not expand scope to fix it here, but do preserve `lifecycle` specifically since that is exactly this task's ask:

```typescript
const existing = current.projectMetadata?.[project];
const projectMetadata = {
  ...(current.projectMetadata ?? {}),
  [project]: {
    name: path.basename(project),
    lastSeen: new Date().toISOString(),
    lifecycle: existing?.lifecycle ?? ("active" as const),
    ...(projectId ? { projectId } : {}),
  },
};
```

Verify against the existing `"registers projects in a user-scoped config"` test in `test/global-workspace-store.test.ts` — it re-registers `/tmp/project-a` a second time implicitly is NOT what that test does (it registers `-b` then `-a`, both once); confirm no existing test re-registers the same path twice, and if the full-suite run in Step 10 surfaces one that does, follow its existing expectations rather than changing them, since fixing pre-existing field-drop-on-reregistration is out of scope here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/global-workspace-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing project-lifecycle test for the error message**

Add to `test/project-lifecycle.test.ts`:

```typescript
it("treats an undefined lifecycle as blocked, distinct from active", () => {
  const metadata = {
    name: "project",
    lastSeen: "2026-08-22T12:00:00.000Z",
  };
  expect(projectMutationBlocked("add", metadata)).toBe(true);
});
```

(This documents the current, still-correct enforcement behavior for a project with no lifecycle set at all — Step 3's fix prevents *new* registrations from ever reaching this state, but the gate itself must still safely handle a metadata record with no lifecycle field for defense in depth, e.g. from a project registered by an older AutoForge version before this fix existed.)

- [ ] **Step 6: Run test to verify it passes as-is**

Run: `npx vitest run test/project-lifecycle.test.ts`
Expected: PASS — this test documents existing, unchanged `projectMutationBlocked` behavior; no source change needed for this specific test, it is a regression guard.

- [ ] **Step 7: Update the blocked-mutation error message in `src/cli/index.ts`**

Around line 129-133, change:

```typescript
if (projectMutationBlocked(cliArgs[0], projectMetadata)) {
  output.stderr(
    `Project lifecycle is ${projectMetadata?.lifecycle}; mutating command "${cliArgs[0]}" is blocked.`,
  );
  return EXIT_CODE.invalidState;
}
```

to:

```typescript
if (projectMutationBlocked(cliArgs[0], projectMetadata)) {
  output.stderr(
    `Project lifecycle is ${projectMetadata?.lifecycle}; mutating command "${cliArgs[0]}" is blocked. Run 'autoforge projects update ${startDirectory} --lifecycle active' to allow mutations.`,
  );
  return EXIT_CODE.invalidState;
}
```

- [ ] **Step 8: No unit test for the `main()` error-message text — documented reason**

`grep -rl "mutating command" test/` currently returns no matches: the blocked-mutation error message in `src/cli/index.ts`'s `main()` has never been unit-tested, because `main()` hardcodes `new GlobalWorkspaceStore()` with no home-directory override (lines 97 and 129), and no test in this suite mocks `os.homedir()`. Refactoring `main()` to accept an injectable store is out of scope for this fix (the ask is a one-line message change, not a testability refactor). Verify the new message text via the Step 11 live CLI smoke test instead, which exercises the real global store end-to-end. Do not add a new `os.homedir()` mocking pattern to the suite for this alone — note this as an intentional scope boundary in your task report.

- [ ] **Step 9: (skipped — see Step 8)**

- [ ] **Step 10: Full regression check**

Run: `npm run typecheck && npm test`
Expected: clean.

- [ ] **Step 11: Live CLI smoke test**

This smoke test registers and unregisters a project in the REAL global AutoForge registry on this machine (`main()` has no home-directory override — see Step 8). Always detach before removing the directory, and detach again at the end even if an earlier step fails, so no stale entry is left behind.

```bash
npm run build
cd /tmp && rm -rf af-lifecycle-smoke && mkdir af-lifecycle-smoke && cd af-lifecycle-smoke && git init -q
ABS_BIN="/Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge/bin/autoforge.js"
SMOKE_DIR="$(pwd)"
node "$ABS_BIN" init
node "$ABS_BIN" projects register "$SMOKE_DIR"
node "$ABS_BIN" projects show "$SMOKE_DIR" --json
cd /Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge
node bin/autoforge.js use af-lifecycle-smoke recap 2>&1 || true
node bin/autoforge.js detach "$SMOKE_DIR" 2>&1 || true
rm -rf "$SMOKE_DIR"
```

Expected: `projects show --json` reports `"lifecycle": "active"` immediately after registration (no manual `--lifecycle active` step needed); a mutating command via `use` against it does not report a blocked-lifecycle error. Confirm cleanup: `node bin/autoforge.js projects list` afterward should not list the smoke-test directory.

- [ ] **Step 12: Close the corresponding issue**

```bash
node bin/autoforge.js start issue issue.clarify-use-command-project-lifecycle-mutation-gate
node bin/autoforge.js decide \
  --statement "Newly registered projects now default to an active lifecycle, and the mutation-blocked error names the exact fix command" \
  --reasoning "registerProject left lifecycle undefined, which projectMutationBlocked treats as blocked while projects list/show already displayed it as active -- an undiscoverable, inconsistent trap that silently blocked every mutating use command against a freshly attached project." \
  --consequence "registerProject sets lifecycle: active on first registration (preserving an existing explicit lifecycle on re-registration); the blocked-command stderr message now includes the exact autoforge projects update --lifecycle active fix." \
  --scope "workspace" --keyword "lifecycle" --keyword "use-command" \
  --work issue.clarify-use-command-project-lifecycle-mutation-gate \
  --kind bugfix
node bin/autoforge.js done
```

- [ ] **Step 13: Commit**

```bash
git add src/workspace/global-store.ts src/cli/index.ts test/global-workspace-store.test.ts test/project-lifecycle.test.ts
git commit -m "fix: default new project registrations to an active lifecycle"
```

---

### Task 4: Clean up generated user-stories template quality

**Files:**
- Modify: `src/planning/artifacts.ts`
- Test: `test/planning/artifacts.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: no signature change — `render()`'s `"user-stories"` case output format changes only.

- [ ] **Step 1: Write the failing tests**

Add to `test/planning/artifacts.test.ts` (inside the existing `describe` block):

```typescript
it("preserves leading acronyms instead of lowercasing them", () => {
  const content = generatePlanningArtifact(
    { ...intent, requirements: ["API rate limiting must be enforced."] },
    "user-stories",
  ).content;
  expect(content).toContain("As a user, I want API rate limiting must be enforced.");
});

it("does not double punctuation when a requirement already ends with one", () => {
  const content = generatePlanningArtifact(
    { ...intent, requirements: ["Support cards."] },
    "user-stories",
  ).content;
  expect(content).toContain("As a user, I want support cards.");
  expect(content).not.toContain("support cards..");
});

it("states the shared objective clause once, not per requirement line", () => {
  const content = generatePlanningArtifact(
    {
      ...intent,
      requirements: ["Support cards", "Record payment status"],
    },
    "user-stories",
  ).content;
  const occurrences = content.split("so the stated objective is achieved").length - 1;
  expect(occurrences).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/planning/artifacts.test.ts`
Expected: FAIL — current template lowercases the entire string (`"api rate limiting..."`), appends the phrase per-line (`occurrences` would be 2, not ≤1), and would double a trailing period.

- [ ] **Step 3: Update the `"user-stories"` case in `src/planning/artifacts.ts`**

Add two small helpers above `render()`:

```typescript
function toStoryFragment(requirement: string): string {
  const trimmed = requirement.trim().replace(/[.!?]+$/, "");
  const [firstWord] = trimmed.split(/\s+/, 1);
  const looksLikeAcronym =
    firstWord !== undefined &&
    firstWord.length > 1 &&
    firstWord === firstWord.toUpperCase();
  if (looksLikeAcronym || trimmed.length === 0) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}
```

Replace the `"user-stories"` case:

```typescript
case "user-stories": {
  if (intent.requirements.length === 0) {
    return "# User Stories\n\n- User stories require structured requirements.";
  }
  const stories = intent.requirements
    .map((requirement) => `- As a user, I want ${toStoryFragment(requirement)}.`)
    .join("\n");
  return `# User Stories\n\nEach story below works toward: ${objective}\n\n${stories}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/planning/artifacts.test.ts`
Expected: PASS, including the pre-existing `"generates specialized stories and criteria without a monolith"` test — confirm `"As a user, I want support cards"` (lowercase `s`, since `"Support"` is not all-caps) still matches; it should, since `toStoryFragment("Support cards")` lowercases only the leading `S`.

- [ ] **Step 5: Full regression check**

Run: `npm run typecheck && npm run format:check && npm test`
Expected: clean.

- [ ] **Step 6: Live CLI smoke test**

```bash
npm run build
cd /tmp && rm -rf af-stories-smoke && mkdir af-stories-smoke && cd af-stories-smoke && git init -q
ABS_BIN="/Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge/bin/autoforge.js"
node "$ABS_BIN" init
echo '{"raw":"Add rate limiting.","objective":"Protect the API from abuse.","requirements":["API rate limiting must be enforced.","Log rejected requests"],"assumptions":[],"unknowns":[],"constraints":[],"acceptanceCriteria":[]}' > intent.json
node "$ABS_BIN" intent assess intent.json --kind implementation --artifact user-stories
cd /Users/coltonajackson/Code/Freelancing/cojacklabs/autoforge
rm -rf /tmp/af-stories-smoke
```

Expected: output content shows `API` preserved uppercase, no doubled punctuation, and the "works toward" objective line appears once at the top rather than repeated per bullet.

- [ ] **Step 7: Close the corresponding issue**

```bash
node bin/autoforge.js start issue issue.improve-generated-user-stories-artifact-quality
node bin/autoforge.js decide \
  --statement "Generated user-stories artifacts no longer mangle acronyms or repeat the objective clause on every line" \
  --reasoning "The prior template called toLowerCase() on the full requirement string, destroying leading acronyms/proper nouns, and appended a generic so the stated objective is achieved phrase verbatim to every single requirement line, producing barely grammatical boilerplate." \
  --consequence "The user-stories template now lowercases only a non-acronym leading word, strips redundant trailing punctuation before appending a period, and states the shared objective once in a header line instead of once per story. Actor extraction and compound-requirement splitting remain explicitly out of scope as a separate, harder NLP problem." \
  --scope "planning" --keyword "user-stories" --keyword "template-quality" \
  --work issue.improve-generated-user-stories-artifact-quality \
  --kind bugfix
node bin/autoforge.js done
```

- [ ] **Step 8: Commit**

```bash
git add src/planning/artifacts.ts test/planning/artifacts.test.ts
git commit -m "fix: improve generated user-stories template quality"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (data/security kinds) → Task 1, including the required `PROFILES` exhaustiveness fix the spec's own text flagged as an audit item. §2 (planning namespacing) → Task 2, including the "most recent wins" read default and the `planning list` full-history change. §3 (lifecycle gate) → Task 3, both the register-time default and the improved error message. §4 (user-stories quality) → Task 4, scoped exactly to template cleanup with no actor-extraction/splitting attempted. Testing section requirements are covered 1:1 by each task's test steps. Rollout section (issue-closing via the documentation gate) → the final steps of every task.
- **Type consistency:** `data`/`security`/`data-change`/`security-change` string literals are identical across Task 1's vocabularies.ts, definitions.ts, and readiness.ts changes. `PlanningArtifactStore.read(kind, sourceFingerprint?)` signature in Task 2 is used consistently by both the rewritten `isFresh` and the command-layer callers, none of which needed to change their `read(kind)` call shape.
- **Placeholder scan:** no TBD/TODO; every step has complete code or an exact command with expected output. Step 15 of Task 1 and the aliases-preservation logic in Task 3 Step 3 are conditional audits with an explicit fallback instruction, not open-ended placeholders — each names precisely what to check and what to do based on the result.
