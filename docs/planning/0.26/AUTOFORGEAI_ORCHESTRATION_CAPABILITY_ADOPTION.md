# AutoForgeAI Orchestration Capability Adoption

Status: Approved conceptual adoption for clean-room planning  
Reviewed source: [`AutoForgeAI/autoforge`](https://github.com/AutoForgeAI/autoforge)
at commit
[`427c228`](https://github.com/AutoForgeAI/autoforge/commit/427c228ed1e15c5d9f5be4b8b15539034ce6c878)  
Reviewed: 2026-08-26

## Purpose and Clean-Room Boundary

This document adopts useful product and orchestration concepts observed in the
separately developed `AutoForgeAI/autoforge` project into CoJack Labs
AutoForge's ultimate north-star architecture.

The reviewed project is licensed under AGPL-3.0, uses a different architecture,
and is not affiliated with CoJack Labs or `@cojacklabs/autoforge`. Any
implementation in this repository must be independently designed from our
requirements and public contracts. Contributors must not copy or translate the
reviewed implementation without explicit license and legal review.

The projects also publish the same `autoforge` executable name. Brand, package,
domain, trademark, and installation-collision risks require a separate review;
this document makes no legal conclusion.

## Strategic Lesson

A long-running coding harness is valuable but increasingly common. AutoForge
should adopt the strongest execution experiences without making the harness the
source of project truth.

```text
Specialized agents execute work
                |
                v
AutoForge governs intent, assignments, permissions, evidence, and continuity
                |
                v
TUI, Web, CLI, SDK, MCP, and embedded clients project the same durable state
```

The adopted capabilities extend the north-star without changing its
provider-neutral foundation.

## Adopted Capability Portfolio

### 1. Specification-to-work initialization

AutoForge should transform approved product intent and specifications into an
actionable work graph. An intelligence layer may propose features, phases,
tasks, dependencies, verification requirements, and human questions, but Core
validates and persists only approved structures.

- Core owns schemas, validation, the work graph, approvals, and project state.
- Agent or Service owns model-assisted decomposition and clarification.
- SDK exposes structured proposal and approval operations.
- Web and TUI provide review, editing, and approval experiences.

This extends the proposed Intent Compiler. It must not create a second feature
database alongside AutoForge work state.

### 2. Role-specialized agents

AutoForge Agent should support explicit roles such as initializer or planner,
implementer, verifier, regression tester, researcher, designer, reviewer, and
release operator.

Protocol describes roles through versioned capabilities rather than
provider-specific prompts. Roles receive least-privilege tools, scoped work,
validation requirements, and bounded context. Agent or Service selects a model
and executes the role; Core remains unaware of model vendors.

### 3. Atomic work claiming and dependency-aware parallelism

AutoForge's assignments, leases, scope, dependency planning, and orchestration
should become the sole coordination mechanism for first-party and third-party
agents.

Future implementation should:

- atomically claim actionable work;
- reject conflicting write scopes;
- renew, expire, release, and recover leases;
- select only dependency-ready work;
- support independent read-only reviewers;
- isolate parallel edits with worktrees or equivalent environments;
- merge only after applicable validation and approval;
- explain why work is blocked or eligible.

Completion requires evidence and decision policy, not a Boolean `passing` field.

### 4. Independent verification and regression agents

An implementation agent should not be the sole authority that its work is
correct. Verifier assignments can rerun gates, inspect behavior, compare design
and implementation, and reopen or create work when a regression is confirmed.

Verifier results become evidence associated with work, source revision,
environment, and gate definition. They participate in the superseding-evidence
model planned for v0.26.

### 5. Structured human-input pauses

Long-running work needs a durable way to stop for clarification or approval.
Protocol should eventually define a `HumanInputRequest` containing:

- requesting run, agent, and work identity;
- question and explanatory context;
- response type and allowed options where appropriate;
- urgency, expiration, and default behavior;
- required approver role;
- privacy classification;
- resume conditions and resulting decision linkage.

Pending questions survive process restarts and appear consistently in CLI, TUI,
Web, mobile, and embedded clients.

### 6. Governed run lifecycle and controls

AutoForge needs a common run lifecycle:

```text
queued -> preparing -> running -> awaiting-input -> pausing -> paused
       -> resuming -> validating -> completed | failed | canceled
```

Users can start, steer, pause, resume, cancel, retry, and inspect runs. A run is
operational state associated with durable work; it does not replace work,
decisions, evidence, or handoffs.

### 7. Live execution events

Protocol should define provider-neutral events for:

- status, progress, claims, and releases;
- plan proposals and approvals;
- tool requests and results;
- bounded logs and sanitized model output;
- file changes and diffs;
- validation results;
- human-input requests;
- cost, token, and timing usage;
- recovery, errors, and completion.

Events can stream to terminals, WebSockets, API clients, or embedded
applications. Important outcomes are promoted into durable Core records; raw
transcripts and provider reasoning traces are not automatically canonical
memory.

### 8. Mission-control interfaces

AutoForge Agent and Web should provide complementary projections of the same
Core and run state:

- kanban and dependency graph views;
- active, queued, blocked, paused, and completed agents;
- live progress and bounded activity feeds;
- changed-file and diff review;
- validation and evidence inspection;
- decision and approval panels;
- human-input inbox;
- token, cost, and latency visibility;
- terminal and browser review surfaces;
- scheduling and recovery controls.

The first-party interface consumes supported SDK and Protocol contracts. It
must not introduce private state that third-party clients cannot reconcile.

### 9. Governed terminal and browser tools

Terminal and browser capabilities belong to Agent execution adapters, not Core.
They require project containment, least privilege, approval tiers, secret and
output sanitization, bounded I/O, timeouts, process-tree cleanup, browser-origin
isolation, action receipts, and rollback where practical.

An embedded terminal is a privileged shell surface and must never become
remotely accessible merely because a Web interface is enabled.

### 10. Scheduled and background execution

AutoForge should support governed schedules for repetitive work such as tests,
dependency audits, issue and support triage, documentation drift, release
readiness, maintenance, and evidence refresh.

Local Agent may provide bounded local schedules. Durable multi-user scheduling,
retries, notifications, quotas, and organization policy belong to Service.
Scheduled runs use the same assignments, scopes, approvals, safety rules, and
evidence requirements as interactive runs.

### 11. Pause, resume, crash recovery, and checkpoints

AutoForge recovers interrupted work from structured state rather than replaying
an entire transcript. Recovery reconciles:

- active work and assignment lease;
- Git revision, worktree identity, and dirty state;
- changed files;
- completed and pending validation;
- open human-input requests;
- last durable run event;
- decisions, risks, and next action.

Checkpoints identify what will be restored before rollback. Source, AutoForge
state, generated assets, databases, and external effects require separate
recovery policies.

### 12. Governed continuous improvement

AutoForge may propose improvements from failed gates, support requests, product
evidence, dependency updates, and observed friction. It must not silently
manufacture and implement its own roadmap.

Improvement proposals flow through intent, strategy, work, approval, execution,
validation, and learning. Autonomous execution is allowed only within a
previously approved goal, budget, scope, and risk policy.

## Architecture Ownership

| Layer     | Adopted responsibility                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------- |
| Protocol  | Roles, capabilities, runs, events, human input, assignments, evidence, and handoffs                     |
| Core      | Canonical work graph, leases, dependencies, governance, decisions, evidence, and recovery truth         |
| SDK       | Structured lifecycle operations and subscriptions with injected effects                                 |
| Agent     | Local orchestration, models, tools, worktrees, roles, terminal/browser adapters, and interaction        |
| Providers | Model requests, normalized streaming, capability negotiation, usage, and sanitized errors               |
| Service   | Hosted execution, schedules, synchronization, secrets, organizations, quotas, notifications, and audits |
| Web       | Mission control, review, approvals, collaboration, configuration, billing, and cloud interaction        |
| Core CLI  | Deterministic lifecycle, validation, inspection, governance, and Agent launch negotiation               |

## Storage Architecture: File-Canonical, Database-Accelerated

AutoForge should not replace its Markdown and JSON project state with SQLite.
Human-readable, Git-versioned files are a core portability advantage: people
and agents can inspect them without a running service, review changes as diffs,
move them with the repository, and recover them from ordinary version control.

SQLite is appropriate where file stores become inefficient or unsafe under
high-frequency concurrent access. The intended hybrid boundary is:

### Canonical project truth: tracked Markdown and JSON

- intent, requirements, specifications, and planning artifacts;
- features, phases, tasks, issues, and dependencies;
- decisions, doctrines, constitution, and domain knowledge;
- promoted memories and research findings;
- validation evidence summaries and release records;
- portable handoffs and documented migrations.

These records remain authoritative, reviewable, exportable, and usable without
SQLite.

### Rebuildable local projection: ignored SQLite

- full-text and graph indexes over canonical records;
- materialized status, dependency, and impact queries;
- lookup acceleration for large projects;
- deduplication and content fingerprints;
- derived dashboards and digital-twin projections.

A projection database must record its schema and source fingerprint, be safe to
delete, and rebuild deterministically from canonical files. It must never be
the only copy of a decision, work item, approved memory, or evidence result.

### Operational Agent state: local SQLite when justified

- high-frequency run events and bounded logs;
- atomic claim coordination and lease heartbeats;
- transient tool calls and process metadata;
- pending human-input delivery state;
- schedule execution state, retries, and local notifications;
- optional conversation history under an explicit retention policy.

Operational databases are ignored by Git, versioned through migrations, use
transactions and WAL where appropriate, expose supported SDK operations, and
produce durable Core records when an event becomes project truth.

### Global and hosted storage

The operating-system global AutoForge instance may use SQLite for project
discovery, local personal-memory indexes, and synchronization queues while
retaining documented export and recovery formats. Team and hosted Service state
should use a server database suitable for multi-user authorization,
synchronization, backups, and audit requirements rather than sharing a SQLite
file over a network filesystem.

### Adoption gate

Before introducing SQLite into a domain:

1. Demonstrate a concurrency, scale, query, or latency requirement that files
   cannot satisfy safely.
2. Classify the data as canonical, derived, operational, global, or hosted.
3. Define migrations, corruption recovery, backup, retention, and deletion.
4. Preserve deterministic export and provider-neutral SDK access.
5. Test atomicity, crash recovery, concurrent processes, and stale projections.
6. Prove that deleting a derived database cannot erase canonical project truth.

The first recommended database use is a rebuildable query projection or local
Agent run/event store, not migration of current work, decisions, and memory out
of Markdown and JSON.

## Candidate Milestone Mapping

### v0.26: contracts and trust foundations

- superseding evidence semantics;
- generated-content safety;
- commenting governance;
- initial role, run, event, and human-input contract design;
- atomic assignment and compatibility audit;
- clean-room and brand-collision governance.

### v0.27: publishable local Agent

- role-specialized local execution;
- dependency-ready work selection;
- run lifecycle and interactive controls;
- streaming execution events;
- verifier and regression roles;
- bounded local scheduling;
- terminal, browser, diff, and evidence review adapters;
- local TUI mission-control foundations;
- interruption and structured recovery.

### v0.28: portable memory and continuity

- durable cross-agent recovery summaries;
- governed conversation-retention choices;
- personal, project, team, and organization memory promotion;
- contradiction, supersession, expiration, and visibility policies.

### v0.29: integration control plane

- expose run, assignment, evidence, and human-input contracts through MCP, ACP,
  SDK, CLI, and third-party adapters;
- add conformance fixtures for external agents and interfaces.

### v0.30: hosted Service foundation

- durable background execution and schedules;
- retries, quotas, notifications, secrets, and organization policies;
- cloud run recovery and audit records.

### v0.31: Web and team collaboration

- full mission-control dashboard;
- team approvals and human-input inbox;
- agent, dependency, evidence, schedule, terminal, and browser projections;
- collaboration and organization administration.

These assignments remain candidate sequencing. Every capability requires
bounded work, acceptance criteria, strategy assessment, and approval.

## Explicit Non-Adoptions

AutoForge will not adopt the reviewed project's:

- Claude Agent SDK exclusivity;
- provider-specific Core contracts;
- raw conversations as canonical project truth;
- second feature database competing with AutoForge work state;
- Boolean passing status as sufficient completion evidence;
- npm-managed Python runtime architecture;
- broad shell authorization based only on command-name parsing;
- monolithic orchestration or security modules;
- source code without license review.

## Implementation Gate

Before coding an adopted capability:

1. Create a bounded AutoForge work item with explicit package ownership.
2. Write provider-neutral Protocol contracts before interface-specific state.
3. Define safety, privacy, authorization, and recovery behavior.
4. Extend existing Core operations instead of creating parallel storage.
5. Add focused conformance, failure-path, and compatibility tests.
6. Record the decision and evidence required for completion.
7. Independently review the implementation for AGPL source contamination.
