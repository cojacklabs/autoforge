# AutoForge Continuous Agentic SDLC Platform

> **Planning status:** Source brainstorming retained for provenance. The
> reconciled, authoritative product track is
> [`docs/planning/0.26/AGENTIC_SDLC_PRODUCT_TRACK.md`](../docs/planning/0.26/AGENTIC_SDLC_PRODUCT_TRACK.md).
> Use that document with the ultimate north-star and post-v0.25 roadmap for
> architecture ownership, delivery sequencing, and implementation decisions.

## Purpose

AutoForge should evolve from a CLI-centered orchestration framework into a **continuous software-delivery agent**. It will receive feature requests and bug reports from a database-backed intake system, triage and plan the work, carry out bounded implementation in an isolated environment, verify the result, and deliver review-ready changes to product owners and CI/CD teams.

The central principle is:

> Automate the full path to a reviewable, evidence-backed change while preserving human authority over production releases, sensitive systems, and other high-risk decisions.

AutoForge should become a project-embedded, provider-neutral control plane that coordinates coding agents, repository context, policies, quality gates, persistent memory, and human approvals across the software-development lifecycle.

---

## Target Operating Model

```text
Feature request / bug report
        ↓
Database-backed intake queue
        ↓
Triage + deduplication + risk classification
        ↓
Context retrieval + repository analysis
        ↓
Plan and acceptance criteria
        ↓
Human approval when policy requires it
        ↓
Isolated implementation workspace / branch
        ↓
Tests + lint + security + evaluation gates
        ↓
PR / review packet
        ↓
Owner or CI/CD review
        ↓
Merge, deploy, monitor, learn
```

AutoForge must support continuous operation, but it must not grant an agent unconstrained authority. It should autonomously intake, diagnose, plan, implement, and verify work within explicit policies, then pause for approval when the impact warrants it.

---

## Product Positioning

AutoForge should not try to be merely another coding model, editor, or prompt library.

| Product category           | Primary value                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Lovable-style products     | Translate natural-language product intent into an application experience                                               |
| Cursor/TRAE-style products | Give developers and agents repository-aware coding tools                                                               |
| **AutoForge**              | Govern and coordinate multi-agent SDLC work across repositories, tools, policies, quality gates, memory, and approvals |

### Refined north star

> **AutoForge continuously converts validated software work into governed, evidence-backed pull requests—using the best available coding agents, enforcing project policy, and requiring humans only for decisions with real business, security, or production risk.**

---

## Core Workflow

### 1. Database-backed work intake

Run an always-on AutoForge service that receives work through a database, webhook, message queue, product portal, customer-support system, monitoring system, or issue tracker.

Each incoming request must become an immutable work record.

```yaml
id: AF-2026-001284
type: bug # bug | feature | security | maintenance
title: Checkout fails for annual subscriptions
description: "..."
source:
  system: product_portal
  requester_id: user_123
  linked_issue: null
priority: high
severity: P1
status: received
repository: org/billing-service
environment: staging
created_at: "..."
```

Use a controlled state machine. Agents must not freely mutate a work item’s status.

```text
received
→ triaged
→ awaiting_clarification | planned
→ awaiting_approval | queued
→ implementing
→ verifying
→ awaiting_review
→ merged | deployed | rejected | blocked | failed
```

Every state transition should persist the actor, timestamp, policy decision, attached evidence, related artifacts, and prior/next state.

### 2. Triage before execution

A triage agent should:

- Detect duplicates and link related work.
- Extract severity, priority, reproduction steps, affected users, expected behavior, and observed behavior.
- Identify the repository, owning team, service, and likely code area.
- Determine whether the request is actionable, ambiguous, security-sensitive, or an incident.
- Generate initial acceptance criteria and risk classification.
- Route work to the appropriate recipe and reviewer group.

A bug should not enter implementation solely because an agent believes it understands the request. It needs a reproducible failure, a clear expected outcome, sufficient operational evidence, or a safe diagnostic task.

### 3. Plan as a first-class artifact

Before changing code, AutoForge should create a versioned, reviewable plan.

