# AutoForge Post-v0.25 North-Star Roadmap

Status: Proposed planning baseline  
Captured: 2026-08-25  
Starting point: AutoForge Core CLI 0.25.2

This document preserves the proposed development direction after the v0.25
platform-boundary release. It is the starting point for v0.26 planning, not an
irrevocable promise that every candidate version or capability will ship in
the order shown. AutoForge strategy assessments, customer evidence, technical
constraints, security review, and explicit release approval may reorder or
split later milestones.

The
[`ULTIMATE_AUTOFORGE_AI_NORTH_STAR.md`](./ULTIMATE_AUTOFORGE_AI_NORTH_STAR.md)
is authoritative for the enduring product destination. This document is the
candidate delivery plan for moving toward it.

## North-Star Outcome

AutoForge should become the persistent, provider-neutral operating system for
turning human intent into governed, explainable, validated software through
collaboration among people and AI agents.

The complete lifecycle is:

```text
Idea -> Research -> Requirements -> Design -> Architecture
     -> Planning -> Prioritization -> Development
     -> Validation -> Decisions -> Handoff -> Learning
```

AutoForge does not need to outperform every coding agent at editing files,
running terminals, controlling browsers, or generating designs. Specialized
agents provide intelligence and execution. AutoForge preserves the shared
intent, truth, coordination, evidence, safety, and continuity that lets those
agents work on the same governed project.

## Strategic Product Position

The principal market gap is not code generation. It is continuity across
agents, providers, sessions, machines, and teams.

AutoForge should provide:

- durable structured project truth rather than transcript-dependent memory;
- portable handoffs among Codex, Claude Code, Cursor, Grok Build, Antigravity,
  TRAE, Replit, Lovable, and future tools;
- explainable work ownership, dependencies, priority, scope, and completion;
- validation evidence tied to the applicable work and source revision;
- governed personal, project, team, and organization knowledge;
- common safety policies for local, background, and hosted agents;
- provider-independent model and capability routing;
- portable product and design contracts;
- local-to-cloud continuity without making the cloud a Core prerequisite.

## Architectural Invariants

The following boundaries apply throughout the roadmap:

1. Core remains deterministic, provider-neutral, local-first, and usable
   without an account, credential, network connection, or hosted service.
2. Agent and Service own model calls, conversational behavior, streaming, and
   provider-specific adapters.
3. The Git repository root is the canonical AutoForge project boundary.
4. Structured project truth takes priority over raw conversational transcripts.
5. Model-produced intents, memories, priorities, research, and designs remain
   proposals until validated and appropriately approved.
6. Memory promotion requires explicit visibility, provenance, and governance.
7. Generated output cannot bypass scope, safety, or validation gates.
8. Provider-specific formats cannot become Core contracts.
9. Public boundaries use versioned Protocol and SDK contracts with capability
   negotiation.
10. Every milestone retains compatibility fixtures, migration guidance,
    evidence, and independent release approval.
11. Web and hosted features enhance local operation rather than becoming a
    prerequisite for it.
12. Each public package or deployable product retains an independent version
    and release gate.

## Adopted Agent-Orchestration Capabilities

AutoForge intends to implement, through its own provider-neutral architecture,
the strongest product concepts identified during the clean-room review of the
separately developed `AutoForgeAI/autoforge` project. These include
role-specialized agents, specification-to-work initialization, atomic work
claiming, dependency-aware parallel execution, independent regression agents,
structured human-input pauses, live run events, mission-control interfaces,
scheduled execution, terminal and browser review surfaces, and structured
crash recovery.

[`AUTOFORGEAI_ORCHESTRATION_CAPABILITY_ADOPTION.md`](./AUTOFORGEAI_ORCHESTRATION_CAPABILITY_ADOPTION.md)
maps each idea to Protocol, Core, SDK, Agent, Providers, Service, Web, and Core
CLI. It also defines a file-canonical, database-accelerated storage boundary:
tracked Markdown and JSON remain authoritative project truth, while SQLite may
serve rebuildable indexes and high-frequency local Agent state. The document
records clean-room, licensing, brand-collision, and explicit non-adoption
boundaries; the reviewed AGPL source must not be copied into this MIT repository
without separate legal and license approval.

