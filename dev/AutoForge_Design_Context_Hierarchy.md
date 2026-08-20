# AutoForge v0.10 — Canonical Design Context Hierarchy

## Purpose

This document defines the canonical hierarchy AutoForge should use to organize design knowledge so agentic AI systems can retrieve and reason about design context in small, task-specific slices.

It is intended primarily for AutoForge v0.10 development, where AutoForge formalizes the agent contract used by coding and design-capable AI systems.

AutoForge is **not an AI agent**.

AutoForge is the persistent project contract and context framework that helps AI agents determine:

- what design context exists;
- where that context lives;
- which design artifacts are relevant to the current task;
- what dependencies must be loaded;
- what unrelated context should be excluded;
- what design rules and decisions must be preserved.

The goal is to prevent agents from being given one giant `design.md` or raw design export containing the entire application.

Instead, design knowledge should be decomposed into independently retrievable artifacts with explicit relationships.

---

# 1. Core Principle

> Every design artifact must be independently understandable, explicitly reference its dependencies, and be retrievable without loading unrelated design context.

The intended retrieval model is:

```text
Human Prompt
    ↓
Host AI Agent
    ↓
AutoForge Contract
    ↓
Identify Active Design Task
    ↓
Resolve Relevant Design Artifact
    ↓
Traverse Only Required Dependencies
    ↓
Assemble Design Context Packet
    ↓
AI Agent Executes / Critiques / Implements
```

AutoForge should behave like a **design dependency resolver**, not a document dump.

---

# 2. Canonical Design Hierarchy

```text
.autoforge/
└── specs/
    └── design/
        ├── 00-foundation/
        │   ├── brand.md
        │   ├── design-system.md
        │   └── tokens/
        │       ├── colors.md
        │       ├── typography.md
        │       ├── spacing.md
        │       ├── radius.md
        │       ├── shadows.md
        │       └── breakpoints.md
        │
        ├── 01-primitives/
        │   ├── button.md
        │   ├── input.md
        │   ├── checkbox.md
        │   ├── badge.md
        │   ├── avatar.md
        │   └── icon.md
        │
        ├── 02-components/
        │   ├── job-card.md
        │   ├── profile-card.md
        │   ├── search-bar.md
        │   └── filter-group.md
        │
        ├── 03-layouts/
        │   ├── app-shell.md
        │   ├── sidebar.md
        │   ├── top-nav.md
        │   └── content-grid.md
        │
        ├── 04-patterns/
        │   ├── search-results.md
        │   ├── empty-state.md
        │   ├── loading-state.md
        │   └── form-section.md
        │
        ├── 05-views/
        │   ├── recommended-jobs-view.md
        │   ├── recent-activity-view.md
        │   └── profile-summary-view.md
        │
        ├── 06-screens/
        │   ├── candidate-dashboard.md
        │   ├── job-search.md
        │   ├── job-details.md
        │   └── settings.md
        │
        ├── 07-flows/
        │   ├── onboarding-flow.md
        │   ├── job-discovery-flow.md
        │   └── application-flow.md
        │
        ├── 08-decisions/
        │   ├── DDR-001.md
        │   └── DDR-002.md
        │
        └── 09-manifests/
            ├── design-manifest.json
            ├── component-registry.json
            ├── screen-registry.json
            └── relationship-graph.json
```

---

# 3. Hierarchy Semantics

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

## Foundation

Global design rules such as brand, tokens, typography, spacing, radius, shadows, responsive breakpoints, and design principles.

## Primitive

A small reusable UI element such as Button, Input, Badge, Avatar, Checkbox, or Icon.

## Component

A reusable, meaningful UI object composed from primitives, such as JobCard, ProfileCard, SearchBar, or FilterGroup.

## Layout

Defines structural arrangement, such as AppShell, Sidebar, TopNav, or ContentGrid.

## Pattern

A reusable arrangement or interaction model combining multiple components, such as SearchResults, EmptyState, LoadingState, or FormSection.

## View

A meaningful section of a screen that can be reasoned about independently, such as RecommendedJobsView or RecentActivityView.

Views are especially important for context slicing because they provide a layer between individual components and a full screen.

## Screen

Represents a complete page, route, or top-level application state.

## Flow

Represents behavior across multiple screens or states, such as onboarding, job discovery, application submission, or profile completion.

## Design Decision Record

A DDR preserves the rationale behind durable visual or interaction decisions.

---

# 4. Machine-Readable Relationships

Every design artifact should contain machine-readable front matter.

Example screen:

```md
---
id: screen.candidate-dashboard
type: screen

uses:
  - layout.app-shell
  - view.recommended-jobs
  - view.recent-activity

flows:
  - flow.job-discovery

decisions:
  - DDR-004
---
```

Example view:

```md
---
id: view.recommended-jobs
type: view

uses:
  - component.job-card
  - primitive.button
---
```

Example component:

```md
---
id: component.job-card
type: component

uses:
  - primitive.avatar
  - primitive.badge
  - primitive.button

tokens:
  - color.surface.primary
  - color.text.primary
  - spacing.md
  - radius.card

variants:
  - default
  - saved
  - applied
---
```

This creates a dependency graph:

```text
screen.candidate-dashboard
        ↓
view.recommended-jobs
        ↓
component.job-card
        ↓
primitive.avatar
primitive.badge
primitive.button
        ↓
design tokens
```

---

# 5. Markdown vs JSON Responsibility

## Markdown

Markdown contains meaning, behavior, rationale, constraints, states, responsive rules, accessibility requirements, and acceptance criteria.

Markdown answers:

> What does this design artifact mean?

## JSON

