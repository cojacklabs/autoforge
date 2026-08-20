# AutoForge 0.7.0 — Rewrite Development Plan

## 1. Mission

Rebuild AutoForge 0.7.0 as an **AI development context and control plane**.

AutoForge should ensure that an AI coding agent receives:

- the correct active work
- relevant prior decisions
- applicable doctrines
- relevant architecture
- relevant design specifications
- required component specifications
- appropriate permissions and boundaries
- only the context necessary for the current task

The guiding principle is:

> Give the agent everything it needs for the current task — no more and no less.

AutoForge 0.7.0 replaces the increasingly monolithic orchestration model of 0.6.x with a smaller, composable system inspired heavily by Piotr Jura's `pm`.

---

# 2. Source Projects

## AutoForge

Repository:

`cojacklabs/autoforge`

Current release:

`0.6.0`

AutoForge currently describes itself as a multi-agent SDLC orchestration framework and contains research, readiness, security, governance, memory, quality gates, work orchestration, audit tooling, and numerous AI-facing artifacts. 

## pm

Upstream inspiration:

`piotrjura/pm`

`pm` defines itself as a control layer between the coding agent and the codebase. Its primary concepts are persistent memory, workflow discipline, decisions, doctrines, scoped work, context injection, and hard edit guardrails. 

Its command implementation is already separated into focused modules such as feature, issue, task, decision, doctrine, hook, cleanup, and lifecycle commands. 

---

# 3. Product Definition

AutoForge 0.7.0 should be defined as:

> **A context and control plane for AI software development that gives each coding agent the knowledge, decisions, design specifications, rules, and permissions required for its current task.**

AutoForge is **not** primarily:

- an autonomous software factory
- a giant prompt library
- a collection of every possible SDLC role
- an AI that reads the entire repository before every task
- a second coding agent

AutoForge manages the environment around the coding agent.

---

# 4. Architectural Model

The architecture should consist of four primary layers.

```text
┌──────────────────────────────────────────────┐
│                 AUTOFORGE                    │
│                                              │
│ Context Resolver                            │
│ Specification Registry                      │
│ Design Context                              │
│ Memory                                      │
│ Build Packets                               │
│ Agent Routing                               │
├──────────────────────────────────────────────┤
│               CONTROL KERNEL                 │
│                                              │
│ Work State                                  │
│ Decisions                                   │
│ Doctrines                                   │
│ Scope                                       │
│ Sessions                                    │
│ Guardrails                                  │
├──────────────────────────────────────────────┤
│               AGENT ADAPTERS                 │
│                                              │
│ Claude Code                                 │
│ Codex                                       │
│ Gemini                                      │
│ Future Agents                               │
├──────────────────────────────────────────────┤
│               HOST PROJECT                   │
└──────────────────────────────────────────────┘
```

---

# 5. Relationship With `pm`

AutoForge should **adopt and extend the strongest architectural concepts from `pm`** rather than run `pm` and AutoForge as two independent control systems.

Do not create:

```text
.pm/
.autoforge/
```

with both systems independently controlling the same agent.

Instead, AutoForge should incorporate or adapt the relevant ideas into its own control plane.

Conceptually:

```text
pm concepts
      │
      ▼
AutoForge kernel
      │
      ├── work state
      ├── decisions
      ├── doctrines
      ├── sessions
      ├── scope
      └── guardrails
```

AutoForge then adds capabilities beyond `pm`:

```text
AutoForge
      │
      ├── context resolver
      ├── specification registry
      ├── component relationships
      ├── screen relationships
      ├── workflows
      ├── design system context
      ├── build packets
      └── multi-agent adapters
```

---

# 6. Licensing Requirement

Before copying implementation code from `pm`:

1. Review its current license.
2. Preserve all legally required attribution.
3. Retain applicable copyright/license notices.
4. Document which AutoForge modules were adapted from upstream.
5. Do not imply that Piotr Jura endorses AutoForge.

Architecture and ideas may be reimplemented independently where doing so results in a cleaner AutoForge architecture.

Prefer understanding and adapting concepts rather than blindly copying files.

---

