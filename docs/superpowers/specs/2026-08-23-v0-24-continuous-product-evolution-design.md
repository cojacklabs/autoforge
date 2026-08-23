# v0.24 — Continuous Product Evolution Engine — Design

**Date:** 2026-08-23
**Status:** Approved design, pending implementation plan
**North-star reference:** `dev/AUTOFORGE_NORTH_STAR_REVISED_POST_V0.14_TO_V0.25.md`, Section 6, "v0.24 — Continuous Product Evolution Engine"

## Overview

v0.24 is not a new domain. Every stage of the north-star's "Full Loop" (Discovery → Structured Knowledge → Governance → Research → Decision → Domain/Specification → Design → Planning → Agent Execution → Validation → Release → Observation → Evidence → Learning → Updated Product Model → ↺) already exists as its own working AutoForge domain. An audit of the actual codebase against the loop, performed during brainstorming, found the loop does not yet close: two concrete integration gaps prevent the "Updated Product Model" (the digital twin) from reflecting reality, and prevent validation results from becoming durable, queryable project memory the way decisions and learning-evidence already are.

v0.24's entire scope is closing these two gaps. It adds no new commands.

### Gap 1: Twin completeness

`src/twin/from-state.ts` currently projects only `work`, `decisions`, `hypotheses`, `experiments`, and `learning-evidence` into the digital twin graph. Per the north-star's own "Digital Twin Includes" list (vision, constitution, releases, domain, features, stories, flows, screens, components, APIs, architecture, permissions, tests, decisions, risks, validation state, active work), the following are completely absent from the graph despite each already existing as a working, populated domain:

- **Governance** (`src/governance/` — `ConstitutionStore`, populated via `autoforge constitution init`)
- **Domain concepts and relationships** (`src/domain/` — `DomainStore`, populated via `autoforge domain init`)
- **Design specifications** (`src/specifications/` — `SpecificationRegistry`, populated via `autoforge design import`)
- **Strategy assessments** (`src/strategy/` — v0.23, shipped this session)
- **Traceability links** (`src/traceability/` — `TraceabilityStore`, populated via `autoforge trace add`)

`twinNodeTypeSchema` already declares `"constitution"` and `"domain"` as valid enum values — the schema anticipated this work; `from-state.ts` simply never populates nodes of those types.

### Gap 2: Validation evidence is siloed

`autoforge gate check` already records durable, structured results via `ValidationEvidenceStore` (`src/quality/evidence.ts`, persisted to `.autoforge/quality/evidence.json`), queryable in isolation via `autoforge evidence list|summary` (`src/commands/evidence.ts`). This is a real, working evidence trail — but it is invisible to `autoforge why`, disconnected from the learning-evidence chain (`hypothesis → experiment → evidence → decision`), and absent from the twin. A human or agent asking "why did this fail validation" or "what does project memory know about this gate" gets nothing from the primary query surfaces.

### Why this closes the loop

Closing both gaps makes the twin capable of answering the north-star's own worked example queries — "which decisions affect the resume domain," "what remains incomplete for this release" — which require governance, domain, and decisions to coexist in one graph. It also makes `autoforge why` capable of surfacing _why a gate failed_, not only architectural rationale, closing the "Validation → Observation → Evidence" segment of the full loop.

## A Real Naming Collision, Found and Resolved

`from-state.ts` currently reuses generic `twinNodeTypeSchema` values as stand-ins for `WorkState` entities that have no dedicated type: `phase` → `"flow"`, `task` → `"work"`, `issue` → `"risk"`. Meanwhile, `SPECIFICATION_TYPES` (`src/specifications/schemas.ts`) already defines `"flow"` to mean _a design flow specification_. Projecting design specifications directly using their own `type` field — the natural, minimal-friction approach — would make `"flow"` nodes ambiguous between "a work phase" and "a design flow spec."

**Resolution:** `twinNodeTypeSchema` gains dedicated `"phase"`, `"task"`, and `"issue"` values; `from-state.ts`'s work projection is updated to use them instead of the reused `"flow"`/`"work"`/`"risk"` labels. This frees `"flow"` (and `"risk"`, for future real risk-tracking use) to mean exactly what the rest of the codebase already calls them.

This is a breaking change to the twin projection's _node-type semantics_ only — not a data migration concern. `.autoforge/twin/projection.json` is a computed, gitignored cache regenerated on demand by `autoforge twin generate` (confirmed: `TwinProjectionStore` has no versioned migration path and the directory is already in `.gitignore`), so existing stored projections are simply regenerated with the corrected types; no upgrade path is needed. `autoforge twin query --type flow` will return design flow specs (once populated) instead of work phases after this change; `--type phase` is the new way to query phases.

## Data Model

### `src/twin/schemas.ts` — `twinNodeTypeSchema` changes

