# AutoForge North Star Architecture Guide

## Revised Roadmap After v0.14

### v0.14.0 → v0.25.0

**Date:** August 21, 2026  
**Status:** Canonical roadmap revision for post-v0.14 development  
**Purpose:** Provide Codex and future contributors with one dependency-aware plan from the completed knowledge/context foundation through AutoForge's Continuous Product Evolution milestone.

---

# 1. Executive Decision

AutoForge v0.14 establishes the foundation required to begin the next architectural phase.

The next release should **not** be the previously proposed rich Interactive CLI.

### Milestone Sequencing Amendment

The roadmap now places **Continuous Product Evolution in v0.24** and the **Interactive CLI Experience in v0.25**. This ordering is authoritative: the lifecycle loop and shared services must mature before the richer human-facing presentation layer is built.

Instead:

```text
v0.14 — Knowledge + Context Foundation
v0.15 — Project Constitution & Governance
v0.16 — Domain Intelligence
v0.17 — Repository-Native Design Protocol
v0.18 — Traceability + Change Impact
v0.19 — Validation + Quality Gates
v0.20 — Product Digital Twin
v0.21 — Multi-Agent Orchestration
v0.22 — Evidence + Learning
v0.23 — Strategy + Prioritization
v0.24 — Continuous Product Evolution
v0.25 — Interactive CLI Experience
```

The existing CLI and thin TUI remain supported.

What is postponed to v0.25 is the **richer human-facing interactive AutoForge experience** that lets users naturally operate the mature project-intelligence system.

This ordering avoids designing the final interface before AutoForge's product-intelligence engines exist.

---

# 2. North Star

## Technical North Star

> **AutoForge is an open-source software-engineering orchestration framework that converts human intent and persistent project knowledge into governed, precise, task-specific context for AI agents across the complete product lifecycle.**

## Human-Facing Philosophy

> **Humans think messily. AutoForge organizes persistently. AI agents execute precisely.**

## Future-State Metaphor

> **AutoForge becomes the living digital twin and orchestration layer of a software project—without replacing the human or the reasoning agent.**

---

# 3. Architectural Invariants

These principles should not change as the roadmap evolves.

## AutoForge Is Not the Reasoning Model

```text
Agent Intelligence ≠ Project Intelligence
```

The AI reasons.

AutoForge provides project truth, product intent, persistent decisions, governance, domain meaning, design meaning, task context, execution boundaries, validation requirements, and evidence.

## Minimum Complete Context

> **The goal is minimum complete context, not maximum context.**

## Repository as Canonical Source

The repository remains the portable source of project truth.

External tools may visualize, critique, or enrich that truth.

## Modular Knowledge

Avoid monoliths such as:

```text
EVERYTHING.md
PROJECT_CONTEXT.md
ALL_DESIGN.md
```

Prefer atomic artifacts with stable IDs and explicit relationships.

## Human Authority

AutoForge may identify conflicts, enforce configured rules, surface risks, and recommend actions.

Humans remain responsible for product authority and strategic decisions.

## One Project Model

Do not create separate competing graphs for governance, domains, design, traceability, and digital twin state.

These should enrich one shared project-knowledge model.

---

# 4. What v0.14 Gives Us

v0.14 is the bridge from the original context-control architecture into Phase 2.

The completed foundation provides the primitives required for later product intelligence:

```text
Structured Knowledge
      ↓
Knowledge Extraction
      ↓
Stable Artifacts
      ↓
Explicit Relationships
      ↓
Context Resolution
      ↓
Context Protocol
      ↓
Scoped Agent Context
```

The current repository already separates these responsibilities into dedicated domains such as:

```text
knowledge/
context/
specifications/
intent/
bootstrap/
workflows/
contract/
agents/
guardrails/
workspace/
```

The next versions should extend these primitives rather than replace them.

---

# 5. Why the Rich Interactive CLI Moves to v0.25

The earlier roadmap placed an Interactive CLI immediately after the context foundation.

That would expose AutoForge before the system understands several major concepts that the interface will eventually need to operate:

