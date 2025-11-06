# Prompt-to-Code Implementation Plan

Goal: Deliver a true prompt-to-code experience with minimal user burden by running a single-context, multi-role orchestrator that auto-enriches missing details, produces structured artifacts, and turns them into validated code and tests. The system logs fine-grained telemetry to continuously train better orchestration behavior.

## Principles
- Single context runtime with role adapters (PM, UI/UX, Architect, Eng, QA, Sec, Perf, SRE).
- Contract-first: structured artifacts (schemas) gate each stage before codegen.
- Minimal questioning: infer defaults; ask only high-signal clarifiers on low-confidence slots.
- Proactive research: role adapters may gather inspiration/patterns with explicit approval when needed.
- Tight plan–code loop: CodePlan + TestPlan approved before any code writes.
- Continuous learning: attribute outcomes to decisions; export datasets for model improvement.

## Milestones

### M0 — Foundations (This PR)
- Add initial schemas: UserAsk, IssueReport, CodePlan, TestPlan.
- Document end-to-end plan and deliverables.

### M1 — Contract-First Workflow
- Implement validation step in `npx autoforge validate` for the new schemas.
- Add generators to produce CodePlan + TestPlan from a UserAsk and repo context (no code writes yet).
- Enhance logs (`ai/logs/activity.jsonl`) to include: step_id, parent_step_id, role, input_artifacts[], output_artifacts[], token_cost, evaluator_scores, outcome.

### M2 — Single-Context Orchestrator
- New module: `ai/runtime/coordinator` to run one persistent session with role adapters.
- Parse a recipe into a DAG; manage a shared Workspace (document store, task queue, scratchpads).
- Implement role adapters for PM and UI/UX to demonstrate: ask normalization → UX proposal → CodePlan/TestPlan.

### M3 — Proactive Research & UX Flow
- UI/UX adapter: inspiration connectors (behind approval), extracting tokens, motifs, patterns.
- Produce DesignSpec + StyleGuideDiff artifacts (schemas v1); generate component/token diffs.
- Add visual and accessibility test cases to TestPlan; optional snapshot harness stub.

### M4 — Code Application & Fast Checks
- Engineer adapter applies CodePlan changes to configured `codeTargets`.
- Run fast checks (lint/type/unit/a11y/visual snapshots) and attach results to telemetry.
- QA adapter validates acceptance criteria; IssueReport moves to resolved.

### M5 — Training & Evaluation
- Dataset exporter: transform telemetry + artifacts into supervised, preference, and repair datasets.
- Basic eval harness with golden tasks (web, mobile, analytics) in CI; track success, token cost, human interventions.
- Distill a generalist orchestrator prompt/model from successful traces.

## Deliverables & Interfaces
- Schemas (JSON Schema draft-07):
  - `ai/schemas/UserAsk.v1.json`
  - `ai/schemas/IssueReport.v1.json`
  - `ai/schemas/CodePlan.v1.json`
  - `ai/schemas/TestPlan.v1.json`
- Runtime (planned):
  - `ai/runtime/coordinator.(ts|js)` — Orchestrator core
  - `ai/runtime/adapters/{pm,uiux,engineer,qa}.(ts|js)` — Role adapters
  - `ai/runtime/telemetry.(ts|js)` — JSONL event writer
- Tooling:
  - `scripts/export_datasets.(js|ts)` — Build training datasets
  - `qa/goldens/prompt_to_code/` — Golden tasks for eval

## Telemetry: Minimal Event Schema (for implementation)
```
{
  "step_id": "uuid",
  "parent_step_id": "uuid|null",
  "role": "pm|uiux|architect|engineer|qa|security|perf|sre",
  "intent": "ux|bug|feature|...",
  "input_artifacts": ["UserAsk:...", "IssueReport:..."],
  "output_artifacts": ["CodePlan:...", "TestPlan:..."],
  "tools": ["static_analyzer", "ui_snapshot"],
  "evaluator_scores": { "a11y": 0.92, "snapshot_diff": 0.01 },
  "token_cost": 1234,
  "outcome": "pass|fail|partial",
  "notes": "short rationale or error"
}
```

## Risks & Mitigations
- Schema rigidity: versioned schemas and repair loops; allow best-effort generation.
- Context bloat: summarize and use deltas; retrieve only relevant artifact slices.
- Overhead: cache validated artifacts by hash; reuse per-step context.

## Next Actions (suggested order)
1) Wire schema validation into `validate` and create a small CLI to generate CodePlan/TestPlan from a UserAsk.
2) Add structured logging to `ai/logs/activity.jsonl` following the telemetry schema.
3) Implement the single-context coordinator stub and PM/UIUX adapters focused on UX complaints.
4) Introduce UX research connectors (approval-gated) and DesignSpec/StyleGuideDiff schemas.
5) Apply code diffs with fast checks; land QA validation and minimal visual/a11y harness.
6) Export datasets, add golden tasks, and track metrics in CI.

