# AutoForge 0.7.0 Phase 5 Decisions

## D-5.1 — Make adapter capabilities and outcomes explicit

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 5, Task 5.1

### Decision

Define one transport-neutral `AgentAdapter` contract with stable identity, display name, explicit setup, context-delivery, and enforcement capabilities, plus asynchronous detection, setup, context delivery, and health operations.

Validate adapter definitions and every operation result with strict runtime schemas. Detection requires evidence, manual setup requires actionable instructions, unsupported delivery requires an explanation, delivered context requires a real delivery mode, and aggregate health must agree with its individual checks.

Context delivery accepts a small generic payload containing identity, content, format, and an optional token estimate. It does not depend on the future build-packet implementation.

### Rationale

- Core application services need one dependency-inverted boundary for all agents.
- Explicit capabilities prevent adapters from claiming unsupported setup, delivery, or enforcement parity.
- Validated outcomes make adapter health and failures safe to expose through CLI and doctor.
- A transport-neutral payload allows Phase 5 delivery work without prematurely defining Phase 8 packet internals.
- Concrete adapters can translate the same payload into their supported mechanisms.

### Consequences

- Concrete adapters must validate or construct results that satisfy these contracts.
- Registries may depend on `AgentAdapter`, but core domain modules must not import concrete agents.
- Enforcement remains descriptive until a safe adapter-specific implementation exists.
- Context packet compilation and token budgeting remain later-phase responsibilities.

## D-5.2 — Resolve adapters deterministically through an immutable registry

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 5, Task 5.2

### Decision

Store validated adapters in an immutable `AgentRegistry` with unique stable IDs and deterministic ID ordering. Allow callers to filter by exact setup mode, required context-delivery mode, and minimum enforcement strength.

Automatic resolution considers only detected adapters that satisfy every requested capability, prefers high-confidence detection, and breaks ties by stable adapter ID. An explicitly preferred adapter never silently falls back: unknown, undetected, or capability-incompatible preferences return a structured not-found error.

### Rationale

- Immutable registration prevents runtime replacement from changing adapter behavior unexpectedly.
- Capability filtering lets application services request what they actually need without importing concrete adapters.
- Stable confidence ordering makes default selection reproducible.
- Refusing fallback for explicit preferences prevents AutoForge from delivering context through an unintended agent.
- Validating detection results at the registry boundary protects callers from dishonest adapter implementations.

### Consequences

- Composition roots must construct the complete adapter set explicitly.
- Automatic selection is deterministic and does not use environment-specific hidden priority.
- A configured default agent can map directly to explicit preferred resolution in a later task.
- Registry health aggregation and concrete adapters remain separate tasks.

## D-5.3 — Use generic file delivery as the honest fallback

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 5, Task 5.3

### Decision

Implement a Generic Agent Adapter that detects any initialized AutoForge project at low confidence, requires no agent-specific setup, delivers context only through repository-contained files, and claims no enforcement capability.

Write payloads atomically beneath `.autoforge/context/agents/generic/` using deterministic bounded filenames derived from payload identity. Generic health requires both the project root and AutoForge configuration to exist. Uninitialized projects are unavailable rather than falsely detected.

### Rationale

- Every initialized project needs a portable fallback that does not depend on a specific coding agent.
- Low-confidence detection allows concrete adapters with stronger evidence to win automatic resolution.
- File delivery is inspectable, reproducible, and compatible with agents AutoForge does not understand yet.
- Claiming no enforcement avoids pretending a passive file can provide hard guardrails.
- Atomic replacement prevents agents from observing partially written context.

### Consequences

- Generic delivery creates generated artifacts under the configured context area.
- Consumers must explicitly read the delivered file; injection is not implied.
- Concrete Codex and Claude adapters may use richer delivery and setup mechanisms.
- Packet lifecycle cleanup remains a later context-management responsibility.

## D-5.4 — Deliver Codex context through a bounded AGENTS.md integration

**Status:** Accepted  
**Date:** 2026-08-19  
**Scope:** Phase 5, Task 5.4

### Decision

Implement a Codex adapter that installs one bounded managed block in the repository-root `AGENTS.md`, preserving all project-authored content outside the block. The block directs Codex to the current atomic context artifact at `.autoforge/context/agents/codex/current.md`.

Treat a valid managed block as high-confidence detection and project `.codex/config.toml` as low-confidence detection. Deliver context through the `repository-instructions` mode, report setup and context health separately, reject incomplete managed markers, and claim advisory rather than hard enforcement.

