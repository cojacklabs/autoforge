# AutoForge Ultimate North Star Architecture Guide

## Unified Roadmap: v0.8.0 → v0.25.0

> **Sequencing amendment:** v0.24 is now Continuous Product Evolution and v0.25 is the Interactive CLI Experience. The continuous lifecycle must be complete before the richer human-facing interface is implemented.

### Phase 1 Foundation + Phase 2 Product Intelligence

**Date:** August 21, 2026\
**Status:** Canonical architecture and roadmap bridge for planning,
implementation, and Codex context\
**Primary purpose:** Explain how AutoForge's releases fit together as
one system, what architectural invariants must remain true, and how each
capability advances the project toward the North Star.

---

# 1. Executive Summary

AutoForge is an open-source software-engineering orchestration
framework.

It is **not** an AI agent and should not evolve into a replacement for
Codex, Claude Code, Cursor, Antigravity, Gemini, or other
reasoning/coding agents.

AutoForge's responsibility is to maintain the durable project
intelligence those agents need:

- human intent;
- product vision;
- structured project knowledge;
- project memory;
- governance;
- domain rules;
- architecture;
- design specifications;
- traceability;
- active work;
- release scope;
- task boundaries;
- context resolution;
- validation requirements;
- evidence;
- evolving product state.

The long-term philosophy is:

> **Humans think messily. AutoForge organizes persistently. AI agents
> execute precisely.**

The technical North Star is:

> **AutoForge converts human intent and persistent project knowledge
> into governed, precise, task-specific context for AI agents across the
> complete product lifecycle.**

The future-state metaphor is:

> **AutoForge becomes the living digital twin and orchestration layer of
> a software project---without replacing the human or the reasoning
> agent.**

---

# 2. Why This Document Exists

AutoForge's roadmap now spans two major phases.

Phase 1, v0.8--v0.14, builds the machinery required to capture,
organize, retrieve, and deliver project knowledge.

Phase 2, v0.15--v0.25, builds governance and product intelligence on top
of that machinery so AutoForge can coordinate a complete
software-development lifecycle.

This document is the connective tissue between those phases.

Codex and other contributors should use it to understand:

1.  why each release exists;
2.  what prior capability it depends on;
3.  what it unlocks next;
4.  what architectural principles must not be violated;
5.  how Verdua acts as the real-world proving ground;
6.  how the full roadmap converges toward AutoForge 1.0.

---

# 3. Architectural Invariants

These principles should remain true even if implementation details
change.

## 3.1 AutoForge Is Not the Reasoning Model

```text
Agent Intelligence ≠ Project Intelligence
```

The AI reasons.

AutoForge supplies persistent project intelligence, constraints,
approved decisions, context, and validation rules.

## 3.2 Minimum Complete Context

> **The goal is minimum complete context, not maximum context.**

Agents should receive the smallest complete slice of project reality
required to perform the active task correctly.

## 3.3 Repository as Canonical Source

> **The repository is the canonical, portable source of truth for
> project and design knowledge.**

External tools may visualize, critique, or enrich that knowledge, but
should not become the only place where essential project truth exists.

## 3.4 Modular Knowledge

Avoid monoliths such as:

```text
EVERYTHING.md
PROJECT_CONTEXT.md
ALL_DESIGN.md
```

Prefer atomic artifacts with stable identifiers and explicit
relationships.

## 3.5 Human Authority

AutoForge may:

- identify conflicts;
- surface risks;
- enforce configured hard constraints;
- explain tradeoffs;
- identify missing evidence;
- recommend options.

AutoForge must not silently replace human product ownership.

## 3.6 Vendor Neutrality

Project intelligence should remain portable across agents and model
providers.

## 3.7 Project Isolation

Global AutoForge availability must never imply cross-project memory
leakage or global filesystem authority.

## 3.8 Validation Is Part of Completion

"Code compiles" is not equivalent to "work is done."

---

# 4. The Complete AutoForge Architecture

