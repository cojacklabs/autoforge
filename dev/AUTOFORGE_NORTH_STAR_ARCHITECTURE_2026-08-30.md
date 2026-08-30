# AutoForge North Star Architecture Plan

## Open-Source Software, Data, and AI Development Orchestration & Governance Framework

**Status:** Accepted source architecture; promoted into `docs/planning/0.26/AUTOFORGE_FRAMEWORK_NORTH_STAR.md`
**Date:** August 30, 2026
**Scope:** AutoForge only
**Critical boundary:** AutoForge is **not** an AI agent and should not evolve into one.

---

## 1. Executive Summary

AutoForge is an open-source orchestration, governance, project-intelligence, and context framework for software, data, and AI development.

Its purpose is to make agentic AI development more reliable by giving any compatible AI agent the exact project knowledge, constraints, workflows, scope, context, validation rules, and historical decisions required to plan, design, build, test, and evolve technical systems.

AutoForge does not compete with Codex, Claude Code, Gemini, Grok Build, Antigravity, Cursor, or future AI development agents.

Instead, AutoForge sits above and around those agents as the persistent engineering control plane.

> **Humans think naturally. AutoForge organizes persistently. AI agents execute precisely.**

Supporting principles:

> **Agent intelligence ≠ project intelligence.**

> **AI should never have to rediscover what the project already knows.**

> **More context ≠ better understanding.**

> **Minimum complete context, not maximum context.**

> **The repository should know how the project should be built, regardless of which AI opens it.**

---

## 2. What AutoForge Is

AutoForge is:

- an open-source engineering framework;
- a project-intelligence layer;
- an orchestration system;
- a governance system;
- a context-resolution system;
- a specification framework;
- a traceability system;
- a validation and quality-gate system;
- a multi-agent coordination framework;
- a persistent engineering memory system;
- an interoperability layer between technical projects and agentic AI.

AutoForge should support software development, data engineering, analytics engineering, AI/ML development, application architecture, product planning, technical research, UX/design specifications, testing, release readiness, and continuous technical evolution.

---

## 3. What AutoForge Is Not

AutoForge is **not**:

- a general-purpose AI assistant;
- an autonomous AI developer;
- a proprietary foundation model;
- a replacement for Codex or Claude Code;
- a chatbot that owns the user's general memory;
- a personal AI;
- an IDE;
- a hosted-only coding platform;
- a prompt-to-app product;
- a source-code generator by itself;
- a substitute for specialized reasoning models;
- a system that requires one AI provider;
- a system that stores every project detail in one giant prompt or Markdown file.

AutoForge may coordinate AI agents and models, but it does not attempt to become the agent itself.

---

## 4. Core Responsibility Boundary

```text
AI Agent
"What implementation makes sense?"

AutoForge
"What does this task mean?
What project knowledge matters?
What is already decided?
What constraints apply?
What is allowed to change?
What workflow should be followed?
What must be validated?"
```

AutoForge owns deterministic project intelligence and orchestration, not model reasoning or autonomous agency.

AI agents own reasoning and execution.

---

## 5. Relationship to the Future Generalist AI

A separate generalist AI may eventually provide user-level memory, long-term personal context, cross-project intent recognition, conversational interaction, general research, broad AI orchestration, and personal knowledge graphs.

That generalist AI may use AutoForge whenever software, data, or AI-development work is required.

```text
Generalist AI
     │
     ├── Personal Memory
     ├── User Intent
     ├── General Knowledge
     ├── Cross-Project Context
     │
     └── Technical Work
            │
            ▼
        AutoForge
            │
            ├── Software Development
            ├── Data Development
            ├── AI Development
            ├── Governance
            ├── Context
            ├── Validation
            └── Agent Coordination
```

However:

> **AutoForge must remain independently usable without the generalist AI.**

A developer should be able to install AutoForge in any compatible project and use it directly with agentic AI systems.

---

## 6. North Star Architecture

```text
                         HUMAN INTENT
                              │
                              ▼
                        AUTOFORGE
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
 PROJECT INTELLIGENCE      ORCHESTRATION         GOVERNANCE
        │                     │                     │
 Knowledge Store          Workflow Engine        Constitution
 Knowledge Graph          Task Planning          Rules
 Decisions                Agent Routing          Scope
 Research                 Multi-Agent            Security
 Specifications           Execution Control      Quality
 Context Resolver         Lifecycle State        Boundaries
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                        AGENT CONTRACT
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
        Codex            Claude Code        Other Agents
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
                   SOFTWARE / DATA / AI WORK
                              │
                              ▼
                         VALIDATION
                              │
                              ▼
                   UPDATED PROJECT KNOWLEDGE
```