# 7. Technology Direction

AutoForge 0.7.0 should standardize on:

- Node.js
- TypeScript
- ES Modules
- Zod for runtime schemas
- Vitest for tests
- `tsup` or equivalent lightweight package bundling
- filesystem-based local state initially
- no required external database
- no required cloud service

The CLI should remain installable as:

```bash
npm install --save-dev @cojacklabs/autoforge
```

and executable through:

```bash
npx autoforge
```

Optional future alias:

```bash
af
```

Do not introduce the alias during the initial rewrite unless there is a clear reason.

---

# 8. Proposed Source Structure

Target approximately:

```text
src/
├── cli/
│   ├── index.ts
│   ├── router.ts
│   └── help.ts
│
├── core/
│   ├── project.ts
│   ├── config.ts
│   ├── paths.ts
│   ├── errors.ts
│   └── logger.ts
│
├── state/
│   ├── store.ts
│   ├── schemas.ts
│   ├── work.ts
│   ├── sessions.ts
│   └── migrations.ts
│
├── work/
│   ├── feature.ts
│   ├── issue.ts
│   ├── phase.ts
│   ├── task.ts
│   └── scope.ts
│
├── decisions/
│   ├── store.ts
│   ├── search.ts
│   └── relevance.ts
│
├── doctrine/
│   ├── registry.ts
│   ├── router.ts
│   ├── loader.ts
│   └── session.ts
│
├── context/
│   ├── resolver.ts
│   ├── graph.ts
│   ├── packet.ts
│   ├── ranking.ts
│   └── explain.ts
│
├── specs/
│   ├── registry.ts
│   ├── parser.ts
│   ├── relations.ts
│   └── schemas.ts
│
├── agents/
│   ├── adapter.ts
│   ├── registry.ts
│   ├── claude/
│   ├── codex/
│   └── generic/
│
├── hooks/
│   ├── manager.ts
│   ├── pre-edit.ts
│   ├── post-edit.ts
│   ├── prompt-context.ts
│   └── session-start.ts
│
├── commands/
│   ├── init.ts
│   ├── recap.ts
│   ├── add.ts
│   ├── start.ts
│   ├── done.ts
│   ├── decide.ts
│   ├── why.ts
│   ├── doctrine.ts
│   ├── context.ts
│   ├── check.ts
│   └── doctor.ts
│
└── tui/
```

The precise structure may change during implementation, but module responsibilities must remain separated.

---

# 9. Runtime Project Structure

Initialization should eventually create something similar to:

```text
.autoforge/
├── config.json
│
├── state/
│   ├── work.json
│   ├── decisions.json
│   ├── session.json
│   └── doctrine-session.json
│
├── doctrine/
│
├── memory/
│
├── specs/
│   ├── screens/
│   ├── components/
│   ├── flows/
│   ├── architecture/
│   └── design/
│
├── context/
│   ├── manifests/
│   └── packets/
│
└── adapters/
```

Generated/temporary context packets may be gitignored.

Persistent specifications and decisions should be capable of being committed when appropriate.

---

# 10. Core Domain Model

AutoForge must explicitly model:

## Work

```text
Feature
 └── Phase
      └── Task
```

and:

```text
Issue
```

An issue represents small scoped work.

A feature represents larger structured work.

## Decisions

Each important decision should include:

```text
id
statement
reasoning
consequences
scope
keywords
createdAt
relatedWork
supersedes
status
```

Decisions should be searchable.

Relevant decisions should eventually be automatically surfaced into context.

## Doctrines

Doctrines define **how an agent should behave**.

Examples:

```text
router
planning
decisions
scope
questions
testing
frontend
backend
design
security
database
accessibility
deployment
```

Doctrines must remain small.

Do not recreate `AUTOFORGE.md` as a giant doctrine.

## Specifications

Specifications define **what the system should be**.

Examples:

```text
Screen
Component
Flow
API
Architecture
DesignToken
DomainModel
```

This distinction is fundamental:

```text
Doctrine
= How should I work?

Specification
= What am I building?

Decision
= Why did we choose this?

Work
= What am I doing right now?

Context Packet
= Which subset of all of these do I need?
```

