# AutoForge Planning Bundle


---

# File: AUTOFORGE_FOUNDATION.md

# AutoForge Foundation

## Status
Living foundation for AutoForge 0.7+.

## Purpose

AutoForge is an open-source **AI software-development context and control framework**.

AutoForge is **not an AI agent**. It is a repository-backed operating contract that AI agents read and follow before taking action in a project.

Its job is to convert messy human intent into structured project knowledge, constrained execution context, durable memory, and clear validation rules.

## North Star

> Humans express intent. AutoForge creates structure. AI agents execute inside explicit boundaries.

A user should not need to become an expert prompt engineer in order to use agentic AI effectively.

AutoForge should absorb the responsibility of turning unclear, incomplete, conversational, or "lazy" prompts into structured development work.

## Core Operating Model

```text
Human
  ↓
Prompt
  ↓
AI Agent
  ↓
AutoForge Contract + Project Context
  ↓
Intent Classification / Triage
  ↓
Research | Discovery | Planning | Design | Implementation | Validation
  ↓
Scoped Context Packet
  ↓
AI Agent Executes
  ↓
Validation
  ↓
Persistent Project Memory
```

The human prompt goes to the AI agent directly.

AutoForge is not runtime middleware in the traditional sense. Instead, compatible AI agents are instructed to consult and obey AutoForge's project contract before acting.

## Core Principles

1. **AutoForge is not an agent.**
   - It does not replace Codex, Claude Code, Cursor, Gemini, Antigravity, or future agents.
   - It provides the rules, context, structure, and state those agents rely upon.

2. **Project intelligence is distinct from agent intelligence.**
   - Agents know how to reason and code.
   - AutoForge stores what this project knows: decisions, design rationale, architecture, scope, constraints, and current work.

3. **AI should never rediscover what the project already knows.**
   - Important knowledge becomes durable project memory.

4. **The user does not need to prompt perfectly.**
   - AutoForge supports progressive structuring of rough or incomplete intent.

5. **Every prompt is not automatically implementation-ready.**
   - Requests may require research, clarification, planning, architecture, design, or validation before code changes.

6. **Context must be segmented.**
   - Do not give an agent the entire project knowledge base for every task.
   - Resolve and provide only the context required for the current task.

7. **Scope is a contract.**
   - Agents should know what they may read, modify, decide, and validate.

8. **Specifications are source-of-truth artifacts.**
   - Screenshots and generated visuals are derivations of structured specifications.
   - Code is also an implementation of those specifications.

9. **Design is first-class project knowledge.**
   - Brand, design tokens, components, screens, flows, responsive behavior, and design decisions belong in structured AutoForge specifications.

10. **AutoForge stays vendor-agnostic.**
    - Core concepts target capabilities, not vendors.
    - Vendor integrations are adapters.

11. **Explainability matters.**
    - AutoForge should be able to explain why a doctrine, decision, spec, or file was included in a context packet.

12. **Deterministic rules before unnecessary AI.**
    - Prefer schemas, relationships, manifests, file metadata, and explicit policy rules before adding more model calls.

13. **Validation closes the loop.**
    - Work is not finished because code was generated.
    - Acceptance criteria and validation rules determine completion.

14. **Open source is a design constraint.**
    - AutoForge should remain inspectable, forkable, composable, and useful without a required hosted service.

## Core Knowledge Categories

AutoForge should distinguish these concepts clearly:

```text
Doctrine
= How should the agent work?

Specification
= What should the product/system/design be?

Decision
= Why was a choice made?

Work
= What is being done now?

Research
= What did we learn before deciding?

Context Packet
= What subset is needed for this task?

Validation
= How do we know the result is acceptable?
```

## Core Lifecycle

```text
IDEA / PROMPT
   ↓
INTAKE
   ↓
TRIAGE
   ↓
RESEARCH / DISCOVERY
   ↓
DECISION
   ↓
SPECIFICATION
   ↓
PLANNING
   ↓
CONTEXT RESOLUTION
   ↓
AGENT CONTRACT
   ↓
IMPLEMENTATION
   ↓
VALIDATION
   ↓
MEMORY
```

## Agent Compatibility Model

An AutoForge-compatible agent should:

1. Detect or be instructed that AutoForge is present.
2. Read the AutoForge entry contract before acting.
3. Determine the current work item.
4. Resolve or request the relevant context packet.
5. Read applicable doctrines and decisions.
6. Respect scope boundaries.
7. Perform only the current action.
8. Validate results.
9. Record durable decisions and discoveries.
10. Stop or re-triage when new ambiguity appears.

## Non-Goals

AutoForge core does not need to:

- become its own general-purpose LLM;
- own a proprietary coding model;
- replace Figma or other design tools;
- replace Codex or Claude Code;
- require a cloud backend;
- ingest the entire repository into every prompt;
- autonomously execute every SDLC step regardless of relevance;
- create dozens of permanent AI personas.

## Long-Term Product Definition

> AutoForge is the persistent project contract that tells any compatible AI agent what the project knows, what the current task means, what context matters, what boundaries apply, and how success is validated.

---

# File: ROADMAP_0.8_TO_0.10.md

# AutoForge Roadmap: 0.8.0 → 0.10.0

## Context

AutoForge 0.7.0 is the architectural reset and foundation release.

Do not overload 0.7.0 with all future orchestration features. Finish the current 0.7 plan first.

The next releases should each answer one major question:

```text
0.7.0 → What is AutoForge?
0.8.0 → How does human intent become structured project knowledge?
0.9.0 → How does structured knowledge move through software/design workflows?
0.10.0 → How does any compatible AI agent reliably participate in AutoForge?
```

---

# 0.8.0 — Intent → Structured Knowledge

## Mission

Allow users to communicate naturally while AutoForge turns their intent into structured, reusable project knowledge.

## Primary Question

> How does an unclear or conversational prompt become safe, structured work?

## Major Capabilities

### 1. Intent Intake

Support input representing:

- project ideas;
- feature requests;
- design requests;
- architecture requests;
- bug reports;
- technical questions;
- voice-transcribed prompts;
- rough brainstorming.

### 2. Progressive Structuring

Convert raw intent into structured fields such as:

- objective;
- user/problem;
- requirements;
- assumptions;
- unknowns;
- constraints;
- acceptance criteria;
- user stories;
- use cases;
- workflow implications;
- technical implications;
- design implications.

### 3. Request Triage

Introduce deterministic request classifications:

```text
READY_FOR_IMPLEMENTATION
RESEARCH_REQUIRED
CLARIFICATION_REQUIRED
PLANNING_REQUIRED
ARCHITECTURE_REQUIRED
DESIGN_REQUIRED
CONFLICT_DETECTED
DEFERRED
```

A request can have more than one required stage.

### 4. Readiness / Confidence

AutoForge should be able to report why a task is or is not ready.

Example:

```text
Implementation readiness: 82%

Known:
✓ Target screen
✓ User goal
✓ Existing component
✓ Acceptance criteria

Missing:
⚠ Mobile behavior
⚠ Empty-state behavior
```

Do not imply mathematical certainty. Treat the score as a heuristic indicator supported by explicit missing/known fields.

### 5. Research Records

Research results should become durable artifacts with:

- research question;
- source/inputs;
- findings;
- alternatives;
- recommendation;
- confidence;
- related decisions;
- affected specs.

### 6. Knowledge Specification Standard

Formalize reusable specification types:

```text
product
architecture
domain
api
design
screen
component
flow
design-token
research
```

Recommended format:

- Markdown for readable explanation.
- YAML front matter for machine-readable identity and relationships.

### 7. Design Specifications

Introduce first-class design artifacts:

```text
brand.md
design-system.md
tokens/
components/
screens/
flows/
patterns/
decisions/
```

### 8. Planning Artifact Generator

Generate only the planning artifacts appropriate for the request.

Possible outputs:

- feature brief;
- PRD section;
- technical plan;
- architecture note;
- design brief;
- user stories;
- acceptance criteria;
- research brief.

## Acceptance Criteria

0.8.0 is successful when:

- a rough user prompt can be converted into structured intent;
- AutoForge can classify required next steps;
- requests requiring research are not sent directly to implementation;
- design, product, and technical knowledge can be stored in the same specification framework;
- knowledge relationships are machine-readable;
- relevant decisions and research can be linked to specs;
- generated planning artifacts are modular rather than monolithic.

