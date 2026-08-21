# AutoForge Updated Development Roadmap

## v0.8.0 → v0.15.0

## Executive Summary

AutoForge is evolving into an open-source orchestration, governance, context, and project-knowledge framework for agentic AI development.

AutoForge is **not an AI agent**.

Its role is to provide coding, design, and research agents with structured project knowledge, scoped context, durable memory, workflows, governance rules, project state, and validation requirements.

The long-term principle is:

> Humans think naturally. AutoForge organizes persistently. AI agents execute precisely.

## Product Model

```text
Human Intent
    ↓
Host AI Agent / AutoForge Interface
    ↓
AutoForge Contract
    ↓
Intent / Mode Detection
    ↓
Knowledge Extraction
    ↓
Structured Project Artifacts
    ↓
Context Resolution
    ↓
Scoped Context Packet
    ↓
Coding / Design / Research Agent
    ↓
Validation
    ↓
Durable Project Memory
```

## Version Roadmap

```text
0.8.0  Structured Knowledge
0.9.0  Workflow Orchestration
0.10.0 Agent Contract
0.11.0 Global Workspace
0.12.0 Bootstrap Engine
0.13.0 Vision + Discovery Engine
0.14.0 Knowledge Graph + Context Protocol
0.15.0 Interactive AutoForge CLI
```

---

# v0.8.0 — Structured Knowledge

## Primary Question

> What does the project know?

## Purpose

Establish modular, machine-readable project knowledge instead of monolithic prompt or documentation files.

## Core Capabilities

- specification registry;
- design specifications;
- research records;
- durable decisions;
- machine-readable relationships;
- Markdown + front matter specifications;
- JSON registries and manifests;
- contextual retrieval primitives.

## Status

Completed / foundational.

---

# v0.9.0 — Workflow Orchestration

## Primary Question

> How does structured knowledge move through the software development lifecycle?

## Purpose

Introduce repeatable workflows across discovery, research, design, architecture, implementation, and validation.

## Core Workflows

```text
feature-development
bug-fix
research
design-create
design-critique
architecture-change
validation
```

Workflows must support conditional stages and must not force every task through every discipline.

---

# v0.10.0 — Agent Contract

## Primary Question

> How must an AutoForge-compatible AI behave?

## Canonical Behavior

```text
User Prompt
    ↓
Host AI receives prompt
    ↓
Check AutoForge
    ↓
Determine active work
    ↓
Determine mode/workflow
    ↓
Resolve relevant context
    ↓
Respect scope
    ↓
Execute
    ↓
Validate
    ↓
Persist durable knowledge
```

## Contract Requirements

Compatible agents should:

- read the AutoForge entry contract;
- understand AutoForge is not another AI;
- identify active work before editing;
- load only relevant context;
- respect doctrines and boundaries;
- avoid unrelated refactors;
- re-triage ambiguity;
- record durable decisions;
- validate before completion.

## Adapter Targets

```text
Codex
Claude Code
Cursor
Gemini
Antigravity
Generic agents
```

---

# v0.11.0 — Global Workspace

## Primary Question

> How does AutoForge work across all projects on a user's machine?

## Purpose

Allow AutoForge to be globally installed while preserving strict per-project isolation.

## Global Scope

```text
~/.autoforge/
├── config
├── registry
├── adapters
├── templates
└── defaults
```

## Project Scope

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

## Rule

> Globally available does not mean globally authorized.

---

# v0.12.0 — Bootstrap Engine

## Primary Question

> How does AutoForge take a project from idea to implementation-ready?

## Bootstrap Lifecycle

```text
User Idea
    ↓
Vision Discovery
    ↓
Problem Definition
    ↓
Target Users
    ↓
Use Cases
    ↓
User Stories
    ↓
User Flows
    ↓
Research
    ↓
Architecture
    ↓
Design System
    ↓
Screens
    ↓
Components
    ↓
Data Model
    ↓
Security
    ↓
Development Plan
    ↓
Task Breakdown
    ↓
Implementation Readiness
```

## Existing Project Bootstrap

AutoForge should also be able to inspect an older codebase, extract useful knowledge and lessons, and create clean new specifications without treating the legacy architecture as authoritative.

