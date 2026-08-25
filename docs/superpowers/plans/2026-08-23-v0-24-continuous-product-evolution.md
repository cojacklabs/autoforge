# v0.24 Continuous Product Evolution Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the north-star's v0.24 loop by (1) wiring governance, domain, design specifications, strategy assessments, and traceability into the digital twin's projection, giving it dedicated `phase`/`task`/`issue` node types to free `flow`/`risk` for their real design/risk meanings, and (2) surfacing validation-gate evidence in `autoforge why`.

**Architecture:** Every domain this plan touches already exists and is fully built — this is pure additive wiring into two existing integration points: `src/twin/from-state.ts` (the pure function that turns durable state into a twin graph) and `src/commands/why.ts` (the decision-search formatter). No new commands, no new stores, no new schemas beyond extending `twinNodeTypeSchema`'s enum and `TwinStateInput`'s optional fields.

**Tech Stack:** TypeScript, Zod schemas, Vitest, the existing `AtomicStateStore`/single-file-store patterns already used by every domain this plan reads from.

## Global Constraints

- Every new `TwinStateInput` field (`constitution`, `domain`, `specifications`, `strategy`, `traceability`, `validationEvidence`) must be optional; `projectStateToTwin` must treat an absent/null/empty input as "contribute zero nodes/edges," never throwing — matches every existing optional-domain pattern in this codebase.
- `buildTwinProjection` (`src/twin/projection.ts`) already filters out any edge whose `sourceId`/`targetId` is not present in the final node set (confirmed: lines 25-30 of that file). New projection code must rely on this existing filter rather than re-implementing "does this target node exist" checks — produce candidate edges freely; do not hand-write existence guards for `traceability`/`validation-evidence` edges.
- `twinNodeTypeSchema`'s new `"phase"`/`"task"`/`"issue"` values replace the current reused `"flow"`/`"work"`/`"risk"` labels for `WorkState` phases/tasks/issues respectively. `"risk"` and `"work"` are removed entirely from the enum (confirmed via `grep -rn '"risk"\|"work"' src/twin/` that no other code references these as twin node types).
- No new `autoforge` CLI commands. `autoforge twin generate/show/query` and `autoforge why` gain new data, not new flags (except none — `why` needs zero new flags, since the validation-evidence link is derived by matching `workId`, not a new query parameter).
- `autoforge gate check` must NOT be modified to auto-write a decision — this is an explicit out-of-scope item from the design spec, matching the v0.23 precedent that routine activity should not be forced into becoming a durable decision.
- Run `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/prettier --check <changed files>` before every commit — trust the local binary directly, not `npx` (this repo's `npx` wrapper can report a misleading exit code with no actual output).

---

## File Structure

```
src/twin/
  schemas.ts        — modify: extend twinNodeTypeSchema enum
  from-state.ts      — modify: TwinStateInput gains 6 optional fields; projectStateToTwin projects each
  projection.ts      — not modified (existing edge-filtering already handles unmodeled-node references)
  query.ts           — not modified (already generic over any TwinNodeType)

src/commands/
  twin.ts            — modify: generate action reads 6 additional stores, passes through to projectStateToTwin
  why.ts             — modify: runWhyCommand reads ValidationEvidenceStore, formatDecisionMatches gains a Validation: line

test/
  twin-schemas.test.ts       — modify: add new node-type acceptance assertions
  twin-from-state.test.ts    — modify: add one test per new input type (present + absent cases)
  twin-command.test.ts       — modify: add one integration test proving the new domains reach the CLI-level generated projection
  why.test.ts                — modify: add validation-evidence surfacing tests
```

---

## Task 1: Twin node-type schema — rename and extend

**Files:**

- Modify: `src/twin/schemas.ts`
- Modify: `test/twin-schemas.test.ts`

**Interfaces:**

- Produces: `twinNodeTypeSchema` accepting `"phase"`, `"task"`, `"issue"`, `"strategy"`, `"validation-evidence"`, `"trace-link"` (new) and no longer accepting `"risk"`/`"work"` (removed). Consumed by every later task in this plan and by the existing, unmodified `queryTwin`/`buildTwinProjection`.

- [ ] **Step 1: Write the failing test**

Add to `test/twin-schemas.test.ts`, inside the existing `describe("digital twin schemas", ...)` block, directly after the existing `it("accepts hypothesis, experiment, and evidence node types", ...)` test:

```ts
it("accepts the new v0.24 node types and rejects the old work/risk stand-ins", () => {
  expect(() => twinNodeTypeSchema.parse("phase")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("task")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("issue")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("strategy")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("validation-evidence")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("trace-link")).not.toThrow();
  expect(() => twinNodeTypeSchema.parse("risk")).toThrow();
  expect(() => twinNodeTypeSchema.parse("work")).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/twin-schemas.test.ts`
Expected: FAIL — `"phase"` (and the other new values) are not yet valid enum members; `"risk"`/`"work"` do not yet throw.

- [ ] **Step 3: Update the schema**

In `src/twin/schemas.ts`, replace the `twinNodeTypeSchema` definition:

```ts
export const twinNodeTypeSchema = z.enum([
  "vision",
  "constitution",
  "release",
  "domain",
  "feature",
  "phase",
  "task",
  "issue",
  "story",
  "flow",
  "screen",
  "component",
  "api",
  "architecture",
  "permission",
  "test",
  "decision",
  "hypothesis",
  "experiment",
  "evidence",
  "strategy",
  "validation-evidence",
  "trace-link",
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/twin-schemas.test.ts`
Expected: PASS (4 tests total)

- [ ] **Step 5: Run the full test suite to check for immediate regressions**

Run: `./node_modules/.bin/vitest run`
Expected: multiple failures in `test/twin-from-state.test.ts` and `test/twin-command.test.ts` if they reference the removed `"risk"`/`"work"` types anywhere (checked during planning: they do not — `grep -rn '"flow"\|"work"\|"risk"' test/twin-*.test.ts` returned no matches), so this run should actually show only pre-existing failures unrelated to this change, if any. If it shows unexpected new failures, stop and report them — do not proceed to Task 2 with a broken baseline.

- [ ] **Step 6: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/twin/schemas.ts test/twin-schemas.test.ts`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/twin/schemas.ts test/twin-schemas.test.ts
git commit -m "feat: extend twin node types for governance, domain, strategy, and traceability

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Twin projection — rename phase/task/issue node types

**Files:**

- Modify: `src/twin/from-state.ts`
- Modify: `test/twin-from-state.test.ts`

**Interfaces:**

- Consumes: `twinNodeTypeSchema` (Task 1) now accepting `"phase"`/`"task"`/`"issue"`.
- Produces: `projectStateToTwin` now emits `type: "phase"` for `WorkState.phases`, `type: "task"` for `WorkState.tasks`, `type: "issue"` for `WorkState.issues` — consumed by Task 3's new specification/strategy projections (which rely on `"flow"` being free for design-flow specs) and by Task 5's integration test.

- [ ] **Step 1: Write the failing test**

Add to `test/twin-from-state.test.ts`, inside the existing `describe("project state digital twin adapter", ...)` block, directly after the existing `it("projects work hierarchy and decision relationships", ...)` test:

```ts
it("projects phases, tasks, and issues with their own dedicated node types", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [
        {
          id: "feature.search",
          name: "Search",
          description: "Search data",
          status: "planned",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      phases: [
        {
          id: "phase.index",
          featureId: "feature.search",
          sequence: 1,
          name: "Index",
          description: "Build the index.",
          status: "planned",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      tasks: [
        {
          id: "task.build-index",
          phaseId: "phase.index",
          name: "Build index",
          description: "Build the search index.",
          status: "planned",
          scope: { include: ["src/search/**"], exclude: [] },
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      issues: [
        {
          id: "issue.slow-index",
          name: "Slow index",
          description: "Indexing is slow.",
          status: "planned",
          scope: { include: ["src/search/**"], exclude: [] },
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      activeWork: null,
    },
    decisions: { decisions: [] },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
  });

  expect(result.nodes.find((node) => node.id === "phase.index")?.type).toBe(
    "phase",
  );
  expect(
    result.nodes.find((node) => node.id === "task.build-index")?.type,
  ).toBe("task");
  expect(
    result.nodes.find((node) => node.id === "issue.slow-index")?.type,
  ).toBe("issue");
});
```

The fixture above's field shapes are verified directly against `src/work/schemas.ts`: `phaseSchema` requires `featureId`+`sequence`, `taskSchema` requires `phaseId`+`scope` (with at least one `include` pattern), `issueSchema` requires only `scope` (no `phaseId`) — all matched exactly.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/twin-from-state.test.ts`
Expected: FAIL — nodes currently have type `"flow"` (phase), `"work"` (task), `"risk"` (issue) instead of `"phase"`/`"task"`/`"issue"`.

- [ ] **Step 3: Update the projection**

In `src/twin/from-state.ts`, change the three `workNode` call sites inside `projectStateToTwin`:

```ts
  const nodes = [
    ...input.work.features.map((item) => workNode(item, "feature")),
    ...input.work.phases.map((item) => workNode(item, "phase")),
    ...input.work.tasks.map((item) => workNode(item, "task")),
    ...input.work.issues.map((item) => workNode(item, "issue")),
```

And update the `workNode` helper's type parameter to match:

```ts
function workNode(
  item: Pick<
    WorkState["features"][number],
    "id" | "name" | "status" | "updatedAt"
  >,
  type: "feature" | "phase" | "task" | "issue",
) {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/twin-from-state.test.ts`
Expected: PASS (3 tests total)

- [ ] **Step 5: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/twin/from-state.ts test/twin-from-state.test.ts`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/twin/from-state.ts test/twin-from-state.test.ts
git commit -m "feat: give twin phases, tasks, and issues their own node types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Project governance and domain into the twin

**Files:**

- Modify: `src/twin/from-state.ts`
- Modify: `test/twin-from-state.test.ts`

**Interfaces:**

- Consumes: `ConstitutionArtifact | null` (`src/governance/schemas.js`), `selectApplicableRules` (`src/governance/evaluate.js` — exported, takes `(constitution: ConstitutionArtifact, input: GovernanceEvaluationInput)` and returns `GovernanceRule[]`; `GovernanceEvaluationInput` has optional `workKind`/`tags`/`release`/`paths`/`objective` fields, `objective` is required by the type but only used for conflict-detection inside `evaluateGovernance` — `selectApplicableRules` itself never reads `objective`, so pass an empty string), `DomainArtifact | null` (`src/domain/schemas.js`).
- Produces: `TwinStateInput` gains `constitution?: ConstitutionArtifact | null` and `domain?: DomainArtifact | null`. `projectStateToTwin` projects constitution rules as `"constitution"` nodes with `governs` edges to matching work items, and domain concepts as `"domain"` nodes with edges from `domain.relationships[]` plus `models` edges to decision/specification provenance. Consumed by Task 5's CLI wiring and Task 6's integration test.

- [ ] **Step 1: Write the failing test**

Add to `test/twin-from-state.test.ts`, as two new `it()` blocks directly after the test added in Task 2:

```ts
it("projects constitution rules with governs edges to matching work items", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [
        {
          id: "feature.billing",
          name: "Billing",
          description: "Billing feature.",
          status: "planned",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    },
    decisions: { decisions: [] },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
    constitution: {
      id: "constitution.default",
      name: "Default Constitution",
      purpose: "Govern this project.",
      rules: [
        {
          id: "constitution.billing-scope",
          title: "Billing is out of scope for Release A",
          statement: "Billing work must not ship in Release A.",
          level: "MUST_NOT",
          enforcement: "hard",
          scope: {
            paths: [],
            workKinds: ["feature"],
            releases: [],
            tags: [],
          },
          rationale: "Release A does not include payments.",
          nonGoals: [],
        },
      ],
      source: ".autoforge/governance/constitution.json",
      updatedAt: "2026-08-22T12:00:00.000Z",
    },
  });

  expect(
    result.nodes.find((node) => node.id === "constitution.billing-scope")?.type,
  ).toBe("constitution");
  expect(result.edges).toContainEqual({
    sourceId: "constitution.billing-scope",
    targetId: "feature.billing",
    relationship: "governs",
  });
});

it("projects domain concepts, their relationships, and provenance edges", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    },
    decisions: {
      decisions: [
        {
          id: "decision.resume-canonical",
          statement: "A user has one canonical active resume.",
          reasoning: "Simplifies matching.",
          consequences: ["Resume history is immutable."],
          scope: ["domain"],
          keywords: ["resume"],
          relatedWork: [],
          supersedes: null,
          status: "active",
          kind: "architecture",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
    },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
    domain: {
      id: "domain-artifact.default",
      concepts: [
        {
          id: "domain.user",
          name: "User",
          description: "A person with an account.",
          aliases: [],
          lifecycle: "confirmed",
          provenance: [],
          metadata: {},
        },
        {
          id: "domain.resume",
          name: "Resume",
          description: "A user's canonical resume.",
          aliases: [],
          lifecycle: "confirmed",
          provenance: [
            {
              sourceType: "decision",
              sourceId: "decision.resume-canonical",
              capturedAt: "2026-08-22T12:00:00.000Z",
            },
          ],
          metadata: {},
        },
      ],
      relationships: [
        {
          id: "domain-relation.user-owns-resume",
          sourceId: "domain.user",
          targetId: "domain.resume",
          type: "owns",
          rationale: "A user owns their resume.",
          lifecycle: "confirmed",
          provenance: [],
        },
      ],
      invariants: [],
      updatedAt: "2026-08-22T12:00:00.000Z",
    },
  });

  expect(result.nodes.find((node) => node.id === "domain.user")?.type).toBe(
    "domain",
  );
  expect(result.edges).toContainEqual({
    sourceId: "domain.user",
    targetId: "domain.resume",
    relationship: "owns",
  });
  expect(result.edges).toContainEqual({
    sourceId: "domain.resume",
    targetId: "decision.resume-canonical",
    relationship: "models",
  });
});

it("omits constitution and domain nodes when neither is provided", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    },
    decisions: { decisions: [] },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
  });

  expect(result.nodes.some((node) => node.type === "constitution")).toBe(false);
  expect(result.nodes.some((node) => node.type === "domain")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/twin-from-state.test.ts`
Expected: FAIL — `constitution`/`domain` are not yet accepted fields on the input, and no projection logic exists for them.

- [ ] **Step 3: Update `TwinStateInput` and `projectStateToTwin`**

In `src/twin/from-state.ts`, add the imports:

```ts
import { selectApplicableRules } from "../governance/evaluate.js";
import type { ConstitutionArtifact } from "../governance/schemas.js";
import type { DomainArtifact } from "../domain/schemas.js";
```

Extend `TwinStateInput`:

```ts
export interface TwinStateInput {
  projectId: string;
  generatedAt: string;
  work: WorkState;
  decisions: DecisionMemory;
  hypotheses: HypothesisMemory;
  experiments: ExperimentMemory;
  evidence: EvidenceMemory;
  constitution?: ConstitutionArtifact | null;
  domain?: DomainArtifact | null;
}
```

Inside `projectStateToTwin`, add constitution and domain node/edge contributions. Insert directly before the `return buildTwinProjection(...)` call, building up the arrays incrementally (the existing `nodes`/`edges` arrays are declared with `const` and built via spread — extend them to plain mutable arrays built with `.push`, or continue the spread style by adding new spread segments; either is acceptable, but stay consistent with the file's existing style, which is a single large array-literal built from spreads. Use the spread style):

```ts
const allWorkKinds: Record<string, string> = {
  ...Object.fromEntries(
    input.work.features.map((item) => [item.id, "feature"]),
  ),
  ...Object.fromEntries(input.work.phases.map((item) => [item.id, "phase"])),
  ...Object.fromEntries(input.work.tasks.map((item) => [item.id, "task"])),
  ...Object.fromEntries(input.work.issues.map((item) => [item.id, "issue"])),
};

const constitutionNodes = (input.constitution?.rules ?? []).map((rule) => ({
  id: rule.id,
  type: "constitution" as const,
  title: rule.title,
  source: ".autoforge/governance/constitution.json",
  updatedAt: input.constitution!.updatedAt,
}));
const constitutionEdges = (input.constitution?.rules ?? []).flatMap((rule) =>
  Object.entries(allWorkKinds)
    .filter(([, kind]) =>
      selectApplicableRules(input.constitution!, {
        objective: "",
        workKind: kind,
      }).some((applicable) => applicable.id === rule.id),
    )
    .map(([workId]) => ({
      sourceId: rule.id,
      targetId: workId,
      relationship: "governs",
    })),
);

const domainNodes = (input.domain?.concepts ?? []).map((concept) => ({
  id: concept.id,
  type: "domain" as const,
  title: concept.name,
  source: ".autoforge/domain/artifact.json",
  updatedAt: input.domain!.updatedAt,
}));
const domainRelationshipEdges = (input.domain?.relationships ?? []).map(
  (relationship) => ({
    sourceId: relationship.sourceId,
    targetId: relationship.targetId,
    relationship: relationship.type,
  }),
);
const domainProvenanceEdges = (input.domain?.concepts ?? []).flatMap(
  (concept) =>
    concept.provenance
      .filter(
        (entry) =>
          entry.sourceType === "decision" ||
          entry.sourceType === "specification",
      )
      .map((entry) => ({
        sourceId: concept.id,
        targetId: entry.sourceId,
        relationship: "models",
      })),
);
```

Then splice `constitutionNodes`/`domainNodes` into the `nodes` array and `constitutionEdges`/`domainRelationshipEdges`/`domainProvenanceEdges` into the `edges` array (both are the existing large array literals built via spread — add `...constitutionNodes, ...domainNodes,` to `nodes` and `...constitutionEdges, ...domainRelationshipEdges, ...domainProvenanceEdges,` to `edges`).

Note: `selectApplicableRules` is called once per `(rule, work item)` pair inside a nested loop above for simplicity and correctness; if this proves too slow in practice for large rule sets during Step 4/5's test run, an optimization is to call `selectApplicableRules(constitution, { objective: "", workKind: kind })` once per distinct work-kind value (there are at most 4: feature/phase/task/issue) and check `.some(r => r.id === rule.id)` against that smaller result set instead of re-filtering per rule — but do not perform this optimization unless the straightforward version above is measurably slow; correctness first.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/twin-from-state.test.ts`
Expected: PASS (6 tests total)

- [ ] **Step 5: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/twin/from-state.ts test/twin-from-state.test.ts`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/twin/from-state.ts test/twin-from-state.test.ts
git commit -m "feat: project governance and domain concepts into the digital twin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Project specifications, strategy, traceability, and validation evidence into the twin

**Files:**

- Modify: `src/twin/from-state.ts`
- Modify: `test/twin-from-state.test.ts`

**Interfaces:**

- Consumes: `Specification[]` (`src/specifications/schemas.js`), `StrategyMemory` (`src/strategy/strategy-schemas.js`, from Task 3 of the v0.23 plan), `TraceGraph` (`src/traceability/schemas.js`), `ValidationEvidenceState` (`src/quality/evidence.js`).
- Produces: `TwinStateInput` gains `specifications?: readonly Specification[]`, `strategy?: StrategyMemory`, `traceability?: TraceGraph`, `validationEvidence?: ValidationEvidenceState`. `projectStateToTwin` projects each. Consumed by Task 5's CLI wiring and Task 6's integration test.

- [ ] **Step 1: Write the failing test**

Add to `test/twin-from-state.test.ts`, as four new `it()` blocks directly after Task 3's tests:

```ts
it("projects specifications using their own type and relationship names", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    },
    decisions: { decisions: [] },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
    specifications: [
      {
        id: "flow.checkout",
        type: "flow",
        name: "Checkout Flow",
        description: "Checkout flow spec.",
        relationships: { uses: ["screen.checkout"] },
        tags: [],
        source: "manual:example",
        updatedAt: "2026-08-22T12:00:00.000Z",
        content: "Checkout flow content.",
      },
      {
        id: "screen.checkout",
        type: "screen",
        name: "Checkout Screen",
        description: "Checkout screen spec.",
        relationships: {},
        tags: [],
        source: "manual:example",
        updatedAt: "2026-08-22T12:00:00.000Z",
        content: "Checkout screen content.",
      },
    ],
  });

  expect(result.nodes.find((node) => node.id === "flow.checkout")?.type).toBe(
    "flow",
  );
  expect(result.nodes.find((node) => node.id === "screen.checkout")?.type).toBe(
    "screen",
  );
  expect(result.edges).toContainEqual({
    sourceId: "flow.checkout",
    targetId: "screen.checkout",
    relationship: "uses",
  });
});