---

# 11. Context Resolver

The Context Resolver is the major new capability of AutoForge 0.7.

Given:

```text
active work
+
user objective
+
repository state
```

it determines the minimum useful context.

Example:

```bash
autoforge context
```

For:

```text
Implement Candidate Dashboard
```

AutoForge might determine:

```text
Work:
TASK-42 Candidate Dashboard

Doctrines:
frontend
design
decisions

Screen:
candidate-dashboard

Components:
sidebar
app-header
job-card
profile-completion

Architecture:
frontend

Decisions:
DEC-14
DEC-27
```

The coding agent should not have to manually discover all of this.

---

# 12. Context Graph

Specifications should eventually form relationships.

Example:

```text
CandidateDashboard
│
├── uses → Sidebar
├── uses → AppHeader
├── uses → JobCard
├── uses → ProfileCompletion
├── follows → CandidateDashboardFlow
├── governed-by → FrontendArchitecture
└── affected-by → DEC-14
```

Do not build a complex graph database for 0.7.0.

Represent relationships using simple structured metadata.

Example:

```yaml
id: screen.candidate-dashboard

uses:
  - component.sidebar
  - component.app-header
  - component.job-card

flows:
  - flow.job-discovery

architecture:
  - architecture.frontend
```

The graph is a **logical abstraction**, not necessarily a graph database.

---

# 13. Build Packets

A Build Packet is the final context product delivered to an agent.

Example:

```text
.autoforge/context/packets/TASK-42.md
```

Packet sections:

```text
# Objective

# Active Work

# Acceptance Criteria

# Applicable Doctrines

# Relevant Decisions

# Relevant Architecture

# Screen Specification

# Component Specifications

# Allowed Files / Scope

# Existing Implementation References

# Validation Requirements
```

Build packets must have a configurable size/token budget.

The packet builder should prioritize:

1. active task
2. acceptance criteria
3. hard constraints
4. relevant decisions
5. directly referenced specifications
6. architecture
7. supporting context

Context should be excluded when it has no meaningful relationship to the task.

---

# 14. Explainability

AutoForge should be able to explain why context was selected.

Example:

```bash
autoforge context --explain
```

Output:

```text
Included component.job-card
Reason:
candidate-dashboard uses job-card

Included DEC-014
Reason:
decision scope includes job-discovery

Excluded security.authentication
Reason:
no relationship with current work
```

This is important because context resolution should not become another invisible AI black box.

---

# 15. Agent Adapter Architecture

Core AutoForge code must not depend directly on Claude Code.

Create an interface similar to:

```ts
interface AgentAdapter {
  id: string;

  detect(): Promise<boolean>;

  install(): Promise<void>;

  injectContext(context: ContextPacket): Promise<void>;

  enforce?(rules: EnforcementRules): Promise<void>;

  healthCheck(): Promise<AgentHealth>;
}
```

Possible adapters:

```text
claude
codex
generic
```

Additional adapters may come later.

Claude Code can support hard hooks.

Codex may use repository instructions and generated context mechanisms appropriate to Codex.

Capabilities may differ between adapters.

Do not fake feature parity.

---

# 16. CLI Philosophy

Keep the CLI small.

Primary commands should converge toward:

```bash
autoforge
autoforge init

autoforge recap

autoforge add
autoforge start
autoforge done

autoforge decide
autoforge why

autoforge doctrine

autoforge context
autoforge context --explain

autoforge check
autoforge doctor
```

Commands should not be duplicated across documentation.

There should eventually be one canonical CLI command reference.

This follows one of `pm`'s strongest design principles: keep command syntax centralized rather than allowing documentation and instructions to drift. 

---

# 17. Development Method

Codex must implement the rewrite **phase by phase**.

Do NOT submit a prompt saying:

> Rewrite AutoForge 0.7.0 according to this document.

Instead:

```text
Master Plan
      ↓
Phase
      ↓
Task
      ↓
Implementation
      ↓
Tests
      ↓
Review
      ↓
Decision Record
      ↓
Next Task
```

Each Codex task must have a constrained file scope.