---

## 7. Three Primary AutoForge Modes

### Plan

For ideas that are still being shaped.

Typical work includes brainstorming, requirements, product discovery, feasibility, research questions, user stories, use cases, feature definition, technical constraints, architecture options, roadmaps, and implementation-readiness planning.

```text
Idea
 ↓
Discovery
 ↓
Research
 ↓
Requirements
 ↓
Decisions
 ↓
Specifications
 ↓
Implementation Readiness
```

### Build

For work that is ready to implement.

```text
Task
 ↓
Relevant Context
 ↓
Governance Check
 ↓
Agent Contract
 ↓
Implementation
 ↓
Validation
 ↓
Knowledge Update
```

### Evolve

For existing systems that need modification.

```text
Existing Project
      ↓
Understand
      ↓
Assess Impact
      ↓
Plan Change
      ↓
Implement
      ↓
Validate
      ↓
Update Project Knowledge
```

AutoForge should be useful from a blank repository through a mature production system.

---

## 8. Software, Data, and AI as First-Class Domains

AutoForge should not be limited to web applications.

### Software

- web applications;
- APIs;
- backend services;
- mobile apps;
- desktop apps;
- CLIs;
- libraries;
- SDKs;
- microservices;
- infrastructure;
- distributed systems.

### Data

- databases;
- data modeling;
- ETL/ELT;
- warehouses;
- lakehouses;
- pipelines;
- semantic models;
- analytics;
- BI;
- data quality;
- governance;
- observability.

Example:

```text
dashboard.sales-performance
    uses → semantic.sales

semantic.sales
    derives-from → warehouse.fact_sales

warehouse.fact_sales
    populated-by → pipeline.sales_ingestion

pipeline.sales_ingestion
    consumes → source.dynamics365
```

### AI

- AI-enabled applications;
- RAG systems;
- model integrations;
- inference services;
- agent systems;
- evaluation pipelines;
- prompt specifications;
- model-routing logic;
- embeddings;
- vector stores;
- safety controls;
- AI observability;
- evaluation suites.

AutoForge governs the engineering lifecycle around AI systems. It does not become the AI reasoning engine itself.

---

## 9. Repository as the Project Brain

A possible `.autoforge/` structure:

```text
.autoforge/
├── vision/
├── product/
├── research/
├── decisions/
├── governance/
├── domain/
├── architecture/
├── specs/
├── design/
├── data/
├── ai/
├── flows/
├── stories/
├── work/
├── validation/
├── evidence/
├── context/
├── sessions/
└── state/
```

Not every project needs every category.

AutoForge should progressively create only the artifacts useful for the project's size and maturity.

---

## 10. Atomic Knowledge Over Monolithic Documentation

AutoForge should avoid giant project-context files.

Knowledge should be modular, addressable, and independently retrievable.

Each artifact should be able to carry:

- stable ID;
- artifact type;
- title;
- status;
- source;
- relationships;
- timestamps;
- confidence or authority where relevant;
- scope;
- provenance.

Example:

```text
screen.candidate-dashboard
    uses → view.recommended-jobs
    follows → flow.job-discovery
    governed-by → architecture.frontend
    affected-by → decision.DEC-014
```

---

## 11. One Project Graph

AutoForge should maintain **one connected project model**, not separate competing graph systems.

Do not create separate governance, domain, design, traceability, architecture, and digital-twin graphs.

Instead:

```text
                 ONE PROJECT GRAPH

Vision ─────────────────┐
Requirement ────────────┤
Decision ───────────────┤
Domain ─────────────────┤
Architecture ───────────┤
Dataset ────────────────┤
Pipeline ───────────────┤
Model ──────────────────┤
Prompt Spec ────────────┤
API ────────────────────┤
Story ──────────────────┤
Flow ───────────────────┤
Screen ─────────────────┤
Component ──────────────┤
Permission ─────────────┤
Test ───────────────────┤
Evidence ───────────────┘
```

Different AutoForge engines add relationships and meaning to this shared project model.

---

## 12. Knowledge Store, Graph, and Context Resolver

These are separate responsibilities.

**Knowledge Store:** What project knowledge exists?

**Knowledge Graph:** How is the knowledge connected?

**Context Resolver:** Which knowledge matters for this task right now?

This separation is a core architectural principle.

