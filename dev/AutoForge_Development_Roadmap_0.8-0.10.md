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