JSON contains IDs, paths, types, relationships, registry entries, and index metadata.

JSON answers:

> Where is the artifact and how is it connected?

Do not expect an AI agent to infer the entire product from a massive raw JSON design export.

---

# 6. Canonical Retrieval Order

For a design-related task, AutoForge should normally resolve context in this order:

```text
1. Active task
2. Relevant screen or view
3. Direct component dependencies
4. Required primitives
5. Required design tokens
6. Relevant flow
7. Relevant design decisions
8. Global brand/design rules
```

The resolver should stop once the task has sufficient context.

---

# 7. Example Context Slice

User request:

> Change the saved-state appearance of JobCard on the Candidate Dashboard.

Likely context packet:

```text
Active task
component/job-card.md
view/recommended-jobs-view.md
screen/candidate-dashboard.md
foundation/tokens/colors.md
foundation/tokens/spacing.md
relevant primitive specs
relevant DDRs
small relevant portion of brand.md
```

Explicitly excluded:

```text
settings screen
billing UI
authentication flow
database architecture
unrelated components
unrelated design decisions
```

---

# 8. Design Context Packet

Suggested canonical packet:

```md
# Design Task

## Objective

## Active Work

## Relevant Screen / View

## Required Components

## Required Primitives

## Required Tokens

## Applicable Design Decisions

## Relevant Flow

## Brand Constraints

## Responsive Requirements

## Accessibility Requirements

## Allowed Scope

## Prohibited Changes

## Acceptance Criteria
```

---

# 9. Agent Contract Behavior

For AutoForge v0.10, compatible AI agents should follow this sequence for design work:

```text
User prompt
   ↓
Host AI receives prompt
   ↓
Check AutoForge contract
   ↓
Identify active work
   ↓
Classify request
   ↓
Resolve relevant design artifact
   ↓
Traverse required dependencies
   ↓
Load design context packet
   ↓
Perform design / critique / implementation
   ↓
Validate against specs
   ↓
Record durable design decisions if required
```

AutoForge is not another AI agent. It is the contract and context system the host AI follows.

---

# 10. Tool Compatibility

The hierarchy should remain tool-neutral.

Potential consumers include:

- Codex
- Claude Code
- Cursor
- Antigravity
- Figma-capable agents
- TypeUI-style systems
- Storybook-related tooling
- future design agents

Tool adapters may translate AutoForge knowledge into tool-specific prompts or operations.

---

# 11. Design Creation Workflow

```text
Human Intent
   ↓
AI + AutoForge triage
   ↓
Design discovery
   ↓
Brand / UX constraints
   ↓
Screen / component spec creation
   ↓
Design context packet
   ↓
Design-capable AI
   ↓
Generated design
   ↓
Critique / validation
   ↓
Update design specs + DDRs
```

---

# 12. Existing Design Critique Workflow

```text
Existing screen / component
   ↓
Resolve related AutoForge specs
   ↓
Design critique packet
   ↓
Design-capable AI
   ↓
Findings
   ↓
Suggested changes
   ↓
Validation against brand, UX, accessibility, and component reuse
   ↓
Update specs / DDR after approval
```

---

# 13. Design-to-Code Handoff

The same design graph should support implementation agents.

```text
screen.candidate-dashboard
  ↓ uses
view.recommended-jobs
  ↓ uses
component.job-card
  ↓ uses
primitive.badge
primitive.avatar
  ↓ uses
design tokens
```

A coding agent should receive only the relevant slice.

---

# 14. AutoForge v0.10 Development Requirements

Codex should treat these as v0.10 requirements:

## A. Canonical design artifact taxonomy

Support:

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

## B. Stable IDs

Examples:

```text
component.job-card
view.recommended-jobs
screen.candidate-dashboard
flow.job-discovery
```

## C. Relationship graph

Support relationships such as:

```text
uses
flows
tokens
decisions
parent
children
```

## D. Scoped retrieval

Given an active task, retrieve only the related design graph.

## E. Explainability

Example:

```text
Included component.job-card
Reason:
screen.candidate-dashboard
→ view.recommended-jobs
→ component.job-card
```

## F. Exclusion

Avoid loading unrelated artifacts even if they exist in the same design system.

## G. Design-agent contract

Design-compatible agents consume the same AutoForge project contract as coding agents, but receive design-specific context.

## H. Vendor neutrality

The hierarchy must not require Figma, TypeUI, or any individual provider.

---

# 15. Golden Context Test

Example task:

```text
Change bookmark placement in JobCard on Candidate Dashboard.
```

Expected:

```text
screen.candidate-dashboard
view.recommended-jobs
component.job-card
primitive.button or bookmark control
spacing tokens
relevant DDR
design doctrine
```

Explicitly excluded:

```text
screen.settings
screen.billing
flow.authentication
backend architecture
unrelated components
```

A passing test demonstrates that AutoForge is reducing context rather than creating another context dump.

---

# 16. Success Criteria

The hierarchy is successful when:

- a component can be understood independently;
- a view can be retrieved without loading the full screen library;
- a screen declares dependencies explicitly;
- a flow remains independent from layout;
- design and coding agents consume the same project knowledge;
- design rationale survives across sessions;
- AutoForge can explain why context was selected;
- irrelevant context is excluded;
- changing design tools does not require rewriting project knowledge.

---

# Canonical Statement

> AutoForge design knowledge is a dependency graph of small, independently understandable specifications. AI agents retrieve only the slice required for the active task, then follow explicit relationships downward through views, components, primitives, tokens, flows, and design decisions as needed.

This hierarchy should be treated as part of the AutoForge v0.10 agent compatibility contract.
