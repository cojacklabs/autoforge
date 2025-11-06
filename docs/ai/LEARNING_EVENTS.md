# Learning Events Schema

This document standardizes how agents log outcomes so AutoForge can learn from past mistakes and improve over time.

## Purpose

- Capture what happened (who, what, when), the result, and any human feedback.
- Build a dataset for evaluations and future prompt/model improvements.
- Enable simple analytics: defect types, stage hotspots, regression trends.

## Where to Log

- Append JSON Lines (one JSON object per line) to `ai/logs/activity.jsonl` inside the AutoForge directory (embedded installs: `./.autoforge/ai/logs/activity.jsonl`).
- Agents should emit at least one event per stage, and an additional event when escalating or receiving human feedback.

## JSON Schema (logical)

```
{
  "task_id": "CR-2025-42",           // change request or session id
  "agent_id": "qa_engineer",         // matches ai/agents.yaml
  "recipe": "web_app",               // optional: selected recipe name
  "stage": "qa",                     // optional: stage id from recipe
  "inputs": ["api/openapi.yaml"],     // key inputs that influenced the decision
  "decision": "tests_passed",         // short label for the outcome
  "outcome": "success|failure|halted",
  "severity": "none|low|medium|high|critical", // if failure/halt
  "error_taxonomy": ["contract_mismatch"],     // repeatable labels
  "human_feedback": "NO-GO due to failing smoke test.",
  "artifacts": ["ai/logs/test_runs/latest_report.md"],
  "timestamp": "2025-10-28T18:22:10Z"
}
```

Notes:

- For privacy, do not include secrets or raw PII in events. Refer to artifacts instead.
- Normalize `error_taxonomy` across agents (examples below) so analytics remain coherent.

## Error Taxonomy (starter)

- planning_missing_prd
- blueprint_contract_mismatch
- tests_missing_or_flaky
- ci_pipeline_break
- security_policy_violation
- performance_budget_exceeded
- observability_gap
- deployment_failure

## Minimal Examples

```
{"task_id":"CR-2025-42","agent_id":"product_manager","decision":"spec_updated","outcome":"success","timestamp":"2025-10-28T18:02:00Z"}
{"task_id":"CR-2025-42","agent_id":"qa_engineer","decision":"tests_failed","outcome":"failure","severity":"high","error_taxonomy":["tests_missing_or_flaky"],"artifacts":["ai/logs/test_runs/latest_report.md"],"timestamp":"2025-10-28T18:21:33Z"}
{"task_id":"CR-2025-42","agent_id":"mastermind_coordinator","decision":"escalated","outcome":"halted","human_feedback":"NO-GO until smoke passes","timestamp":"2025-10-28T18:22:10Z"}
```

## Reporting

- Summarize outcomes under `ai/reports/learning/` (e.g., weekly `summary_YYYYMMDD.md`).
- Include top errors, impacted stages, and proposed fixes (prompt changes, gates, checklists).

## Next Steps

- Export corpus for evaluations via scripts (train/eval datasets) and run dry-run evals to track improvements.
- See `docs/ai/EVALS.md` (once added) for running evaluations.
