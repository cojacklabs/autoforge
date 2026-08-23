# v0.23 — Product Strategy & Prioritization Engine — Design

**Date:** 2026-08-23
**Status:** Approved design, pending implementation plan
**North-star reference:** `dev/AUTOFORGE_NORTH_STAR_REVISED_POST_V0.14_TO_V0.25.md`, Section 6, "v0.23 — Product Strategy & Prioritization Engine"

## Overview

A new durable-memory domain, `strategy`, lets a human record an explainable, multi-factor judgment on any work item (feature, phase, task, or issue) — _"what should we consider doing next, and why"_ — without AutoForge ever computing a blended numeric score or making the call itself. This directly answers the north-star's v0.23 question while staying clear of v0.21's `orchestrate prioritize`.

### Relationship to `orchestrate prioritize` (v0.21)

`orchestrate prioritize <work-id> <0-100>` is a narrow scheduling tiebreaker: a single integer baked onto an `OrchestrationNode`, consumed only by `compareReady()` to decide which _already-orchestrated_ task an agent should claim next. It carries no rationale, no factors, and only applies to work that has entered an active orchestration plan.

v0.23's strategy assessments are a different question — a human-facing, multi-factor, explainable judgment that can apply to _any_ work item regardless of orchestration status, including features that aren't ready for execution scheduling at all. Merging the two would conflate "what should a human strategically consider" with "what should an agent mechanically claim next."

**Decision:** these stay separate. `strategy` is a new, independent domain and command family. `orchestrate prioritize` is unchanged. A human may read a strategy assessment's rationale and then separately choose to bump an item's orchestration priority once it enters active execution — the two mechanisms compose rather than merge.

## Data Model

New module `src/strategy/`, mirroring the structure of `src/learning/` (hypothesis/experiment/evidence).

### `src/strategy/strategy-schemas.ts`

```ts
strategyFactorLevelSchema = z.enum(["low", "medium", "high", "uncertain"]);

strategyDecisionSchema = z.enum(["now", "next", "later", "backlog"]);

strategyIdSchema: /^strategy\.[a-z0-9][a-z0-9._-]*$/

strategyAssessmentSchema = {
  id: strategyIdSchema,
  workId: <feature|phase|task|issue reference>,   // reuses the existing relatedWorkIdSchema pattern from evidence-schemas.ts
  factors: {
    alignment: strategyFactorLevelSchema,
    value: strategyFactorLevelSchema,
    risk: strategyFactorLevelSchema,
    cost: strategyFactorLevelSchema,
    evidenceStrength: strategyFactorLevelSchema,
    dependencyPressure: strategyFactorLevelSchema,
    complexity: strategyFactorLevelSchema,
    releaseConstraint: strategyFactorLevelSchema,
  },
  decision: strategyDecisionSchema,
  rationale: z.string().trim().min(1).max(4_000),
  evidenceIds: z.array(evidenceIdSchema),          // may be empty
  resultingDecision: decisionIdSchema.nullable(),  // stamped after the linked decision write succeeds
  supersedes: strategyIdSchema.nullable(),
  status: z.enum(["active", "superseded"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}
```

All eight factors share one uniform scale (`low | medium | high | uncertain`). `uncertain` is a first-class, honest answer — strategic calls are often made with incomplete information, and the north-star's own worked example uses "uncertain" for candidate-value.

### `src/strategy/strategy-store.ts`

`StrategyStore`, same `AtomicStateStore` + `ensure()` pattern as `EvidenceStore`. Persisted at `.autoforge/learning/strategy.json`, colocated with `hypothesis.json`/`experiment.json`/`evidence.json` since strategy assessments are conceptually part of the same "bring reality back into project knowledge" family, and it avoids introducing a new top-level state directory.

### `src/strategy/strategy-service.ts`

`StrategyService.assess(input)`:

1. Validate `workId` against the work store (same `workIds()` helper pattern as `EvidenceService`).
2. If `evidenceIds` provided, validate via `EvidenceService.assertEvidenceExists()`.
3. If `supersedes` provided, validate the target assessment exists and is currently `active`; mark it `superseded` in the same write.
4. Allocate an id via slugified `workId` + date, with numeric-suffix collision handling (same pattern as `allocateEvidenceId`).
5. Persist the new assessment with `status: "active"`, `resultingDecision: null`.
6. **Always** call `DecisionService.record()` to write a linked decision:
   - `statement`: `"<workId>: strategic assessment recommends <decision>"`
   - `reasoning`: the assessment's `rationale` verbatim
   - `consequences`: one deterministic line summarizing the eight factors (e.g. `"alignment=low, value=uncertain, risk=high, cost=medium, evidenceStrength=low, dependencyPressure=low, complexity=medium, releaseConstraint=low"`)
   - `relatedWork`: `[workId]`
   - `keywords`: `["strategy", decision]`
   - `evidence`: the assessment's `evidenceIds` (so the decision also gets `resultingDecision` stamped onto that evidence, reusing existing plumbing)
7. Stamp the new decision's id onto the strategy assessment's `resultingDecision` field.

This uniformly links every assessment (including `backlog`/`later` calls) to a decision. `autoforge why` will therefore surface routine strategy calls alongside architecture/bugfix decisions — an accepted tradeoff in favor of a single, consistent code path over conditional linkage logic.

`StrategyService.assertAssessmentExists()` / `history(workId)` support the CLI's `show`/`history` commands by walking the `supersedes` chain.