## Non-Goals

- full multi-agent workflow execution;
- automatic vendor/model selection;
- complete Figma integration;
- graph database;
- autonomous project execution.

---

# 0.9.0 — Workflow Orchestration

## Mission

Move structured project knowledge through reusable software-development and design workflows.

## Primary Question

> Once AutoForge understands the request, how does the correct work happen in the correct order?

## Major Capabilities

### 1. Workflow Engine

Represent reusable workflows such as:

```text
Feature Development
Bug Fix
Architecture Change
Design Creation
Design Critique
Research
Refactor
Release Readiness
```

Each workflow defines:

- entry conditions;
- required context;
- stages;
- outputs;
- validation gates;
- exit conditions.

### 2. Conditional Stages

Do not run every discipline for every task.

Example:

```text
Change button spacing
→ Design context
→ Implementation
→ Visual validation

New payments architecture
→ Research
→ Architecture
→ Security
→ Implementation planning
```

### 3. Responsibility-Based Roles

Model responsibilities, not permanent vendor-specific personas:

- product;
- research;
- architecture;
- UX;
- UI;
- frontend;
- backend;
- data;
- QA;
- security;
- DevOps/SRE;
- marketing/product strategy where relevant.

### 4. Cross-Stage Handoffs

Every stage produces structured output.

Example:

```text
UX → user flow
UI → screen/component specifications
Architecture → technical contract
Engineering → implementation
QA → validation report
```

### 5. Context Packet Assembly

For every stage, AutoForge should assemble only the required context:

```text
objective
active work
applicable doctrines
relevant decisions
research
specifications
allowed scope
acceptance criteria
validation rules
```

### 6. Design Workflow Pipeline

Formalize design as a first-class workflow:

```text
User Intent
  ↓
Design Discovery
  ↓
Brand / Design Constraints
  ↓
Design Specifications
  ↓
Design Context Packet
  ↓
Design-Capable AI / Tool
  ↓
Generated Design
  ↓
Critique / Validation
  ↓
Updated Design Specs / Decisions
```

Support both:

- new design creation;
- critique of an existing application/design.

### 7. Design Context Export

Produce tool-neutral packets that can be consumed by:

- Figma-capable agents;
- TypeUI-style tools;
- UI-generating coding agents;
- future design systems.

Do not make the core dependent on one design platform.

### 8. Validation Pipeline

Validation may include:

- task acceptance criteria;
- tests;
- scope;
- architecture;
- design spec compliance;
- responsive behavior;
- accessibility;
- brand consistency;
- security where relevant.

## Acceptance Criteria

0.9.0 is successful when:

- AutoForge selects an appropriate workflow from structured intent;
- irrelevant workflow stages are skipped;
- each stage has explicit input/output contracts;
- design tasks can be created or critiqued from modular specs;
- context packets are smaller than the total available project knowledge;
- workflow results update durable project knowledge;
- implementation and design workflows can share the same project memory.

## Non-Goals

- requiring multiple AI vendors;
- fully autonomous unattended development;
- perfect visual comparison across every platform;
- universal compatibility contract.

---

# 0.10.0 — AutoForge Agent Contract

## Mission

Formalize the protocol every AutoForge-compatible AI agent follows.

## Primary Question

> How does any AI agent reliably use AutoForge without AutoForge becoming an AI agent itself?

## Core Principle

AutoForge is not runtime intelligence.

It is a **project contract and orchestration standard** consumed by AI agents.

## Major Capabilities

### 1. Canonical Agent Entry Contract

Create a small canonical entry file such as:

```text
.autoforge/AGENT.md
```

or equivalent manifest.

It must tell an agent:

1. AutoForge is installed.
2. AutoForge is not another agent.
3. Consult AutoForge before project actions.
4. Determine active work.
5. Triage the user's request.
6. Load only relevant context.
7. Respect scope and doctrines.
8. Validate before completion.
9. Persist decisions/research when required.

Keep this file small.

### 2. Contract Versioning

Introduce a machine-readable contract version.

Example:

```json
{
  "autoforgeContract": "1",
  "projectSchema": "1"
}
```

Package version and contract version should be independent.

### 3. Agent Adapter Interface