```text
Constitution
Domains
Release Scope
Design Truth
Traceability
Change Impact
Validation State
Digital Twin
Agents
Evidence
Strategy
Prioritization
```

Building the final interaction model before those domains stabilize would likely cause repeated redesign.

Therefore:

## Keep Now

- existing non-interactive CLI;
- existing commands;
- machine-readable output;
- existing thin/read-oriented TUI;
- agent-facing project contracts.

## Postpone Until v0.25

- conversational orchestration shell;
- unified project cockpit;
- natural-language project operations;
- interactive views over governance, domains, traceability, evidence, strategy, and digital-twin state;
- mode inference across discovery, planning, design, development, review, and validation.

> **Build the engines first. Design the cockpit once the controls actually exist.**

---

# 6. Revised Roadmap

## v0.14 — Knowledge + Context Foundation

### Status: Completed foundation / baseline for this roadmap

### Primary Question

> What does the project know, and what matters to the current task?

### Responsibility

Provide the common project-brain infrastructure:

- knowledge artifacts;
- knowledge extraction;
- stable IDs;
- relationships;
- specification registry;
- context resolver;
- context protocol;
- context packets;
- context budgets;
- inclusion/exclusion explanations;
- agent-neutral delivery.

### Exit Principle

Every later Phase 2 engine must reuse this foundation.

Do not build parallel state or context systems.

---

## v0.15 — Project Constitution & Governance Engine

### Primary Question

> What is allowed, required, discouraged, or forbidden?

### Mission

Create the durable rules of the road for a project so agents cannot silently drift away from approved product, security, engineering, UX, or release principles.

### Proposed Capabilities

- Project Constitution;
- product principles;
- engineering principles;
- UX principles;
- security principles;
- explicit non-goals;
- MUST / MUST NOT / SHOULD / MAY semantics;
- forbidden architectural patterns;
- release-scope rules;
- conflict detection;
- ADR requirements;
- definition-of-done rules;
- hard vs advisory governance.

### Example IDs

```text
constitution.product.candidate-first
constitution.resume.single-canonical
constitution.security.frontend-not-authority
constitution.accounts.universal-user
```

### Relationship to Existing Doctrine

Doctrine answers:

> How should an agent work?

Constitution answers:

> What must remain true about this project/product?

These must not be merged into one concept.

### Required Outputs

At minimum:

```text
ConstitutionArtifact
GovernanceRule
GovernanceSeverity
GovernanceScope
GovernanceEvaluation
GovernanceConflict
```

### v0.15 Release Gate

- constitution artifacts persist with stable IDs;
- rules can be queried by scope;
- hard and advisory rules are distinguishable;
- an agent task can be evaluated against applicable rules;
- conflicts are explainable;
- release scope can reject clearly out-of-scope work;
- governance reuses the existing knowledge/context model;
- no second policy graph or second context packet exists;
- tests demonstrate a conflicting task is identified before implementation.

---

## v0.16 — Domain Intelligence Engine

### Primary Question

> What does the product mean?

### Mission

Represent business concepts, relationships, and invariants rather than merely repository files.

### Example Domain Objects

For a hiring platform such as Verdua:

```text
User
ProfessionalProfile
Resume
ResumeVersion
Opportunity
Job
Organization
OrganizationMember
TalentWorkspace
Entitlement
CandidateDiscoverability
```

### Example Relationships

```text
User owns Profile
Profile supplies Resume
Resume has ResumeVersion
Organization has OrganizationMember
Subscription grants Entitlement
```

### Domain Invariants

```text
A user has one canonical active resume.
Resume history is immutable.
Subscription does not imply authorization.
```

### Long-Term Consumers

Domain intelligence may later support validation or generation of:

- database schemas;
- API contracts;
- DTOs;
- validation schemas;
- permissions;
- UI view models;
- tests.

### Dependency

Requires v0.15 governance so domain invariants can participate in project rules.

---

## v0.17 — Repository-Native Design Specification Protocol

### Primary Question

> What should the product look like and how should it behave?

### Mission

Make design knowledge canonical, portable, modular, and agent-consumable from the repository.

### Design Hierarchy