---

# 18. Phase 0 — Architecture Audit

## Objective

Understand both projects before changing implementation.

## Codex tasks

### 0.1 Inventory AutoForge

Document:

- CLI commands
- scripts
- state files
- memory mechanisms
- governance mechanisms
- prompts
- quality gates
- research features
- current package boundaries

### 0.2 Inventory `pm`

Document:

- storage model
- work model
- decision model
- doctrine system
- session management
- hooks
- scope enforcement
- TUI
- recovery mechanisms

### 0.3 Build migration matrix

Create:

```text
KEEP
REWRITE
ADAPT FROM PM
DEFER
REMOVE
```

Example:

```text
AutoForge autopilot → DEFER
AutoForge giant prompt manifests → REMOVE
AutoForge quality checks → KEEP/REWRITE
pm decisions → ADAPT
pm work state → ADAPT
pm doctrines → ADAPT
AutoForge context resolver → NEW
AutoForge specification graph → NEW
```

## Gate

No production code modifications during Phase 0.

Deliver architecture report first.

---

# 19. Phase 1 — New TypeScript Foundation

## Objective

Create the clean 0.7 architecture without implementing advanced functionality.

Implement:

- TypeScript configuration
- source structure
- build configuration
- CLI router
- filesystem helpers
- config loader
- Zod schemas
- error handling
- test setup

Do not port AutoForge behavior yet.

## Gate

Pass:

```bash
npm test
npm run build
npm run typecheck
```

---

# 20. Phase 2 — Control Kernel

Implement:

- project initialization
- state store
- features
- phases
- tasks
- issues
- active work
- start/done lifecycle
- scope tracking
- session state

Use `pm` as the main architectural reference.

Do not implement context intelligence yet.

## Acceptance criteria

A user can:

```bash
autoforge init
autoforge add
autoforge start
autoforge recap
autoforge done
```

and state survives CLI sessions.

---

# 21. Phase 3 — Decision Memory

Implement:

```bash
autoforge decide
autoforge why
```

Requirements:

- persistent decisions
- rationale
- keywords
- relationships to work
- superseded decisions
- simple relevance search

Do not use embeddings or vector databases in 0.7.

Start deterministic.

## Acceptance test

Record a decision.

Restart the process.

Search using related terminology.

The decision should be recoverable.

---

# 22. Phase 4 — Doctrine System

Adapt `pm`'s small-doctrine philosophy.

Implement:

```bash
autoforge doctrine
autoforge doctrine <name>
```

Create initial doctrines:

```text
router
planning
decisions
scope
questions
testing
frontend
backend
design
security
```

The router tells agents which doctrines to load.

Avoid large doctrine files.

## Gate

No doctrine should become a general project encyclopedia.

---

# 23. Phase 5 — Agent Adapter Layer

Implement:

```text
AgentAdapter
AgentRegistry
GenericAdapter
ClaudeAdapter
CodexAdapter
```

Initially adapters only need:

- detection
- setup
- context delivery
- health status

Advanced enforcement can follow.

Core business logic must never import a concrete agent adapter directly.

Use dependency inversion.

---

# 24. Phase 6 — Specification Registry

Implement structured specification storage.

Supported initial types:

```text
architecture
screen
component
flow
design
```

Each spec requires:

```text
id
type
name
description
relationships
tags
source
updatedAt
```

Implement:

```text
register
read
list
find relationships
```

Specifications may use Markdown with YAML front matter.

Example:

```yaml
---
id: component.job-card
type: component
uses:
  - token.spacing.md
  - token.typography.body
---
```

followed by human-readable Markdown.

This allows both machines and humans to understand the same artifact.

---

# 25. Phase 7 — Context Resolver

Implement the first deterministic context resolver.

Inputs:

```text
active work
task description
spec relationships
decisions
doctrine router
configured context budget
```

Output:

```text
ContextSelection
```

Example schema:

```ts
interface ContextSelection {
  work: WorkItem;
  doctrines: DoctrineRef[];
  decisions: DecisionRef[];
  specs: SpecRef[];
  exclusions: ContextExclusion[];
}
```