Adapters translate the AutoForge contract into native mechanisms available to each tool.

Examples:

```text
Codex
Claude Code
Cursor
Gemini
Antigravity
Generic
```

Possible capabilities:

```text
context_injection
pre_edit_guard
post_edit_tracking
session_start
repository_instruction
subagent_delegation
tool_execution
```

Adapters must declare capabilities rather than pretending all agents support the same enforcement.

### 4. Compatibility Capability Matrix

Example:

```text
Agent         Context  Hard Guardrails  Hooks  Build Packets
Claude Code     ✓           ✓           ✓         ✓
Codex           ✓           varies      varies    ✓
Generic         ✓           ✕           ✕         ✓
```

The actual matrix should be generated from real adapters.

### 5. Contract Enforcement Levels

Possible levels:

```text
advisory
managed
enforced
```

- Advisory: instructions/context only.
- Managed: AutoForge CLI controls task/context lifecycle.
- Enforced: native agent hooks can block prohibited actions.

### 6. Prompt Lifecycle Contract

For every user prompt:

```text
User Prompt
   ↓
Agent receives prompt
   ↓
Agent checks AutoForge state/contract
   ↓
Triage request
   ↓
Resolve relevant context
   ↓
Follow selected workflow
   ↓
Execute within scope
   ↓
Validate
   ↓
Update durable knowledge
```

### 7. Design-Agent Compatibility

The same contract should support design-capable agents.

A design agent may receive:

- brand spec;
- design doctrine;
- relevant components;
- screen spec;
- responsive rules;
- design decisions;
- critique criteria.

It should not receive unrelated backend or infrastructure context.

### 8. Self-Check / Doctor

Add compatibility checks:

```text
autoforge doctor
```

Should report:

- AutoForge contract version;
- installed/detected agents;
- adapter status;
- missing integrations;
- invalid project schemas;
- stale or missing state;
- contract violations where detectable.

## Acceptance Criteria

0.10.0 is successful when:

- AutoForge clearly cannot be mistaken for an AI agent;
- a compatible coding agent can discover and follow the contract;
- the same project can be used with more than one supported agent;
- context resolution behavior remains consistent across adapters;
- each adapter advertises its real enforcement capabilities;
- design and engineering agents use the same underlying project contract;
- agent instructions remain concise and reference deeper context only when required.

## Non-Goals

- forcing every third-party AI product to support AutoForge;
- building a proprietary agent runtime;
- claiming hard enforcement when the host agent cannot technically provide it.

---

# Roadmap Guardrails

For 0.8, 0.9, and 0.10:

1. Do not duplicate project knowledge.
2. Do not return to giant all-in-one Markdown context files.
3. Do not hard-code the product around one AI vendor.
4. Do not confuse responsibilities with agent identities.
5. Do not migrate legacy features only because they exist.
6. Keep the CLI and schemas canonical.
7. Every new feature must answer:
   - What project knowledge does this add?
   - What workflow does it enable?
   - What context does it reduce?
   - What boundary does it enforce?
   - How is it validated?

---

# File: DESIGN_SPECIFICATION_STANDARD.md

# AutoForge Design Specification Standard

## Purpose

Define a tool-neutral design knowledge format that AutoForge can use to:

- create new application designs;
- critique existing designs;
- hand structured design context to design-capable AI tools;
- hand the same design intent to coding agents;
- preserve design rationale across sessions;
- keep design and implementation synchronized.

AutoForge does not replace Figma, TypeUI, Storybook, or future design tools.

AutoForge defines the **common design language and project context** those tools consume.

## Design Philosophy

### 1. Specifications are authoritative

Structured specifications describe intended behavior and design.

Rendered visuals and implemented code are derivations that should be validated against those specifications.

### 2. Design context is modular

Never rely on one giant `design.md`.

Use small artifacts with explicit relationships.

### 3. Design rationale is durable

Store not only what a design looks like, but why decisions were made.

### 4. Design is compositional

Model:

```text
Foundation
  ↓
Primitive
  ↓
Component
  ↓
Pattern
  ↓
Screen
  ↓
Flow
```

### 5. Design tools are adapters

The AutoForge core should not depend on one renderer.

---

# Recommended Repository Structure