```text
foundation
primitive
component
layout
pattern
view
screen
flow
state
responsive
design-decision
```

### Principle

> Design tools are visualization and critique layers. The repository contains canonical design knowledge.

### Required Design Semantics

Components should represent:

- purpose;
- variants;
- properties;
- states;
- behavior;
- tokens;
- responsive rules;
- accessibility;
- data inputs;
- dependencies.

Screens should represent:

- route;
- purpose;
- user;
- layout;
- component tree;
- permissions;
- entitlement behavior;
- loading;
- empty;
- error;
- responsive behavior;
- accessibility;
- data dependencies.

### Dependency

Builds on v0.14 specifications/context, v0.15 governance, and v0.16 domain meaning.

---

## v0.18 — Dependency, Traceability & Change-Impact Engine

### Primary Question

> What depends on what, and what changes if this changes?

### Mission

Connect intent to implementation.

### Canonical Chain

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

### Example

```text
screen.candidate-dashboard
  implements → story.candidate-home
  uses → component.opportunity-card
  depends-on → api.opportunities
  governed-by → entitlement.opportunity-insights
```

### Desired Command

```text
autoforge impact <artifact-or-concept>
```

### Important Architecture Rule

This is **not a new graph**.

v0.18 enriches the relationship model introduced earlier with traceability semantics and impact traversal.

---

## v0.19 — Validation & Quality Gate Engine

### Primary Question

> Is this work actually complete and correct?

### Mission

Turn "done" into a governed state rather than a coding event.

### Validation Categories

```text
Product
Architecture
Security
Privacy
UX
Accessibility
Testing
Documentation
Release Scope
```

### Example Lifecycle

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

### Required Behavior

AutoForge should be able to prevent release-ready status when configured gates remain unsatisfied.

### Dependency

Requires governance, domain meaning, design specifications, and traceability.

---

## v0.20 — Product Digital Twin

### Primary Question

> What is the current known state of the product?

### Mission

Expose a continuously maintained, queryable interpretation of project truth.

### The Digital Twin Includes

- vision;
- constitution;
- releases;
- domain;
- features;
- stories;
- flows;
- screens;
- components;
- APIs;
- architecture;
- permissions;
- tests;
- decisions;
- risks;
- validation state;
- active work.

### Critical Rule

> The digital twin is not one giant file and should not initially be a separate database.

It is the connected interpretation of the existing project model.

### Example Queries

```text
What capabilities exist today?
What is planned but not implemented?
Which screens use this component?
What permissions protect candidate data?
Which decisions affect the resume domain?
What remains incomplete for this release?
```

---

## v0.21 — Multi-Agent Orchestration Engine

### Primary Question

> How do specialized agents collaborate without losing project consistency?

### Mission

Coordinate agents through role-scoped, governed context rather than giving every agent the whole project.

### Possible Roles

```text
Product
Architecture
Design
Frontend
Backend
Security
QA
Research
```

### Agent Input

Each agent receives:

```text
active task
role
required context
applicable governance
permitted actions
prohibited actions
allowed files
acceptance criteria
validation requirements
context budget
```

### Key Benchmark

```text
Same Task
Same AutoForge Packet

     ↓            ↓
   Codex        Claude

     ↓            ↓
Implementation Implementation
```

Compare interpretation, scope, architecture, fidelity, tests, and acceptance criteria.

### Dependency

Do not build this until a single canonical packet can be interpreted reliably by independent agents.

---

## v0.22 — Learning & Evidence Engine

### Primary Question

> What did reality teach us after the product was used?

### Mission

Bring observed evidence back into durable project knowledge.

### Evidence Types

- analytics;
- beta feedback;
- support tickets;
- bug reports;
- usability studies;
- experiments;
- performance metrics;
- interviews;
- AI evaluations.

### Canonical Relationship

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

Requires traceable features, decisions, releases, and digital-twin state.

---

## v0.23 — Product Strategy & Prioritization Engine

### Primary Question

> What should humans consider doing next?

### Mission

Help people evaluate priorities without making AutoForge an autonomous product executive.

### Inputs