```text
HUMAN INTENT
      ↓
INGESTION / DISCOVERY
      ↓
PROJECT VISION
      ↓
PROJECT CONSTITUTION
      ↓
STRUCTURED KNOWLEDGE STORE
      ↓
DOMAIN + DESIGN MODELS
      ↓
KNOWLEDGE / DEPENDENCY GRAPH
      ↓
CONTEXT RESOLUTION ENGINE
      ↓
TASK-SPECIFIC CONTEXT PACKET
      ↓
AGENT CONTRACT
      ↓
SPECIALIZED AI AGENT
      ↓
IMPLEMENTATION
      ↓
VALIDATION + QUALITY GATES
      ↓
RELEASE
      ↓
OBSERVATION + EVIDENCE
      ↓
LEARNING
      ↓
UPDATED LIVING PRODUCT MODEL
      ↺
```

This is the complete loop AutoForge is moving toward.

---

# 5. Core Engine Model

The version numbers describe delivery sequencing. The architecture
itself should be understood as cooperating engines.

## Foundation Engines

- Structured Knowledge Engine
- Workflow Engine
- Agent Contract Engine
- Global Workspace Engine
- Bootstrap Engine
- Vision & Discovery Engine
- Knowledge Graph Engine
- Context Resolution / Context Protocol Engine

## Product Intelligence Engines

- Constitution & Governance Engine
- Domain Intelligence Engine
- Design Specification Engine
- Dependency & Traceability Engine
- Validation & Quality Gate Engine
- Product Digital Twin
- Multi-Agent Orchestration Engine
- Learning & Evidence Engine
- Strategy & Prioritization Engine
- Continuous Product Evolution Engine
- Interactive CLI Experience

These engines should remain composable rather than becoming one giant
subsystem.

---

# 6. Phase 1 --- Build the Project Brain

## v0.8.0 → v0.14.0

Phase 1 answers:

> **How does AutoForge capture, organize, retrieve, and deliver project
> knowledge reliably?**

---

## v0.8.0 --- Structured Knowledge

### Mission

Create modular project knowledge instead of relying on giant prompt
files.

### Primary Question

> What does the project know?

### Foundation

Examples of knowledge types:

```text
vision
product
research
decision
architecture
design
screen
view
component
flow
user-story
use-case
technical-spec
work
```

### Unlocks

Structured knowledge becomes the raw material for workflows, retrieval,
bootstrap, graphs, governance, and validation.

---

## v0.9.0 --- Workflow Orchestration

### Mission

Move structured knowledge through repeatable software-development
workflows.

### Primary Question

> What process should this request follow?

Possible workflows:

```text
discovery
research
feature-development
bug-fix
design-create
design-critique
architecture-change
validation
```

Not every request should invoke every discipline.

### Unlocks

The system can reason about project stages instead of treating every
prompt as an immediate coding request.

---

## v0.10.0 --- Agent Contract

### Mission

Define how an AutoForge-compatible agent must behave.

### Primary Question

> What rules must the host AI follow before, during, and after
> execution?

Canonical flow:

```text
User Prompt
   ↓
Host Agent
   ↓
Check AutoForge
   ↓
Identify active work
   ↓
Resolve context
   ↓
Respect scope
   ↓
Execute
   ↓
Validate
   ↓
Persist durable knowledge
```

### Unlocks

AutoForge can govern AI behavior without becoming the AI itself.

---

## v0.11.0 --- Global Workspace

### Mission

Make AutoForge available across a user's development environment while
preserving project isolation.

### Primary Question

> How can AutoForge be globally available but locally authoritative?

Concept:

```text
~/.autoforge/
├── config
├── registry
├── adapters
├── templates
└── defaults
```

and:

```text
project/.autoforge/
├── vision
├── work
├── decisions
├── research
├── specs
├── design
└── context
```

### Invariant

> Globally available does not mean globally authorized.

### Unlocks

AutoForge can serve many independent projects from one installation.

---

## v0.12.0 --- Bootstrap Engine

### Mission

Take a project from idea or legacy codebase to implementation-ready
structured knowledge.

### Primary Question

> What must be understood before serious implementation begins?

Lifecycle:

```text
Idea
 ↓
Vision
 ↓
Problem
 ↓
Users
 ↓
Use Cases
 ↓
User Stories
 ↓
Flows
 ↓
Research
 ↓
Architecture
 ↓
Design
 ↓
Data
 ↓
Security
 ↓
Development Plan
 ↓
Tasks
```

### Existing Project Mode

Legacy code may be mined for lessons without treating its architecture
as authoritative.

### Unlocks

AutoForge can initialize clean projects and clean rebuilds.

---

## v0.13.0 --- Vision + Discovery Engine

