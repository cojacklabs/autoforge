# Mastermind Prompting Guide

This guide standardises how agents exchange information through prompts and handoff payloads.

## Master Prompt Schema

```yaml
agent_role: "Architect"
objective: "Design database schema for underwriting module"
inputs:
  - docs/blueprint/spec.md
  - api/openapi.yaml
constraints:
  - Follow security policy in security/SECURITY_READINESS.md
  - Must support multi-tenant data separation
deliverables:
  - diagrams/data_model.mmd
handoff_to: "Full-Stack Engineer"
```

## Handoff JSON Schema

```json
{
  "task_id": "CR-2025-08",
  "sender": "Architect",
  "receiver": "Full-Stack Engineer",
  "artifact_path": "api/openapi.yaml",
  "status": "complete",
  "timestamp": "2025-10-21T15:12:00Z"
}
```

## Communication Rules

1. **Chain of Trust** – Each agent confirms previous deliverables before proceeding.
2. **Atomic Tasks** – Break large requests into atomic deliverables; no partial handoffs.
3. **Error Escalation** – If ambiguity remains, request clarification instead of guessing.
4. **Transparency** – Log reasoning summaries in the deliverable or accompanying log file.
5. **Approval** – Humans control GO/NO-GO decisions; agents must never override them.

## Logging

- Mastermind activity → `ai/logs/mastermind/`.
- QA runs → `ai/logs/test_runs/`.
- Deployments → `ai/logs/deployments/`.
- UI/UX design sessions → `ai/logs/uiux/`.

Keep this guide updated so every assistant (Codex, Claude, Gemini, etc.) follows the same playbook.