The resolver must preserve reasons for inclusion.

---

# 26. Phase 8 — Build Packet Compiler

Implement:

```bash
autoforge context
```

and:

```bash
autoforge context --explain
```

Generate an AI-friendly packet.

The packet must be:

- deterministic where practical
- ordered
- concise
- scoped
- human-readable
- agent-readable
- reproducible

Do not simply concatenate every referenced file.

Summarization/compaction mechanisms may be introduced later.

---

# 27. Phase 9 — Guardrails and Enforcement

Implement or adapt:

- no-edit-without-active-work
- scope boundaries
- doctrine requirements
- session recovery
- context refresh
- agent-specific enforcement

Hard blocking should only occur where the adapter supports it safely.

Claude Code hooks can provide stronger enforcement.

Other adapters may initially provide advisory enforcement.

---

# 28. Phase 10 — Existing AutoForge Capability Migration

Only after the kernel works should AutoForge 0.6 features be evaluated.

For every feature ask:

> Does this capability strengthen AutoForge's purpose as a context/control plane?

Possible candidates:

### Keep

- quality gates
- project health checks
- structured memory
- useful security checks
- workspace boundaries

### Rewrite

- current memory loading
- agent manifests
- prompt architecture
- orchestration flow

### Defer

- SOC 2 evidence generation
- large autonomous autopilot
- adaptive multi-agent orchestration
- model training telemetry
- advanced compliance functionality

### Remove

- redundant prompt systems
- duplicated command documentation
- mechanisms requiring agents to ingest large amounts of irrelevant context

Do not migrate code solely because it already exists.

---

# 29. Phase 11 — Design Context

After the context system works generically, introduce design specifications.

Support:

```text
screens
components
design tokens
flows
states
responsive behavior
```

This should enable:

```text
Figma
  ↓
Design Exporter
  ↓
AutoForge Specs
  ↓
Context Resolver
  ↓
Build Packet
  ↓
Coding Agent
```

Figma API/plugin integration is **not required for the initial 0.7 kernel**.

Manual/generated design specs can validate the architecture first.

---

# 30. Phase 12 — TUI

Do not build the TUI first.

The CLI/domain architecture must work independently.

Once the kernel is stable, build the human interface over it.

Potential views:

```text
Dashboard
Active Work
Features
Issues
Tasks
Decisions
Context
Specifications
Doctrines
Agents
Health
```

The TUI should call the same application services used by the CLI.

Never place domain logic directly inside UI components.

---

# 31. Phase 13 — Migration From 0.6

Implement migration awareness.

`autoforge init` or:

```bash
autoforge migrate
```

should detect older AutoForge installations.

Do not silently destroy old data.

Recommended behavior:

1. detect version
2. inspect legacy content
3. back up legacy `.autoforge`
4. migrate supported artifacts
5. report skipped artifacts
6. validate result

Because the architecture changes significantly, not every 0.6 artifact needs automatic migration.

---

# 32. Phase 14 — Dogfood AutoForge on AutoForge

Before using Virdua as the main test project, AutoForge should manage its own development.

Example:

```text
AutoForge task
      ↓
AutoForge context resolver
      ↓
Codex
      ↓
AutoForge implementation
```

This gives us immediate feedback about:

- context size
- missing decisions
- bad relationships
- doctrine usefulness
- scope rules
- agent ergonomics

AutoForge must successfully orchestrate development of AutoForge itself.

---

# 33. Phase 15 — Virdua Dogfood

Once AutoForge can manage itself reliably:

```text
Virdua Figma Design
       ↓
AutoForge Specs
       ↓
Virdua Task
       ↓
Context Resolver
       ↓
Build Packet
       ↓
Codex
       ↓
Implementation
```

Use one real Virdua screen as the first complete design-to-code validation.

Measure:

- required manual context
- number of agent corrections
- component fidelity
- design fidelity
- context size
- repeated explanations
- token consumption
- implementation rework

This should become the primary validation test for the new AutoForge philosophy.

---

# 34. Required Codex Workflow

For every implementation task Codex must:

## Before coding