### Mission

Turn natural brainstorming into durable project direction.

### Primary Question

> How does human thinking become project knowledge?

Inputs may include:

```text
voice transcript
chat
brain dump
customer feedback
feature idea
research thought
business idea
design thought
technical concern
```

Possible extracted knowledge:

```text
vision amendment
feature candidate
research question
user story
use case
design concept
architecture concern
risk
backlog item
decision candidate
```

### Living Vision

A durable project vision should capture purpose, users, customer
promise, differentiation, principles, direction, and non-goals.

### Unlocks

Humans no longer need to think like specification documents.

---

## v0.14.0 --- Knowledge Graph + Context Protocol

### Mission

Connect project knowledge and resolve the exact slice required for a
task.

### Primary Question

> What does this agent need to know right now?

Three layers:

```text
Knowledge Store
      ↓
Knowledge Graph
      ↓
Context Resolver
```

Example relationships:

```text
screen.candidate-dashboard
  uses → view.recommended-jobs
  follows → flow.job-discovery
  governed-by → architecture.frontend
  affected-by → decision.DEC-014
```

Context packets should include:

```text
objective
active task
relevant specs
relevant decisions
relevant design
architecture constraints
allowed files
prohibited changes
acceptance criteria
validation instructions
```

### Context Efficiency

Measure total available context versus selected context.

Reducing irrelevant context is a feature.

### Unlocks

AutoForge can provide model-independent, task-specific project
understanding.

---

> **Superseded milestone notice:** this document originally placed an
> "Interactive AutoForge CLI" milestone here as v0.15.0. The roadmap
> revision after v0.14 (see
> `dev/AUTOFORGE_NORTH_STAR_REVISED_POST_V0.14_TO_V0.25.md`) moved the
> richer human-facing interactive experience to v0.25 so it can be built
> on top of the mature governance, domain, design, traceability,
> validation, digital-twin, orchestration, evidence, strategy, and
> continuous-evolution engines instead of preceding them. v0.15 is now
> the Project Constitution & Governance Engine described below. See
> Section 5 ("Interactive CLI Experience") of the revised roadmap for the
> current v0.25 design intent; the possible-interaction sketch and modes
> originally proposed here still describe that later milestone
> reasonably well.

# 7. Phase 1 Readiness Gate

Before Phase 2 is treated as production-ready architecture, Phase 1
should demonstrate:

- modular project knowledge;
- stable artifact identifiers;
- project isolation;
- reliable bootstrap;
- conversational knowledge extraction;
- explicit relationships;
- task-specific context resolution;
- explainable context inclusion;
- agent contract enforcement;
- context budgeting;
- working agent adapters;
- CLI/project entry points;
- validation fixtures proving unrelated context is excluded.

Phase 2 should extend these primitives rather than duplicate them.

---

# 8. Phase 2 --- Build the Living Product Model

## v0.15.0 → v0.25.0

Phase 2 answers:

> **How does AutoForge preserve product intent, understand the product
> itself, govern execution, validate results, and learn over time?**

---

## v0.15.0 --- Project Constitution & Governance Engine

### Mission

Create the rules of the road.

### Primary Question

> What is allowed, required, discouraged, or forbidden?

Capabilities:

- product principles;
- engineering doctrines;
- security principles;
- UX principles;
- explicit non-goals;
- forbidden architectural patterns;
- MUST / MUST NOT / SHOULD / MAY rules;
- release scope;
- conflict detection;
- ADR requirements;
- definition of done.

### Dependency

Requires Phase 1's structured knowledge and agent contract.

### Unlocks

Agents can be prevented from silently drifting away from approved
intent.

---

## v0.16.0 --- Domain Intelligence Engine

### Mission

Represent the business/product model rather than only repository files.

### Primary Question

> What does this product mean?

Domain artifacts may represent:

```text
User
Profile
Resume
Opportunity
Organization
Entitlement
Subscription
```

with relationships and invariants.

Example:

```text
User owns Profile
Profile supplies Resume
Subscription grants Entitlement
```

Domain invariant:

```text
Subscription does not imply authorization.
```

### Dependency

Builds on structured artifacts and governance.

### Unlocks

Architecture, APIs, schemas, UI, permissions, and tests can all
reference the same business meaning.

---

## v0.17.0 --- Repository-Native Design Specification Protocol

### Mission