```ts
// Before
"vision" |
  "constitution" |
  "release" |
  "domain" |
  "feature" |
  "story" |
  "flow" |
  "screen" |
  "component" |
  "api" |
  "architecture" |
  "permission" |
  "test" |
  "decision" |
  "risk" |
  "hypothesis" |
  "experiment" |
  "evidence" |
  "work";

// After
"vision" |
  "constitution" |
  "release" |
  "domain" |
  "feature" |
  "phase" |
  "task" |
  "issue" |
  "story" |
  "flow" |
  "screen" |
  "component" |
  "api" |
  "architecture" |
  "permission" |
  "test" |
  "decision" |
  "hypothesis" |
  "experiment" |
  "evidence" |
  "strategy" |
  "validation-evidence" |
  "trace-link";
```

`"phase"`, `"task"`, `"issue"`, `"strategy"`, `"validation-evidence"`, and `"trace-link"` are new. `"risk"` and `"work"` are removed (no longer meaningfully distinct from `"issue"`/`"task"` once those exist as their own types — this repo has no other user of those two labels; confirmed via `grep -rn '"risk"\|"work"' src/twin/`).

No new edge-relationship enum is needed — `twinEdgeSchema.relationship` is already a free-form, regex-validated string (`/^[a-z][a-z0-9-]*$/`), not a closed enum. New relationship strings introduced by this design: `governs`, `models`, `assesses`, `validates`, `traces` (alongside the existing `part-of`, `informs`, `supersedes`, `tests`, `produced-by`, `resulted-in`).

### `src/twin/from-state.ts` — new optional input fields

`TwinStateInput` gains six new **optional** fields (optional so a project without governance/domain/design/strategy/traceability configured still produces a valid, unbroken twin — matching the existing lazy/optional pattern used throughout this codebase for domains that may not be initialized):

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

Projection logic added to `projectStateToTwin`:

- **Work rename** (existing logic, types corrected): `phases.map(item => workNode(item, "phase"))`, `tasks.map(item => workNode(item, "task"))`, `issues.map(item => workNode(item, "issue"))`.
- **Constitution**: one node per `constitution.rules[]` entry (`id`, `type: "constitution"`, `title: rule.title`, `source: ".autoforge/governance/constitution.json"`, `updatedAt: constitution.updatedAt`). Edge `governs` from each rule to every work item it applies to, computed via `selectApplicableRules(constitution, { workKind, tags, ... })` (`src/governance/evaluate.ts` — already exported, already used by orchestration for exactly this purpose) called once per work item with that item's own kind/tags as input, rather than `evaluateGovernance` (which additionally requires an `objective` string and computes pass/warning/conflict/blocked status — unnecessary for a structural "does this rule apply" edge). Reuse `selectApplicableRules` directly; do not re-derive scope-matching logic.
- **Domain**: one node per `domain.concepts[]` entry (`id`, `type: "domain"`, `title: concept.name`, `source: ".autoforge/domain/artifact.json"`, `updatedAt`: derived from the concept's own data or artifact's `updatedAt` if the concept has none). Edges directly from `domain.relationships[]` (`sourceId`/`targetId`/`type` map straight onto `twinEdgeSchema`). Additional `models` edge from each concept to `provenance[].sourceId` when `provenance[].sourceType` is `"decision"` or `"specification"`.
- **Specifications**: one node per specification using its own `type` field directly as the twin node type (collision-free after the rename above) — `id`, `title: name ?? id`, `source: specification's own source metadata`, `updatedAt`. Edges from each specification's existing relationship data (already modeled in `specifications/schemas.ts`) using relationship `specifies` when no more specific existing relationship name applies.
- **Strategy**: one node per **active-status** assessment only (superseded assessments are historical, not part of the current model) — `id`, `type: "strategy"`, `title: "<decision label>: <workId>"`, `source: ".autoforge/learning/strategy.json"`, `updatedAt`. Edge `assesses` → `workId`; edge `resulted-in` → `resultingDecision` (mirrors the existing evidence → decision edge exactly, same relationship name, for consistency).
- **Traceability**: no new nodes (traceability connects nodes already in the graph). Edge `traces` for every `traceGraph.links[]` entry whose `sourceId` and `targetId` both correspond to an already-projected node id — links referencing artifacts the twin hasn't modeled (e.g. bare file paths) are silently skipped, not treated as errors, since traceability may reference more than the twin currently represents.
- **Validation evidence**: one node per record — `id`, `type: "validation-evidence"`, `title: "<gateId> (<status>)"`, `source: ".autoforge/quality/evidence.json"`, `updatedAt: capturedAt`. Edge `validates` → `workId` when present; edge `traces` for each id in `traceIds` when that id corresponds to an already-projected node.

### `autoforge why` — surfacing validation evidence

`src/commands/why.ts`'s `formatDecisionMatches` gains a `Validation: <gateId> (<status>)` line beneath a matched decision, appended the same way the `Evidence:` line was added earlier this session: `runWhyCommand` additionally reads `ValidationEvidenceStore`, groups records by `workId`, and looks up records whose `workId` intersects the matched decision's `relatedWork`. This is read-only and additive — no schema change to `ValidationEvidence` or `Decision` is needed, since the link is derived by matching `workId` rather than a stored foreign key.

## CLI Surface