```yaml
work_item: AF-2026-001284
objective: Fix annual subscription checkout failure
hypothesis:
  - Annual billing interval is not mapped in payment-provider payload
affected_components:
  - services/billing/
  - packages/payments/
  - tests/integration/checkout/
implementation_steps:
  - Locate subscription payload construction
  - Add annual interval mapping
  - Add regression test for annual plan
  - Run billing test suite and static checks
acceptance_criteria:
  - Annual checkout completes in the test environment
  - Monthly checkout behavior remains unchanged
  - Existing billing suite passes
risk:
  data_migration: false
  payment_impact: high
  production_access: prohibited
required_approvals:
  - payments_owner
  - ci_cd_team
```

Plans should include source references, expected files, test strategy, dependencies, assumptions, risk and blast-radius assessment, rollback considerations, and approval requirements.

### 4. Isolated execution

After all required approvals, AutoForge should:

- Create a per-task branch, workspace, container, or ephemeral environment.
- Build a bounded task-context packet from repository code, documentation, tests, policies, ownership metadata, and prior decisions.
- Assign scoped work to an implementation agent.
- Permit only the tools and paths required for the task.
- Persist diffs, commands, tool results, and intermediate artifacts.
- Retry only controlled, diagnosable failures; escalate after a configurable limit.

### 5. Evidence-based verification

No task is done because an agent claims success. Completion must be supported by evidence.

Required evidence may include:

- Build and type-check logs.
- Lint and formatting results.
- Unit, integration, contract, end-to-end, or browser-test results.
- Dependency and security scan results.
- Diff review against acceptance criteria.
- Required human approvals.
- Staging deployment and post-deployment validation, if applicable.

When verification fails, AutoForge must classify the outcome:

- Implementation defect: return a scoped task to implementation.
- Environment failure: report the infrastructure blockage.
- Ambiguous requirement: pause and request clarification.
- Policy violation: halt immediately.
- Insufficient evidence: keep the item unverified; do not claim resolution.

### 6. Review-ready output

AutoForge should produce a concise review packet for owners and CI/CD reviewers.

```text
AF-2026-001284 — Fix annual subscription checkout

Status: Awaiting review
Risk: High — payments
Branch: autoforge/AF-2026-001284-annual-checkout
Change summary: Added annual interval mapping and regression coverage.
Files changed: 4
Validation:
  ✓ Type check
  ✓ Lint and formatting
  ✓ Billing unit tests
  ✓ Checkout integration test
  ✓ Dependency scan
  ✓ Security review completed
Required approval: Payments owner + CI/CD reviewer

Open review | Request changes | Approve PR | Reject | Escalate
```

Reviewers must be able to inspect the original request, triage evidence, plan, diff, source references, test output, policy decisions, assumptions, and required approvals.

---

## Autonomy Model

| Level | Name                | Behavior                                                                                                                     |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0     | Manual              | AutoForge prepares context and plans; humans initiate each stage                                                             |
| 1     | Supervised          | AutoForge executes scoped implementation and validation in isolation, then pauses for review                                 |
| 2     | Managed autopilot   | AutoForge handles approved low- and medium-risk recipes through pull-request creation; protected actions require approval    |
| 3     | Adaptive operations | AutoForge improves routing and recipes from controlled evaluation data; it does not self-expand permissions or bypass policy |

### Decision policy

| Change type                           | AutoForge may perform automatically                     | Human approval required                                    |
| ------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Documentation and low-risk refactors  | Plan, edit, test, create PR                             | Merge when protected-branch policy requires it             |
| Well-defined bug fix                  | Diagnose, patch, test, open PR                          | Merge and production release                               |
| Standard feature                      | Triage, plan, implement in branch, validate             | Plan approval for broader scope; merge/deploy              |
| Database migration                    | Draft, test in sandbox, generate migration proposal     | Execute against real environment or deploy                 |
| Payments, authentication, permissions | Investigate, patch in isolation, run security checks    | Plan, merge, and production release                        |
| Security incident                     | Collect evidence and perform pre-authorized containment | Remediation, disclosure, and production changes            |
| Production rollback                   | Detect breach and recommend rollback                    | Automatic rollback only under explicit pre-approved policy |

---

## Platform Architecture