## Agentic SDLC Product Track

Continuous Agentic SDLC automation is the first concrete product vertical
beneath the ultimate north-star. It combines four compatible profiles: a
Cursor/TRAE-like interactive local Agent, supervised request-to-review
automation, a later hosted continuous Service, and the shared deterministic
foundation used by both.

The
[`AGENTIC_SDLC_PRODUCT_TRACK.md`](./AGENTIC_SDLC_PRODUCT_TRACK.md)
defines the operating loop, architecture ownership, canonical contracts,
autonomy policy, storage and audit boundaries, candidate delivery mapping,
future work hierarchy, and success measures. It preserves v0.26 as a trust and
contract milestone; database-backed intake, durable hosted queues, and team
mission control remain later Service and Web horizons.

## v0.26 Candidate Charter: Trustworthy Portable Foundation

v0.26 should improve trust, evidence, and portability before AutoForge expands
the experimental Agent or introduces hosted infrastructure.

### 1. Superseding validation evidence

Source status: gate and work-scope supersession was implemented and validated
on 2026-08-26. Source-revision, environment, and gate-definition fingerprints
remain follow-up contract enrichment before the v0.26 exit gate. Publication
remains independently gated.

- Evaluate readiness from the latest applicable required gate execution.
- Retain earlier failures as immutable audit history.
- Bind evidence to work, source revision, environment, and gate definition.
- Explain which evidence established or blocked readiness.
- Prevent one work item or revision from accidentally validating another.

### 2. Code-commenting governance

- Require comments for rationale, invariants, security assumptions, exported
  contracts, compatibility boundaries, and non-obvious constraints.
- Discourage narration, duplication, obsolete explanations, and density quotas.
- Incorporate the policy into doctrines, generated agent contracts, context
  packets, documentation, review guidance, and objective checks where useful.
- Test enforcement behavior without prescribing arbitrary comment counts.

### 3. Agent generated-content safety

- Validate model-generated file content before any write.
- Sanitize streamed terminal output before display.
- Detect secrets, transcript leakage, unsafe absolute paths, binary payloads,
  and policy-prohibited content.
- Make failed validation atomic so partial edits are not left behind.
- Record attributable rejection evidence without logging sensitive content.
- Complete this gate before Agent or Providers publication.

### 4. Portable adapter preparation

- Define one canonical AutoForge structured handoff document.
- Map project context to `AGENTS.md`, `CLAUDE.md`, Cursor rules, and equivalent
  agent-specific instruction surfaces without making them sources of truth.
- Define MCP, ACP, CLI, and SDK transport mappings around shared contracts.
- Add provider-neutral conformance fixtures without requiring paid model calls.
- Document capability discovery and read-only versus mutating permissions.

### 4.1 Agent execution contract preparation

- Define candidate provider-neutral agent-role and capability contracts.
- Define a durable `HumanInputRequest` boundary for clarification and approval
  pauses.
- Define the run lifecycle and sanitized execution-event vocabulary needed by
  future TUI, Web, MCP, ACP, SDK, and embedded clients.
- Ensure operational run state remains linked to, but does not replace,
  durable work, decisions, evidence, and handoffs.
- Define the file-canonical and optional SQLite projection/runtime boundary
  before introducing a database dependency.

### 5. Compatibility cleanup

- Decide whether the deprecated `autoforge tui` alias is removed in v0.27.
- Audit temporary root-package and CLI compatibility shims.
- Define the eventual physical Core CLI package relocation.
- Keep v0.24 and v0.25 durable state readable or provide an explicit lossless
  migration.

### v0.26 exit gate

v0.26 is ready only when readiness evidence is trustworthy, commenting
governance is useful rather than noisy, generated Agent output is rejected
safely before writes or display, portable handoff contracts have compatibility
fixtures, and supported older project state remains readable.

## Candidate Later Milestones

The following themes are provisional. Planning may split, merge, rename, or
reorder them when evidence supports a better path.

### v0.27: Publishable Local Agent