---

## 13. Context Resolution

The Context Resolver should produce the **minimum complete context** needed for a task.

Example request:

> “Add CSV export to the customer invoice report.”

AutoForge may select:

```text
INCLUDED
✓ InvoiceReport specification
✓ Invoice domain entity
✓ Export conventions
✓ Current report API
✓ Relevant architecture decision
✓ Data privacy rule
✓ Existing tests
✓ Acceptance criteria

EXCLUDED
✗ Landing page
✗ Authentication redesign
✗ Billing integration
✗ Unrelated migrations
✗ Entire product vision
```

Pipeline:

```text
Available Knowledge
       ↓
Task Intent
       ↓
Graph Relationships
       ↓
Governance Filtering
       ↓
Relevance Ranking
       ↓
Context Budget
       ↓
Context Packet
```

Context selection should remain explainable and measurable.

---

## 14. Governance

Governance is one of AutoForge's defining capabilities.

### Normative Levels

```text
MUST
MUST_NOT
SHOULD
SHOULD_NOT
MAY
```

### Enforcement Classes

```text
advisory
managed
hard
```

Potential governance areas include product principles, release scope, architecture, security, privacy, UX, data, AI safety, testing, documentation, deployment, and forbidden patterns.

Example:

```text
Rule:
Billing is out of scope for Release A.

Task:
Implement Stripe subscription checkout.

Evaluation:
blocked

Reason:
The requested work violates release scope.
```

AutoForge should surface this conflict before implementation begins.

---

## 15. Project Constitution

Projects should be able to define durable rules such as:

```text
constitution.product.candidate-first
constitution.security.frontend-not-authority
constitution.architecture.vendor-neutral
constitution.data.canonical-source-of-truth
constitution.ai.provider-replaceable
```

Only applicable rules should enter a task's context packet.

---

## 16. Agent Contract

AutoForge should expose a formal, vendor-neutral contract to compatible AI agents.

An agent contract can describe:

- task objective;
- current mode;
- relevant context;
- acceptance criteria;
- allowed scope;
- prohibited scope;
- applicable governance;
- allowed files/resources;
- validation requirements;
- workflow state;
- output expectations.

Conceptually:

```json
{
  "task": "TASK-42",
  "objective": "Add CSV export to invoice reporting",
  "mode": "development",
  "context": {},
  "scope": {
    "allowed": [],
    "prohibited": []
  },
  "governance": [],
  "acceptanceCriteria": [],
  "validation": []
}
```

The same underlying contract should be usable across agents even when adapter details differ.

---

## 17. Agent Adapters

AutoForge should support an adapter layer for systems such as:

- Codex;
- Claude Code;
- Gemini;
- Grok Build;
- Antigravity;
- Cursor;
- open-source agents;
- future agent systems.

AutoForge must never claim hard enforcement where the underlying adapter cannot provide it.

---

## 18. Multi-Agent Orchestration

AutoForge should eventually coordinate specialized agents such as:

```text
Product
Architecture
Research
Design
Frontend
Backend
Data
AI
Security
QA
Documentation
```

Each agent should receive only:

- its role;
- objective;
- relevant project knowledge;
- allowed scope;
- prohibited scope;
- acceptance criteria;
- validation rules;
- context budget.

Not:

> “Here is the entire repository. Figure it out.”

---

## 19. Repository-Native Design Protocol

Principle:

> **Design tools are visualization and critique layers. The repository contains canonical design knowledge.**

Hierarchy:

```text
FOUNDATION
   ↓
PRIMITIVES
   ↓
COMPONENTS
   ↓
LAYOUTS
   ↓
PATTERNS
   ↓
VIEWS
   ↓
SCREENS
   ↓
FLOWS
```

Figma, Stitch, and other tools may visualize design intent but should not be the only source of truth.

---

## 20. Traceability and Change Impact

AutoForge should connect intent to implementation.

```text
Vision
  ↓
Requirement
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
Permission
  ↓
Test
```

For data systems:

```text
Source
  ↓
Pipeline
  ↓
Transformation
  ↓
Model
  ↓
Semantic Layer
  ↓
Metric
  ↓
Dashboard
```

For AI systems:

```text
Use Case
  ↓
Prompt / Agent Spec
  ↓
Model Route
  ↓
Tool / Retrieval Dependency
  ↓
Evaluation
  ↓
Safety Rule
```

AutoForge should use these relationships to determine change impact before implementation.

---

## 21. Validation and Quality Gates