| Component           | Responsibility                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Intake API          | Receives feature requests, bug reports, support escalations, monitoring alerts, and CI events                  |
| Work database       | Stores work items, plans, state transitions, approvals, artifacts, audit events, and outcomes                  |
| Queue and scheduler | Provides reliable delivery, prioritization, retries, deduplication, concurrency control, and SLA-aware routing |
| Orchestrator        | Executes workflow graphs, handoffs, retries, escalation, resumptions, and policy checks                        |
| Context engine      | Builds task-specific evidence packets from code, docs, tests, issues, ownership, decisions, and live signals   |
| Agent gateway       | Normalizes interactions with supported AI coding providers and environments                                    |
| Tool gateway        | Controls Git, filesystem, terminal, CI, databases, browser tests, observability, and deployment actions        |
| Workspace manager   | Creates isolated branches, sandboxes, ephemeral environments, credentials, cleanup, and reproducible execution |
| Evaluator service   | Runs tests, static analysis, security checks, contract validation, and independent diff/acceptance review      |
| Review portal       | Lets owners and CI/CD teams inspect plans, evidence, diffs, approvals, and task status                         |
| Learning service    | Produces versioned, evaluated improvement proposals for prompts, recipes, routing, and context retrieval       |

The repository-local `.autoforge/` directory remains the project policy and intelligence layer. The always-on AutoForge service becomes the scheduling and governance control plane across repositories.

---

## Agent Roles and Artifact Contracts

Use specialized roles where they deliver measurable quality gains. A central orchestrator owns state, permissions, and final routing; worker agents cannot take unrestricted external actions.

| Role                 | Primary function                                  | Required artifacts                                            |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Triage agent         | Classify, deduplicate, prioritize, route          | Triage report, severity, acceptance criteria, risk assessment |
| Discovery agent      | Map relevant code, docs, tests, dependencies      | Evidence packet, affected-area map, unknowns                  |
| Product manager      | Translate request into scope and requirements     | PRD/change brief, acceptance criteria, exclusions             |
| Architect            | Define design and contracts                       | ADR, API/data contract, migration/rollback plan               |
| Implementation agent | Make scoped code changes                          | Diff, implementation notes, tests                             |
| QA agent             | Validate behavior and regressions                 | Test plan, results, failures, reproducible evidence           |
| Security agent       | Review security and supply-chain implications     | Threat model, findings, remediation status                    |
| DevOps/SRE agent     | Prepare deployment and operational evidence       | Deployment plan, runbook, monitoring/rollback checks          |
| Reviewer/evaluator   | Independently judge evidence against requirements | Acceptance review, unresolved risks, gate decision            |
| Coordinator          | Own workflow state and escalation                 | Run summary, handoff record, approval requests                |

Artifacts must be typed, versioned, schema-validated, and linked to the work item. Do not depend solely on conversational handoffs.

---

## Security, Reliability, and Governance Requirements

A continuously running engineering agent must be designed for malformed, ambiguous, adversarial, and high-impact input.

- Treat issue text, support tickets, logs, code comments, retrieved documentation, and external content as untrusted input; defend against prompt injection.
- Do not expose production secrets to language models. Use short-lived, scoped credentials through the tool gateway.
- Apply least privilege by agent, task, repository, branch, environment, tool, and filesystem path.
- Isolate every task with bounded time, token, cost, tool, and network limits.
- Require objective verification evidence before a task enters `awaiting_review`.
- Retain source request, retrieved context, plan version, agent/model version, prompts or policies, tool calls, diffs, commands, logs, evaluator results, and approvals.
- Make consequential actions idempotent and resumable; queue redelivery must not produce duplicate pull requests, migrations, deployments, or notifications.
- Provide global, repository, environment, role, and per-run kill switches.
- Enforce rate limits, quotas, concurrency limits, and budget controls.
- Never call a user-reported bug resolved merely because code was written; call it `awaiting_review` until the required evidence and designated approval are complete.
- Never permit agents to self-grant additional privileges or self-modify core governance policies.

---

## Controlled Learning Model

AutoForge can learn from operational outcomes, but improvements must be governed like production changes.

