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
