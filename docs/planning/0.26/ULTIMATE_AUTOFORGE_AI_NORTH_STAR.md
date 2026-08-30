# Ultimate AutoForge AI North-Star

Status: Superseded on 2026-08-30; preserved as historical product exploration
Established: 2026-08-26

> This AI-operator destination no longer governs AutoForge implementation.
> AutoForge is now restricted to the independently usable engineering
> framework defined by the
> [AutoForge Framework North-Star](./AUTOFORGE_FRAMEWORK_NORTH_STAR.md). General
> AI, personal-assistant, and Visual Product Studio concepts are preserved in
> the
> [Separated Future AI Product Portfolio](./SEPARATED_FUTURE_AI_PRODUCT_PORTFOLIO.md).

## Product Promise

AutoForge's official product tagline is:

> **Human intent. AI execution. One shared understanding.**

It describes the product's central promise: translate what people mean into
governed AI action while preserving durable context that humans and agents can
understand together. The broader company mission remains **eliminating
communication barriers between humans and AI—for good**.

## North-Star Statement

AutoForge is a trusted, persistent, provider-neutral AI operator that
understands a person's goals, knowledge, responsibilities, and permissions and
safely performs validated work across applications, communications, projects,
and teams.

This is the enduring destination for the AutoForge product family. The
[post-v0.25 roadmap](./POST_V0_25_NORTH_STAR_ROADMAP.md) proposes how to move
toward it, while individual AutoForge work items, evidence, decisions, and
release gates determine what is actually implemented and when.

## Product Evolution

AutoForge should grow through four compatible identities rather than abandon
one product each time its reach expands:

```text
Software project orchestration
            |
            v
Governed developer agent
            |
            v
Cross-application work orchestration
            |
            v
Personal and organizational AI operator
```

The current Core is the durable foundation, not a temporary prototype. Its
project state, decisions, evidence, governance, and handoffs become the trust
layer used by every future interface and agent runtime.

## The Complete Operating Loop

For software development, AutoForge preserves continuity across the complete
product lifecycle:

```text
Idea -> Research -> Requirements -> Design -> Architecture
     -> Planning -> Priority -> Development -> Validation
     -> Decisions -> Handoff -> Learning
```

For broader work, AutoForge applies the same discipline through a universal
operator loop:

```text
Observe -> Understand -> Propose -> Approve -> Act -> Verify -> Remember
```

The user remains in control of goals, permissions, consequential decisions,
and what becomes durable memory.

## What "AutoForge Becomes Its Own AI" Means

AutoForge should own the agent identity, durable context, orchestration,
memory, permission model, validation, and user experience. It can route work to
OpenAI, Anthropic, Gemini, OpenRouter, local models, and future providers
without making any one model the product.

Training a general-purpose foundation model is not a near-term requirement.
Later, AutoForge may develop or fine-tune specialized small models for intent
classification, memory retrieval, routing, policy checks, prioritization, and
validation when evidence shows a clear privacy, quality, latency, or cost
advantage. Those models remain replaceable components behind provider-neutral
contracts.

## User Experiences

AutoForge should eventually be available wherever governed work happens:

- a first-party interactive CLI and TUI for local development;
- a Web application for cloud interaction, accounts, teams, subscriptions,
  providers, synchronization, approvals, and mission control;
- SDK, API, MCP, ACP, and embedded-agent surfaces;
- adapters for coding and design tools such as Claude Code, Codex, Cursor,
  Grok Build, Antigravity, TRAE, Replit, Lovable, Figma, Stitch, and TypeUI;
- mobile, voice, browser, and messaging channels where they provide a safe and
  accessible interface;
- scheduled and background execution governed by the same scopes, approvals,
  and evidence requirements as interactive work.

The everyday operator may read and draft email, summarize and triage support
backlogs, inspect application databases, prepare RCS or internet-based
messages, coordinate projects, or act inside a SaaS product. Reading, sending,
deleting, refunding, publishing, and changing production data are not equivalent
permissions and must never share an implicit authority level.

## Ultimate Experience: Visual Product Studio

AutoForge should ultimately let a person describe an idea and see the system's
interpretation take shape in a first-party visual canvas before consequential
work is accepted. The experience should support anything from a standard file
or flagship prototype to a fully fledged, thoroughly architected,
support-grade product ready for production deployment:

```text
Prompt -> Structured intent -> Visual canvas <-> Raw code workspace
       -> Human refinement -> Approved artifacts -> Preview and execution
       -> Architecture and validation -> Deploy -> Operate -> Evolve
```

The canvas should make screens, components, design tokens, user flows, states,
responsive behavior, accessibility requirements, assets, data relationships,
and implementation status inspectable. An integrated raw-code workspace should
make files, diffs, dependencies, schemas, APIs, tests, infrastructure, and
runtime evidence directly accessible rather than hiding implementation behind
generated previews. Users should be able to refine the same understanding
through conversation, direct manipulation, or code while AutoForge records
provenance, proposals, approvals, validation, and version history.

