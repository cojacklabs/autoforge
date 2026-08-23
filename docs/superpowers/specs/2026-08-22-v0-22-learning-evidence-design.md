# v0.22 — Learning & Evidence Engine — Design

**Date:** 2026-08-22
**Status:** Approved, pending implementation plan

## Problem

AutoForge's north-star roadmap (`dev/AUTOFORGE_NORTH_STAR_REVISED_POST_V0.14_TO_V0.25.md`,
§"v0.22 — Learning & Evidence Engine") defines the next milestone after
v0.21 as bringing observed real-world evidence back into durable project
knowledge, following the canonical relationship:

```text
hypothesis → feature → experiment → evidence → decision → updated specification
```

AutoForge already has durable `features`, `decisions` (with `relatedWork`
linking), `traceability` (v0.18), and a digital twin (v0.20). It has no
concept of a hypothesis, an experiment, or product-facing evidence
(analytics, beta feedback, support tickets, bug reports, usability
studies, performance metrics, interviews, AI evaluations). Note this is
distinct from `src/quality/evidence.ts` (v0.19), which tracks pass/fail/
skip results against AutoForge's own quality gates — that module keeps its
existing name and scope unchanged.

## Non-Goals

- **No release-tracking domain.** The spec's dependency list mentions
  "traceable releases," but AutoForge has no dedicated release/version
  entity today. This milestone does not add one — evidence links to the
  decision or work item that produced a change, and release context comes
  from existing git tags and `CHANGELOG.md`.