```text
.autoforge/
└── specs/
    └── design/
        ├── brand/
        │   ├── brand.md
        │   ├── voice.md
        │   └── principles.md
        │
        ├── foundation/
        │   ├── design-system.md
        │   └── tokens/
        │       ├── colors.md
        │       ├── typography.md
        │       ├── spacing.md
        │       ├── radius.md
        │       ├── shadows.md
        │       └── breakpoints.md
        │
        ├── primitives/
        │   ├── button.md
        │   ├── input.md
        │   ├── icon.md
        │   └── ...
        │
        ├── components/
        │   ├── job-card.md
        │   ├── profile-card.md
        │   └── ...
        │
        ├── patterns/
        │   ├── empty-state.md
        │   ├── search-results.md
        │   └── ...
        │
        ├── screens/
        │   ├── dashboard.md
        │   ├── profile.md
        │   └── ...
        │
        ├── flows/
        │   ├── onboarding.md
        │   └── ...
        │
        ├── decisions/
        │   ├── DDR-001.md
        │   └── ...
        │
        └── manifests/
            ├── design-manifest.json
            ├── component-registry.json
            ├── screen-registry.json
            └── relationship-graph.json
```

---

# Markdown + Front Matter Standard

Every spec should combine:

- YAML front matter for machine-readable metadata;
- Markdown for human/agent-readable explanation.

Example:

```md
---
id: component.job-card
type: component
name: Job Card

uses:
  - primitive.avatar
  - primitive.badge
  - primitive.button

tokens:
  - color.surface.primary
  - spacing.4
  - typography.body
  - radius.md

variants:
  - default
  - saved
  - applied

source:
  tool: figma
  nodeId: "123:456"
---

# Job Card

## Purpose

Displays a summarized job opportunity.

## Anatomy

1. Company logo
2. Job title
3. Company
4. Location
5. Salary
6. Match score
7. Save action

## Layout

...

## Responsive Behavior

...

## Interactions

...

## Accessibility

...

## Constraints

- Reuse existing Button and Badge.
- Do not introduce unregistered color values.
- Do not create a duplicate JobCard implementation.
```

---

# Required Spec Types

## Brand

Should include:

- brand positioning;
- visual tone;
- voice/tone;
- palette philosophy;
- typography philosophy;
- imagery/icon principles;
- prohibited patterns.

## Design Tokens

Should represent:

- color;
- typography;
- spacing;
- radius;
- elevation/shadow;
- breakpoint;
- motion when applicable.

Use semantic token names where possible.

Example:

```text
color.surface.primary
color.text.muted
spacing.component.md
radius.card
```

## Primitive

Small reusable control:

- button;
- input;
- checkbox;
- radio;
- badge;
- avatar;
- icon.

## Component

Meaningful reusable UI object composed from primitives.

## Pattern

Reusable arrangement or behavior involving multiple components.

## Screen

A route/view-level artifact.

Recommended sections:

- purpose;
- route;
- layout;
- components;
- data;
- actions;
- states;
- responsive behavior;
- navigation;
- accessibility;
- acceptance criteria.

## Flow

Represents cross-screen behavior.

Example:

```text
Dashboard
  ↓
Job Details
  ↓
Apply
  ↓
Application Confirmation
```

## Design Decision Record (DDR)

Design decisions should capture:

```text
id
decision
reasoning
alternatives
consequences
related specs
status
date
```

Example:

```text
DDR-004
Use a monochrome primary interface with semantic accent colors only.

Reason:
Reduce visual noise and preserve a premium utilitarian feel.
```

---

# Design Context Packet

A design-capable AI should receive only the relevant subset.

Example request:

> Redesign the Candidate Dashboard recommendation cards.

Packet:

```text
Objective
Brand principles
Relevant design doctrine
Required tokens
Candidate Dashboard screen spec
Job Card component spec
Related DDRs
Responsive constraints
Accessibility requirements
Critique/acceptance criteria
```

Do not include unrelated:

- settings screens;
- authentication architecture;
- database specs;
- every component in the product.

---

# Design Creation Workflow

