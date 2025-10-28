# Agent Network

This document summarizes the autonomous roles that collaborate on the ROS AI platform. Each role maps to a prompt in `ai/prompts/` and a permission set in `ai/agents.yaml`.

| Order | Agent ID               | Primary Objective                                            | Handoff                |
| ----- | ---------------------- | ------------------------------------------------------------ | ---------------------- |
| 1     | discovery_researcher   | Investigate new ideas, compile feasibility analyses          | product_manager        |
| 2     | product_manager        | Translate ideas/requests into blueprints and PRD updates     | architect              |
| 3     | architect              | Design systems, diagrams, and API deltas                     | fullstack_engineer     |
| 4     | fullstack_engineer     | Implement code, migrations, and automated tests              | qa_engineer            |
| 5     | qa_engineer            | Validate functionality, performance, and regression safety   | security_engineer      |
| 6     | security_engineer      | Run threat modeling, dependency audits, and policy checks    | devops_engineer        |
| 7     | devops_engineer        | Prepare CI/CD, deploy across environments, maintain runbooks | mastermind_coordinator |
| 8     | mastermind_coordinator | Orchestrate workflows, enforce quality gates, and summarize  | human approver         |

## Handoff Expectations

- Every agent records its reasoning and deliverables under `ai/logs/` and `ai/reports/`.
- Handoffs include a short status JSON conforming to the schema in `docs/MASTERMIND_PROMPTING_GUIDE.md`.
- If an agent cannot satisfy its constraints, it halts and escalates to the previous agent or human operator.

Refer to the prompts for detailed instructions, constraints, and deliverable formats.

## Progress & Next Steps

**Current Progress**

- 2025-10-24: Initial public release of @cojacklabs/autoforge v0.1.0. Scoped package, added config-driven workflow (`autoforge configure`), planning-first quality gates, project snapshot (`autoforge snapshot`), and onboarding prompt generator (`autoforge load` / `refresh`).
- 2025-10-28: v0.2.0 updates in progress. Default folder renamed to `.autoforge/` (legacy `autoforge/` still supported), STOP/APPROVAL gates with `max_retries` added across prompts, recipe-based orchestration (`docs/blueprint/recipes/*` + `automation_bootstrap`), integration registry (`ai/integrations.yaml`), and new optional roles (integration_engineer, payments_engineer, data_analyst, compliance_officer). Agents should reload manifests and follow the updated approvals cadence.

**Upcoming / To Do**

1. Publish v0.2.0 notes, update `README`/`QUICKSTART` links, and collect adopter feedback.
2. Wire recipes into automation flows end-to-end and add example CI configs per recipe.
3. Expand validator to enforce new gates and optional role deliverables.

## Lessons Learned

- Use this section to capture durable insights after each cycle (architecture choices, vendor trade-offs, process tweaks). Keep bullets short and reference deeper artifacts in `ai/reports/`.

## Agent Rules & Conventions (Living)

- Agents may update this section to record new working agreements that improve throughput or quality.
- Keep rules concise, actionable, and tool-agnostic so they carry over when switching IDEs/CLIs.
- When a rule changes behavior or scope, note the date and a one-line rationale.
