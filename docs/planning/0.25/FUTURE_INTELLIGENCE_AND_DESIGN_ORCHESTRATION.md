# Future Intelligence and Design Orchestration

## Status

Backburner architecture concept. This document preserves long-term product
direction discovered during the v0.25 release checkpoint. It is not a v0.25
release requirement, a committed version plan, or a required implementation
sequence.

The capabilities below may be explored independently and reordered as product
evidence, platform constraints, and customer needs become clearer. AutoForge's
normal strategy, evidence, and approval processes determine whether and when an
idea becomes committed work.

## Purpose

AutoForge should eventually help people turn informal, incomplete, and jumbled
requests into reliable project intelligence that coding, research, design, and
architecture agents can execute. Lightweight AI models may assist with this
translation, but they must not become owners of canonical project truth.

The proposed capability has two closely related responsibilities:

1. An optional **Intent Compiler** translates general prompts into validated,
   provider-neutral AutoForge contracts.
2. A **Design Orchestrator** translates approved product intent into portable
   design contracts that specialized agents and design platforms can follow.

## Architectural Boundary

```text
Unstructured human request
        |
        v
Optional intelligence pipeline
rules -> micro model -> mini model -> escalation when necessary
        |
        v
Schema validation, uncertainty checks, and user approval
        |
        v
Canonical AutoForge contracts
intent | work | memory proposals | research | design | evidence
        |
        v
Specialized agents and platform adapters
```

AutoForge Core owns schemas, validation, governance, project state, work,
decisions, evidence, and memory-promotion rules. Model selection, provider
calls, conversational clarification, streaming, and model-driven synthesis
belong in AutoForge Agent or the hosted AutoForge Service.

Local Core operation must remain deterministic and usable without an account,
provider credential, or network connection.

## Intent Compiler

The Intent Compiler is an optional compiler, organizer, recommender, and router.
It does not directly mutate durable project state or make irreversible product
decisions.

Potential responsibilities include:

- classify likely work kinds and affected product domains;
- extract objectives, users, requirements, constraints, assumptions, risks,
  unknowns, and acceptance criteria;
- identify clarification questions before implementation begins;
- propose features, tasks, issues, dependencies, and validation requirements;
- identify candidate personal, project, or team memories;
- formulate research questions and required source types;
- prepare portable product, architecture, and design briefs;
- recommend the appropriate agent, model tier, tool, or workflow;
- explain confidence and reasons for escalation.

Every model-produced artifact must carry a contract version, model/provider
provenance, confidence explanation, and source-request reference. Output must
pass strict schema validation before AutoForge presents it for approval or
stores it as canonical state.

## Model Escalation Ladder

AutoForge should use the least expensive and least powerful mechanism that can
reliably perform the requested operation.

### Tier 0: Deterministic processing

Use ordinary code for known vocabulary, command detection, project lookup,
schema validation, deduplication, scope enforcement, and simple filters.

### Tier 1: Micro model

Use a small model for classification, entity extraction, idea grouping,
missing-information detection, memory proposals, and workflow routing.

### Tier 2: Mini model

Use a stronger lightweight model for feature decomposition, acceptance
criteria, research planning, architectural summarization, design briefs, and
task-relationship proposals.

### Tier 3: Frontier model or human review

Escalate material architecture, security, ambiguous strategy, cross-system
migration, complex UX, conflicting evidence, and irreversible actions.

Model tiers are capability classes rather than hard-coded providers. Routing
must account for privacy, cost, latency, context capacity, structured-output
reliability, and user or organization policy.

## Candidate Structured Intent

A future versioned intent contract may include:

- objective and desired outcome;
- personas and affected stakeholders;
- work kinds and product domains;
- requirements, constraints, assumptions, and unknowns;
- acceptance and validation criteria;
- research questions and evidence requirements;
- design requirements and existing design-system references;
- proposed work and dependency relationships;
- memory candidates and recommended visibility;
- recommended capabilities, agents, and tools;
- risks, confidence, clarification questions, and provenance.

The original request may be retained only according to an explicit privacy and
retention policy. The compiled contract, not an unrestricted transcript, is the
preferred durable artifact.

## Memory Organization

The intelligence pipeline may propose that information belongs to one of four
memory scopes:

- session memory, which is temporary;
- project memory, which is durable project truth;
- personal memory, which follows one user across projects;
- team memory, which is reviewed and shared with authorized collaborators.

Promotion should follow an explicit lifecycle:

```text
discovered -> proposed -> deduplicated -> reviewed -> promoted -> superseded
```

Models may recommend promotion, consolidation, or supersession. They must not
silently place generated claims into personal, project, or team memory.

## Prioritization and Research

Lightweight models may extract strategic signals such as alignment, user value,
risk, complexity, dependencies, evidence strength, and release pressure. These
signals feed AutoForge's explainable strategy process; the model does not
replace the human `now`, `next`, `later`, or `backlog` decision.

Research assistance should separate question formation, retrieval, provenance,
synthesis, and decision-making. Durable findings require source identity,
capture time, confidence, relevant work, disagreements, and unresolved
questions. A model-generated summary without inspectable evidence is not an
approved research result.

## Portable Design Contract

AutoForge should not reproduce Figma, TypeUI, Stitch, or another design canvas.
It should define a vendor-neutral Design Contract that specialized platforms
and agents can consume.

The contract may include:

- product objective, target users, and desired experience;
- brand personality and visual direction;
- information architecture and user journeys;
- required screens, breakpoints, and interaction states;
- components, variants, design tokens, and production-code mappings;
- typography, color, spacing, elevation, motion, and responsive behavior;
- accessibility, content, localization, and platform requirements;
- empty, loading, error, success, permission, and offline states;
- existing design-system and implementation references;
- review criteria, implementation handoff, and drift-validation requirements.

Adapters translate this contract into each platform's supported operations. As
of this concept's capture, Figma exposes design context and canvas operations
through MCP, TypeUI distributes agent-oriented design-system instructions and
MCP workflows, and Google Labs Stitch supports an AI-native design canvas,
portable `DESIGN.md` guidance, MCP, and SDK integration. These external
capabilities are informative examples, not permanent dependencies.

## Strategic Design Workflow

Future design-oriented AutoForge workflows should generally preserve this
shape while allowing projects to customize individual stages:

1. Understand the product objective, users, constraints, and desired outcome.
2. Inspect existing code, brand assets, design systems, and prior decisions.
3. Ask unresolved product and UX questions.
4. Compile and approve the portable Design Contract.
5. Select appropriate design agents, platforms, and adapters.
6. Generate multiple meaningfully different directions where exploration is
   useful.
7. Let the user select, combine, or reject directions.
8. Complete required flows, screens, breakpoints, interactions, and states.
9. Validate accessibility, consistency, usability, and contract coverage.
10. Link design components and tokens to production equivalents.
11. Produce a structured implementation handoff.
12. Compare the implementation with the approved design contract and record
    drift or accepted deviations.

## Safety and Quality Rules

- Generated structure is a proposal until validated and approved.
- Confidence must be explained rather than represented as false precision.
- Low-confidence or high-risk work must escalate.
- Provider-specific response formats must not leak into Core contracts.
- Model output must never bypass project scope, governance, or quality gates.
- Design generation must cover flows and states, not only attractive screens.
- Accessibility and responsive behavior are contract requirements, not optional
  polish.
- Research claims require provenance and inspectable evidence.
- Personal and team memories require explicit visibility and promotion rules.
- Model calls must respect organization privacy, retention, cost, and provider
  policies.

## Open Questions

- Which intent fields are universal enough to enter the public Protocol?
- Should compilation be synchronous for small prompts and a durable run for
  larger requests?
- How should local and hosted model routing policies be represented?
- Which objective checks can measure structured-output and design-contract
  quality without rewarding superficial completeness?
- How should memory proposals detect contradictions and superseded guidance?
- What permissions are required before an agent can read or promote team
  memory?
- Which design-platform capabilities belong in common adapter interfaces, and
  which must remain vendor-specific extensions?
- How should design-to-code and code-to-design drift be measured?

## External References at Time of Capture

- [Figma MCP server documentation](https://developers.figma.com/docs/figma-mcp-server/)
- [Figma AI](https://www.figma.com/ai/)
- [TypeUI getting started](https://www.typeui.sh/docs/getting-started)
- [Google Labs: Stitch AI-native UI design](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/)

External product capabilities will change. Future implementation planning must
revalidate these references and target stable contracts rather than captured
product details.