**No new commands.** `autoforge twin generate` (`src/commands/twin.ts`) gains six additional store reads, run in parallel alongside the existing five, and passes the results through to `projectStateToTwin`:

```ts
const constitutionStore = new ConstitutionStore(project.path);
const domainStore = new DomainStore(project.path);
const specifications = new SpecificationRegistry(
  new SpecificationFileStore(project.path),
);
const strategyStore = new StrategyStore(project.path);
const traceabilityStore = new TraceabilityStore(project.path);
const validationEvidenceStore = new ValidationEvidenceStore(project.path);

const [
  constitution,
  domain,
  specificationList,
  strategyState,
  traceGraph,
  validationEvidenceState,
] = await Promise.all([
  constitutionStore.load(),
  domainStore.load(),
  specifications.list(),
  (async () => {
    await strategyStore.ensure();
    return (await strategyStore.state.read()).state.data;
  })(),
  traceabilityStore.read(),
  validationEvidenceStore.read(),
]);
```

`autoforge twin query --type <type>` and `--relationship <name>` already accept arbitrary values validated against the (now-extended) `twinNodeTypeSchema` / free-form relationship string — no changes needed to `query.ts` itself. `--type strategy`, `--type constitution`, `--type validation-evidence`, `--type trace-link`, `--type phase`/`task`/`issue` all work automatically once the schema and projection are extended.

`src/commands/why.ts` gains the `ValidationEvidenceStore` read described above; no new flags.

## Error Handling & Validation

- Every new `TwinStateInput` field is optional; `projectStateToTwin` must treat `null`/`undefined` identically to "no records of that kind" (empty node/edge contribution), never throwing.
- Traceability and validation-evidence edges referencing a node id not present in the graph are silently dropped (not an error) — traceability's referenced universe is not guaranteed to be a subset of the twin's modeled universe.
- `twin generate` continues to succeed even when `constitution`/`domain` are uninitialized (`.load()` already returns `null` per the existing "project-scoped single-file stores must resolve null instead of throwing ENOENT" decision from earlier project history) — no new error paths introduced.
- `governanceRule` → work-item matching reuses `evaluateGovernance`'s existing matching semantics exactly; this design does not re-specify or alter governance-scope matching rules.

## Testing Plan

Golden tests in `test/twin-from-state.test.ts` (extending existing coverage) and `test/why.test.ts` (extending existing coverage):

1. Each new input type (constitution, domain, specifications, strategy, traceability, validation evidence), when present, produces exactly the expected nodes/edges.
2. Each new input type, when absent (`null`/`undefined`/empty), contributes zero nodes/edges and does not throw.
3. Superseded strategy assessments are excluded from twin projection; only the active one for a given `workId` appears.
4. A traceability link or validation-evidence `traceIds` entry referencing an unmodeled node id is silently skipped, not an error.
5. Regression: existing phase/task/issue projection assertions updated to expect `"phase"`/`"task"`/`"issue"` instead of `"flow"`/`"work"`/`"risk"`; a design specification of type `"flow"` and a work phase coexist in one projection without id or type collision.
6. `autoforge twin query --type strategy` / `--type constitution` / `--type trace-link` / `--type validation-evidence` each return only their own node type, via the command layer (`test/twin-command.test.ts` or equivalent, extending existing coverage).
7. `autoforge why`: a decision whose `relatedWork` overlaps a `ValidationEvidence.workId` shows the `Validation: <gateId> (<status>)` line; absent when no validation evidence references the matched decision's related work.

## Documentation Impact

- `docs/AUTOFORGE_CLI_REFERENCE.md` — the `autoforge twin query --type <type>` line already documents `--type` generically; no textual change strictly required, but worth a one-line addition noting the twin now includes governance, domain, design, strategy, and traceability data alongside work/decisions/evidence.
- `dev/AUTOFORGE_NORTH_STAR_REVISED_POST_V0.14_TO_V0.25.md` — no change needed; v0.24 is already fully specified there at the mission-statement level this design implements.
- `CHANGELOG.md` — new "Continuous Product Evolution Engine" entry at release time, following the v0.22.0/v0.23.0 entries' format.

## Out of Scope (for this first cut)

- No new `autoforge` commands. This milestone is entirely integration/wiring of existing domains into the existing twin and `why` surfaces.
- No automatic decision-writing from `gate check` — matches the v0.23 precedent that routine activity should not be forced into becoming a durable decision; a human who wants to record an architectural response to a validation failure still runs `autoforge decide` explicitly.
- No changes to `orchestrate`'s existing governance-consumption logic (`src/orchestration/context.ts`) — confirmed already correctly wired during the pre-design audit; out of scope because it isn't broken.
- No traceability _authoring_ changes (`autoforge trace add` and its validation stay as-is) — only _projecting_ existing traceability links into the twin is in scope.
- No new evidence-kind added to `learning/evidence-schemas.ts`'s `EvidenceKind` enum for validation results — `ValidationEvidence` remains its own record type in `src/quality/`, connected to the rest of the loop via twin projection and `why` surfacing rather than by merging into the learning-evidence domain's schema.