Make product design portable, structured, and repository-native.

### Primary Question

> What should the product look like and how should it behave?

Suggested structure:

```text
design/
  tokens/
  components/
  patterns/
  screens/
  flows/
  accessibility/
```

External design tools remain visualization and critique layers.

The repository remains canonical.

### Dependency

Uses vision, domain knowledge, context protocol, and governance.

### Unlocks

Multiple design/coding agents can work from the same design truth.

---

## v0.18.0 --- Dependency, Traceability & Change-Impact Engine

### Mission

Connect product intent to implementation.

### Primary Question

> If this changes, what else is affected?

Canonical chain:

```text
Vision
 ↓
Use Case
 ↓
User Story
 ↓
Flow
 ↓
Screen
 ↓
Component
 ↓
API
 ↓
Domain Entity
 ↓
Authorization Rule
 ↓
Test
```

### Dependency

Builds directly on v0.14's graph and v0.16/v0.17 semantics.

### Unlocks

AutoForge can perform impact analysis instead of file-name guessing.

---

## v0.19.0 --- Validation & Quality Gate Engine

### Mission

Make "done" a governed state.

### Primary Question

> What must be true before this work advances?

Potential gates:

- product;
- architecture;
- security;
- privacy;
- UX;
- accessibility;
- testing;
- documentation.

Lifecycle:

```text
idea
discovery
validated
specified
design-ready
implementation-ready
in-development
review
validated
release-ready
released
observed
```

### Dependency

Requires governance, domain semantics, design specs, and traceability.

### Unlocks

AutoForge can prevent incomplete work from being promoted merely because
code exists.

---

## v0.20.0 --- Product Digital Twin

### Mission

Create the connected, queryable interpretation of the current product.

### Primary Question

> What is the product's known state right now?

The digital twin is **not one giant file**.

It is the connected interpretation of:

- vision;
- constitution;
- releases;
- domains;
- features;
- screens;
- components;
- APIs;
- architecture;
- permissions;
- tests;
- decisions;
- risks;
- evidence;
- active work.

### Dependency

The twin emerges from the knowledge graph, traceability, governance,
domain model, and validation state.

### Unlocks

Project-wide queries become possible without loading the entire
repository into an agent.

---

## v0.21.0 --- Multi-Agent Orchestration Engine

### Mission

Coordinate specialized agents through governed, scoped context.

Possible roles:

```text
Product Agent
Architecture Agent
Design Agent
Frontend Agent
Backend Agent
Security Agent
QA Agent
Research Agent
```

Each receives only:

```text
active task
role
required knowledge
permitted actions
prohibited actions
allowed files
acceptance criteria
validation rules
context budget
```

### Benchmark

Give two agents the same context packet and compare their interpretation
and implementation.

### Dependency

Requires reliable context packets, governance, traceability, and
validation.

### Unlocks

AutoForge becomes an orchestration layer across agents rather than an
instruction file for one agent.

---

## v0.22.0 --- Learning & Evidence Engine

### Mission

Bring real-world evidence back into project knowledge.

Evidence may include:

- analytics;
- beta feedback;
- support tickets;
- bug reports;
- usability studies;
- experiment results;
- performance metrics;
- interviews;
- AI evaluations.

Relationship:

```text
hypothesis
 ↓
feature
 ↓
experiment
 ↓
evidence
 ↓
decision
 ↓
updated specification
```

### Dependency

Requires a living product model and traceable features/decisions.

### Unlocks

AutoForge can distinguish assumptions from observed evidence.

---

## v0.23.0 --- Product Strategy & Prioritization Engine

### Mission

Help humans evaluate what should be built next.

### Primary Question

> Given our vision, evidence, dependencies, value, cost, and risk, what
> deserves attention?

AutoForge may organize:

- strategic alignment;
- user value;
- risk;
- cost;
- evidence strength;
- dependencies;
- technical complexity.

### Invariant

> AutoForge informs prioritization. Humans remain responsible for
> strategy.

### Dependency

Requires governance, evidence, domain understanding, and dependency
data.

### Unlocks

Roadmap discussions can be grounded in project reality rather than
isolated prompts.

---

## v0.24.0 --- Continuous Product Evolution Engine

### Mission

Close the complete product-development loop.