“Done” should mean more than “the code compiles.”

Potential gates:

### Product

- requirements satisfied;
- acceptance criteria satisfied;
- release scope respected.

### Architecture

- approved patterns followed;
- dependencies appropriate;
- architectural decisions respected.

### Security

- authentication;
- authorization;
- least privilege;
- secret handling;
- audit requirements.

### Data

- schema validity;
- lineage;
- data quality;
- reproducibility;
- downstream impact.

### AI

- evaluation coverage;
- model/provider assumptions;
- prompt/version tracking;
- failure handling;
- safety boundaries.

### UX

- loading;
- empty;
- error;
- responsive behavior;
- accessibility.

### Testing

- unit;
- integration;
- end-to-end;
- regression;
- data tests;
- AI evaluations where appropriate.

### Documentation

- implementation notes;
- decisions;
- updated specifications;
- migrations;
- operational notes.

---

## 22. Engineering Digital Twin

The connected project graph should eventually expose a continuously maintained model of the technical system.

It can represent:

- vision;
- releases;
- requirements;
- domains;
- architecture;
- applications;
- services;
- datasets;
- pipelines;
- APIs;
- AI systems;
- screens;
- components;
- permissions;
- tests;
- dependencies;
- decisions;
- risks;
- active work;
- validation status.

The digital twin is a connected interpretation of modular AutoForge knowledge, not a giant file.

---

## 23. Evidence and Learning

AutoForge should learn from project evidence such as:

- bugs;
- incidents;
- performance results;
- analytics;
- failed tests;
- user feedback;
- usability findings;
- AI evaluations;
- data-quality failures;
- experiments.

Example:

```text
Hypothesis
   ↓
Feature
   ↓
Experiment
   ↓
Evidence
   ↓
Decision
   ↓
Updated Specification
```

This remains engineering/project knowledge, not general personal memory.

---

## 24. Strategy and Prioritization

AutoForge may organize inputs such as value, risk, technical complexity, evidence, dependencies, architectural impact, release alignment, and validation state.

But:

> **AutoForge informs prioritization. Humans remain responsible for strategy.**

AutoForge should not become an autonomous product executive.

---

## 25. CLI / TUI

The AutoForge CLI/TUI should remain an engineering operating surface.

It may allow users to:

- initialize AutoForge;
- inspect project state;
- create work;
- review governance;
- inspect context;
- view decisions;
- inspect change impact;
- validate releases;
- trigger agent workflows;
- inspect project knowledge;
- interact with the engineering digital twin.

It should **not** become a general-purpose personal AI chat product.

---

## 26. Global Workspace

AutoForge may be globally installed while keeping project state isolated.

```text
~/.autoforge/
├── config
├── registry
├── adapters
├── templates
└── defaults
```

Project-local state:

```text
project/.autoforge/
├── vision
├── work
├── decisions
├── governance
├── research
├── specs
├── architecture
├── design
├── data
├── ai
├── validation
└── context
```

> **Globally available does not mean globally authorized.**

AutoForge should not silently scan unrelated repositories.

---

## 27. Bootstrap Engine

AutoForge should bootstrap new and existing technical projects.

```text
User Idea
↓
Vision Discovery
↓
Problem
↓
Users / Stakeholders
↓
Use Cases
↓
Requirements
↓
Research
↓
Architecture
↓
Domain Model
↓
Data Model
↓
Design System
↓
AI Architecture (when applicable)
↓
Security
↓
Development Plan
↓
Task Breakdown
↓
Implementation Readiness
```

For existing systems, AutoForge should extract knowledge without blindly treating legacy architecture as authoritative.

---

## 28. Canonical Roadmap

```text
v0.14 — Knowledge + Context Foundation       [completed]

v0.15 — Project Constitution + Governance
v0.16 — Domain Intelligence
v0.17 — Repository-Native Design Protocol
v0.18 — Traceability + Change Impact
v0.19 — Validation + Quality Gates
v0.20 — Engineering Digital Twin
v0.21 — Multi-Agent Orchestration
v0.22 — Evidence + Learning
v0.23 — Strategy + Prioritization
v0.24 — Interactive Engineering CLI/TUI
v0.25 — Continuous Engineering Evolution
```

The roadmap remains focused on software, data, and AI-development orchestration.

---

## 29. Roadmap Questions

**v0.14:** What does the project know, and what matters now?

**v0.15:** What is allowed, required, discouraged, or forbidden?

**v0.16:** What does this software/data/AI system mean?