Goal: turn the experimental Agent into a safe, useful local product.

Candidate outcomes:

- independently publish Agent and approved Providers;
- make bare `autoforge` the mature interactive Agent entry point;
- support streaming responses and continuous follow-up;
- provide plan, review, approve, execute, and verify interaction;
- support interruption, recovery, and durable structured handoffs;
- support role-specialized planning, implementation, verification, research,
  design, review, and release execution;
- select dependency-ready work through atomic assignments and scoped leases;
- expose start, steer, pause, resume, cancel, retry, and inspect controls;
- stream provider-neutral run events and structured human-input requests;
- provide local mission-control, terminal, browser, diff, and evidence review;
- support bounded local schedules under the same governance as interactive runs;
- negotiate provider and model capabilities;
- add approved OpenAI, Anthropic, Gemini, and OpenRouter adapters;
- expose token, cost, latency, and context-use information;
- complete native credential-store validation on macOS, Windows, and Linux;
- resolve the deprecated Core TUI alias and temporary launcher boundaries.

Exit gate: a user can install AutoForge, attach a repository, launch the Agent,
complete guarded work, switch supported providers, and resume without losing
structured project state.

### v0.28: Portable Memory and Continuity

Goal: transfer governed knowledge among agents, sessions, machines, and teams.

Candidate outcomes:

- personal, project, team, and organization memory levels;
- explicit promotion, demotion, archival, and deletion workflows;
- provenance, confidence, expiration, supersession, and contradiction handling;
- privacy, visibility, retention, and export policies;
- provider-neutral session and work handoffs;
- secure global-memory export and import;
- reusable preferences applied only to approved projects;
- no raw transcript retention by default.

Exit gate: work started in one supported agent can continue in another with the
correct decisions, constraints, validation, risks, and next action.

### v0.29: Integration Control Plane

Goal: make AutoForge available inside third-party agentic products without
requiring the first-party Agent.

Candidate outcomes:

- AutoForge MCP server;
- ACP or equivalent agent-client adapter;
- stabilized public SDK operations;
- generated setup contracts for major coding agents;
- capability discovery and negotiation;
- read-only and mutation permissions;
- scoped leases and conflict prevention for parallel agents;
- shared evidence and handoff schemas;
- adapter conformance and compatibility testing.

Exit gate: a conforming third-party agent can inspect, claim, execute, validate,
explain, and hand off AutoForge work without parsing terminal prose.

### v0.30: Hosted Service Foundation

Goal: synchronize governed project intelligence securely while preserving
independent local operation.

Candidate outcomes:

- hosted Service/API boundary;
- authentication, users, and organizations;
- encrypted state synchronization;
- offline-first reconciliation and conflict resolution;
- tenant isolation and authorization;
- audit logging and observability;
- hosted model gateway and routing policies;
- durable scheduled and background execution with retries and recovery;
- usage metering, quotas, and cost controls;
- provider-secret custody design;
- backup, recovery, and incident-response foundations.

Exit gate: two authorized environments can synchronize structured project state
without making an account mandatory for local-only projects.

### v0.31: Web and Team Collaboration

Goal: provide the management surface for individuals and organizations.

Candidate outcomes:

- account, organization, and project management;
- work, decision, evidence, release, and agent-run views;
- dependency, schedule, human-input, terminal, and browser mission-control
  views;
- team-memory review and promotion;
- provider and cloud synchronization configuration;
- roles, permissions, approvals, and audit history;
- subscription, billing, and usage management;
- accessible cloud interaction with AutoForge workflows.

Exit gate: a team can review and govern AutoForge activity without relying
exclusively on local CLI access.

### Later: Intelligence and Design Orchestration

The optional Intent Compiler and portable Design Orchestrator remain governed
future capabilities. They may advance earlier if customer evidence demonstrates
clear value and the required trust boundaries are ready.

Candidate outcomes:

- deterministic, micro-model, mini-model, and frontier/human escalation tiers;
- schema-validated intent, requirements, task, memory, and research proposals;
- explainable model routing based on privacy, cost, latency, and capability;
- source-backed research assistance;
- vendor-neutral design contracts covering flows, screens, states, tokens,
  accessibility, responsiveness, motion, and production mappings;