- strategic alignment;
- user value;
- risk;
- cost;
- evidence strength;
- dependency pressure;
- technical complexity;
- release constraints.

### Example

```text
feature: recruiter-messaging

strategic-alignment: low
candidate-value: uncertain
recruiter-value: medium
spam-risk: high
privacy-risk: medium
evidence-strength: low
decision: backlog
```

### Invariant

> AutoForge informs prioritization. Humans remain responsible for strategy.

---

## v0.24 — Interactive CLI Experience

### Primary Question

> How does a human naturally operate the complete AutoForge system?

### Mission

Create the rich interactive project cockpit after the underlying project-intelligence engines are mature.

### Potential Experience

```text
$ autoforge

AutoForge — Verdua
──────────────────────────────

Current Release: Candidate Beta
Active Work: none

Governance
✓ Constitution loaded
⚠ 1 proposed conflict

Domains
✓ 11 modeled

Implementation
12 / 17 stories complete

Validation
⚠ 2 release gates incomplete

Evidence
3 findings awaiting review

What are you thinking about?

> _
```

### Possible Modes

```text
brainstorm
discovery
research
planning
design
development
review
validation
strategy
```

### Important Boundary

The interactive CLI is a presentation/orchestration surface over application services.

It must not own governance logic, graph logic, domain state, context ranking, validation logic, evidence logic, or agent logic.

### Existing TUI

The current thin/read-oriented TUI may remain available throughout Phase 2.

v0.24 represents the richer conversational/operational experience, not the first existence of a terminal interface.

### Why v0.24 Comes Before v0.25

By v0.24 the system's major engines exist.

The human now gets one natural surface to operate them.

The final v0.25 release can then prove that the full lifecycle works as one coherent closed loop.

---

## v0.25 — Continuous Product Evolution Engine

### Primary Question

> Can AutoForge close the complete software-development lifecycle and continuously preserve what the project learns?

### Mission

Integrate the entire AutoForge architecture into a persistent engineering lifecycle.

### Full Loop

```text
Human Thought
     ↓
Discovery
     ↓
Structured Knowledge
     ↓
Governance
     ↓
Research
     ↓
Decision
     ↓
Domain / Specification
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
Updated Product Model
     ↺
```

### Critical Architectural Rule

v0.25 must not depend exclusively on the v0.24 UI.

Continuous evolution must remain accessible through shared application services so it can be operated through:

```text
Interactive CLI
regular CLI
Codex
Claude Code
CI
future MCP integrations
future cloud interfaces
```

### Capstone Goal

> **Persistent engineering orchestration across the entire product lifecycle.**

---

# 7. Dependency Chain

```text
v0.14 Knowledge + Context
        ↓
v0.15 Governance
        ↓
v0.16 Domain Intelligence
        ↓
v0.17 Design Protocol
        ↓
v0.18 Traceability
        ↓
v0.19 Validation
        ↓
v0.20 Digital Twin
        ↓
v0.21 Multi-Agent Orchestration
        ↓
v0.22 Evidence + Learning
        ↓
v0.23 Strategy + Prioritization
        ↓
v0.24 Interactive Experience
        ↓
v0.25 Continuous Evolution
```

This is a dependency narrative, not permission to couple each implementation tightly to the previous release.

Application-service boundaries should remain independent and composable.

---

# 8. Verdua as the Reference Implementation

Verdua should continue to expose real problems that AutoForge can formalize.

```text
AutoForge capability
        ↓
Apply to Verdua
        ↓
Observe friction
        ↓
Document failure mode
        ↓
Improve AutoForge
        ↓
Re-run workflow
```

Use Verdua to validate:

- governance;
- domain modeling;
- design specifications;
- traceability;
- context resolution;
- release boundaries;
- authorization and privacy requirements;
- validation gates;
- multi-agent consistency;
- evidence feedback.

Do not treat old Verdua architecture as automatically authoritative.

---

# 9. v0.15 Immediate Implementation Priority

The next implementation should focus only on the **Project Constitution & Governance Engine**.

Codex should not implement v0.16+ as part of the same task.

## Recommended v0.15 Work Sequence