## CLI Surface

New command file `src/commands/strategy.ts`, registered in `src/cli/index.ts` alongside `learning-evidence`, following its argument-parsing and error-reporting conventions exactly (`usageError`, `EXIT_CODE`, `reportCommandError`).

```bash
autoforge strategy assess <work-id> \
  --alignment <low|medium|high|uncertain> \
  --value <low|medium|high|uncertain> \
  --risk <low|medium|high|uncertain> \
  --cost <low|medium|high|uncertain> \
  --evidence-strength <low|medium|high|uncertain> \
  --dependency-pressure <low|medium|high|uncertain> \
  --complexity <low|medium|high|uncertain> \
  --release-constraint <low|medium|high|uncertain> \
  --decision <now|next|later|backlog> \
  --rationale <text> \
  [--evidence <evidence-id>...] \
  [--supersedes <strategy-id>]

autoforge strategy list [--decision <now|next|later|backlog>] [--work <work-id>]
autoforge strategy show <strategy-id>
autoforge strategy history <work-id>
```

- `assess` requires all eight factors, `--decision`, and `--rationale` — no partial assessments. This matches `autoforge decide`'s all-required-fields convention, keeps every assessment comparable in `list`, and forces a genuinely complete strategic read before one is recorded. Missing any required flag is a usage error naming the missing option, identical to `decide.ts`'s validation.
- `list` defaults to showing only `status: "active"` assessments (the latest per work item), sorted by `updatedAt` descending. `--decision` filters by label; `--work` filters to one work item's current assessment.
- `show <strategy-id>` renders one assessment's full factor breakdown, decision, rationale, evidence ids, and superseded-by/supersedes links (same rendering shape as `formatDecisionMatches`).
- `history <work-id>` walks the `supersedes` chain for one work item, newest first — the strategy-domain equivalent of `why --history`.

## Context Packet Integration

When the active work item (feature, phase, task, or issue) has an `active`-status strategy assessment, the context packet includes a new `## Strategy Assessment` block — factors, decision, rationale, and evidence ids — using the same scored/explained inclusion-reason treatment `src/context/packet.ts` already applies to decisions (`renderDecisions`), not an unconditional dump. This requires:

- A `renderStrategy(selection)` function in `src/context/packet.ts`, alongside `renderDecisions`.
- A strategy-selection step in the context resolver (wherever decisions are currently selected relative to the active work item) that looks up the active work's latest assessment, if any, and includes/excludes it with an explain-log reason exactly like every other selected/excluded source today.

Exact resolver wiring (which file currently performs decision selection, and how strategy selection should be threaded through it) is implementation detail for the plan, not the design.

## Error Handling & Validation

- Unknown `workId` → `INVALID_ARGUMENT` (mirrors `EvidenceService`'s error helper).
- Unknown `--evidence` id → `INVALID_ARGUMENT`, validated before any write (reuses `EvidenceService.assertEvidenceExists`).
- Unknown `--supersedes` id, or superseding an assessment that is not currently `active` → rejected.
- Invalid factor or `--decision` enum value → CLI usage error naming the allowed values (same convention as `learning-evidence.ts`'s `--kind` validation).
- Missing any required flag → usage error naming the missing option, same convention as `decide.ts`.

## Testing Plan

Golden tests in `test/strategy-command.test.ts` and `test/strategy-service.test.ts`, following `test/decide.test.ts` / `test/why.test.ts` conventions:

1. Assessing an unknown work item is rejected before any write.
2. Assessing with an unknown `--evidence` id is rejected before any write.
3. A complete assessment persists, writes a linked decision, and that decision's id is stamped back onto the assessment's `resultingDecision`.
4. The linked decision's `evidence` stamps `resultingDecision` onto any referenced evidence records (reused evidence-service plumbing).
5. Superseding an assessment marks the prior record `superseded`; `history` returns both records, newest first.
6. Superseding an already-superseded or nonexistent assessment id is rejected.
7. `list` shows only active assessments by default; `--decision` and `--work` filter correctly.
8. `show` renders factors, decision, rationale, and evidence ids.
9. Each required flag, when omitted, produces a usage error naming that flag (`it.each`-style, matching `why.test.ts`'s invalid-argument table).
10. The context packet includes the active work item's active assessment when one exists, and excludes it (with a reason) when none exists — matching the existing Included/Excluded explain-log convention.

## Documentation Impact

- `docs/AUTOFORGE_CLI_REFERENCE.md` — add a `strategy` command family section, following the `learning` family's format.
- `CHANGELOG.md` — new "Product Strategy & Prioritization Engine" entry on release, following the `v0.22.0` entry's format and level of detail.
- `README.md` — no change expected; it does not enumerate every command family individually today.
- North-star docs — no change needed; v0.23 is already fully specified in the revised roadmap.

## Out of Scope (for this first cut)

- No automatic/derived numeric score. Categorical factors and a human-assigned decision label are the entire output — matching this project's own established decision that readiness/confidence must remain an explainable heuristic, never a claim of certainty.
- No automatic re-scoring or staleness detection when linked evidence changes after an assessment is recorded (a human must explicitly `--supersedes` to re-assess).
- No autonomous recommendation engine. AutoForge records and surfaces the assessment; it does not rank features against each other or suggest what to build next on its own — per the north-star's explicit invariant: "AutoForge informs prioritization. Humans remain responsible for strategy."