```text
User Prompt
  ↓
Intent / Design Triage
  ↓
Existing Design Context Resolution
  ↓
Design Discovery (if required)
  ↓
Brand + UX Constraints
  ↓
Spec Draft / Update
  ↓
Design Context Packet
  ↓
Design-Capable AI / Tool
  ↓
Generated Visual / Prototype
  ↓
Critique
  ↓
Validation
  ↓
Spec + DDR Update
```

---

# Design Critique Workflow

For an existing application:

```text
Existing Design
  ↓
Relevant AutoForge Specs
  ↓
Critique Criteria
  ↓
Design Agent
  ↓
Findings:
- visual hierarchy
- brand consistency
- accessibility
- responsive behavior
- component reuse
- UX clarity
  ↓
Recommended Changes
  ↓
Human / Project Decision
  ↓
Updated Specs + DDR
```

---

# Design-to-Code Handoff

The same design knowledge should support implementation.

Example:

```text
screen.dashboard
  ↓ uses
component.job-card
  ↓ uses
primitive.badge
  ↓ uses
design tokens
```

AutoForge's context resolver should traverse only the dependencies required by the current task.

A coding agent implementing `screen.dashboard` should receive:

- screen spec;
- referenced components;
- referenced primitives if needed;
- relevant tokens;
- relevant design decisions;
- frontend architecture constraints.

---

# Tool Adapter Model

Future design adapters may include:

```text
Figma
TypeUI
Storybook
UI-generating coding agents
Other design tools
```

Adapters translate:

```text
AutoForge Design Context Packet
          ↓
Tool-specific instructions/input
          ↓
Tool output
          ↓
Normalized result / updated specs
```

Do not store tool-specific behavior in the core design domain.

---

# Validation

Design validation should support:

## Brand
- palette consistency;
- typography consistency;
- visual tone;
- prohibited patterns.

## Components
- correct reuse;
- no duplicate components;
- variant correctness.

## UX
- clear action hierarchy;
- expected states;
- navigation consistency.

## Responsive Behavior
- desktop;
- tablet;
- mobile where required.

## Accessibility
- semantic control behavior;
- keyboard behavior where applicable;
- contrast;
- labeling;
- focus states.

## Specification Fidelity
- output matches required components;
- no invented interaction without a spec or decision;
- no unregistered design token values.

---

# Design System Success Criteria

The design specification system is successful when:

- an agent can understand one component without reading the full application design;
- a screen can declare dependencies explicitly;
- the context resolver can select related design specs automatically;
- both design and coding agents can consume the same source knowledge;
- a visual change can update the corresponding component/screen spec;
- design rationale survives future agent sessions;
- users can switch design tools without rewriting project knowledge.

---

# File: CODEX_IMPLEMENTATION_PLAN_0.8_TO_0.10.md

# Codex Implementation Plan — AutoForge 0.8.0 to 0.10.0

## Important Instruction

Do **not** implement this entire roadmap in one task.

AutoForge is explicitly being designed to avoid oversized AI context and oversized work items.

Treat this file as a master roadmap.

Implement one version at a time and split each version into small tasks.

AutoForge 0.7.0 is already in active development. Do not rewrite or destabilize its architecture merely to pre-build 0.8+ functionality.

---

# Before Starting 0.8.0

Once 0.7.0 ships:

## Step 1 — Repository Audit

Read:

- current source tree;
- current AutoForge foundation/architecture docs;
- schemas;
- state model;
- doctrine model;
- context resolver;
- adapters;
- existing migration logic;
- tests.

Create:

```text
docs/planning/0.8/REPO_AUDIT.md
```

Document:

- what 0.7 made permanent;
- pain points;
- reusable abstractions;
- technical debt;
- features that would conflict with 0.8;
- migration risks.

Do not modify production code during this audit.

## Step 2 — Architecture Decision Review

Create or update decisions for:

- AutoForge is not an AI agent;
- human prompt goes to host AI first;
- AutoForge is the project contract;
- specifications are modular;
- design is first-class;
- core remains vendor-agnostic;
- adapters expose capabilities;
- context is resolved per task.

These decisions should be durable before new implementation begins.

---

# 0.8.0 Implementation Sequence

## Epic 8.1 — Knowledge Specification Core

### Task 8.1.1 — Specification domain types

Implement schemas/types for:

```text
product
architecture
research
design
screen
component
flow
design-token
```

Acceptance:

- validated IDs;
- validated types;
- relationships;
- tags;
- source metadata;
- timestamps.

### Task 8.1.2 — Markdown + front matter parser

Acceptance:

- parse valid specs;
- return useful schema errors;
- preserve Markdown body;
- no requirement for an AI call.

### Task 8.1.3 — Specification registry

Acceptance:

- list;
- load;
- resolve by ID;
- resolve basic relationships.

### Task 8.1.4 — Design spec scaffold

Add initial structure for:

```text
brand
foundation/tokens
primitives
components
patterns
screens
flows
decisions
```

---

## Epic 8.2 — Intent Intake

### Task 8.2.1 — Intent schema

Represent:

- raw prompt;
- normalized objective;
- known facts;
- assumptions;
- unknowns;
- constraints;
- requested outcome.

### Task 8.2.2 — Triage rules

Implement initial classifications:

```text
READY_FOR_IMPLEMENTATION
RESEARCH_REQUIRED
CLARIFICATION_REQUIRED
PLANNING_REQUIRED
ARCHITECTURE_REQUIRED
DESIGN_REQUIRED
CONFLICT_DETECTED
DEFERRED
```

Prefer deterministic rules and explicit missing fields.

### Task 8.2.3 — Readiness explanation

Output:

- known requirements;
- missing requirements;
- blocking issues;
- recommended next stage.

Do not produce opaque confidence without explanations.

---

## Epic 8.3 — Research Artifacts

Implement:

- research brief;
- research result schema;
- recommendation;
- alternatives;
- links to decisions/specs.

Research execution may still be performed by the host agent.

AutoForge stores and structures the result.

---

## Epic 8.4 — Planning Artifacts

Implement small modular planning outputs.

Avoid recreating monolithic generated plans.

Acceptance:

- artifacts link to active work;
- artifacts link to related specs;
- artifacts can be consumed by later context resolution.

---

# 0.8.0 Release Gate

Before marking 0.8 complete:

- all schemas validated;
- specification registry covered by tests;
- design specs can be registered and linked;
- a rough intent fixture can be triaged;
- a research-required fixture is not classified as implementation-ready;
- a design-required fixture selects relevant design specifications;
- documentation reflects actual commands/APIs.

Stop before beginning 0.9.

---

# 0.9.0 Implementation Sequence

## Epic 9.1 — Workflow Domain

Create:

```text
WorkflowDefinition
WorkflowStage
StageInput
StageOutput
StageGate
```

Workflow must support conditional stages.

---

## Epic 9.2 — Standard Workflows

Start with a small set:

```text
feature-development
bug-fix
research
design-create
design-critique
```

Do not implement every SDLC discipline immediately.

---

## Epic 9.3 — Context Packet Enhancements

Extend context selection to support stage-specific context.

Example:

```text
design stage
→ brand + screen + components + design decisions

implementation stage
→ active work + architecture + screen + components + code scope

research stage
→ research question + relevant decisions + architecture background
```

---

## Epic 9.4 — Design Workflow

### Task 9.4.1 — Design creation packet

Generate packet for new design work.

### Task 9.4.2 — Design critique packet

Generate packet for existing design evaluation.

### Task 9.4.3 — Design result normalization

Represent:

- generated artifacts;
- findings;
- recommended spec updates;
- new DDR candidates.

### Task 9.4.4 — Design validation

Add initial validation:

- required components;
- required states;
- token usage;
- responsive requirements;
- accessibility checklist;
- brand constraints.

---

## Epic 9.5 — Cross-Stage Handoff

Ensure workflow stage output becomes structured input to the next stage rather than a raw transcript dump.

Acceptance example:

```text
Research Finding
  ↓
Decision
  ↓
Architecture Spec Update
  ↓
Implementation Context
```

---

# 0.9.0 Release Gate

- conditional workflows work;
- irrelevant stages can be skipped;
- design-create workflow works end-to-end using fixture specs;
- design-critique workflow works end-to-end using fixture specs;
- stage packets remain scoped;
- workflow outputs update project knowledge;
- tests cover at least one complete feature workflow and one complete design workflow.

Stop before beginning 0.10.

---