1. Collect telemetry: gate pass/fail, retries, human changes, reviewer acceptance, reopens, defects, cost, duration, and downstream feedback.
2. Create versioned candidates for prompts, recipes, routing, retrieval, and evaluator rules.
3. Evaluate candidates on representative held-out tasks and safety/quality benchmarks.
4. Roll out behind feature flags with a stable control configuration.
5. Measure acceptance rate, rework, escaped defects, time to approval, cost per accepted change, and rollback rate.
6. Promote, roll back, or retire candidates through an explicit approval process.

Project and tenant data should be isolated by default. Cross-project learning must be opt-in, de-identified where appropriate, and governed by data-handling policy.

---

## Implementation Roadmap

### Phase 1 — Review-ready bug automation

Deliver the smallest complete, trustworthy loop:

- Database-backed work-item schema, state machine, and immutable audit log.
- Intake API, webhook, or queue consumer.
- One-repository Level 1 workflow.
- Triage, plan creation, isolated branch/workspace, implementation, tests, and review packet.
- Manual approval before merge and deployment.
- Kill switch, budgets, retry policy, and artifact retention.

**Success criterion:** AutoForge turns a bounded, reproducible bug report into a test-backed, review-ready pull request without human intervention during implementation.

### Phase 2 — Feature and CI/CD workflows

Add:

- Feature templates and an automated clarification process.
- Repository ownership and agent/reviewer routing.
- CI event ingestion with results linked to work items.
- Approval policies mapped to code owners, risk categories, and environments.
- Staging deployment proposals and post-deployment checks.
- Parallel read-only agents for research, test discovery, and security review.

**Success criterion:** A team can use AutoForge as its normal intake-to-review workflow for low-risk features and defects.

### Phase 3 — Managed continuous operation

Add:

- SLA-aware prioritization, deduplication, and incident routing.
- Recipe selection by project type, risk, and request class.
- Cross-project dashboards for quality, cost, latency, and review burden.
- Auto-merge only for narrow, pre-approved, low-risk recipes.
- Monitoring-driven work-item creation and remediation proposals.
- Controlled evaluation pipeline for workflow and prompt improvements.

**Success criterion:** AutoForge continuously reduces an engineering backlog while maintaining or improving acceptance rate, escaped-defect rate, reviewer time, and deployment safety.

---

## Key Success Metrics

Track outcomes rather than raw agent activity:

- Percentage of work items reaching `awaiting_review` with complete evidence.
- Reviewer acceptance rate on first submission.
- Human rework time per accepted change.
- Time from intake to review-ready PR.
- First-pass quality-gate success rate.
- Retry and escalation rate by workflow stage.
- Escaped-defect and reopened-issue rate.
- Security-policy violation rate.
- Cost per accepted change.
- Deployment rollback rate.
- Percentage of actions with complete provenance and policy evaluation.

---

## Questions for Agentic-AI Brainstorming

Use the following questions to pressure-test and refine the architecture:

1. What is the minimal durable workflow/state-machine model needed for safe, resumable execution?
2. Which work-item types and risk levels should be eligible for Level 2 managed autopilot first?
3. What evidence should be mandatory before a task is eligible for owner or CI/CD review?
4. How should AutoForge detect and mitigate prompt injection in tickets, logs, documentation, and repository content?
5. Which artifacts should use strict schemas, and how should they be versioned?
6. How should the system resolve conflicts when multiple work items touch the same repository area?
7. Which agent roles should be parallelized, and where must execution remain sequential?
8. How should task context be retrieved, ranked, cited, minimized, and kept current?
9. How should approval policy map to code ownership, risk, environment, compliance scope, and change type?
10. What tool-permission model provides useful autonomy without granting unnecessary production access?
11. How should AutoForge integrate with Git hosting, CI/CD, ticketing, monitoring, database, and deployment systems?
12. How should prompts, recipes, retrieval strategies, and evaluators be experimentally improved without harming production reliability?
13. What user experience lets reviewers approve safe changes in minutes while still exposing required evidence?
14. Which deployment, rollback, and incident operations—if any—can be made automatic under pre-authorized policy?
15. What data-isolation, retention, privacy, and tenancy model is required before cross-project learning is allowed?
