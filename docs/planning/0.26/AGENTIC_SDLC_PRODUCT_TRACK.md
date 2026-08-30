# Agentic SDLC Product Track

Status: Superseded on 2026-08-30; reusable framework contracts retained
Reconciled: 2026-08-26  
Source concept: [`dev/AutoForge_Agentic_SDLC_Automation_Strategy.md`](../../../dev/AutoForge_Agentic_SDLC_Automation_Strategy.md)

> The first-party Agent, hosted execution, and Web product profiles now belong
> to the future CoJack Labs AI portfolio. AutoForge retains only the reusable
> project-intelligence, governance, orchestration, handoff, and validation
> contracts described by the
> [AutoForge Framework North-Star](./AUTOFORGE_FRAMEWORK_NORTH_STAR.md).

## Purpose

Continuous Agentic SDLC automation is AutoForge's first major vertical beneath
the [ultimate north-star](./ULTIMATE_AUTOFORGE_AI_NORTH_STAR.md). It gives the
platform a concrete path from project intelligence to a useful Agent and,
later, a governed hosted service:

> AutoForge continuously converts validated software work into governed,
> evidence-backed, review-ready changes while preserving human authority over
> consequential decisions.

This track complements the broader personal and organizational AI destination.
It does not replace the post-v0.25 roadmap, make hosted operation a Core
requirement, or authorize every capability described here for immediate
implementation.

## Target Operating Loop

```text
Request -> Triage -> Plan -> Approval -> Isolated execution
        -> Verification -> Review packet -> Merge/deploy -> Learn
```

AutoForge may automate routine steps within declared policy. It must pause for
clarification, approval, or authority it does not possess. A necessary pause is
correct behavior, not an automation failure.

## Four Compatible Execution Profiles

| Profile               | Product responsibility                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Interactive Agent     | Cursor/TRAE-like local conversation, streaming, follow-up questions, context, plans, diffs, terminal, and browser |
| Supervised automation | Convert bounded requests into validated local branches, worktrees, and review packets                             |
| Continuous Service    | Hosted intake, queues, schedules, retries, multi-repository execution, approvals, notifications, and audit        |
| Shared foundation     | Protocol, Core, SDK, work, policy, evidence, memory, permissions, handoffs, and recovery truth                    |

The profiles share versioned contracts but not authority. Interactive local
use cannot require a hosted account. Hosted execution cannot silently become
canonical project truth or grant broader tools than the same work would receive
locally.

## Architecture Ownership

| Layer       | Responsibility                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| Protocol    | Work requests, runs, events, human input, approvals, capabilities, workspaces, review packets, and handoffs  |
| Core        | Deterministic state transitions, policy, priority, dependencies, evidence, decisions, and readiness          |
| SDK         | Stable operations over Core and approved remote transports with effects injected at boundaries               |
| Agent       | Interactive runtime, model routing, streaming, context retrieval, tools, local workspaces, and recovery      |
| Providers   | Replaceable model adapters, capability negotiation, normalized usage, errors, and streams                    |
| Connectors  | Least-privilege Git hosting, CI, issue, support, monitoring, browser, database, and deployment integrations  |
| Service/API | Hosted identity, intake, queues, schedules, execution, organizations, secrets, quotas, budgets, and audit    |
| Web         | Intake, mission control, review packets, diffs, evidence, approvals, team policy, configuration, and billing |

## Canonical Contracts

The product track should converge on provider-neutral, versioned contracts for:

- `WorkRequest`: immutable source identity plus versioned normalized intent;
- `WorkEvent`: append-only actor, time, prior/next state, policy, and evidence;
- `WorkProjection`: current state derived from authoritative events and project
  truth;
- `Run` and `RunEvent`: resumable execution identity and sanitized live events;
- `HumanInputRequest`: clarification, choice, approval, or missing authority;
- `ApprovalRequest`: subject, policy basis, approvers, expiry, and disposition;
- `ToolCapability`: scoped operation, resource, environment, duration, and
  approval tier;
- `Workspace`: repository revision, branch or worktree, isolation, lease, and
  cleanup policy;
- `ReviewPacket`: source request, accepted plan, diff, evidence, decisions,
  risks, open questions, rollback considerations, and required approvals.

New intake and run states must map to AutoForge's existing work, workflow,
orchestration, evidence, and handoff concepts. A hosted database must not create
a second competing work lifecycle.

## Governed State Model

A candidate work lifecycle is:

```text
received -> triaged -> awaiting-clarification | planned
         -> awaiting-approval | queued -> implementing -> verifying
         -> awaiting-review -> merged | deployed | rejected | blocked | failed
```

Protocol defines the vocabulary and compatibility rules. Core determines valid
transitions. Every transition records actor, timestamp, policy result, evidence,
and prior/next state. Service databases may materialize current projections,
but repository-promoted decisions, requirements, evidence, and memory retain
their existing canonical formats.

## Storage and Audit Boundaries

- Tracked Markdown and JSON remain canonical project truth.
- Git remains authoritative for code and revision history.
- Local SQLite may hold rebuildable indexes or justified high-frequency Agent
  run and event state after the existing benchmark and recovery gate passes.