- **No analytics ingestion pipeline.** Evidence is manually or agent
  recorded (e.g. "here's what a beta user said," "here's what the
  telemetry showed"), not auto-scraped from a live product's real
  monitoring/analytics system. Building an ingestion integration is a
  future concern, not this milestone.
- **No automatic hypothesis-status inference.** `confirmed`/`refuted`
  transitions are explicit human/agent judgment calls recorded via the
  CLI, never automatically derived from evidence volume or thresholds.

## Design

### 1. Three new domains, following the existing `decisions` module's proven pattern

Module directory: `src/learning/` (not `src/evidence/`, since
`src/quality/evidence.ts` already owns that name for an unrelated concept
— same collision-avoidance reasoning applied to the CLI surface below).

**`src/learning/hypothesis.ts`** — schema + store, mirroring
`src/decisions/schemas.ts`/`store.ts`:

```text
Hypothesis
  id: hypothesis.<slug>
  statement: string (1-2000 chars)
  expectedOutcome: string (1-2000 chars)
  metric: string (1-200 chars)       — free-text, e.g. "activation rate"
  target: string (1-200 chars)       — free-text, e.g. ">= 40% within 7 days"
  linkedFeature: relatedWorkId | null
  status: proposed | testing | confirmed | refuted
  createdAt / updatedAt: timestamp
```

`metric`/`target` are deliberately free-text strings, not a structured
comparator/value pair — this must cover both quantitative signals
("activation rate >= 40%") and qualitative ones ("users stop reporting
confusion about X"), and a typed numeric comparator would force every
hypothesis into a shape that doesn't fit the qualitative case.

**`src/learning/experiment.ts`** — schema + store:

```text
Experiment
  id: experiment.<slug>
  hypothesisIds: string[] (min 1)    — an experiment may test multiple hypotheses
  method: string (1-500 chars)       — e.g. "A/B test", "user interview", "beta rollout"
  status: planned | running | completed | abandoned
  startedAt: timestamp
  endedAt: timestamp | null
  createdAt / updatedAt: timestamp
```

**`src/learning/evidence.ts`** — schema + store (this is the new,
product-facing "evidence," distinct from `src/quality/evidence.ts`):

```text
Evidence
  id: evidence.<slug>                — NOTE: distinct ID namespace from
                                        quality evidence, which uses
                                        gate-scoped IDs; no collision risk
                                        since these live in separate stores
  kind: analytics | beta-feedback | support-ticket | bug-report |
        usability-study | experiment-result | performance-metric |
        interview | ai-evaluation
  summary: string (1-4000 chars)
  source: string (1-500 chars)       — e.g. "Beta cohort #3", "Support ticket #4821"
  experimentId: string | null
  hypothesisId: string | null        — set directly when no experiment exists
  relatedWork: relatedWorkId | null  — direct feature/task link, for ad hoc
                                        evidence with no formal experiment
  resultingDecision: string | null   — decision.<slug>, stamped by `decide --evidence`
  capturedAt: timestamp
```

Evidence does **not** require an `experimentId`. Most real-world evidence
(an unsolicited bug report, a support ticket) never originates from a
planned experiment — requiring one would exclude exactly the kind of
signal this milestone exists to capture. Evidence must have at least one
of `experimentId`, `hypothesisId`, or `relatedWork` set, and may have more
than one simultaneously (e.g. evidence tied to both an experiment and a
directly related task) — the constraint is "not all three null," not
"exactly one." Validated via `superRefine`, matching the pattern already
used in `decisionMemorySchema`'s cross-field validation. The CLI's
`evidence add` therefore accepts `--experiment`/`--hypothesis`/`--work` as
three independent optional repeatable-once flags, not a mutually
exclusive choice.

### 2. Closing the loop: evidence → decision

`autoforge decide` gains a new repeatable `--evidence <id>` flag (same
parsing pattern as the existing `--work` flag in
`src/commands/decide.ts`). After a decision is recorded,
`DecisionService.record()` stamps `resultingDecision: <new-decision-id>`
on every referenced evidence record via the evidence store, making the
full chain mechanically traceable — not just linkable by convention.

`autoforge why`'s search (`src/decisions/search.ts`) is unaffected in its
own scope but a small addition surfaces the connection: when a matched
decision has evidence records pointing at it via `resultingDecision`,
`formatDecisionMatches()` includes an `Evidence: <id>, <id>` line, so a
human/agent asking "why was this decided" sees not just the decision's own
`reasoning` text but the concrete evidence that prompted it.

### 3. CLI surface

New top-level `autoforge learning` command family:

```text
autoforge learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <id>]
autoforge learning hypothesis list [--status <status>]
autoforge learning hypothesis show <id>
autoforge learning hypothesis status <id> --status <proposed|testing|confirmed|refuted>

autoforge learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text>
autoforge learning experiment list [--status <status>]
autoforge learning experiment show <id>
autoforge learning experiment complete <id>

autoforge learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <id>]
autoforge learning evidence list [--kind <kind>]
autoforge learning evidence show <id>
```

`autoforge decide` gains `--evidence <id>` (repeatable), documented
alongside the existing `--work`/`--kind` flags in `src/cli/help.ts`.

### 4. Digital twin integration

Per the spec's stated dependency on "digital-twin state," the twin
projection (`src/twin/projection.ts`) gains hypothesis/experiment/evidence
as new node types, queryable the same way existing twin nodes are (e.g.
"what evidence exists for this feature," "which hypotheses are still
`testing`"). This reuses the twin's existing node/edge model — no new
graph, consistent with the twin's own "not a separate database" invariant
from the north-star doc.

## Testing

- **Schema validation**: each of the three new schemas — valid-input
  round-trip, the `metric`/`target` free-text acceptance, the evidence
  cross-field `superRefine` (at least one of experiment/hypothesis/work
  set; reject an evidence record with all three null).
- **Store round-trip + empty-state**: matching this session's established
  convention — `read()`/equivalent resolves `null` on `ENOENT`, never
  throws, for a project where the domain has never been initialized.
- **Command tests**: one per verb (add/list/show/status/complete) across
  all three new command families, plus `decide --evidence` stamping
  `resultingDecision` correctly and rejecting an unknown evidence ID.
- **Integration test — the full chain**: create a hypothesis, an
  experiment testing it, evidence linked to that experiment, a decision
  referencing that evidence via `--evidence`, and confirm
  `resultingDecision` is populated and `autoforge why` surfaces the
  evidence line for that decision.
- **Twin integration**: `twin generate` includes hypothesis/experiment/
  evidence nodes; `twin query` can filter by these new node types.

## Rollout

Implemented as AutoForge work on itself, tracked through the normal
`autoforge add` → `autoforge start` → `autoforge decide` (linked) →
`autoforge done` lifecycle, per the documentation gate shipped earlier
this session. Ships as v0.22.0 once the full chain (hypothesis through
`decide --evidence`) is implemented, tested, and self-exercised against
this project's own work — mirroring how the documentation-gate and
live-issue-fixes bodies of work each closed by exercising themselves
against AutoForge's own live state before release.
