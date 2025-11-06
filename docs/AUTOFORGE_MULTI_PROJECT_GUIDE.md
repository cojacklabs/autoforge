# AutoForge Multi‑Project Guide

Generalized, role‑aware, and planning‑first guidance for using AutoForge as a centralized multi‑agent SDLC platform across many different projects. This document distills lessons from prior reviews and refactors them so both technical and non‑technical professionals can guide an application from idea → production with clear checkpoints, observability, and approvals.

---

## Who This Is For

- Non‑technical stakeholders (founders, product owners, domain experts) who need a structured, low‑friction way to shape requirements and approve outcomes.
- Technical practitioners (architects, engineers, QA, security, DevOps/SRE, data/AI) who want repeatable workflows, handoffs, and quality gates.

Use this guide alongside:

- docs/QUICKSTART.md – CLI and first‑run flow
- docs/PROMPT_HANDBOOK.md – Ready‑made prompt snippets
- ai/AGENTS.md – Roles, handoffs, progress log
- ai/context.manifest.yaml – Context roots and quality gates
- docs/ai/AGENT_AUTONOMY_GUIDE.md – Operating model and boundaries

---

## Core Principles (Project‑Agnostic)

1. Planning‑first, code‑second
   - Establish vision, PRD, blueprints, and quality gates before writing code. Allow “planning stubs” for fast iteration with explicit approvals.

2. Role specialization with explicit handoffs
   - Distinct agents (Product, Architecture, Engineering, QA, Security, DevOps/SRE, UI/UX, Performance) collaborate via structured prompts and JSON handoff payloads.

3. Human‑in‑the‑loop control points
   - High‑impact actions (architecture deltas, production deploys, critical tests, security exceptions) require human approval.

4. Context memory and observability
   - Centralize memory files, logs, and audit trails. Persist decisions and outcomes between sessions.

5. Quality gates as guardrails
   - Enforce completeness (PRD present, diagrams, API, security, observability, perf plans) with lightweight stubs during early exploration.

6. Extensible templates and “recipes”
   - Package common workflows by domain (e.g., SaaS app, analytics platform, mobile app) so teams can start fast and stay consistent.

7. Secure by default
   - Role‑based access, write scopes, secrets hygiene, immutable logs, and compliance reporting baked into the process.

8. Continuous learning
   - Capture feedback/errors/successes and roll up into prompts, rules, and future iterations.

---

## Overview of the AutoForge Operating Model

- Two‑world model: Human realm (docs/, api/, diagrams/, devops/, security/, qa/) vs AI realm (ai/ manifests, prompts, logs, memory, reports).
- Configuration drives behavior:
  - `autoforge.config.json` defines code targets and context overrides.
  - `npx autoforge configure` keeps managed YAML (ai/code_targets.yaml, ai/context_targets.yaml) synchronized.
- Observability by default:
  - Use `npx autoforge validate` to enforce quality gates.
  - Use `npx autoforge snapshot [path]` to generate REPO.md for sharing structure with assistants.
  - Maintain activity logs under `ai/logs/**` and short, durable memory in `ai/memory/**`.

---

## Roles and Collaboration

Baseline roles (customize per project via `ai/agents.yaml`):

- Discovery Researcher – Gather inputs and feasibility.
- Product Manager – Vision, PRD, acceptance criteria.
- Architect – Systems, diagrams, and API.
- Full‑Stack Engineer – Code/tests aligned to contracts.
- QA Engineer – Functional/regression testing and quality reporting.
- Security Engineer – Threat modeling, dependency checks, policy.
- DevOps Engineer – CI/CD, deployments, and runbooks.
- SRE – Observability, SLI/SLOs, alerts.
- UI/UX Designer – Wireframes, flows, style guide, a11y.
- Performance Engineer – Perf plans and scripts.
- Mastermind Coordinator – Orchestration, guardrails, and summaries.

Optional roles (add as needed):

- Integration Engineer – Third‑party APIs (payments, data providers, analytics).
- Payments Engineer – Billing/subscriptions, webhooks, reconciliation.
- Data Analyst – Dashboards, KPIs, insights.
- Compliance Officer – Audit trails, regulatory outputs.

Handoffs:

- Use the schema in `docs/MASTERMIND_PROMPTING_GUIDE.md` to exchange inputs, constraints, and deliverables.
- Enforce exit conditions and “max retries” to avoid infinite loops.
- If context is missing/invalid, halt and escalate—never guess.

---

## Human Checkpoints and Approvals

Design decisions that require explicit acknowledgment:

- Architecture deltas or new external integrations
- Touching `devops/**`, production deployments, or secrets
- Security findings, policy exceptions, or P0 regressions
- Large refactors or migrations

Implementation tips:

- Each prompt should surface a “STOP for approval” step before critical changes.
- Assistants should summarize risk, blast radius, and rollback strategy.

---

## Memory, Logging, and Auditability

- Persist key decisions in `ai/memory/ACTIVE_MEMORY.yaml` and update it at major handoffs.
- Write structured logs to `ai/logs/**` (consider a single `activity.jsonl` stream for session summaries).
- Store concise outcomes in `ai/reports/**` (e.g., kickoff, retrospectives, UI/UX updates).
- Keep `REPO.md` current with `npx autoforge snapshot [path]` for new collaborators/agents.

---

## Quality Gates (Default Set)

Common baseline checks (customize in `ai/context.manifest.yaml`):

- API contract present (e.g., `api/openapi.yaml` or planning stub)
- Architecture diagram(s) present (or planning stubs)
- Security readiness checklist present
- PRD present
- UI/UX style guide present
- Observability docs present (dashboards/alerts/SLOs)
- Optional: Tests present, CI config present, Performance plan/scripts present

Note: File paths are case‑sensitive. Ensure manifest entries match on‑disk filenames.

---

## Project Recipes (Assembly Line Templates)

Recipes define who does what, in which order, with which gates. Create one per domain or product family and store under `docs/blueprint/recipes/*.yaml`.

Example (generic):

```yaml
name: default_web_app
stages:
  - id: idea_intake
    role: product_manager
    inputs: [ideas/**]
    deliverables:
      - docs/prd/PRODUCT_REQUIREMENTS.md
    approvals: [human]

  - id: architecture
    role: architect
    inputs: [docs/prd/PRODUCT_REQUIREMENTS.md]
    deliverables:
      - api/openapi.yaml
      - diagrams/system.mmd
    approvals: [human]

  - id: engineering
    role: fullstack_engineer
    inputs: [api/openapi.yaml, docs/blueprint/tech.md]
    deliverables:
      - src/**
      - tests/**
    approvals: []

  - id: qa
    role: qa_engineer
    inputs: [tests/**, api/openapi.yaml]
    deliverables:
      - qa/reports/test_report.md
    approvals: [human]

  - id: security
    role: security_engineer
    inputs: [security/**, devops/devops.yaml]
    deliverables:
      - security/reports/findings.md
    approvals: [human]

  - id: release
    role: devops_engineer
    inputs: [qa/reports/test_report.md]
    deliverables:
      - ai/logs/deployments/*_deploy.md
    approvals: [human]
```

Use recipes to seed `automation_bootstrap` behavior (select the recipe, expand steps, orchestrate prompts, enforce gates, and pause for approvals).

---

## Integrations and Plugins (API Ecosystem)

Standardize integrations so agents can propose, implement, test, and maintain connectors.

1. Register providers in `ai/integrations.yaml`:

```yaml
providers:
  stripe:
    env: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET]
    sdks: ["@stripe/stripe-js", "stripe"]
    deliverables:
      - src/server/payments/**
      - docs/security/stripe.md
      - tests/payments/**
  analytics_provider:
    env: [ANALYTICS_KEY]
    sdks: ["analytics-sdk"]
    deliverables:
      - src/services/analytics/**
      - tests/analytics/**
```

2. Constrain write paths for new roles (e.g., `integration_engineer`, `payments_engineer`) in `ai/agents.yaml`.

3. Require:

- Secrets only via environment variables
- Retries/backoff and error taxonomies
- Schemas and mocks/fixtures for offline tests

---

## Key Automation Features for SaaS Acceleration

Below are cross‑domain automation features that speed up SaaS development. Each item includes suggested AutoForge hooks and concrete actions.

1. Multi‑Agent SDLC Orchestration