The product journey does not end when a prototype looks complete. AutoForge
should help mature the same project through system architecture, frontend and
backend implementation, data and identity boundaries, testing, security,
deployment, observability, documentation, incident readiness, and ongoing
support. Sandboxed previews should demonstrate behavior without implying that
visual polish proves correctness, accessibility, security, scalability,
operability, or release readiness.

The canvas is an editor and projection over canonical typed artifacts, not a
second source of truth. Prompt-to-canvas, canvas-to-artifact, design-to-code,
and code-to-design changes must use versioned contracts, bidirectional drift
detection, and explicit conflict handling. Export must remain portable, and
adapters for Framer, Figma, Stitch, TypeUI, and future visual platforms must
remain replaceable behind provider-neutral boundaries.

## Platform Architecture

| Layer                   | Enduring responsibility                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Protocol                | Versioned, provider-neutral contracts for work, memory, runs, events, permissions, evidence, handoffs, and capabilities     |
| Core                    | Deterministic canonical truth, governance, validation, priority, decisions, dependencies, assignments, and recovery rules   |
| SDK                     | Stable programmatic operations over Core and approved remote transports, with effects injected at boundaries                |
| Agent                   | First-party conversational runtime, local orchestration, tools, roles, model routing, streaming, and interaction            |
| Providers               | Replaceable model adapters, capability negotiation, normalized usage, errors, and streaming                                 |
| Connectors and channels | Least-privilege access to email, messaging, databases, support systems, browsers, design tools, and SaaS applications       |
| Service/API             | Hosted identity, synchronization, execution, schedules, organizations, secrets, quotas, metering, audits, and notifications |
| Web                     | Cloud interaction, project and team management, provider setup, billing, approvals, evidence, and mission control           |
| Intelligence            | Schema-bound intent, research, requirements, task, design, routing, memory, and validation proposals                        |

An eventual connector or capability marketplace may distribute reviewed
integrations. Installation must not imply permission to read or mutate every
resource available to the connector.

## Trust and Authority

Every capability should fit an explicit authority ladder:

```text
Discover -> Read -> Propose -> Approve -> Execute -> Verify
```

Advancing through the ladder requires declared capability, applicable policy,
and user or organization authority. High-impact actions require stronger
approval, receipts, verification, and recovery than low-risk read operations.

The minimum trust model includes:

- least-privilege scopes and time-bounded credentials;
- visible previews for consequential actions;
- atomic writes and rollback or compensation where practical;
- secret and generated-content sanitization;
- immutable historical evidence with explicit supersession semantics;
- attributable action receipts without leaking sensitive content;
- interruption, retry, checkpoint, and recovery behavior;
- human-input requests that pause work instead of inventing authority;
- tenant isolation and auditability for hosted use.

## Memory and Shared Knowledge

AutoForge should support personal, project, team, and organization memory.
Movement between levels is an explicit promotion, not an accidental side effect
of a chat session.

Every durable memory needs:

- origin and provenance;
- owner and visibility;
- confidence and applicable scope;
- creation, review, expiration, and supersession state;
- contradiction handling;
- retention, export, demotion, archival, and deletion controls.

Structured summaries, decisions, preferences, constraints, evidence, and
handoffs are preferred over raw transcripts. A transcript may be retained only
through an explicit policy for a defined purpose and retention period.

## Orchestration and Mission Control

The long-term execution system should include:

- specification-to-work initialization;
- role-specialized planners, implementers, researchers, designers, reviewers,
  verifiers, and release operators;
- dependency-aware parallel work with atomic claims and scoped leases;
- independent validation and regression agents;
- durable human-input and approval pauses;
- a governed run lifecycle and provider-neutral event stream;
- terminal, browser, diff, evidence, cost, and progress review surfaces;
- schedules, background execution, checkpoints, and crash recovery;
- continuous-improvement proposals that cannot silently create and execute
  their own roadmap.

The detailed clean-room capability portfolio and ownership mapping live in
[AutoForgeAI Orchestration Capability Adoption](./AUTOFORGEAI_ORCHESTRATION_CAPABILITY_ADOPTION.md).

### First Product Vertical: Agentic SDLC

AutoForge's first complete vertical should convert validated software requests
into governed, evidence-backed, review-ready changes. The vertical progresses
from a Cursor/TRAE-like interactive local Agent, through supervised local
request-to-review automation, into later integration, hosted Service, and team
mission-control capabilities without moving model calls or hosted dependencies
into Core.

The authoritative
[Agentic SDLC Product Track](./AGENTIC_SDLC_PRODUCT_TRACK.md) separates these
execution profiles, defines their shared contracts and authority boundaries,
and maps them onto the candidate delivery horizons below.

## Storage Boundaries

Storage follows a file-canonical, database-accelerated model:

1. Tracked Markdown and JSON remain authoritative project truth.
2. Local SQLite may provide disposable, deterministically rebuildable search,
   graph, status, and materialized-query indexes.
3. SQLite may hold justified high-frequency local Agent runtime state when its
   lifecycle, migration, backup, and recovery rules are explicit.
4. The hosted Service uses an appropriate transactional database for accounts,
   organizations, synchronization, billing, schedules, and operational state.
