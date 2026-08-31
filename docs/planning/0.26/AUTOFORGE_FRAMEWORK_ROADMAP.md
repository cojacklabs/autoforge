# AutoForge Framework Roadmap

Status: Authoritative framework planning baseline
Established: 2026-08-30

## Objective

Advance AutoForge as a trusted, open-source engineering control plane without
turning it into a first-party AI agent, personal assistant, IDE, visual
application builder, or hosted-only platform.

## Immediate Reconciled Priorities

1. Complete revision-, environment-, and gate-definition-aware validation
   evidence so readiness remains trustworthy.
2. Define durable, high-value code-commenting governance for agent contracts
   and review without optimizing for comment volume.
3. Make typed AutoForge artifacts the default location for agent-produced
   planning, research, design, architecture, and handoff outputs.
4. Apply the documented
   [hybrid SQLite storage boundary](HYBRID_SQLITE_STORAGE_BOUNDARY.md): keep
   files canonical and defer database adoption until measured gates justify it.
5. Stabilize provider-neutral contracts and adapters for third-party agents,
   including capability negotiation, scope, approvals, handoffs, and evidence.
6. Expand software, data, and AI specifications within one connected project
   graph and improve explainable minimum-complete-context resolution.
7. Reconcile compatibility shims and package boundaries left by the abandoned
   first-party Agent direction.

## Framework Horizons

### Trust and Knowledge Integrity

- validation evidence applicability and supersession;
- comment and documentation governance;
- canonical artifact registry and provenance;
- state migrations and compatibility fixtures;
- deterministic quality, security, and release gates.

### Project Graph and Context

- one graph spanning vision, requirements, decisions, domains, architecture,
  design, data, AI, work, tests, and evidence;
- explainable relevance ranking and context budgets;
- change-impact analysis and contradiction handling;
- rebuildable indexes with measured storage adoption gates.

### Agent Interoperability

- versioned agent contracts and capability declarations;
- third-party agent adapter mappings;
- MCP, SDK, CLI, and machine-readable integration surfaces;
- atomic claims, leases, handoffs, verifier roles, and human-input gates;
- explicit limits where a host can provide guidance but not hard enforcement.

### Software, Data, and AI Engineering Depth

- architecture, domain, API, security, infrastructure, and operational specs;
- datasets, lineage, pipelines, semantic models, quality, and observability;
- AI use cases, prompt and agent specifications, model assumptions, retrieval,
  evaluations, safety rules, and AI observability;
- repository-native design contracts and implementation traceability.

### Optional Ecosystem Services

Hosted synchronization, team views, or browser project inspection may be
considered only as optional projections around the framework. They must not
introduce model reasoning into Core, make accounts mandatory, or replace
repository-owned truth.

## Reconciled Work Classification

### Remains in AutoForge

- validation evidence binding and release readiness;
- agent-facing commenting governance;
- canonical agent-produced artifact storage;
- hybrid SQLite boundaries for indexes and coordination;
- project memory, decisions, research, specifications, and handoffs;
- design protocols, adapters, and design-to-code traceability;
- agent contracts, MCP, SDK, orchestration, assignments, and validation.

### Transfers to the Future CoJack Labs AI

- generalist conversation and personal memory;
- model-provider routing and credentials as an end-user AI product;
- the Visual Product Studio and raw-code canvas;
- email, messaging, support, and everyday-assistant actions;
- prompt-to-product generation and proprietary Agent experiences;
- consumer subscriptions and AI-usage billing.

### Requires Reframing or Closure

- experimental `@cojacklabs/autoforge-agent` and Providers publication work;
- bare `autoforge` delegation to a first-party Agent;
- hosted Agent execution, provider-secret custody, and model streaming;
- AutoForge-branded AI domains and marketing commitments;
- any item whose value depends on AutoForge becoming the reasoning product.

## Naming Workstream

AutoForge remains the repository, package, executable, and state name during
this reconciliation. `Forger` is only a rejected-for-now candidate because the
unscoped npm package is occupied and a directly adjacent AI framework already
uses the name and CLI.

A future naming issue must evaluate repositories, registries, executables,
domains, search results, trademark risk, international meaning, compatibility
aliases, state directories, environment variables, credential-service names,
documentation, and deprecation policy. No rename may begin until a replacement
and migration policy are explicitly approved.

## Exit Test

The roadmap is reconciled when a new agent can unambiguously conclude that
AutoForge organizes and governs technical project work while external agents
reason and execute; no active priority requires AutoForge to become the future
CoJack Labs AI.

## Recorded Work

Current framework priorities:

- `issue.bind-validation-evidence-to-revision-environment-and-gate-definition`;
- `issue.define-and-enforce-an-agent-code-commenting-standard`;
- `issue.make-the-autoforge-artifact-registry-the-default-for-agent-produced-planning`;
- `issue.define-and-benchmark-the-hybrid-sqlite-storage-boundary`;
- `issue.audit-and-retire-first-party-autoforge-agent-compatibility-surfaces`;
- `issue.select-a-distinctive-framework-name-and-compatibility-migration-plan`.

Transferred or reframed work retains its history and strategy assessment, but
must not be selected as framework implementation merely because its work record
remains present.