This design follows the official Codex instruction model: Codex discovers `AGENTS.md` from the project root toward the working directory, later guidance has higher precedence, and instructions are loaded when a run starts. See [OpenAI's AGENTS.md documentation](https://developers.openai.com/codex/guides/agents-md).

### Rationale

- A small stable root instruction avoids repeatedly embedding potentially large packets in `AGENTS.md`.
- Preserving content outside explicit markers prevents AutoForge from owning or overwriting project guidance.
- Atomic context replacement gives each new Codex run one inspectable current artifact.
- High-confidence managed-block detection lets Codex win over the generic fallback after setup.
- Advisory capability accurately reflects instructions that Codex follows but AutoForge cannot hard-enforce.

### Consequences

- Context changes are observed by newly started Codex runs; already-running sessions may require refresh or restart.
- Nested project instructions can override root guidance according to Codex precedence.
- Projects with incomplete AutoForge markers require repair before setup can continue.
- Codex CLI execution, authentication, and model configuration remain outside this adapter's initial scope.

## D-5.4A — Compile one canonical context artifact for every adapter

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 5, Tasks 5.3–5.4 refactor

### Decision

All adapters deliver the same canonical generated artifact at `.autoforge/context/current.md`. Agent-native files such as `AGENTS.md`, `CLAUDE.md`, or future model-specific instruction files contain only bounded pointers to that shared artifact.

Centralize payload validation, initialized-project validation, newline normalization, containment, and atomic replacement in one context writer. Generic delivery returns the canonical file directly. Codex setup points its managed `AGENTS.md` block to the canonical file and Codex delivery replaces that same file.

This decision supersedes only the adapter-specific artifact paths established by D-5.3 and D-5.4. Their detection, setup, health, and capability decisions remain accepted.

### Rationale

- One compiled artifact prevents duplicated agent context from drifting.
- Adapter shims remain small and native to each agent's discovery mechanism.
- Switching agents does not require recompiling or copying equivalent context.
- Centralized validation and atomic writes give every adapter identical durability behavior.
- Persistent work, decisions, doctrines, and future specifications remain source state; `current.md` is only the task-relevant compiled view.

### Consequences

- The most recent successful delivery becomes the shared current context for all configured agents.
- Adapter-specific history and copies are intentionally not maintained.
- Future Claude, Gemini, Grok, and Cursor adapters must point to the canonical artifact.
- Build-packet history and cleanup remain Phase 8 responsibilities.

## D-5.5 — Deliver Claude context through a bounded CLAUDE.md integration

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 5, Task 5.5

### Decision

Implement a Claude Code adapter that preserves project-authored `CLAUDE.md` content and installs one bounded managed block pointing to `.autoforge/context/current.md`. Treat a valid managed block as high-confidence detection and existing project `CLAUDE.md` or `.claude/settings.json` configuration as low-confidence detection.

Use the shared canonical writer for delivery, report instruction and context health separately, reject malformed managed markers, and claim advisory enforcement. Do not install hooks in the initial adapter.

This follows Claude Code's documented separation: `CLAUDE.md` supplies persistent project context, while hooks provide deterministic lifecycle control. See [Claude Code project memory](https://code.claude.com/docs/en/memory) and [Claude Code hooks](https://code.claude.com/docs/en/hooks-guide).

### Rationale

- A native `CLAUDE.md` shim makes the canonical context discoverable without duplicating it.
- Shared managed-block utilities keep preservation, repair detection, and atomic writes consistent with Codex.
- Existing Claude configuration is useful detection evidence without implying AutoForge setup is complete.
- Advisory capability accurately describes project instructions without installed hooks.
- Deferring hooks avoids unsafe configuration merging before concrete enforcement rules exist.

### Consequences

- New Claude Code sessions can discover the latest shared context through project instructions.
- Already-running sessions may require context refresh or restart after the canonical file changes.
- Future hook enforcement must merge `.claude/settings.json` safely and report managed-policy limitations.
- Gemini, Grok, and Cursor adapters must reuse the same canonical artifact and managed-instruction utilities.

## D-5.6 — Support Gemini CLI and Antigravity through native workspace instructions

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 5, Task 5.6

### Decision

Implement one Gemini adapter that configures both Google development surfaces without duplicating AutoForge context. Install a bounded `GEMINI.md` block that imports `.autoforge/context/current.md` for Gemini CLI, and a bounded `.agents/rules/autoforge.md` workspace rule that directs Antigravity to the same canonical artifact.

Treat both managed shims together as high-confidence detection. Treat an existing native instruction file, a partial managed setup, or project `.gemini/settings.json` as low-confidence detection. Validate every managed block before writing either shim, report each native surface separately in health checks, and claim advisory enforcement.

This follows Gemini CLI's documented repository context and import mechanisms in [`GEMINI.md`](https://geminicli.com/docs/cli/gemini-md/) and Antigravity's documented workspace rules under `.agents/rules/` in [Google's Antigravity IDE codelab](https://codelabs.developers.google.com/getting-started-agy-ide#8).

### Rationale

- Gemini CLI and Antigravity expose different native project-instruction locations.
- Two small shims preserve native discovery while keeping all generated context centralized.
- Gemini CLI's `@` import loads the canonical artifact directly instead of relying on prose alone.
- Pre-validating both blocks prevents a malformed second surface from causing partial setup.
- Advisory capability avoids overstating what instruction files can enforce.

### Consequences

- Setup may create both `GEMINI.md` and `.agents/rules/autoforge.md` even when only one Google client is currently used.
- Project-authored content outside AutoForge's bounded blocks remains untouched.
- New sessions discover the latest canonical context; active sessions may require reload or restart.
- The adapter does not modify global Gemini or Antigravity configuration.

## D-5.7 — Deliver Grok Build context through its AGENTS.md compatibility

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 5, Task 5.7

### Decision

Implement a Grok Build adapter that installs a Grok-owned bounded block in repository-root `AGENTS.md`, preserving project-authored guidance and blocks owned by other adapters. The block points Grok Build to the shared `.autoforge/context/current.md` artifact.

Treat a valid Grok managed block as high-confidence detection and an existing project `AGENTS.md` or `.grok/config.toml` as low-confidence detection. Use the shared canonical writer for delivery, reject malformed Grok markers, report instruction and context health separately, and claim advisory enforcement.

This follows Grok Build's documented support for the `AGENTS.md` instruction-file family and its project-scoped `.grok/config.toml`. See [xAI's skills and compatibility documentation](https://docs.x.ai/build/features/skills-plugins-marketplaces) and [Grok Build settings](https://docs.x.ai/build/settings).

### Rationale

- `AGENTS.md` is Grok Build's documented repository instruction surface and requires no plugin or hook installation.
- A Grok-owned block gives detection and repair semantics without taking ownership of Codex or team guidance.
- Repeating only a small pointer is preferable to duplicating the generated context payload.
- Existing `.grok/config.toml` is useful evidence without implying AutoForge setup is complete.
- Advisory capability accurately reflects instruction discovery without deterministic hooks.

### Consequences

- Repositories configured for both Codex and Grok contain two small managed `AGENTS.md` blocks pointing to one canonical artifact.
- AutoForge preserves all content outside its Grok-specific markers.
- New Grok Build sessions discover the current artifact; active sessions may require restart.
- Hooks, plugins, permissions, authentication, and model selection remain outside this adapter's initial scope.

## D-5.8 — Deliver Cursor context through an always-applied project rule

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 5, Task 5.8

### Decision

Implement a Cursor adapter that manages `.cursor/rules/autoforge-context.mdc` as an always-applied project rule. The rule references `.autoforge/context/current.md` rather than copying generated context into Cursor configuration.

Treat a valid managed block with `alwaysApply: true` frontmatter as high-confidence detection and an existing `.cursor/rules` directory or `.cursor/mcp.json` as low-confidence detection. Preserve valid content outside AutoForge's bounded block, reject an existing dedicated rule without always-applied frontmatter, report rule and context health separately, and claim advisory enforcement.

This follows Cursor's documented `.cursor/rules/*.mdc` format, always-applied rule type, and file references. See [Cursor's rules documentation](https://cursor.com/docs/rules).

### Rationale

- A dedicated `.mdc` rule provides Cursor-native activation and adapter-specific detection.
- `alwaysApply: true` makes the small pointer available consistently across Cursor Agent sessions.
- Referencing the canonical artifact maintains one generated source of current context.
- Refusing an invalid collision avoids silently creating a rule Cursor may ignore.
- Advisory capability avoids treating prompt-level rules as deterministic enforcement.

### Consequences

- Cursor setup creates one version-controlled project rule under `.cursor/rules`.
- Project-authored content in a valid pre-existing dedicated rule remains intact.
- A conflicting file without valid always-applied frontmatter requires manual repair or relocation.
- Cursor team rules, user rules, hooks, MCP configuration, and account setup remain outside this adapter's initial scope.