5. No database projection silently becomes the only copy of durable project
   decisions, requirements, evidence, or promoted memory.

The benchmark and adoption gates are defined in the
[orchestration capability document](./AUTOFORGEAI_ORCHESTRATION_CAPABILITY_ADOPTION.md#storage-architecture-file-canonical-database-accelerated).

## Architectural Invariants

1. Core remains deterministic, provider-neutral, local-first, and usable
   without an account, credential, network connection, or hosted service.
2. The Git repository root is the canonical AutoForge project boundary.
3. Attaching a project to the global workspace is explicit.
4. Agent and Service own model calls and external side effects; Core owns the
   rules and durable truth around them.
5. Model output is a proposal until schema validation, policy, scope, and any
   required approval allow it to become state or action.
6. Provider-specific formats never become canonical Core contracts.
7. Public boundaries use versioned Protocol and SDK contracts with capability
   negotiation and compatibility fixtures.
8. Generated output cannot bypass content safety, validation, or evidence
   gates.
9. Memory promotion is explicit and governed; raw transcripts are not retained
   by default.
10. Web and cloud capabilities enhance local use rather than becoming
    prerequisites for it.
11. Every public package and deployable product retains an independent release
    gate.
12. External product concepts are implemented clean-room under AutoForge's own
    contracts and license boundaries.
13. Visual representations project canonical typed artifacts and cannot become
    an ungoverned parallel source of project truth.

## Candidate Delivery Horizons

Version labels communicate a possible sequence, not a promise that features
must ship together or in this exact order.

| Horizon        | Candidate outcome                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v0.26          | Trust foundation: superseding evidence, commenting governance, generated-content safety, portable contracts, storage boundary, compatibility                                    |
| v0.27          | Safe, publishable local Agent with streaming, roles, tools, recovery, approvals, and provider routing                                                                           |
| v0.28          | Governed portable memory and continuity across agents, sessions, machines, and teams                                                                                            |
| v0.29          | Integration control plane through SDK, MCP, ACP, adapters, and conformance contracts                                                                                            |
| v0.30          | Hosted Service foundation for secure synchronization, execution, organizations, secrets, schedules, and metering                                                                |
| v0.31          | Web and team collaboration for cloud interaction, mission control, billing, policy, and shared work                                                                             |
| Later horizons | Governed visual product studio, everyday-work connectors and channels, embedded AI, mobile and voice experiences, marketplace, and evidence-backed specialized AutoForge models |

## Reconciled Immediate Priority

The current implementation sequence is:

1. superseding release-readiness evidence (`now`);
2. code-commenting governance (`next`);
3. Agent generated-content safety (`next`);
4. hybrid SQLite storage boundary and benchmark (`next`);
5. role, run, event, human-input, and adapter contract decomposition;
6. optional intent compiler and portable design orchestration (`later`).
7. visual product canvas and bidirectional design-to-code contracts (`later`,
   after the required artifact, Agent, preview, and design foundations).

This ordering resolves the prior mismatch between the roadmap, which required
trustworthy evidence first, and a status recommendation that surfaced
commenting governance. Evidence must reliably express readiness before later
milestones rely on that readiness signal.

## Competitive Position

Specialized agents may be better at individual edits, searches, designs, or
provider-specific experiences. AutoForge's defensible responsibility is to
govern the durable truth that lets users and many agents work safely across
time:

> Agents execute. AutoForge preserves intent, authority, evidence, memory, and
> continuity.

The measure of success is not the number of models, autonomous steps, or
generated files. It is whether users can achieve reliable outcomes, understand
what happened, recover when something fails, and continue work without losing
intent or trust.

## Explicit Non-Goals

- Training a frontier foundation model in the near term.
- Requiring cloud service, login, or payment for Core project governance.
- Replacing every coding IDE, design tool, email client, or support system.
- Treating raw chat history or hidden provider reasoning as project memory.
- Allowing autonomous execution outside an approved goal, budget, scope,
  permission, and risk policy.
- Copying AGPL implementation from the unrelated `AutoForgeAI/autoforge`
  project into this MIT codebase.
- Treating provisional version horizons as implementation authorization.

## Governance of the North-Star

The destination may be clarified as evidence improves, but material changes to
its trust model, architectural invariants, or product identity require an
AutoForge decision. Delivery remains governed by bounded work items,
explainable strategy assessment, dependencies, validation evidence, and
explicit release approval.

Brand, package, domain, executable-name, and trademark collision with other
projects named AutoForge require a separate legal and product review before the
hosted business or wider distribution materially expands.

Related planning:

- [Post-v0.25 North-Star Roadmap](./POST_V0_25_NORTH_STAR_ROADMAP.md)
- [AutoForgeAI Orchestration Capability Adoption](./AUTOFORGEAI_ORCHESTRATION_CAPABILITY_ADOPTION.md)
- [Future Intelligence and Design Orchestration](../0.25/FUTURE_INTELLIGENCE_AND_DESIGN_ORCHESTRATION.md)
- [v0.25 Platform Migration Plan](../0.25/PLATFORM_MIGRATION_PLAN.md)
