# Governance, Session Policy, and Memory Enforcement

AutoForge v0.4 introduces strict governance, session rules, and enforced memory to reduce user reminders and protect IP.

## GovernancePolicy
- Mode: `strict` (local‑only), `supervised` (approval prompts), or `flexible`.
- Redaction: scrub PII/secrets from logs/reports/exports; maintain local reversible mapping (optional).
- Egress: allowed domains/tools; everything else requires approval and is logged.
- Data residency: store datasets locally by default; opt‑in export.

Example config:
```json
{
  "governance": {
    "mode": "strict",
    "redaction": { "pii": true, "secrets": true },
    "egress": { "allow": [], "requireApproval": ["uiux_inspiration"] },
    "dataResidency": "local"
  }
}
```

## SessionPolicy
- Roles: allowed adapters for the run.
- Artifacts: permitted inputs/outputs (by schema id).
- Pre‑step rules: must read memory, load relevant artifacts.
- Output rules: must validate schemas and pass quality gates.
- Repair: max attempts; then escalate.

Example config:
```json
{
  "sessionPolicy": {
    "roles": ["pm", "uiux", "engineer", "qa"],
    "artifacts": ["UserAsk.v1", "IssueReport.v1", "CodePlan.v1", "TestPlan.v1"],
    "preStepRules": ["readMemory", "loadRelevantArtifacts"],
    "outputRules": ["validateSchemas", "qualityGates"],
    "repair": { "maxAttempts": 2 }
  }
}
```

## Memory Enforcement
- Mandatory reads: session start, before role switch, pre‑codegen, pre‑approval, milestone completion.
- Delta writes: after each decision step, append decisions, assumptions, open questions to `ai/memory/{role}.md`; summarize to `ai/memory/global.md`.
- Retrieval hygiene: summarize long sections; link to history; prefer artifact references over raw dumps.

## Reporting & Cadence
- Progress: `ai/reports/progress_current.md` auto‑updated daily (configurable) and on task transitions.
- Tasklist: DAG view in `ai/reports/tasks_current.md` reflecting current status.
- Handover: milestone pack with scope, artifact inventory, decisions, runbooks, provenance hashes.

## Approvals and Auditing
- Any egress or high‑risk changes prompt for approval (mode‑dependent).
- IP ledger logs approvals, redactions, tool calls, gate results, and outcomes.

