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