```text
Human Thought
     ↓
Discovery
     ↓
Structured Knowledge
     ↓
Research
     ↓
Decision
     ↓
Specification
     ↓
Design
     ↓
Planning
     ↓
Agent Execution
     ↓
Validation
     ↓
Release
     ↓
Observation
     ↓
Evidence
     ↓
Learning
     ↓
Updated Project Knowledge
     ↺
```

### Goal

> Persistent engineering orchestration across the entire product
> lifecycle.

### Dependency

This is the integration milestone for the complete architecture.

---

## v0.25.0 --- Interactive CLI Experience

### Mission

Provide the richer human-facing cockpit over the mature v0.24 lifecycle services.

### Architectural Boundary

The interactive CLI is a presentation and orchestration surface. It must reuse shared application services and must not own governance, graph, context, validation, evidence, or agent logic.

### Dependency

Requires the v0.24 continuous lifecycle to be complete and operable through the regular CLI, agentic controllers, and CI.

---

# 9. Dependency-Aware Roadmap

The roadmap should not be interpreted as twenty isolated feature
releases.

The deeper dependency chain is:

```text
STRUCTURED KNOWLEDGE (0.8)
        ↓
WORKFLOW (0.9)
        ↓
AGENT CONTRACT (0.10)
        ↓
GLOBAL PROJECT MODEL (0.11)
        ↓
BOOTSTRAP (0.12)
        ↓
DISCOVERY / VISION (0.13)
        ↓
KNOWLEDGE GRAPH + CONTEXT (0.14)
        ↓
GOVERNANCE (0.15)
        ↓
DOMAIN INTELLIGENCE (0.16)
        ↓
DESIGN PROTOCOL (0.17)
        ↓
TRACEABILITY (0.18)
        ↓
VALIDATION (0.19)
        ↓
DIGITAL TWIN (0.20)
        ↓
MULTI-AGENT ORCHESTRATION (0.21)
        ↓
EVIDENCE (0.22)
        ↓
STRATEGY SUPPORT (0.23)
        ↓
CONTINUOUS EVOLUTION (0.24)
        ↓
INTERACTIVE CLI (0.25)
```

Important architectural interpretation:

- v0.14 provides the graph primitive.
- v0.18 enriches that graph with end-to-end product traceability.
- v0.20 exposes the connected graph/state as the product digital twin.
- v0.21 uses the mature context/governance model to coordinate
  multiple agents.
- v0.25 integrates the full loop.

These should not become duplicate representations.

---

# 10. The Seam Between Phase 1 and Phase 2

Phase 1 creates the **project brain infrastructure**.

Phase 2 gives that brain **product meaning, governance, verification,
and learning**.

```text
PHASE 1
Capture
Structure
Connect
Retrieve
Deliver
        ↓
PHASE 2
Govern
Understand
Trace
Validate
Coordinate
Observe
Learn
```

The seam is v0.14--v0.15:

```text
v0.14:
What context is relevant?

v0.15:
What rules govern what can happen with that context?
```

That seam should be treated as an explicit architecture boundary.

---

# 11. Verdua as the Reference Implementation

Verdua should not merely consume AutoForge.

It should continuously stress-test it.

Recommended loop:

```text
AutoForge capability reaches usable state
        ↓
Apply it to Verdua
        ↓
Observe friction / missing context
        ↓
Document the failure mode
        ↓
Improve AutoForge
        ↓
Re-run the Verdua workflow
```

Recommended rebuild sequence:

```text
1. Archive current Verdua prototype
2. Extract useful lessons
3. Do not treat legacy architecture as authoritative
4. Bootstrap new Verdua
5. Define constitution
6. Define vision and release boundaries
7. Define domain model
8. Define user stories and flows
9. Define repository-native design specs
10. Build relationships
11. Generate scoped context packets
12. Assign agent work
13. Validate implementation
14. Update project knowledge
15. Repeat
```

---

# 12. When Is AutoForge Ready to Rebuild Verdua?

Do not use a version number alone as the criterion.

The practical readiness test is whether AutoForge can reliably:

- capture Verdua's vision;
- preserve its product principles;
- bootstrap modular specifications;
- model important domains;
- represent user stories and flows;
- represent design canonically;
- connect dependencies;
- generate scoped context;
- constrain an agent's work;
- explain why context was selected;
- validate acceptance criteria;
- preserve decisions after implementation.