**v0.17:** What should users experience, and how is design intent represented?

**v0.18:** What depends on what, and what changes if this artifact changes?

**v0.19:** Is the work actually correct and complete?

**v0.20:** What is the current known state of the technical system?

**v0.21:** How do specialized AI agents collaborate safely?

**v0.22:** What has engineering reality taught the project?

**v0.23:** What should humans consider building or changing next?

**v0.24:** How does a human naturally operate the complete AutoForge engineering system?

**v0.25:** Can AutoForge close the technical lifecycle and preserve engineering learning continuously?

---

## 30. Continuous Engineering Evolution

```text
Human Intent
     ↓
Discovery
     ↓
Structured Project Knowledge
     ↓
Research
     ↓
Decision
     ↓
Specification
     ↓
Architecture / Design
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

AutoForge manages continuity of the engineering process.

AI agents remain replaceable participants inside that loop.

---

## 31. Open-Source Strategy

AutoForge should remain:

- vendor-neutral;
- locally usable;
- repository-native;
- inspectable;
- portable;
- extensible;
- adapter-based;
- model-independent;
- automation-friendly;
- CI-friendly.

It should be useful whether the user chooses Codex, Claude Code, Gemini, Grok Build, Antigravity, Cursor, an open-source agent, a future generalist AI, or a custom enterprise agent.

---

## 32. Integration Philosophy

Potential integration surfaces include:

- CLI;
- package/library APIs;
- machine-readable project state;
- agent contracts;
- adapters;
- hooks;
- CI/CD;
- future MCP/tool protocols where appropriate;
- optional hosted orchestration services.

AutoForge should not depend architecturally on one interaction surface.

---

## 33. Security and Trust

Potential controls include:

- project-root isolation;
- allowed file scopes;
- prohibited paths;
- secrets policy;
- agent capability declarations;
- command restrictions;
- approval requirements;
- release gates;
- environment boundaries;
- audit logs;
- decision provenance.

AutoForge should never assume that an AI agent is authorized to modify everything it can see.

---

## 34. Canonical Architectural Rules

1. **AutoForge is not an AI agent.**
2. **AutoForge owns orchestration, not intelligence.**
3. **AI agents remain replaceable.**
4. **Project intelligence belongs to the project.**
5. **Use one connected project model.**
6. **Separate storage, graph relationships, and context resolution.**
7. **Prefer atomic knowledge over monolithic documentation.**
8. **Provide minimum complete context.**
9. **Make context selection explainable.**
10. **Govern before execution.**
11. **Validate before declaring work complete.**
12. **Preserve decisions and evidence.**
13. **Support software, data, and AI engineering as first-class domains.**
14. **Keep AutoForge independently usable.**
15. **Do not require the future generalist AI.**
16. **Do not claim hard enforcement when an adapter is only advisory.**
17. **Do not hard-code one product's assumptions into AutoForge core.**
18. **Do not require one AI provider.**

---

## 35. Ideal Developer Experience

A developer opens a repository and runs the framework directly or through a compatible agent adapter:

```bash
autoforge
```

When a natural-language request is entered, the selected external agent owns reasoning and execution while AutoForge resolves the project contract. The user requests:

> “We need to add organization-level RBAC.”

AutoForge should resolve:

```text
Relevant domain entities
Relevant APIs
Relevant database schema
Existing authorization decisions
Security constitution
Affected screens
Affected services
Release scope
Tests
Change-impact relationships
```

A compatible agent workflow can then receive:

```text
AutoForge identified:

3 affected domain entities
4 APIs
2 database tables
6 UI surfaces
3 authorization rules
11 relevant tests
1 architectural decision

Recommended workflow:
Architecture
→ Security
→ Backend
→ Frontend
→ Validation
```

The user should not need to re-explain the project architecture to every new AI agent.

---

## 36. Ultimate North Star

> **AutoForge is the open-source engineering control plane for AI-assisted software, data, and AI development.**

It allows humans and organizations to preserve project intelligence, govern technical work, resolve relevant context, coordinate specialized AI agents, validate outcomes, and continuously evolve technical systems without becoming dependent on any single AI model or agent.

```text
Human
  ↓
AutoForge
  ↓
Project Intelligence
+ Governance
+ Context
+ Orchestration
+ Validation
  ↓
Any Compatible AI Agent
  ↓
Software / Data / AI System
```

The enduring principle remains:

> **Humans think naturally. AutoForge organizes persistently. AI agents execute precisely.**
