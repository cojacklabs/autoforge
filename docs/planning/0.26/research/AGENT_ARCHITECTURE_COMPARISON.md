# Coding-Agent Architecture Comparison and AutoForge Gap Analysis

Status: Research synthesis
Established: 2026-08-30
Sources: `docs/planning/0.26/research/{claude-code,codex,gemini-cli,antigravity-cli,grok-build}-architecture-notes.md`,
derived from Repomix dumps of the five repos under `~/Code/Resources/GitHub/AI/`.

## Purpose and boundary

This document is research, not a design decision. It exists to inform two
separate, deliberately distinct threads:

1. **AutoForge's own framework work** — where a pattern below is genuinely
   about orchestration, governance, context resolution, or agent
   interoperability (AutoForge's actual job), it may inform a v0.26 issue.
2. **A future, separate CoJack Labs AI coding agent** — where a pattern is
   about how an agent itself plans, calls tools, samples a model, or
   sandboxes execution, it belongs to that separate initiative, never to
   AutoForge's own codebase. Per the reconciled framework roadmap
   (`docs/planning/0.26/AUTOFORGE_FRAMEWORK_ROADMAP.md`) and the north-star
   rule "AutoForge is not an AI agent and should not evolve into one," none
   of this document licenses AutoForge itself to grow an agent loop, sampler,
   or sandbox.

Every repo studied here is a **public wrapper repo, not the full proprietary
agent implementation** — Claude Code and Antigravity CLI ship literally zero
implementation source (only docs/plugins/changelog); Codex, Gemini CLI, and
Grok Build ship substantial real source but are still missing key pieces
(model-serving backend, in most cases). Treat every claim below as bounded by
what its source note explicitly cites — the per-repo notes each have a "What's
NOT in This Repo" section documenting exactly what was and wasn't verified.

---

## 1. Agent loop / core execution model

| Repo            | What's actually verifiable                                                                                                                                                                                                                 | Notable pattern                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | Nothing — no source at all                                                                                                                                                                                                                 | —                                                                                                                                                               |
| Codex           | `run_turn` in `codex-rs/core/src/session/turn.rs`: loop drains queued input, runs hooks, builds a `StepContext`, samples, handles streamed response; terminates on plain assistant message, hook signal, or error                          | Turn/Task separation — a "Task" wraps multiple turns for higher-level flows (regular, compact, review, user_shell)                                              |
| Gemini CLI      | Event-driven: `GeminiEventType` enum (`Content`, `ToolCallRequest`, `LoopDetected`, `ChatCompressed`, `MaxSessionTurns`, ...) drives a scheduler-based tool-call state machine (`Scheduled → Validating → Executing → Successful/Errored`) | Explicit classification of stream failure modes (`MALFORMED_FUNCTION_CALL`, `SAFETY_BLOCKED`, `THINKING_ONLY_RESPONSE`, ...) rather than one generic error path |
| Antigravity CLI | Inferred only from changelog: "single execution path" unification in 1.1.17 implies interactive/headless/subagent paths were originally divergent                                                                                          | Explicit reasoning-"effort" as an axis orthogonal to model choice                                                                                               |
| Grok Build      | `Agent` struct in `xai-grok-agent/src/agent.rs` is "effectively immutable after construction"; turn/session lifecycle lives in a separate `xai-agent-lifecycle` crate with a contributor/pipeline pattern (not read in depth)              | `should_auto_compact` is a pure predicate on token-count vs. context-window threshold, unit-tested at the boundary                                              |

**Cross-cutting takeaway:** every agent studied treats "the loop" as a
composition of smaller named stages (turn/step/task in Codex; scheduler states
in Gemini; contributor pipeline in Grok), not a single monolithic while-loop.
All have an explicit, named stop-condition taxonomy (not just "no more tool
calls") — loop detection, max-turns, safety-block, and user-cancel are each
distinct, observable outcomes, not folded into a generic "done" flag.

**Loop-safety-valve pattern worth flagging for a future agent build:** Grok
Build's `TodoGate` (forces continuation if todos are pending, but ships
disabled by default and capped at `max_fires_per_prompt`) and Antigravity's
"forced-continuation deadlock" bug (coordinator injecting empty "continue"
steps up to an invocation limit) are two independent discoveries of the same
problem: naive "keep going until done" logic needs an explicit, small,
engineered ceiling or it becomes a cost/availability risk. Any future agent
build should treat this as known prior art, not something to rediscover via a
production incident.

---

## 2. Tool / extension system

| Repo            | Tool model                                                                                                                                                                           | Extension packaging                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | Not defined in this repo (only referenced by name)                                                                                                                                   | Plugin = `.claude-plugin/plugin.json` manifest + `commands/`/`agents/`/`hooks/` dirs; **11 real first-party plugins ship in-repo** as working examples          |
| Codex           | `ToolRouter` + `ToolRegistry`; tool availability **recomputed per turn**, not fixed at session start; tool names carry an explicit namespace (`"collaboration"` for sub-agent tools) | Full plugin marketplace with install/search/**share** (ACL'd roles) — closer to an app store than a config toggle                                               |
| Gemini CLI      | Tools organized by concern (`read-file`, `edit`, `shell` + `shellBackgroundTools` for background processes, `ask-user`, `enter-plan-mode`/`exit-plan-mode`)                          | "Extensions" bundle prompts+MCP+commands+themes+hooks+subagents+skills as one unit; **explicit re-consent required** when an extension update adds hooks/skills |
| Antigravity CLI | Named tools only (`manage_task`, `invoke_subagent`, `schedule`, embedded content-hash-verified `ripgrep`)                                                                            | Plugin manifest declares skills/rules/hooks/MCP; central `config.json` enablement so a plugin can't silently flip its own default-disabled state                |
| Grok Build      | `ToolBridge`/`ToolRegistry` referenced everywhere but **never located in source** (biggest confirmed gap in that report)                                                             | Plugin = skills+agents+MCP+hooks bundle; **project-scope plugins require explicit trust grant** (CLI/user-scope plugins auto-trusted)                           |

**MCP is universal.** All five either document or implement MCP client
support as a first-class extension mechanism — this is now table stakes, not
a differentiator. Two systems (Codex, Grok Build) go further and let the
_agent itself_ run _as_ an MCP server/host, treating the agent as a
composable node in a larger tool graph rather than only a consumer.

**Skills are converging as a named concept distinct from tools/plugins.**
Claude Code, Codex, and Gemini CLI each independently ship a `SKILL.md`-based
convention (structured `references/`, `examples/`, `scripts/` subdirectories)
as something between a tool and a prompt template. This is directly relevant
to AutoForge's own doctrine/skill routing (`src/doctrine/`) — worth confirming
AutoForge's doctrine format doesn't need to interop with or learn from this
convention, since it's becoming a de facto standard across the ecosystem this
research surveyed.

**Trust-scoping of project-local extensions is a recurring, independently
discovered pattern.** Grok Build's "project-scope plugins require an explicit
trust grant" and Gemini CLI's "re-consent on extension update that adds hooks"
are the same idea: code/config that ships _inside a repository_ (as opposed to
a user's own global config) is not automatically trusted just because it was
discovered. This is directly relevant to AutoForge's own governance/
constitution model — worth confirming AutoForge's own doctrine/hook loading
(if it ever executes anything beyond declarative routing) doesn't implicitly
trust repo-local content the way a naive implementation would.

---

## 3. Context & memory management

| Repo            | Project-memory file convention                                                                                                                                                                  | Compaction                                                                                                                                                    | Long-term memory                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | `CLAUDE.md` referenced only, never specified here                                                                                                                                               | —                                                                                                                                                             | —                                                                                                                                                                                       |
| Codex           | `AGENTS.md`, concatenated root-to-cwd, size-capped (32KB default), `AGENTS.override.md` for local overrides                                                                                     | Multi-strategy: local/inline, server-side (`compact_remote.rs`/`_v2.rs`), pre/mid/post-turn, all hook-wrapped and golden-snapshot-tested                      | `memories/read`/`memories/write` — citation-tracked, narrower than a general vector store (unconfirmed if broader RAG exists)                                                           |
| Gemini CLI      | `GEMINI.md`, **3-tier + just-in-time**: global → workspace → per-directory scan triggered by tool file access (not just startup); supports `@import` of other files; configurable filename list | `/compress` command, `PreCompress` hook                                                                                                                       | **Checkpointing** to a shadow git repo (`~/.gemini/history/<hash>`), isolated from the user's own `.git`; snapshots conversation + pending tool call + files, restorable via `/restore` |
| Antigravity CLI | Not specified (references "customizations": rules/skills/agents/hooks, cached with deterministic sort order specifically to protect prompt-cache stability)                                     | Truncation charges byte budget only against reclaimable content, protecting "checkpoints"                                                                     | SQLite-backed transcript persistence, resumable, exportable to a GUI                                                                                                                    |
| Grok Build      | Markdown-first: `~/.grok/memory/MEMORY.md` (global) + per-workspace `MEMORY.md` keyed by `blake3(cwd)`, plus dated session logs                                                                 | Two-crate split: `xai-chat-state` (mechanics: strip-tool-messages, strip-reasoning-blocks, strip-images) + `xai-grok-agent`'s `CompactionPolicy` (thresholds) | SQLite+`sqlite-vec` index **layered on top of** the markdown files — markdown is the source of truth, the index is purely for retrieval                                                 |

**AutoForge already has a stronger position here than any single competitor
studied**, because AutoForge's "project memory" isn't one flat file — it's
already a structured, typed knowledge store (decisions, specifications,
context packets) with an explicit Context Resolver, which is closer to what
these tools are converging _toward_ than what any currently ships. The
concrete lessons worth importing:

- **Gemini CLI's JIT per-directory memory scan** (triggered by the tool
  actually touching a directory, not just once at startup) is a genuinely
  different idea from AutoForge's current context-resolution model, which
  resolves once per task/session. Worth a deliberate question for the
  Project Graph and Context horizon (`AUTOFORGE_FRAMEWORK_ROADMAP.md`): should
  context resolution re-trigger mid-task when an agent's scope touches a new
  directory it wasn't originally scoped to?
- **Grok Build's "markdown is the source of truth, index is disposable/
  rebuildable"** principle is _already_ AutoForge's own stated principle for
  the hybrid SQLite storage boundary (`issue.define-and-benchmark-the-hybrid-
sqlite-storage-boundary`) — this is independent validation that the
  approach AutoForge already committed to is the right shape, not a new idea
  to adopt.
- **Explicit provenance-tagging of agent-authored messages** (Grok Build's
  `AGENT_MESSAGE_MODEL_LABEL`, marking synthetic messages from another agent
  so the model doesn't mistake them for genuine human instructions) is a
  concrete, cheap mitigation directly relevant to AutoForge's own multi-agent
  orchestration horizon (v0.21 in the original roadmap numbering) — any
  future AutoForge-mediated agent-to-agent handoff should consider the same
  labeling discipline.

---

## 4. Safety / sandboxing / permissions

This is the deepest, most convergent section across all five repos, and the
one most worth close reading if the future CoJack Labs AI agent build needs a
sandboxing model.

**Universal patterns, independently arrived at by every team studied:**

- **Approval has at least three tiers**, not a binary allow/deny: something
  like `Never` (fully autonomous) / `OnRequest` (model decides) / `Granular`
  (per-category) / `UnlessTrusted` (deny by default for untrusted projects) in
  Codex; `always-proceed` / `proceed-in-sandbox` / `strict` in Antigravity;
  `allow`/`deny`/`ask_user` per-rule with priority ordering in Gemini's TOML
  policy engine; `Allow`/`Deny`/`Ask` in Grok Build's `PermissionConfig`.
- **Sandboxing is per-OS and non-trivial**: macOS Seatbelt (with checked-in
  `.sbpl`/profile source in both Codex and Gemini CLI), Linux Landlock/bwrap
  (Codex, Grok Build), Windows restricted-token/elevated modes (Codex is the
  only one with genuinely deep, PowerShell-aware Windows sandboxing via a
  tree-sitter parser for dangerous-command detection).
- **Fail-closed defaults are explicit and code-commented, not incidental.**
  Grok Build's permission-rule default was _deliberately_ changed to `Deny`
  with a direct CWE-1188 citation in the code comment; its child-network
  seccomp arms on _configured_ intent rather than _confirmed_ enforcement,
  explicitly reasoned as "the fail-closed direction" in a comment. Antigravity
  independently discovered and fixed the inverse bug — an allowlist entry that
  tokenized to zero words matched _every_ command and silently auto-approved
  everything. **This is the single most important cross-repo finding for any
  permission-matching engine AutoForge or a future agent ever builds**: an
  empty/degenerate rule must be treated as "matches nothing," never "matches
  everything," and this needs an explicit test case, not just code review,
  because it shipped as a real bug in production software from a major vendor.
- **Hooks/policy-checks disagree on fail-open vs. fail-closed, deliberately,
  per-mechanism** — Grok Build's tool-permission engine fails closed (default
  deny) while its _hooks_ dispatcher explicitly fails open ("only a healthy
  deny blocks" — a crashing hook can't itself become a denial-of-service).
  This is not a contradiction; it's the same team correctly reasoning that
  different failure directions are safer for different mechanisms (a
  security-critical allow/deny gate vs. an optional advisory extension
  point). Worth internalizing as a general principle rather than picking one
  fail-direction and applying it uniformly everywhere.
- **A sandboxed project cannot silently override a trusted global policy of
  the same name.** Grok Build's explicit rule ("a malicious workspace can't
  hollow out a global custom profile while keeping the trusted name") is the
  sandboxing-policy analogue of the extension re-consent pattern in section 2
  — repo-local content is never allowed to redefine something the user/org
  configured globally, only add to it.
- **Codex's "Guardian" layer and Antigravity's async/deferred security
  review** (`asyncRewake` in Claude Code's plugin ecosystem) are two
  independent solutions to the same tension: a thorough safety check is often
  too slow to run synchronously in the foreground turn. Codex layers a
  second-opinion policy engine; Claude Code's plugin defers the check and
  re-injects findings later without blocking. **This maps directly onto
  AutoForge's own quality-gate/evidence work** — the evidence-binding feature
  just shipped already treats gate results as asynchronous, supersedable
  facts rather than synchronous blockers, which is philosophically the same
  insight applied to AutoForge's own domain (validation, not tool-call
  approval).

**Where AutoForge's framework boundary matters:** none of the sandboxing
detail above is something AutoForge itself should implement — AutoForge
orchestrates and governs, it doesn't sandbox model-driven shell execution
(that's the agent's job, and AutoForge explicitly defers to whichever
compatible agent is doing the work). This section is entirely scoped to
inform the _future separate agent build_, not AutoForge's own quality-gate or
governance subsystems, which operate on a different threat model (validating
already-produced code/state, not gating live tool calls from a model).

---

## 5. Configuration & extensibility

| Repo            | Config format                                                                                    | Layering                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Code     | `settings.json`/`settings.local.json`/`managed-settings.json` (schema referenced, not specified) | User → local → managed/enterprise, with MDM-pushed policy templates for macOS/Windows                                                                  |
| Codex           | TOML, `ConfigLayer`/`ConfigLayerSource` with a "requirements stack" model                        | defaults → user → project → managed/enterprise → cloud-bundle → CLI overrides                                                                          |
| Gemini CLI      | `settings.json`, zod-validated                                                                   | project `.gemini/` → user `~/.gemini/` → system `/etc/gemini-cli/` → extension-contributed (last)                                                      |
| Antigravity CLI | `settings.json` (inferred paths under `~/.gemini/antigravity-cli/`)                              | global → project-specific overrides (`~/.gemini/config/projects/`)                                                                                     |
| Grok Build      | TOML, `$VAR` env-expansion                                                                       | user config → `managed_config.toml` (enterprise) → `requirements.toml` (server-synced policy cache); managed config additionally **signed and cached** |

**A shared, load-bearing convention: parse errors must never leak secrets.**
Grok Build's config loader explicitly avoids echoing the raw source line from
a TOML parse error (because the offending line "may carry a secret"),
building a custom redacted formatter used consistently across both the error
path and diagnostic tracing. This is a concrete, cheap, easily-missed
correctness requirement any config loader — AutoForge's own `.autoforge/
config.json` reader included — should hold itself to.

**Hooks are the dominant "true" extension point across every system studied**
— more so than plugins or skills, which package _content_ (prompts, agent
roles, MCP configs) while hooks are the mechanism that lets _arbitrary
external logic_ intervene in the loop. Gemini CLI's 11 named lifecycle events
(splitting `BeforeToolSelection` from `BeforeTool`, and carving out
`PreCompress` as its own event) is the most granular hook taxonomy found.
This is directly relevant to AutoForge's own gate/evidence lifecycle — the
question worth raising for a future issue: does AutoForge's own quality-gate
pipeline need named, granular lifecycle hook points (pre-scope-resolution,
pre-gate-check, post-gate-check, pre-evidence-record) rather than treating
`gate check` as one opaque operation, the way Gemini CLI treats
`BeforeToolSelection`/`BeforeTool`/`AfterTool` as three distinct moments
instead of one?

---

## 6. Distinctive ideas worth a deliberate AutoForge or future-agent decision

Ranked by how directly they're relevant to AutoForge's actual framework
mandate (not the future agent build):

1. **Cross-provider tool-name normalization** (Grok Build validates MCP tool
   names against the intersection of Anthropic/OpenAI/Gemini naming rules up
   front, not per-provider at request time) — directly relevant to
   AutoForge's own agent-contract stabilization work
   (`issue.stabilize-provider-neutral-contracts-and-adapters`, per the
   roadmap's Agent Interoperability horizon). AutoForge's agent contract
   already aims to be usable across Codex/Claude Code/Gemini/etc.; this is
   concrete prior art for one specific compatibility problem (tool-name
   syntax) that AutoForge will eventually need to solve the same way.
2. **Fail-closed-by-default permission matching, with the empty-rule-matches-
   everything bug as a named regression class** — directly relevant to
   AutoForge's own governance/constitution rule-matching
   (`src/governance/evaluate.ts`) and doctrine routing
   (`src/doctrine/router.ts`) — worth a dedicated audit pass (or at minimum a
   regression test) confirming an empty/degenerate scope pattern, keyword
   list, or path pattern in AutoForge's own routing can't accidentally match
   everything the way Antigravity's shell-allowlist bug did.
3. **Async/deferred review pattern** (Claude Code's `asyncRewake`, Codex's
   Guardian layer) as validation that AutoForge's own evidence-supersession
   model (shipped in v0.25.3, extended just now with revision/environment/
   gate-fingerprint binding) is philosophically well-aligned with where the
   rest of the industry is independently converging — not a new idea to
   adopt, but useful external validation of a direction already taken.
4. **Explicit re-consent / trust-scoping for repo-local extensions** —
   directly relevant if/when AutoForge's own artifact registry
   (`issue.make-the-autoforge-artifact-registry-the-default-for-agent-
produced-planning`) or doctrine system ever loads anything more dynamic
   than declarative routing data from inside a project's own tracked files.
5. **Config-parse-error secret redaction** — a small, concrete correctness
   bar (`src/core/config.ts` and any future config loader) worth holding
   AutoForge to explicitly, since it's cheap to get right and easy to miss.

## 7. What is explicitly NOT adopted from this research

- No agent loop, sampler, tool-router, or sandboxing implementation belongs
  in AutoForge's own codebase — that entire domain (sections 1 and 4 above)
  is scoped to the separate future CoJack Labs AI coding agent, should that
  initiative proceed, and only after its own brainstorm/design/plan cycle.
- AutoForge does not need its own MCP _client_ — AutoForge's job is
  producing agent contracts and context packets _for_ MCP-capable agents,
  not being one itself.
- No decision has been made to build the future CoJack Labs AI agent at all,
  or on what timeline, architecture, or scope — this document is research to
  have on hand if/when that separate initiative is deliberately started, not
  a commitment to start it.