The Phase 2 source roadmap proposes Verdua as a governance,
design-protocol, context-resolution, orchestration, and multi-agent
benchmark. That should remain the operating strategy.

---

# 13. Canonical Validation Benchmarks

## Benchmark 1 --- Cross-Agent Consistency

Same task + same packet + same constraints.

Compare Codex, Claude, or other capable agents for:

- scope;
- architecture;
- requirements;
- design fidelity;
- tests;
- acceptance criteria.

## Benchmark 2 --- Context Efficiency

Measure:

```text
total available knowledge
selected knowledge
excluded knowledge
estimated tokens
context reduction %
```

Required information must remain present.

## Benchmark 3 --- Governance Enforcement

Introduce a task that violates the project constitution.

AutoForge should flag the conflict before implementation.

## Benchmark 4 --- Change Impact

Change a domain rule.

AutoForge should identify affected:

- stories;
- flows;
- screens;
- APIs;
- entities;
- permissions;
- tests;
- documentation.

## Benchmark 5 --- Design Fidelity

Give independent agents the same repository-native design specification.

Compare outputs.

## Benchmark 6 --- Validation Completeness

Attempt to mark work release-ready while omitting configured
requirements such as accessibility, authorization, tests, or error
states.

AutoForge should prevent release-ready status.

---

# 14. Codex Implementation Guidance

Codex should treat this roadmap as architectural direction, not
permission to implement every future release immediately.

For every milestone:

1.  inspect the current repository state;
2.  identify which prerequisite interfaces already exist;
3.  reuse existing primitives;
4.  avoid parallel competing representations;
5.  preserve backward compatibility unless migration is explicitly
    planned;
6.  add schemas before complex behavior;
7.  add fixtures and golden tests;
8.  document new artifact types and relationships;
9.  make context selection explainable;
10. keep model/provider-specific logic behind adapters;
11. keep human authority explicit;
12. update the roadmap/architecture docs when implementation reality
    changes.

Do not prematurely build v0.20's digital twin as a separate database if
the knowledge graph can already represent the required state.

Do not prematurely build v0.21's multi-agent system until a single
context packet can be interpreted consistently by multiple independent
agents.

Do not build v0.24 as an autonomous product manager.

---

# 15. Definition of AutoForge 1.0 Readiness

A future 1.0 maturity threshold should mean AutoForge reliably:

- captures natural human intent;
- structures durable project knowledge;
- preserves vision and governance;
- understands core product domains;
- maintains repository-native design truth;
- tracks dependencies and traceability;
- resolves minimum complete context;
- coordinates compatible agents;
- validates implementation against configured gates;
- preserves rationale and decisions;
- incorporates real-world evidence;
- supports human prioritization;
- keeps projects isolated;
- remains vendor-neutral;
- maintains a living interpretation of the product;
- closes the loop from thought to evidence to updated knowledge.

  1.0 should represent system maturity, not simply the next semantic
  version after 0.25.

---

# 16. Final North Star

## Technical North Star

> **AutoForge is an open-source software-engineering orchestration
> framework that converts human intent and persistent project knowledge
> into governed, precise, task-specific context for AI agents across the
> complete product lifecycle.**

## Human-Facing Philosophy

> **Humans think messily. AutoForge organizes persistently. AI agents
> execute precisely.**

## Future-State Metaphor

> **AutoForge becomes the living digital twin and orchestration layer of
> a software project---without replacing the human or the reasoning
> agent.**

## The Simplest Mental Model

```text
Human provides intent.
AutoForge preserves truth.
AutoForge resolves context.
AI performs the work.
AutoForge validates the result.
Reality provides evidence.
AutoForge learns what changed.
Human remains in control.
```

That is the seamless path from v0.8 through v0.25.

---

# 17. Immediate Focus

The roadmap is intentionally ambitious. Current development should
remain milestone-focused.

The immediate objective is not to build Phase 2 prematurely.

The objective is to make each Phase 1 primitive strong enough that Phase
2 can extend it without architectural rewrites.

In particular, the transition should protect:

- stable project isolation;
- stable artifact IDs;
- modular knowledge;
- explicit relationships;
- deterministic schemas;
- explainable context resolution;
- agent-neutral context packets;
- human authority;
- repository portability.

If those foundations remain stable, Phase 2 can evolve naturally from
the system already being built rather than requiring AutoForge to
reinvent itself.