- adapters for Figma, Stitch, TypeUI, TRAE, and future design systems;
- design-to-code and code-to-design drift evidence.

See
[`../0.25/FUTURE_INTELLIGENCE_AND_DESIGN_ORCHESTRATION.md`](../0.25/FUTURE_INTELLIGENCE_AND_DESIGN_ORCHESTRATION.md)
for the preserved concept baseline.

### Later: Visual Product Studio

The ultimate interactive experience is a governed visual canvas where users
can inspect and refine AutoForge's interpretation of a prompt, then carry the
same typed intent through prototyping, design, bootstrapping, implementation,
preview, and validation. This is a long-horizon product destination rather
than an expansion of the v0.26 charter.

Candidate outcomes:

- prompt-to-canvas generation for simple files, prototypes, and complex
  applications;
- visual editing of flows, screens, components, tokens, states, responsive
  behavior, accessibility, assets, and data relationships;
- conversational, canvas, and code edits converging on versioned canonical
  artifacts with provenance and approval history;
- bidirectional design-to-code and code-to-design synchronization with drift
  and conflict evidence;
- secure live previews, collaborative review, comments, approvals, and
  recoverable version history;
- high-quality design-system and UX constraints whose compliance is validated
  independently from visual generation;
- portable exports and provider-neutral adapters for Framer, Figma, Stitch,
  TypeUI, and future visual platforms.

Prerequisites include mature typed artifact contracts, a publishable local
Agent, portable design contracts, isolated preview execution, generated-content
safety, and evidence-backed customer demand. The canvas remains a projection
and editor over canonical project truth; it must not create a competing state
system.

Exit evidence: a user can move a representative application from natural
language to an inspectable canvas, refine it visually or conversationally,
generate and edit portable code, detect round-trip drift, and validate the
result without losing intent, provenance, or control.

## Immediate Implementation Order

The proposed next sequence is:

1. Approve the v0.26 charter and decompose it into bounded work.
2. Implement superseding evidence semantics because later releases depend on
   trustworthy readiness reporting.
3. Define and enforce the Agent code-commenting standard.
4. Implement generated-content validation and stream sanitization.
5. Define portable handoff and adapter mappings with conformance fixtures.
6. Define the initial role, run, event, human-input, and hybrid-storage
   contracts needed by the adopted orchestration capability portfolio.
7. Complete compatibility, security, clean-room, documentation, and release
   audits.
8. Release v0.26 before expanding or publishing the production Agent.

Existing AutoForge issues supply the initial work queue:

- `issue.make-release-readiness-use-superseding-gate-evidence` — `now`, first;
- `issue.define-and-enforce-an-agent-code-commenting-standard` — `next`;
- `issue.enforce-agent-generated-content-safety-before-writes-and-streaming` —
  `next`;
- `issue.define-and-benchmark-the-hybrid-sqlite-storage-boundary` — `next`;
- `issue.define-optional-intent-compiler-and-portable-design-orchestration` —
  `later`.
- `issue.define-the-autoforge-visual-product-canvas-and-design-to-code-contracts`
  — `later`.

This explicit order reconciles the earlier status recommendation that surfaced
commenting governance ahead of evidence supersession. Trustworthy readiness is
the prerequisite for evaluating every later release gate, so evidence remains
the first v0.26 implementation item.

Portable adapter preparation and compatibility cleanup require new bounded work
items when the v0.26 charter is approved for implementation.

## Roadmap Governance

Before promoting a candidate capability into committed milestone work:

1. Capture the user problem and intended outcome.
2. Register relevant customer, technical, security, and market evidence.
3. Identify Core, Protocol, SDK, Agent, Service, and Web ownership.
4. Define privacy, security, and compatibility boundaries.
5. Record dependencies and a narrow acceptance gate.
6. Assign an explainable strategy decision: now, next, later, or backlog.
7. Obtain explicit approval before implementation or publication where needed.

Success should be measured by reliable continuity and validated outcomes, not
the number of integrations, models, generated files, or autonomous steps.