### Phase A — Audit Existing Governance Concepts

Inspect:

```text
doctrine/
guardrails/
contract/
intent/
workflows/
quality/
knowledge/
specifications/
```

Determine what is already behavior guidance versus what requires a new project-governance domain.

### Phase B — Define Governance Domain

Create canonical schemas for:

```text
Constitution
GovernanceRule
GovernanceLevel
GovernanceScope
GovernanceEvaluation
GovernanceConflict
```

Suggested normative levels:

```text
MUST
MUST_NOT
SHOULD
SHOULD_NOT
MAY
```

Suggested enforcement classes:

```text
advisory
managed
hard
```

Do not confuse normative language with adapter enforcement capability.

### Phase C — Persistence

Persist durable project constitution and rules using the existing state/knowledge architecture.

Avoid creating a separate unversioned policy store.

### Phase D — Rule Selection

Select applicable governance based on:

```text
active work
objective
scope
artifact relationships
release
domain tags where available later
```

### Phase E — Evaluation

Evaluate tasks/plans against selected rules.

Return structured:

```text
pass
warning
conflict
blocked
not-applicable
```

with reasons.

### Phase F — Context Integration

Include only applicable governance rules in the existing context packet.

Do not dump the full constitution into every packet.

### Phase G — Agent Contract Integration

Make selected governance visible to compatible agents.

Adapters may enforce only what their capabilities safely support.

### Phase H — CLI

Possible initial command surface:

```bash
autoforge constitution init
autoforge constitution list
autoforge constitution show <id>
autoforge constitution check
```

Exact command names should be decided after auditing current router conventions.

### Phase I — Golden Tests

At minimum:

1. rule applies and is included;
2. irrelevant rule is excluded;
3. advisory conflict warns;
4. hard conflict blocks the governed transition;
5. release-scope rule rejects out-of-release feature;
6. rules survive persistence/reload;
7. context remains under budget;
8. different agents receive identical selected governance;
9. legacy doctrine behavior remains unchanged.

---

# 10. What v0.15 Must Not Do

Do not:

- build the domain engine;
- redesign the TUI;
- build a graph database;
- create a second context packet;
- create a second knowledge registry;
- turn doctrines into product constitution entries automatically;
- add autonomous product decisions;
- hard-code Verdua rules into AutoForge core;
- claim enforcement where an adapter only supports advisory guidance;
- load every governance rule into every task.

---

# 11. v0.15 Definition of Done

v0.15 is complete when AutoForge can demonstrate:

```text
Human-approved project principle
        ↓
Durable constitution artifact
        ↓
Applicable rule selection
        ↓
Task / plan evaluation
        ↓
Conflict explanation
        ↓
Scoped context inclusion
        ↓
Agent receives rule
        ↓
Configured enforcement behavior
```

Concrete benchmark:

```text
Rule:
Billing is out of scope for Release A.

Task:
Add Stripe subscription checkout.

Expected:
AutoForge identifies the release-scope conflict
before implementation and explains the governing rule.
```

---

# 12. AutoForge 1.0 Direction

AutoForge 1.0 should represent a maturity threshold, not merely the next number after v0.25.

A future 1.0 should reliably:

- capture natural human intent;
- preserve durable project knowledge;
- preserve product vision;
- govern project behavior;
- understand product domains;
- maintain repository-native design truth;
- track dependencies;
- resolve minimum complete context;
- coordinate compatible agents;
- validate work;
- preserve decisions;
- ingest evidence;
- support human prioritization;
- maintain a living product model;
- close the development feedback loop;
- remain project-isolated;
- remain vendor-neutral;
- keep humans in control.

---

# 13. Final Mental Model

```text
Human provides intent.
AutoForge preserves truth.
Governance protects intent.
Domain intelligence gives meaning.
Design defines experience.
Traceability connects consequences.
Context resolution selects what matters.
AI performs bounded work.
Validation proves completion.
Evidence records reality.
Strategy helps humans decide.
The interactive CLI exposes the system.
Continuous Evolution closes the loop.
```

That is the revised path from the completed v0.14 foundation to AutoForge's v0.25 North Star.