---

# v0.13.0 — Vision + Discovery Engine

## Primary Question

> How does AutoForge continuously translate human thinking into coherent product direction?

## Inputs

```text
voice transcript
chat conversation
feature idea
customer feedback
research thought
business idea
design thought
technical concern
```

## Extracted Knowledge

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

## Living Vision

Introduce a durable `VISION.md` (or canonical equivalent) containing:

- purpose;
- problem;
- target users;
- customer promise;
- differentiation;
- strategic principles;
- long-term direction;
- explicit non-goals.

## Vision Conflict Detection

New ideas should be checked against existing vision and flagged when they conflict instead of being implemented silently.

## Discovery Mode

Users may think aloud naturally. AutoForge should ask targeted questions and progressively update structured knowledge.

---

# v0.14.0 — Knowledge Graph + Context Protocol

## Primary Question

> How does AutoForge convert large amounts of human/project context into the exact structured slice an agent needs?

## Mission

Formalize the bridge between human knowledge and agent execution.

This release should:

1. decompose unstructured input into atomic project knowledge;
2. connect those artifacts into a project knowledge graph;
3. resolve the smallest useful context slice for a task;
4. define a vendor-neutral context protocol.

## 14.1 Atomic Knowledge Extraction

A brain dump should not become one giant file.

Example input:

```text
"I want a lemonade stand website where people can see where I'm
selling today, order online, and maybe subscribe to alerts when
I move locations."
```

Possible extracted artifacts:

```text
vision: mobile-friendly lemonade ordering platform
use-case: customer locates current stand
feature: online ordering
feature-candidate: location-change subscription
research-question: notification delivery mechanism
user-story: customer wants to know when stand location changes
```

## 14.2 Knowledge Graph

Every artifact should have:

```text
stable ID
type
relationships
source
status
updatedAt
```

Example:

```text
screen.candidate-dashboard
    uses → view.recommended-jobs
    follows → flow.job-discovery
    governed-by → architecture.frontend
    affected-by → decision.DEC-014
```

A graph database is not required initially. Structured manifests and relationships are sufficient.

## 14.3 Context Protocol

Define a canonical vendor-neutral context payload.

Example:

```json
{
  "task": "TASK-42",
  "objective": "Update saved state of JobCard",
  "mode": "development",
  "context": {
    "vision": [],
    "decisions": [],
    "specs": [],
    "design": [],
    "architecture": []
  },
  "scope": {
    "allowed": [],
    "prohibited": []
  },
  "validation": []
}
```

## 14.4 Context Packet Builder

Inputs:

```text
user objective
active task
workflow stage
project knowledge graph
agent capability
context budget
```

Outputs:

```text
objective
active work
applicable doctrine
relevant vision
relevant decisions
relevant specs
relevant design context
allowed files
prohibited changes
acceptance criteria
validation instructions
```

## 14.5 Context Ranking

Priority:

```text
1. active task
2. acceptance criteria
3. hard boundaries
4. directly referenced specs
5. relevant decisions
6. relevant vision constraints
7. architecture
8. supporting context
```

## 14.6 Explainability

AutoForge should explain why context was selected.

Example:

```text
Included component.job-card

Reason:
TASK-42 targets screen.candidate-dashboard
→ screen uses view.recommended-jobs
→ view uses component.job-card
```

## 14.7 Context Budgeting

Track:

```text
available project context
selected context
excluded context
estimated token count
context reduction %
```

## 14.8 Design Context Integration

The knowledge graph must include:

```text
foundation
primitive
component
layout
pattern
view
screen
flow
design-decision
```

## 14.9 Golden Context Tests

Example task:

```text
Move bookmark control inside JobCard on Candidate Dashboard.
```

Expected:

```text
screen.candidate-dashboard
view.recommended-jobs
component.job-card
bookmark primitive
spacing tokens
relevant DDR
design doctrine
```

Excluded:

```text
billing
database
settings
authentication
unrelated screens
```

## v0.14 Release Gate