- Hooks: `ai/prompts/**`, `ai/AGENTS.md`, `ai/agents.yaml`, recipes under `docs/blueprint/recipes/**`
- Actions:
  - Define a recipe per product type (web app, analytics, mobile) with stages, owners, deliverables, and gates.
  - Add explicit halt/exit conditions and max retries in role prompts.
  - Insert STOP/APPROVAL steps for risky operations (deployments, schema migrations, external integrations).

2. AI‑Driven Requirements & Architecture

- Hooks: `ai/prompts/idea_conversation.yaml`, `idea_intake.yaml`, `product_manager.yaml`, `architect.yaml`, `docs/blueprint/*.md`, `api/openapi.yaml`
- Actions:
  - Use discovery + product prompts to capture PRD and acceptance criteria.
  - Auto‑draft architecture diagrams and API contracts from PRD; store under `diagrams/` and `api/`.
  - Require a lightweight review gate before engineering starts.

3. Code Generation & Refactoring

- Hooks: `ai/prompts/fullstack_engineer.yaml`, `ai/code_targets.yaml`
- Actions:
  - Generate CRUD scaffolds and API clients from `api/openapi.yaml`.
  - Propose dependency updates/refactors with impact analysis and rollbacks.
  - Always pair code generation with test generation (see #4).

4. Automated Testing & QA

- Hooks: `qa/tests.md`, `ai/prompts/qa_engineer.yaml`, `docs/perf/**`
- Actions:
  - Autogenerate unit/integration/regression tests alongside code.
  - Run a QA prompt to triage failures and produce reports under `qa/reports/**` and `ai/logs/test_runs/**`.
  - Add a gate to require minimum test presence before deploy.

5. Continuous Integration & Delivery (CI/CD)

- Hooks: `ai/prompts/devops_engineer.yaml`, `devops/devops.yaml`, `devops/runbooks/**`, `ai/logs/deployments/**`
- Actions:
  - Define per‑environment build/deploy templates and rollback procedures.
  - Trigger builds from agent decisions with human approval checkpoints.
  - Log deployment summaries and artifacts for auditability.

6. API Integration Automation

- Hooks: `ai/integrations.yaml`, `integrations/**`, role: `integration_engineer`
- Actions:
  - One‑click scaffolding for connectors including env var stubs, retries/backoff, schema validation, and mocks.
  - Validate provider schemas; record error taxonomies; generate fixtures for offline tests.

7. Real‑Time Analytics & Reporting

- Hooks: role: `data_analyst`, `docs/observability/**`, dashboards under app code targets
- Actions:
  - Autogenerate dashboards tied to KPIs with role‑based views (admin/analyst/partner).
  - Define data contracts and refresh cadences; surface a simple metrics glossary.

8. Security & Compliance Automation

- Hooks: `ai/prompts/security_engineer.yaml`, `security/**`, role: `compliance_officer`
- Actions:
  - Automate RBAC scaffolds, secrets policy, encryption posture, and audit logging.
  - Produce compliance artifacts (e.g., SOC2/GDPR summaries) under `security/reports/**`.

9. UI/UX Automation

- Hooks: `ai/prompts/uiux_designer.yaml`, `docs/uiux/**`
- Actions:
  - Generate accessible UI skeletons from approved wireframes/style guide.
  - Apply responsive themes and motion guidelines consistently across views.

10. Knowledge Base, Documentation & Training

- Hooks: `npx autoforge snapshot`, `REPO.md`, `ai/reports/**`, `docs/**`
- Actions:
  - Autogenerate API docs, architecture notes, and user guides as part of each change.
  - Maintain a living onboarding/training module for new users.

11. Payment and Billing Flow Automation

- Hooks: provider config in `ai/integrations.yaml` (e.g., Stripe), role: `payments_engineer`
- Actions:
  - Scaffold subscription, invoicing, webhooks, and receipts with audit logging.
  - Enforce secrets hygiene and reconciliation reports.

12. Feedback, Optimization & Retraining

- Hooks: `ai/logs/learning/**`, `ai/reports/learning/**`
- Actions:
  - Capture user/agent feedback and outcome metrics; propose process/prompt improvements.
  - Periodically summarize learnings and update prompts/recipes.

---

## Implementation Roadmap (Framework‑Level)

Use this backlog to evolve AutoForge itself so every project benefits.

- Now
  - Add default recipes under `docs/blueprint/recipes/` (web_app, analytics_app, mobile_app).
  - Introduce `ai/integrations.yaml` and new roles: `integration_engineer`, `payments_engineer`, `data_analyst`, `compliance_officer`.
  - Add STOP/APPROVAL steps + halt/exit conditions + max retries across role prompts.
  - Standardize `ai/logs/activity.jsonl` session summaries; document the format.

- Next
  - Add quality gates for “tests present” and “CI config present”.
  - Provide connector scaffolds (env, retries, schemas, mocks) for popular providers.
  - Seed a docs/observability package with example dashboards/alerts and SLO templates.

- Later
  - Optional UI assistant to review approvals and orchestrate multi‑agent runs.
  - Lightweight policy engine to enforce write scopes and sign off rules.
  - Pluggable analytics for agent performance and process optimization.

---

## Non‑Technical Path (From Scratch)

1. Capture the idea
   - Run the Idea Conversation prompt (see docs/PROMPT_HANDBOOK.md) to interview on goals, audience, and risks.
   - The agent drafts/updates `ideas/` and a PRD stub.

2. Approve the plan
   - Review PRD, high‑level architecture, and UI/UX sketches (wireframes/user flows/style guide).

3. Orchestrate the build
   - Use a project recipe to guide the agent sequence with clear approvals.
   - Agents propose tests, security checklists, and observability from the start.

4. Validate and deploy
   - Inspect QA and security reports; approve the deployment plan.
   - Receive a simple release summary and next‑step recommendations.

---

## Technical Path (From Scratch or Existing Codebase)

1. Install and initialize
   - `npm install --save-dev @cojacklabs/autoforge`
   - `npx autoforge init`

2. Configure
   - Update `autoforge.config.json` (codeTargets/contextTargets) to match your repo.
   - `npx autoforge configure`

3. Load context and validate gates
   - `npx autoforge load` then paste the onboarding block into your AI tool.
   - `npx autoforge validate` and address missing gates (use planning stubs if needed).

4. Snapshot (optional but recommended)
   - `npx autoforge snapshot` to create `REPO.md` for collaborators/agents.

5. Orchestrate via prompts
   - Kick off with `automation_bootstrap`, then follow recipe‑driven handoffs.

---

## Security, Privacy, and Access Control

- Constrain agent write scopes in `ai/agents.yaml`.
- Keep `write_protect` rules for critical manifests and governance docs.
- Record immutable audit logs (timestamps, actor, action, path) and store under `ai/logs/**`.
- Enforce secrets via environment variables and rotate regularly.

---

## Continuous Learning and Improvement

- Aggregate session outcomes and feedback under `ai/logs/learning/`.
- Publish periodic summaries to `ai/reports/learning/` with action items (prompt changes, new gates, template updates).
- Refresh agent context with `npx autoforge load|refresh` after material changes.

---

## Quick Checklist (Any Project)

- [ ] Initialize AutoForge and configure targets
- [ ] Capture idea → PRD → diagrams → API draft
- [ ] Validate quality gates (allow planning stubs initially)
- [ ] Choose a recipe and run orchestration
- [ ] Enforce approvals at critical steps
- [ ] Generate code and tests inside declared targets
- [ ] Run QA, security, perf checks; fix findings
- [ ] Prepare deploy plan, execute, log results
- [ ] Update memory and retrospective

---

## Notes and Pitfalls

- Case sensitivity matters: ensure `ai/context.manifest.yaml` file paths exactly match on‑disk names.
- Keep prompts minimal but strict: define constraints, deliverables, and explicit stop/approval points.
- If a role needs new paths, update `ai/agents.yaml` and re‑validate before running prompts.
- Prefer planning stubs over blocking—just label clearly and route to approval.

---

## Adapting to Your Domain

Create or customize a recipe for your domain (e.g., fintech, healthcare, ecommerce, analytics, mobile). Define:

- Stages, owners (roles), deliverables, and quality gates
- Integration providers and required secrets
- Performance and observability budgets
- Security/compliance expectations (e.g., SOC2, HIPAA, GDPR)

Start simple; iterate with the agent network, and promote learned patterns into shared recipes for future projects.
