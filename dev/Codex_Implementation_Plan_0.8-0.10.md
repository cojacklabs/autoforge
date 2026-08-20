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