- atomic extraction works on conversation fixtures;
- stable artifact IDs exist;
- relationships can be traversed;
- context protocol schema validates;
- context packets generate successfully;
- inclusion explanations work;
- context budgets are measurable;
- golden tests prove unrelated context exclusion;
- coding and design adapters consume the same protocol.

---

# v0.15.0 — Interactive AutoForge CLI

## Primary Question

> How can users interact directly with AutoForge as a project operating interface without AutoForge becoming a coding agent?

## Purpose

Turn AutoForge into an interactive human-facing orchestration interface.

## Core Experience

```bash
autoforge
```

Possible interface:

```text
AutoForge
────────────────────────
Project: Verdua
Stage: Discovery
Active Work: none

What are you thinking about?

> _
```

AutoForge should:

```text
detect intent
determine likely mode
retrieve existing knowledge
ask clarifying questions
update structured artifacts
create tasks/context packets
hand work to compatible agents
```

## Modes

```text
discovery
brainstorm
research
planning
design
development
review
validation
```

Modes should be inferred when practical. If confidence is low, ask for confirmation.

## Companion Mode

Core open-source operation:

```text
Codex / Claude Code / Cursor
        +
     AutoForge
```

No extra model API is required beyond the user's existing coding-agent access.

## Native Mode

Optional future operation:

```text
User
 ↓
AutoForge CLI
 ↓
Configured AI provider
 ↓
Structured project knowledge
```

Potential providers:

```text
OpenRouter
OpenAI
Anthropic
Gemini
others
```

Users bring their own API credentials.

## Model Routing

Potential strategy:

```text
low-cost model
→ extraction / classification / summarization / routing

high-reasoning model
→ research / architecture / complex planning

coding agent
→ implementation

design-capable agent
→ visual/design work
```

Do not route every request through multiple models unnecessarily.

## CLI Commands

Potential minimal surface:

```bash
autoforge
autoforge init
autoforge discover
autoforge plan
autoforge design
autoforge context
autoforge recap
autoforge doctor
autoforge projects
```

## MCP / Tool Integration

MCP-style integrations may be explored later, but must not be a core dependency.

## v0.15 Release Gate

- interactive CLI launches reliably;
- current project is detected;
- user can enter natural language;
- AutoForge can infer or ask for mode;
- knowledge can be extracted into structured artifacts;
- context packets can be generated;
- user can review proposed changes;
- companion mode works without configured model APIs;
- native providers are optional and pluggable;
- AutoForge core still contains no embedded coding agent.

---

# Verdua Reference Implementation Strategy

Do not restart Verdua until AutoForge reaches a sufficiently stable baseline.

Recommended sequence:

```text
1. Finish v0.9
2. Stabilize v0.10
3. Complete v0.11
4. Build v0.12 Bootstrap Engine
5. Build core v0.13 Vision / Discovery
6. Build v0.14 Context Protocol
7. Freeze a stable AutoForge baseline
8. Archive existing Verdua as prototype/reference
9. Bootstrap a new Verdua specification set
10. Rebuild Verdua incrementally
```

v0.15 does not necessarily need to block the Verdua rebuild.

## Readiness Test

AutoForge is ready when it can:

- capture the Verdua vision;
- organize project knowledge;
- bootstrap architecture and design;
- produce scoped work;
- resolve the correct context;
- reliably constrain coding/design agents.

## Prototype Policy

Preserve the old Verdua application as reference material. Extract lessons, working flows, useful components, auth/database lessons, product decisions, and failed approaches. Do not automatically inherit its architecture.

---

# North Star

```text
Human
thinks naturally
     ↓
AutoForge
captures and structures knowledge
     ↓
AutoForge
maintains vision + decisions + specs
     ↓
AutoForge
selects task-specific context
     ↓
Agent
executes within boundaries
     ↓
AutoForge
validates and records what changed
```

## Canonical Statement

> AutoForge allows humans to think naturally while giving AI agents the structured knowledge, project memory, workflows, boundaries, and task-specific context required to build software correctly.

Or more simply:

> Humans think messily. AutoForge organizes persistently. AI agents execute precisely.

AutoForge is not trying to teach every user how to become a better prompt engineer.

AutoForge is trying to make perfect prompting increasingly unnecessary.