1. Read the current development-plan section only.
2. Inspect relevant existing source.
3. Search existing decisions.
4. Identify affected files.
5. State implementation approach.
6. Confirm scope fits the task.

## During coding

1. Modify only relevant files.
2. Do not perform unrelated refactors.
3. Reuse existing abstractions.
4. Record architectural decisions.
5. Add/update tests with behavior.

## After coding

1. Run targeted tests.
2. Run typecheck.
3. Run lint where applicable.
4. Summarize changed files.
5. State acceptance criteria results.
6. Record new architectural decisions.
7. Stop.

Codex should **not automatically begin the next phase**.

---

# 35. Task Sizing Rule

A Codex implementation task should usually modify:

```text
1–5 closely related files
```

Larger changes must be broken into multiple tasks.

Example:

Do not:

```text
Build the entire context resolver.
```

Instead:

```text
TASK 7.1
Define context-selection domain types.

TASK 7.2
Implement spec relationship traversal.

TASK 7.3
Implement decision relevance ranking.

TASK 7.4
Implement doctrine selection.

TASK 7.5
Compose ContextResolver.

TASK 7.6
Implement resolver explanation output.
```

---

# 36. Testing Strategy

Use three levels.

## Unit

Test:

- state
- schemas
- decision matching
- doctrine routing
- relationship traversal
- context ranking

## Integration

Test commands against temporary repositories.

Example:

```text
init
→ add work
→ start
→ decide
→ context
→ done
```

## Golden Context Tests

Given a fixed project fixture:

```text
Task: Candidate Dashboard
```

the resolver should select an expected context set.

These tests are extremely important.

Example:

```text
EXPECTED:

screen.dashboard
component.sidebar
component.job-card
decision.014
doctrine.frontend
doctrine.design
```

and explicitly ensure unrelated specs are excluded.

---

# 37. Performance Requirement

The context system exists to reduce AI consumption.

Therefore AutoForge should track:

```text
available sources
selected sources
excluded sources
estimated characters/tokens
context reduction %
```

Example:

```text
Repository knowledge:
184,000 estimated tokens

Selected context:
11,400 estimated tokens

Reduction:
93.8%
```

This becomes one of AutoForge's most meaningful metrics.

---

# 38. 0.7.0 Release Criteria

AutoForge 0.7.0 is ready when:

- TypeScript architecture is stable
- CLI builds successfully
- work state persists
- decisions persist
- `why` works
- doctrines work
- agent adapter interface works
- Codex adapter works
- Claude adapter works at basic level
- specifications can be registered
- relationships can be resolved
- context packets can be generated
- context selection can be explained
- scope control works
- legacy migration is documented
- tests pass
- documentation represents the new architecture
- AutoForge can dogfood itself
- at least one Virdua feature can be implemented using a generated AutoForge context packet

---

# 39. Explicit Non-Goals for 0.7.0

Do not allow the rewrite to expand endlessly.

Not required:

- vector database
- hosted AutoForge service
- SaaS account
- cloud synchronization
- autonomous swarm execution
- automatic pull request management
- automatic deployment
- full Figma plugin
- dozens of agent personas
- AI model training
- enterprise compliance platform
- graph database
- perfect support for every coding agent

Those can be revisited after the core architecture proves itself.

---

# 40. First Codex Assignment

Do **not** begin by writing the new application.

The first Codex assignment should be:

> Perform Phase 0 of the AutoForge 0.7.0 rewrite. Compare the current `cojacklabs/autoforge` repository with `piotrjura/pm`. Produce an architecture audit and migration matrix categorizing existing AutoForge capabilities as KEEP, REWRITE, ADAPT FROM PM, DEFER, or REMOVE. Do not modify production source code. Identify the minimum architecture needed for Phase 1 and document any licensing/attribution requirements related to incorporating `pm`. Stop after delivering the audit.

Only after reviewing that result should Phase 1 begin.

---

# 41. Guiding Principle

Whenever implementation complexity starts growing, return to this question:

> Does this help AutoForge give the coding agent better task-specific context or better task-specific control?

If not, it probably does not belong in the 0.7.0 core.