- The hosted Service uses a transactional database for tenants, queues,
  schedules, approvals, audit events, and hosted execution.
- Immutable events and mutable projections are distinct; legitimate
  clarification and status changes never rewrite audit history.
- Deleting a derived database cannot delete promoted project truth.

Normal audit retention includes structured artifacts, prompt-template or
policy identifiers, model/provider identifiers, context fingerprints,
sanitized tool receipts, decisions, evidence, approvals, timing, usage, and
cost. Raw prompts, responses, logs, retrieved sensitive content, transcripts,
and provider reasoning require explicit purpose, sanitization, access policy,
and retention limits. Hidden chain-of-thought is never a required artifact.

## Autonomy and Review Policy

| Level | Behavior                                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| 0     | Prepare context and plans; a human initiates each stage                                                         |
| 1     | Execute scoped implementation and validation in isolation, then pause for review                                |
| 2     | Create review-ready changes for pre-approved low- and medium-risk recipes; protect merge and production actions |
| 3     | Improve routing and recipes through controlled evaluations without self-expanding permissions                   |

Payments, authentication, authorization, migrations, incidents, production
data, deployment, rollback, disclosure, and other consequential operations
require stronger policy, evidence, approval, and recovery than routine local
work. An agent cannot grant itself authority or change the policy governing its
own run.

## Candidate Delivery Mapping

### v0.26 — Trust and execution contracts

- Complete evidence applicability binding to revision, environment, and gate
  definition.
- Establish useful code-commenting governance and generated-content safety.
- Define the initial work request, run, event, human-input, approval,
  capability, workspace, and review-packet contracts.
- Preserve the file-canonical storage boundary and benchmark SQLite before
  adoption.

No always-on hosted Service is required for the v0.26 exit gate.

### v0.27 — Interactive local Agent

- Mature bare `autoforge` into the guarded interactive Agent entry point.
- Add continuous prompts, follow-up questions, provider-neutral streaming,
  model and reasoning configuration, repository retrieval, and plan review.
- Add governed terminal, browser, diff, and evidence views.
- Add scoped tools, worktree isolation, interruption, pause/resume, checkpoints,
  and crash recovery.

### v0.28 — Local review-ready automation

- Accept a bounded local feature or reproducible bug request.
- Triage, clarify, plan, approve, implement in isolation, verify, and produce a
  complete review packet.
- Demonstrate routine implementation without routine human intervention while
  correctly pausing when clarification or authority is required.

### v0.29 — Integration control plane

- Add GitHub or GitLab pull-request creation and CI result ingestion.
- Add issue, support, monitoring, and ownership connectors.
- Expose shared run, approval, evidence, and handoff contracts through SDK,
  MCP, ACP, and conformance fixtures.

### v0.30 — Hosted continuous Service

- Add intake APIs and webhooks, transactional work events, queues, schedules,
  retries, deduplication, idempotency, budgets, kill switches, and hosted
  workspace execution.
- Add tenant isolation, scoped secret custody, quotas, metering, retention,
  backup, and audit controls.

### v0.31 — Web review and team operations

- Add backlog, run, plan, diff, evidence, and review-packet views.
- Add team permissions, approval inboxes, provider and cloud configuration,
  billing, usage, and multi-repository mission control.

These labels are candidate sequencing. Strategy evidence, customer demand,
security review, dependencies, and explicit approval may split or reorder them.

## Future AutoForge Work Hierarchy

After the current independent transition audit, register a candidate feature:

`feature.continuous-agentic-sdlc-platform`

Candidate phases:

1. `phase.agentic-execution-contracts`
2. `phase.interactive-local-agent`
3. `phase.local-review-ready-automation`
4. `phase.integration-control-plane`
5. `phase.hosted-continuous-service`
6. `phase.web-review-and-team-operations`

Initial bounded work should define:

1. the unified work-request and run state machines;
2. `HumanInputRequest` and approval contracts;
3. provider-neutral streaming and run events;
4. capability-based tool authorization;
5. review-packet and acceptance-evaluation contracts;
6. interactive and continuous execution profiles;
7. prompt, transcript, tool-log, and audit retention policy;
8. one local bug-to-review-packet experiment.

Each item requires its own AutoForge strategy assessment, scope, dependencies,
decision record, validation, and release authorization. Recording this hierarchy
does not automatically create or start those work items.

## Product Success Measures

Measure accepted outcomes rather than agent activity:

- complete evidence at review time;
- first-submission reviewer acceptance;
- human rework time;
- intake-to-review latency;
- first-pass gate success;
- retry, escalation, and clarification rates;
- escaped defects and reopened work;
- security-policy violations;
- cost per accepted change;
- rollback rate;
- complete provenance and policy evaluation.

## Adoption Gate

Before implementing a capability from this track:

1. confirm the current north-star and applicable roadmap horizon;
2. identify Protocol, Core, SDK, Agent, Connector, Service, and Web ownership;
3. decide what is canonical, derived, operational, or hosted state;
4. define authority, approval, secret, retention, and recovery boundaries;
5. create typed contracts and compatibility fixtures before interface-specific
   state;
6. prove a bounded vertical slice before generalizing the platform;
7. record strategy, decision, evidence, and explicit publication approval.
