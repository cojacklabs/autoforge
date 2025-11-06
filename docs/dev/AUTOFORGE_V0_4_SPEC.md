# AutoForge v0.4 — Prompt‑to‑Code with Governance, Memory, and Quality Gates

This specification consolidates the design for AutoForge v0.4. It delivers a true prompt‑to‑code experience with single‑context orchestration, strict governance, enforced memory use, and hard quality gates (TypeScript, ESLint, Prettier, and artifact syntax validation). It also defines telemetry for continuous learning while preserving IP confidentiality.

## Vision & Goals
- Prompt‑to‑code from minimal user input, with high reliability.
- Single‑context multi‑role orchestration (PM, UI/UX, Architect, Engineer, QA, Security, Perf, SRE).
- Governance‑first: approvals, redaction, data residency, and provenance.
- Enforced memory: agents must consult/update memory at checkpoints.
- Non‑negotiable quality gates on every patch: typecheck, lint, format, syntax validation.
- Continuous learning via fine‑grained telemetry and offline eval harnesses.

## Core Additions
1) Structured Artifacts (contract‑first)
- UserAsk.v1 (normalize prompts), IssueReport.v1 (triage), CodePlan.v1 (intended diffs), TestPlan.v1 (acceptance cases).
- Validated by JSON Schema during `autoforge validate` and throughout orchestration.

2) Session Policy & Governance
- SessionPolicy defines allowed roles, tools, artifacts, gates, egress, cadence.
- GovernancePolicy enforces approvals, redaction, and data residency; all egress is logged.

3) Memory Enforcement
- Mandatory reads at key gates (session start, role switch, before code writes, pre‑approval, milestone close).
- Delta writes after each decision step to role/global memory; summarized for retrieval.

4) Quality Policies (Hard Gates)
- TypeScript `tsc --noEmit` (or `npm run typecheck`) must pass.
- ESLint must pass with `--max-warnings=0` (or repo policy).
- Prettier must pass `--check` (auto‑fix if allowed by policy).
- JSON/YAML/MD/OpenAPI artifacts parsed and validated before landing.

5) Orchestrator (Single‑Context Runtime)
- Coordinator mounts role adapters inside one session; plans as a DAG; shares a typed Workspace (artifact store, task queue, scratchpads).
- Minimal role set at first (PM + UI/UX + Engineer + QA) then expand.

6) Telemetry & Datasets
- IP‑safe ledger logs decisions with role, inputs/outputs, gates run, approvals, costs, outcomes.
- Dataset exporter builds supervised/preference/repair datasets for prompt/model improvements.

7) Reporting & Handover
- Auto progress reports and milestone handover packs with provenance hashes.
- Confident, minimal prompts to the user; ask only on low‑confidence or governance events.

8) Context Load Experience
- Full orchestrator prompt lives in `.autoforge/ai/prompts/orchestrator_context.md`.
- Users copy a tiny stub from `.autoforge/ai/prompts/load_stub_prompt.txt` into their AI IDE, then paste the full context.
- This keeps policies versioned in‑repo, avoids mega copy/paste, and works across IDEs without file access.

## Config Surface (Proposed)
Add to `autoforge.config.json`:

```json
{
  "qualityPolicies": {
    "typecheck": { "cmd": "npm run typecheck", "required": true },
    "lint": { "cmd": "npm run lint", "maxWarnings": 0, "required": true },
    "format": { "cmdCheck": "npm run format:check", "cmdWrite": "npm run format", "allowWrite": true },
    "docs": { "jsonSchema": true, "yamlLint": true, "markdownLint": true, "openapiLint": true },
    "tests": { "cmd": "npm test -s", "runOnChanged": true }
  },
  "governance": {
    "mode": "strict",
    "redaction": { "pii": true, "secrets": true },
    "egress": { "allow": [], "requireApproval": ["uiux_inspiration"] },
    "dataResidency": "local"
  },
  "cadence": { "progress": "daily", "milestoneHandover": true },
  "sessionPolicy": {
    "roles": ["pm", "uiux", "engineer", "qa"],
    "artifacts": ["UserAsk.v1", "IssueReport.v1", "CodePlan.v1", "TestPlan.v1"],
    "preStepRules": ["readMemory", "loadRelevantArtifacts"],
    "outputRules": ["validateSchemas", "qualityGates"],
    "repair": { "maxAttempts": 2 }
  }
}
```

## Workflow (UX Complaint Example)
1. Normalize ask → UserAsk.v1; fill slots with assumptions or 1–2 clarifiers.
2. Triage → IssueReport.v1 (components, repro, expected vs. observed).
3. PM/UIUX produce CodePlan.v1 + TestPlan.v1; validate contracts.
4. Engineer applies minimal diffs; run Prettier → ESLint → TypeScript; fix if allowed.
5. QA runs acceptance checks (including visual/a11y if configured); update IssueReport to resolved.
6. Auto‑update memory, task DAG, progress report; if milestone, generate Handover pack.

## Milestone Plan
- M0 Foundations: initial schemas; plan docs; wire schema validation to `validate`.
- M1 Contract‑First: generate CodePlan/TestPlan from UserAsk, enhanced logs.
- M2 Single‑Context: coordinator + PM/UIUX adapters; DAG plan; shared workspace.
- M3 Proactive UX: inspiration connectors (approval‑gated), DesignSpec/StyleGuideDiff schemas.
- M4 Code & Checks: apply diffs; fast gates; QA validation; handover v1.
- M5 Training/Eval: dataset exporter; golden tasks in CI; orchestrator prompt/model distillation.

## Security & IP
- Strict governance mode by default; all egress approval‑gated and logged.
- Redaction filters for PII/secrets on any report or export; local dataset generation by default.
- Provenance: hash/sign artifacts and include in handover packs.

## References
- Prompt‑to‑Code plan: docs/PROMPT_TO_CODE_IMPLEMENTATION_PLAN.md
- Quality policies: docs/QUALITY_POLICIES.md
- Governance & memory: docs/GOVERNANCE_AND_MEMORY.md
 - Load flow: docs/LOAD_FLOW.md