# 0.10.0 Implementation Sequence

## Epic 10.1 — Canonical Agent Contract

Create a concise entry contract.

Potential path:

```text
.autoforge/AGENT.md
```

It must clearly state:

- AutoForge is not an agent;
- the host AI receives user prompts;
- before action, consult AutoForge state/context;
- classify/triage requests;
- respect active work and scope;
- resolve relevant context only;
- validate and persist durable knowledge.

Keep detailed rules in referenced doctrines/specs.

---

## Epic 10.2 — Contract Manifest

Add machine-readable contract metadata.

Example:

```json
{
  "autoforgeContract": "1",
  "projectSchema": "1"
}
```

Do not couple contract version to package SemVer.

---

## Epic 10.3 — Adapter Capability Interface

Define adapter capabilities explicitly.

Example:

```ts
type AdapterCapability =
  | "context_injection"
  | "repository_instruction"
  | "session_start"
  | "pre_edit_guard"
  | "post_edit_tracking"
  | "subagent_delegation";
```

Every adapter reports supported capabilities.

---

## Epic 10.4 — Codex Adapter Hardening

Because Codex is a primary AutoForge development agent:

- ensure contract can be discovered reliably;
- ensure context packet references are concise;
- ensure active task can be determined;
- define how Codex should record decisions;
- define how Codex should stop/re-triage when ambiguity appears.

Do not assume unsupported hook behavior.

---

## Epic 10.5 — Claude Code Adapter Hardening

Use native hooks where supported.

Enforcement should be stronger only where technically real.

---

## Epic 10.6 — Generic Adapter

Provide a lowest-common-denominator integration:

- repository instruction;
- context packet;
- CLI commands;
- advisory guardrails.

This proves AutoForge is not dependent on one provider.

---

## Epic 10.7 — Design-Agent Contract

Define design-agent behavior.

A compatible design agent should:

1. read the design task;
2. load the design context packet;
3. reuse defined brand/tokens/components;
4. avoid inventing unapproved patterns;
5. return output plus structured critique/changes;
6. propose DDR/spec updates when design reasoning changes.

---

## Epic 10.8 — Doctor / Compatibility Report

Extend:

```text
autoforge doctor
```

to report:

- contract version;
- schema version;
- detected agent integrations;
- adapter capabilities;
- missing configuration;
- stale state;
- invalid specs;
- design registry health.

---

# 0.10.0 Release Gate

- canonical agent contract exists and is concise;
- Codex can follow it in a fixture project;
- Claude Code can follow it in a fixture project;
- generic adapter works without native hooks;
- adapter capability reporting is truthful;
- context packet output stays vendor-neutral;
- design agents can consume a design packet without unrelated engineering context;
- AutoForge documentation never describes AutoForge as an autonomous AI agent.

---

# Codex Task Execution Rules

For every implementation task:

## Before code

1. Read only the relevant roadmap section.
2. Run/review AutoForge recap/state if available.
3. Search relevant decisions.
4. Inspect only the required code area.
5. State affected files.
6. Confirm acceptance criteria.

## During code

1. Keep scope small.
2. Avoid unrelated refactors.
3. Reuse existing schemas/services.
4. Add tests.
5. Record architecture/product decisions when durable.

## After code

1. Run targeted tests.
2. Run typecheck/lint/build as applicable.
3. Report changed files.
4. Report acceptance criteria.
5. Record new decisions/research.
6. Stop.

Do not automatically move into the next epic or version.

---

# Recommended Task Size

Prefer:

```text
1–5 closely related files per task
```

Split broad work.

Bad:

> Build the full design system and workflow engine.

Good:

```text
9.4.1 Define design packet schema
9.4.2 Implement design packet resolver
9.4.3 Add design-create workflow definition
9.4.4 Add fixture and golden test
```

---

# Golden Tests

Add fixtures where the expected context is explicit.

Example task:

```text
Change JobCard bookmark placement on Candidate Dashboard
```

Expected design context:

```text
brand/principles
tokens/spacing
component.job-card
screen.candidate-dashboard
relevant DDR
design doctrine
```

Explicitly excluded:

```text
billing
database
authentication
unrelated settings screen
```

This verifies AutoForge is reducing context rather than creating another context dump.