it("projects only active strategy assessments, with assesses and resulted-in edges", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [
        {
          id: "feature.messaging",
          name: "Messaging",
          description: "Messaging feature.",
          status: "planned",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    },
    decisions: {
      decisions: [
        {
          id: "decision.strategic-assessment-recommends-backlog",
          statement:
            "feature.messaging: strategic assessment recommends backlog",
          reasoning: "High risk.",
          consequences: ["Deferred."],
          scope: ["strategy"],
          keywords: ["strategy", "backlog"],
          relatedWork: ["feature.messaging"],
          supersedes: null,
          status: "active",
          kind: "feature-note",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
    },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
    strategy: {
      assessments: [
        {
          id: "strategy.messaging-1",
          workId: "feature.messaging",
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
          rationale: "High spam risk.",
          evidenceIds: [],
          resultingDecision: "decision.strategic-assessment-recommends-backlog",
          supersedes: null,
          status: "superseded",
          createdAt: "2026-08-22T11:00:00.000Z",
          updatedAt: "2026-08-22T11:00:00.000Z",
        },
        {
          id: "strategy.messaging-2",
          workId: "feature.messaging",
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
          rationale: "Risk resolved.",
          evidenceIds: [],
          resultingDecision: "decision.strategic-assessment-recommends-backlog",
          supersedes: "strategy.messaging-1",
          status: "active",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
    },
  });

  expect(result.nodes.some((node) => node.id === "strategy.messaging-1")).toBe(
    false,
  );
  expect(
    result.nodes.find((node) => node.id === "strategy.messaging-2")?.type,
  ).toBe("strategy");
  expect(result.edges).toContainEqual({
    sourceId: "strategy.messaging-2",
    targetId: "feature.messaging",
    relationship: "assesses",
  });
  expect(result.edges).toContainEqual({
    sourceId: "strategy.messaging-2",
    targetId: "decision.strategic-assessment-recommends-backlog",
    relationship: "resulted-in",
  });
});

it("projects traceability links only between already-modeled nodes", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [
        {
          id: "feature.search",
          name: "Search",
          description: "Search feature.",
          status: "planned",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    },
    decisions: { decisions: [] },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
    traceability: {
      schemaVersion: 1,
      links: [
        {
          id: "trace.search-implements-story",
          sourceId: "feature.search",
          targetId: "story.search-onboarding",
          relationship: "implements",
          provenance: "manual",
          capturedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
    },
  });

  expect(result.edges.some((edge) => edge.sourceId === "feature.search")).toBe(
    false,
  );
});

it("projects validation evidence with validates edges to work items", () => {
  const result = projectStateToTwin({
    projectId: "project.example",
    generatedAt: "2026-08-22T12:00:00.000Z",
    work: {
      features: [
        {
          id: "feature.search",
          name: "Search",
          description: "Search feature.",
          status: "planned",
          createdAt: "2026-08-22T12:00:00.000Z",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    },
    decisions: { decisions: [] },
    hypotheses: { hypotheses: [] },
    experiments: { experiments: [] },
    evidence: { evidence: [] },
    validationEvidence: {
      schemaVersion: 1,
      evidence: [
        {
          id: "evidence.command.tests.123",
          gateId: "command.tests",
          status: "passed",
          severity: "required",
          workId: "feature.search",
          traceIds: [],
          reason: "Quality command tests exited with code 0.",
          capturedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
    },
  });

  expect(
    result.nodes.find((node) => node.id === "evidence.command.tests.123")?.type,
  ).toBe("validation-evidence");
  expect(result.edges).toContainEqual({
    sourceId: "evidence.command.tests.123",
    targetId: "feature.search",
    relationship: "validates",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/twin-from-state.test.ts`
Expected: FAIL — `specifications`/`strategy`/`traceability`/`validationEvidence` are not yet accepted fields, no projection logic exists.

- [ ] **Step 3: Update `TwinStateInput` and `projectStateToTwin`**

In `src/twin/from-state.ts`, add the imports:

```ts
import type { Specification } from "../specifications/schemas.js";
import type { StrategyMemory } from "../strategy/strategy-schemas.js";
import type { TraceGraph } from "../traceability/schemas.js";
import type { ValidationEvidenceState } from "../quality/evidence.js";
```

Extend `TwinStateInput` further:

```ts
export interface TwinStateInput {
  projectId: string;
  generatedAt: string;
  work: WorkState;
  decisions: DecisionMemory;
  hypotheses: HypothesisMemory;
  experiments: ExperimentMemory;
  evidence: EvidenceMemory;
  constitution?: ConstitutionArtifact | null;
  domain?: DomainArtifact | null;
  specifications?: readonly Specification[];
  strategy?: StrategyMemory;
  traceability?: TraceGraph;
  validationEvidence?: ValidationEvidenceState;
}
```

Add projection logic, again inserted before the `return buildTwinProjection(...)` call:

```ts
const specificationNodes = (input.specifications ?? []).map((spec) => ({
  id: spec.id,
  type: spec.type as (typeof twinNodeTypeSchema.options)[number],
  title: spec.name,
  source: spec.source,
  updatedAt: spec.updatedAt,
}));
const specificationEdges = (input.specifications ?? []).flatMap((spec) =>
  Object.entries(spec.relationships).flatMap(([relationshipName, targets]) =>
    targets.map((targetId) => ({
      sourceId: spec.id,
      targetId,
      relationship: relationshipName,
    })),
  ),
);

const activeStrategyAssessments = (input.strategy?.assessments ?? []).filter(
  (assessment) => assessment.status === "active",
);
const strategyNodes = activeStrategyAssessments.map((assessment) => ({
  id: assessment.id,
  type: "strategy" as const,
  title: `${assessment.decision}: ${assessment.workId}`,
  source: ".autoforge/learning/strategy.json",
  updatedAt: assessment.updatedAt,
}));
const strategyEdges = activeStrategyAssessments.flatMap((assessment) => [
  {
    sourceId: assessment.id,
    targetId: assessment.workId,
    relationship: "assesses",
  },
  ...(assessment.resultingDecision
    ? [
        {
          sourceId: assessment.id,
          targetId: assessment.resultingDecision,
          relationship: "resulted-in",
        },
      ]
    : []),
]);

const traceabilityEdges = (input.traceability?.links ?? []).map((link) => ({
  sourceId: link.sourceId,
  targetId: link.targetId,
  relationship: link.relationship,
}));

const validationEvidenceNodes = (input.validationEvidence?.evidence ?? []).map(
  (record) => ({
    id: record.id,
    type: "validation-evidence" as const,
    title: `${record.gateId} (${record.status})`,
    source: ".autoforge/quality/evidence.json",
    updatedAt: record.capturedAt,
  }),
);
const validationEvidenceEdges = (
  input.validationEvidence?.evidence ?? []
).flatMap((record) => [
  ...(record.workId
    ? [
        {
          sourceId: record.id,
          targetId: record.workId,
          relationship: "validates",
        },
      ]
    : []),
  ...record.traceIds.map((traceId) => ({
    sourceId: record.id,
    targetId: traceId,
    relationship: "traces",
  })),
]);
```

Splice `specificationNodes`, `strategyNodes`, `validationEvidenceNodes` into the `nodes` array, and `specificationEdges`, `strategyEdges`, `traceabilityEdges`, `validationEvidenceEdges` into the `edges` array.

Note on `traceIds` relationship naming: the design calls this a `traces` edge; the step above already labels it `"traces"` directly in `validationEvidenceEdges`'s second spread — no separate constant needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/twin-from-state.test.ts`
Expected: PASS (10 tests total)

- [ ] **Step 5: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/twin/from-state.ts test/twin-from-state.test.ts`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/twin/from-state.ts test/twin-from-state.test.ts
git commit -m "feat: project specifications, strategy, traceability, and validation evidence into the digital twin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Wire the six new data sources into `autoforge twin generate`

**Files:**

- Modify: `src/commands/twin.ts`
- Modify: `test/twin-command.test.ts`

**Interfaces:**

- Consumes: `ConstitutionStore.load()`, `DomainStore.load()`, `SpecificationRegistry.list()`, `StrategyStore` (`.ensure()` + `.state.read()`), `TraceabilityStore.read()`, `ValidationEvidenceStore.read()` — all pre-existing, unmodified classes. `projectStateToTwin` (Tasks 2-4) now accepting the six new optional fields.
- Produces: `runTwinCommand`'s `generate` action produces a projection including all new domains when present in the project. Consumed by end users and by this task's own integration test.

- [ ] **Step 1: Write the failing test**

Add to `test/twin-command.test.ts`, as a new `it()` block directly after the existing `it("includes hypothesis nodes in the generated projection", ...)` test. This test directly writes fixture files for the domains that don't have a simple one-shot CLI command to populate them (constitution/domain/traceability/validation-evidence), and uses the real `strategy assess` CLI command for strategy (since that's straightforward):

```ts
it("includes governance, domain, strategy, and validation-evidence nodes in the generated projection", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-twin-command-"));
  roots.push(root);
  await mkdir(path.join(root, ".git"));
  await initializeProject({ projectRoot: root });

  const workStore = createWorkStateStore(root);
  const feature = await new WorkService(workStore).createFeature({
    name: "Messaging",
    description: "Messaging feature.",
  });

  const strategyOutput = { stdout: vi.fn(), stderr: vi.fn() };
  await runStrategyCommand({
    args: [
      "assess",
      feature.entity.id,
      "--alignment",
      "high",
      "--value",
      "high",
      "--risk",
      "low",
      "--cost",
      "medium",
      "--evidence-strength",
      "high",
      "--dependency-pressure",
      "low",
      "--complexity",
      "medium",
      "--release-constraint",
      "low",
      "--decision",
      "now",
      "--rationale",
      "Clear evidence, low risk.",
    ],
    output: strategyOutput,
    startDirectory: root,
  });

  await mkdir(path.join(root, ".autoforge", "governance"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, ".autoforge", "governance", "constitution.json"),
    JSON.stringify({
      id: "constitution.default",
      name: "Default Constitution",
      purpose: "Govern this project.",
      rules: [
        {
          id: "constitution.example-rule",
          title: "Example rule",
          statement: "An example rule statement.",
          level: "SHOULD",
          enforcement: "advisory",
          scope: { paths: [], workKinds: ["feature"], releases: [], tags: [] },
          rationale: "Example rationale.",
          nonGoals: [],
        },
      ],
      source: ".autoforge/governance/constitution.json",
      updatedAt: "2026-08-22T12:00:00.000Z",
    }),
    "utf8",
  );

  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runTwinCommand({
      args: ["generate", "--json"],
      output,
      startDirectory: root,
      now: () => new Date("2026-08-22T12:00:00.000Z"),
    }),
  ).resolves.toBe(0);

  const call = output.stdout.mock.calls.find(([value]) =>
    typeof value === "string" ? value.includes('"schemaVersion"') : false,
  );
  expect(call).toBeDefined();
  const projection = JSON.parse(call![0] as string);
  expect(
    projection.nodes.some(
      (node: { type: string }) => node.type === "constitution",
    ),
  ).toBe(true);
  expect(
    projection.nodes.some((node: { type: string }) => node.type === "strategy"),
  ).toBe(true);
});
```

The path `.autoforge/governance/constitution.json` is verified directly against `ConstitutionStore`'s `filePath` getter in `src/governance/store.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/twin-command.test.ts`
Expected: FAIL — the generated projection does not yet include constitution/strategy nodes, since `runTwinCommand` doesn't read those stores yet.

- [ ] **Step 3: Wire the new stores into `runTwinCommand`**

In `src/commands/twin.ts`, add imports:

```ts
import { ConstitutionStore } from "../governance/store.js";
import { DomainStore } from "../domain/store.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import { SpecificationFileStore } from "../specifications/store.js";
import { StrategyStore } from "../strategy/strategy-store.js";
import { TraceabilityStore } from "../traceability/store.js";
import { ValidationEvidenceStore } from "../quality/evidence.js";
```

Inside the `generate` action, extend the parallel reads. Replace:

```ts
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

With:

```ts
const hypothesisStore = new HypothesisStore(project.path);
const experimentStore = new ExperimentStore(project.path);
const evidenceStore = new EvidenceStore(project.path);
const strategyStore = new StrategyStore(project.path);
await Promise.all([
  hypothesisStore.ensure(),
  experimentStore.ensure(),
  evidenceStore.ensure(),
  strategyStore.ensure(),
]);
const constitutionStore = new ConstitutionStore(project.path);
const domainStore = new DomainStore(project.path);
const specifications = new SpecificationRegistry(
  new SpecificationFileStore(project.path),
);
const traceabilityStore = new TraceabilityStore(project.path);
const validationEvidenceStore = new ValidationEvidenceStore(project.path);
const [
  { state: work },
  { state: decisions },
  { state: hypotheses },
  { state: experiments },
  { state: evidence },
  { state: strategy },
  constitution,
  domain,
  specificationList,
  traceGraph,
  validationEvidenceState,
] = await Promise.all([
  createWorkStateStore(project.path).read(),
  createDecisionStore(project.path).read(),
  hypothesisStore.state.read(),
  experimentStore.state.read(),
  evidenceStore.state.read(),
  strategyStore.state.read(),
  constitutionStore.load(),
  domainStore.load(),
  specifications.list(),
  traceabilityStore.read(),
  validationEvidenceStore.read(),
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
    constitution,
    domain,
    specifications: specificationList,
    strategy: strategy.data,
    traceability: traceGraph,
    validationEvidence: validationEvidenceState,
  }),
);
```

`SpecificationRegistry.list()` is verified directly against `src/specifications/registry.ts`: `async list(options: ListSpecificationsOptions = {}): Promise<Specification[]>` — a no-argument call returns every specification, matching the code above.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/twin-command.test.ts`
Expected: PASS (3 tests total)

- [ ] **Step 5: Run the full test suite**

Run: `./node_modules/.bin/vitest run`
Expected: all tests pass — this task touches a shared command file (`src/commands/twin.ts`), so confirm no regression elsewhere.

- [ ] **Step 6: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/commands/twin.ts test/twin-command.test.ts`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/commands/twin.ts test/twin-command.test.ts
git commit -m "feat: wire governance, domain, design, strategy, traceability, and validation evidence into autoforge twin generate

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Surface validation evidence in `autoforge why`

**Files:**

- Modify: `src/commands/why.ts`
- Modify: `test/why.test.ts`

**Interfaces:**

- Consumes: `ValidationEvidenceStore` (`src/quality/evidence.js` — already exists, `.read(): Promise<ValidationEvidenceState>`, no `.ensure()` method since it returns an empty default on ENOENT rather than requiring initialization — confirmed via its `read()` implementation catching ENOENT and returning `{ schemaVersion: 1, evidence: [] }`).
- Produces: `formatDecisionMatches` gains an optional `validationByWorkId` parameter; `runWhyCommand` populates it from `ValidationEvidenceStore` and passes it through. Purely additive — no other command depends on this.

- [ ] **Step 1: Write the failing test**

Add to `test/why.test.ts`, as two new `it()` blocks directly after the existing evidence-surfacing tests (`"surfaces linked evidence beneath a matched decision"` and `"omits the evidence line when no evidence references the decision"`):

```ts
it("surfaces validation evidence beneath a matched decision via related work", async () => {
  const { feature, projectRoot } = await createFixture();
  const decisions = new DecisionService(
    createDecisionStore(projectRoot),
    createWorkStateStore(projectRoot),
    { now: () => new Date(TIMESTAMP) },
  );
  await decisions.record({
    statement: "Ship the checkout redesign.",
    reasoning: "Improves conversion.",
    consequences: ["New checkout flow ships."],
    scope: ["checkout"],
    keywords: ["checkout", "redesign"],
    relatedWork: [feature.entity.id],
  });

  const { ValidationEvidenceStore } =
    await import("../src/quality/evidence.js");
  await new ValidationEvidenceStore(projectRoot).record({
    id: "evidence.command.tests.1",
    gateId: "command.tests",
    status: "passed",
    severity: "required",
    workId: feature.entity.id,
    traceIds: [],
    reason: "Quality command tests exited with code 0.",
    capturedAt: TIMESTAMP,
  });

  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await expect(
    runWhyCommand({
      args: ["--query", "checkout redesign"],
      output,
      startDirectory: projectRoot,
    }),
  ).resolves.toBe(EXIT_CODE.success);
  expect(output.stdout.mock.calls[0]?.[0]).toContain(
    "Validation: command.tests (passed)",
  );
});

it("omits the validation line when no validation evidence references the decision's related work", async () => {
  const { projectRoot } = await createFixture();
  const output = { stdout: vi.fn(), stderr: vi.fn() };

  await expect(
    runWhyCommand({
      args: ["--query", "determinism relevance"],
      output,
      startDirectory: projectRoot,
    }),
  ).resolves.toBe(EXIT_CODE.success);
  expect(output.stdout.mock.calls[0]?.[0]).not.toContain("Validation:");
});
```

Note: check the exact top-of-file imports in `test/why.test.ts` already present — `DecisionService`, `createDecisionStore`, `createWorkStateStore`, `EXIT_CODE`, `vi` are already imported per the file's existing content (confirmed during planning); only `ValidationEvidenceStore` needs a dynamic `await import(...)` since it isn't already imported at the top of the file, matching the file's own existing convention of dynamic-importing modules introduced by a later task (see the existing dynamic imports of `runLearningEvidenceCommand`/`runDecideCommand`/`EvidenceStore` elsewhere in this same file from the v0.23 work).

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run test/why.test.ts`
Expected: FAIL — no `Validation:` line is produced yet.

- [ ] **Step 3: Wire validation evidence into `why`**

In `src/commands/why.ts`, add the import:

```ts
import { ValidationEvidenceStore } from "../quality/evidence.js";
```

Update `formatDecisionMatches`'s signature and body:

```ts
export function formatDecisionMatches(
  matches: readonly DecisionSearchMatch[],
  evidenceByDecision?: ReadonlyMap<string, readonly string[]>,
  validationByWorkId?: ReadonlyMap<string, readonly string[]>,
): string {
  if (matches.length === 0) {
    return "No matching decisions.";
  }

  const blocks = matches.map(
    ({ decision, reasons, score, supersededBy }, index) => {
      const lines = [
        `[${index + 1}] ${decision.id} (score ${score}, ${decision.status})`,
        `Statement: ${decision.statement}`,
        `Reasoning: ${decision.reasoning}`,
        `Consequences: ${decision.consequences.join(" | ")}`,
        `Scope: ${decision.scope.join(", ")}`,
        `Keywords: ${decision.keywords.join(", ")}`,
        `Related work: ${decision.relatedWork.join(", ") || "(none)"}`,
        `Matched: ${reasons.join("; ")}`,
      ];
      if (decision.supersedes) {
        lines.push(`Supersedes: ${decision.supersedes}`);
      }
      if (supersededBy) {
        lines.push(`Superseded by: ${supersededBy}`);
      }
      const evidenceIds = evidenceByDecision?.get(decision.id);
      if (evidenceIds && evidenceIds.length > 0) {
        lines.push(`Evidence: ${evidenceIds.join(", ")}`);
      }
      const validationLines = decision.relatedWork.flatMap(
        (workId) => validationByWorkId?.get(workId) ?? [],
      );
      if (validationLines.length > 0) {
        lines.push(`Validation: ${validationLines.join(", ")}`);
      }
      return lines.join("\n");
    },
  );
  return [`Decision matches: ${matches.length}`, ...blocks].join("\n\n");
}
```

Update `runWhyCommand` to read validation evidence and build the `validationByWorkId` map:

```ts
export async function runWhyCommand(
  options: WhyCommandOptions,
): Promise<ExitCode> {
  const parsed = parseWhyArguments(options.args, options.output);
  if (!parsed) {
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const { state } = await createDecisionStore(project.path).read();
  const matches = searchDecisions(state.data, parsed);

  const evidenceStore = new EvidenceStore(project.path);
  await evidenceStore.ensure();
  const { state: evidenceState } = await evidenceStore.state.read();
  const evidenceByDecision = new Map<string, string[]>();
  for (const record of evidenceState.data.evidence) {
    if (!record.resultingDecision) {
      continue;
    }
    const existing = evidenceByDecision.get(record.resultingDecision);
    if (existing) {
      existing.push(record.id);
    } else {
      evidenceByDecision.set(record.resultingDecision, [record.id]);
    }
  }

  const validationEvidenceState = await new ValidationEvidenceStore(
    project.path,
  ).read();
  const validationByWorkId = new Map<string, string[]>();
  for (const record of validationEvidenceState.evidence) {
    if (!record.workId) {
      continue;
    }
    const label = `${record.gateId} (${record.status})`;
    const existing = validationByWorkId.get(record.workId);
    if (existing) {
      existing.push(label);
    } else {
      validationByWorkId.set(record.workId, [label]);
    }
  }

  options.output.stdout(
    formatDecisionMatches(matches, evidenceByDecision, validationByWorkId),
  );
  return EXIT_CODE.success;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run test/why.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 5: Run the full test suite**

Run: `./node_modules/.bin/vitest run`
Expected: all tests pass.

- [ ] **Step 6: Typecheck and format**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/prettier --check src/commands/why.ts test/why.test.ts`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/commands/why.ts test/why.test.ts
git commit -m "feat: surface validation gate evidence in autoforge why

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Documentation and AutoForge governance registration

**Files:**

- Modify: `docs/AUTOFORGE_CLI_REFERENCE.md`

**Interfaces:**

- Consumes: nothing new — prose describing the wiring built in Tasks 1-6.
- Produces: nothing consumed by later tasks — this is the final documentation task before governance registration.

- [ ] **Step 1: Add a one-line note to the twin query documentation**

Read `docs/AUTOFORGE_CLI_REFERENCE.md` and find the line documenting `autoforge twin query`. Directly after it (or in the nearest surrounding prose, matching the file's existing style of brief explanatory sentences after command blocks), add:

```markdown
The digital twin includes governance, domain, design, strategy, and
traceability data alongside work, decisions, and evidence — `twin query
--type constitution`, `--type domain`, `--type strategy`, `--type
validation-evidence`, and `--type trace-link` are all queryable once the
corresponding domain has data.
```

- [ ] **Step 2: Typecheck, format, and run the full suite one final time**

Run: `./node_modules/.bin/prettier --check docs/AUTOFORGE_CLI_REFERENCE.md && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run`
Expected: no errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add docs/AUTOFORGE_CLI_REFERENCE.md
git commit -m "docs: document twin's new governance, domain, strategy, and traceability coverage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Register the work in AutoForge's own governance and record decisions**

This mirrors how v0.23's work was registered (see `docs/superpowers/plans/2026-08-23-v0-23-strategy-prioritization.md`'s Task 7 for the exact precedent). From the main checkout (not a worktree, if one is in use — AutoForge governance commands should run against the primary checkout's `.autoforge/` state per the v0.23 precedent):

```bash
autoforge add feature --name "Continuous Product Evolution Engine" --description "v0.24 north-star milestone: close the full development loop by wiring governance, domain, design, strategy, and traceability into the digital twin, and surfacing validation evidence in autoforge why."
```

Note the returned `feature.<id>`, then:

```bash
autoforge add phase --feature <feature-id> --name "Twin and why integration" --description "Wire every existing domain the north-star's digital twin was always meant to include, and surface validation-gate evidence in decision search."
```

Note the returned `phase.<id>`, then create one task per implementation task above (Tasks 1-6), each scoped to the files that task touches, e.g.:

```bash
autoforge add task --phase <phase-id> --name "Twin node-type schema rename and extension" --description "Extend twinNodeTypeSchema with phase/task/issue/strategy/validation-evidence/trace-link; remove risk/work." --include "src/twin/schemas.ts" --include "test/twin-schemas.test.ts"

autoforge add task --phase <phase-id> --name "Twin phase/task/issue node-type migration" --description "Give WorkState phases/tasks/issues their own dedicated twin node types instead of reusing flow/work/risk." --include "src/twin/from-state.ts" --include "test/twin-from-state.test.ts"

autoforge add task --phase <phase-id> --name "Twin governance and domain projection" --description "Project constitution rules and domain concepts/relationships into the digital twin." --include "src/twin/from-state.ts" --include "test/twin-from-state.test.ts"

autoforge add task --phase <phase-id> --name "Twin specification, strategy, traceability, and validation-evidence projection" --description "Project design specifications, active strategy assessments, traceability links, and validation evidence into the digital twin." --include "src/twin/from-state.ts" --include "test/twin-from-state.test.ts"

autoforge add task --phase <phase-id> --name "Wire new domains into autoforge twin generate" --description "Read constitution, domain, specifications, strategy, traceability, and validation evidence stores and pass them through to projectStateToTwin." --include "src/commands/twin.ts" --include "test/twin-command.test.ts"

autoforge add task --phase <phase-id> --name "Surface validation evidence in autoforge why" --description "formatDecisionMatches and runWhyCommand surface validation-gate evidence linked to a matched decision's related work." --include "src/commands/why.ts" --include "test/why.test.ts"
```

- [ ] **Step 5: Start and complete each task as it finishes**

As each of Tasks 1-6 above completes, run (mirroring the v0.23 precedent exactly):

```bash
autoforge start task <task-id>
autoforge decide --statement "<one-sentence statement of what this task implemented>" --reasoning "<why>" --consequence "<one-line consequence>" --scope twin --keyword continuous-evolution --work <task-id> --kind feature-note
autoforge done
```

- [ ] **Step 6: Final verification**

```bash
autoforge recap
```

Expected: the new feature/phase/tasks show as `completed`, and `autoforge why --query "continuous evolution"` surfaces the decisions recorded in Step 5.

---

## Plan Self-Review Notes

- **Spec coverage:** All six data-model additions from the design spec (constitution, domain, specifications, strategy, traceability, validation evidence) have a dedicated task (Tasks 3 and 4), the naming-collision resolution has its own task (Task 2) ahead of the specification-projection task that depends on it being resolved first, the CLI wiring has its own task (Task 5), and the `why` integration has its own task (Task 6). The design's "Out of Scope" items (no new commands, no auto-decision-writing from gate check, no orchestration changes, no traceability authoring changes, no evidence-kind schema merge) are respected by omission — no task builds any of them.
- **Discovered during planning, not left as a guess:** `buildTwinProjection` already filters unreachable-node edges, so the design's "silently skip edges to unmodeled nodes" requirement needed zero new code — this is called out explicitly in the Global Constraints section so no task re-implements it. `selectApplicableRules` (not `evaluateGovernance`) is the correct function to reuse for governance-edge matching, corrected during the spec's own self-review and carried through into Task 3's exact code. There is no existing test asserting the old `"flow"`/`"work"`/`"risk"` twin node types anywhere in the codebase, so Task 2's "regression" concern from the design spec is moot — confirmed via `grep` during planning, and Task 2's steps reflect only new-test-writing, not old-test-updating.
- **Type consistency:** `TwinStateInput` is extended additively across Tasks 3-4 (never redefined from scratch), and every later task's code references field names (`constitution`, `domain`, `specifications`, `strategy`, `traceability`, `validationEvidence`) exactly as introduced in the tasks that add them. `ValidationEvidenceStore`, `StrategyStore`, `ConstitutionStore`, `DomainStore`, `TraceabilityStore`, `SpecificationRegistry`/`SpecificationFileStore` are all referenced by their real, already-existing class names and method signatures, verified against actual source during planning (not assumed).
- **Fully verified during planning, not left as a runtime guess:** `Phase`/`Task`/`Issue` field shapes (`src/work/schemas.ts`), `ConstitutionStore`'s file path (`src/governance/store.ts`), and `SpecificationRegistry.list()`'s signature (`src/specifications/registry.ts`) were all read directly from source and confirmed to match every fixture and code sample in this plan — no open assumptions remain.
