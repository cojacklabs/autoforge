# Gemini CLI Architecture Notes

Source: Repomix-flattened dump at
`/Users/coltonajackson/Code/Resources/GitHub/AI/Google/gemini-cli/REPO.md` (~752,773 lines).
This file was explored incrementally (directory structure scan + targeted grep/Read on
~20 files/docs) rather than read in full — see "What Was Skipped" at the end.

## Agent Loop / Core Execution Model

- Core turn/event types live in `packages/core/src/core/turn.ts`. The loop is event-driven:
  a `GeminiEventType` enum defines the full vocabulary of stream events — `Content`,
  `Thought`, `ToolCallRequest`, `ToolCallResponse`, `ToolCallConfirmation`,
  `UserCancelled`, `Error`, `ChatCompressed`, `MaxSessionTurns`, `Finished`,
  `LoopDetected`, `Citation`, `Retry`, `ContextWindowWillOverflow`, `InvalidStream`,
  `ModelInfo`, `AgentExecutionStopped`, `AgentExecutionBlocked`.
- Streaming responses are validated against a closed set of failure modes
  (`ServerGeminiInvalidStreamEvent.value.type`): `NO_FINISH_REASON`, `NO_RESPONSE_TEXT`,
  `MALFORMED_FUNCTION_CALL`, `UNEXPECTED_TOOL_CALL`, `MAX_TOKENS_EXCEEDED`,
  `SAFETY_BLOCKED`, `RECITATION_BLOCKED`, `OTHER_BLOCKED`, `THINKING_ONLY_RESPONSE` — i.e.
  the client explicitly classifies and recovers from malformed/aborted model streams
  rather than treating any non-standard stream as a generic error.
- Chat/session state and the actual model call wrapper are in
  `packages/core/src/core/geminiChat.ts` (exports `GeminiChat`, `StreamEventType`).
  `packages/core/src/core/client.ts` (`GeminiClient`) is the higher-level orchestrator that
  owns the chat, tool registry, prompt registry, sandbox manager, etc. (see its long import
  list surfaced from `packages/core/src/config/config.ts`).
- Tool-call scheduling is its own subsystem under `packages/core/src/scheduler/`:
  `scheduler.ts` (`Scheduler` class — "Event-Driven Orchestrator for Tool Execution"),
  `state-manager.ts`, `tool-executor.ts`, `tool-modifier.ts`, `confirmation.ts`,
  `hook-utils.ts`, `policy.ts`, `types.ts` (tool-call state machine: `Scheduled` →
  `Validating` → `Executing` → `Successful`/`Errored`, per `CoreToolCallStatus`).
- Non-interactive ("headless") execution is a parallel code path:
  `packages/cli/src/nonInteractiveCli.ts` (legacy) and
  `packages/cli/src/nonInteractiveCliAgentSession.ts` (newer "agent session" model) —
  both are wired up behind a runtime switch (see CI config referencing
  `legacy`/`session` variants), suggesting an in-flight migration to a session-based
  headless execution model.
- Stop conditions include: `MaxSessionTurns`, explicit `Finished`, `UserCancelled`,
  `LoopDetected` (repetition/loop detection), and hook-driven `AgentExecutionStopped` /
  `AgentExecutionBlocked` (a `BeforeAgent`/`AfterAgent` hook can halt or block a turn).

## Tool/Extension System

- Built-in tools (from `packages/core/src/tools/`, `packages/core/src/config/config.ts`
  imports): `ls.ts`, `read-file.ts`, `read-many-files.ts`, `write-file.ts`, `edit.ts`,
  `grep.ts` (plus a dedicated `ripGrep.ts` / `RipGrepTool`), `glob.ts`, `shell.ts` (with
  companion `shellBackgroundTools.ts` for `list_background_processes` /
  `read_background_output` — i.e. first-class background shell process support),
  `web-fetch.ts`, `web-search.ts`, `ask-user.ts` (interactive user-prompt tool),
  `activate-skill.ts` (agent-skills integration), `enter-plan-mode.ts` /
  `exit-plan-mode.ts` (a distinct "Plan Mode"), `write-todos.ts`, `complete-task.ts`,
  `topicTool.ts` (`update_topic`), `get-internal-docs.ts`, `jit-context.ts` (just-in-time
  context injection), and MCP-related tools `list-mcp-resources.ts`,
  `read-mcp-resource.ts`, `mcp-tool.ts`.
- `AgentTool` (`packages/core/src/agents/agent-tool.ts`) plus
  `packages/core/src/agents/agent-scheduler.ts` and `executor.ts` implement sub-agent
  delegation (see `docs/core/subagents.md`, `evals/subagents.eval.ts`,
  `evals/subtask_delegation.eval.ts`).
- MCP client support is substantial: `packages/core/src/tools/mcp-client.ts`,
  `mcp-client-manager.ts`, `mcp-compliance-transport.ts`, `mcp-tool.ts`, plus CLI-side
  `packages/cli/src/commands/mcp/{add,list,remove,enableDisable}.ts`. MCP servers are
  configured via `gemini mcp` and per-extension `gemini-extension.json`
  (`packages/cli/src/config/extensions/examples/mcp-server/`).
- **Extensions** are a first-class packaging mechanism (`docs/extensions/index.md`,
  `reference.md`): an extension bundles "prompts, MCP servers, custom commands, themes,
  hooks, sub-agents, and agent skills" into one shareable unit, installed via
  `gemini extensions install <github-url-or-local-path>` (creating a local copy; updates
  require `gemini extensions update`), with `enable`/`disable` scoped to `user` or
  `workspace`, `--auto-update` / `--pre-release` / `--consent` flags, and a public
  extension gallery (geminicli.com/extensions/browse). Extension example templates ship
  in-repo: `custom-commands`, `exclude-tools`, `hooks`, `mcp-server`, `policies`, `skills`,
  `themes-example` (`packages/cli/src/config/extensions/examples/`).
- Extension lifecycle logic lives in `packages/core`/`packages/cli` under
  `config/extension-manager.ts`, `config/extension.ts`, `extensionRegistryClient.ts`,
  `extensionEnablement.ts`, `extensionUpdates.ts`, and a `consent.ts` module that
  generates a "consent string" and warns the user when an extension's hooks or skills
  change, or when migrating an extension — i.e. extension updates that add hooks/skills
  require re-consent, a notable trust-boundary control.

## Context & Memory Management

- `docs/cli/gemini-md.md` documents a **hierarchical GEMINI.md memory system**, loaded in
  three tiers: (1) global `~/.gemini/GEMINI.md`, (2) workspace/parent-directory
  `GEMINI.md` files discovered during startup, (3) **just-in-time (JIT) context files** —
  when a tool touches a directory, the CLI scans for `GEMINI.md` up the directory tree at
  that moment (implemented via `packages/core/src/tools/jit-context.ts` and
  `packages/core/src/utils/memoryDiscovery.ts`). All discovered files are concatenated and
  sent with every prompt; the footer shows a count of loaded context files.
  `/memory show` / `/memory reload` inspect and force-refresh this hierarchy.
  Filename is configurable via `settings.json` `context.fileName` (defaults to
  `["GEMINI.md"]`, can add `AGENTS.md`, `CONTEXT.md`, etc.).
- Files can `@import` other files (`@./components/instructions.md`) via a dedicated
  "Memory Import Processor" (`docs/reference/memport.md`), implemented in
  `packages/core/src/utils/memoryImportProcessor.ts`.
- `memoryDiscovery.ts` includes a `deduplicatePathsByFileIdentity` routine that dedupes
  discovered GEMINI.md paths by `(dev, ino)` rather than string path — explicitly to
  handle case-insensitive filesystems where different-case path strings resolve to the
  same physical file.
- **Checkpointing** (`docs/cli/checkpointing.md`): disabled by default, enabled via
  `settings.json` → `general.checkpointing.enabled: true` (the old `--checkpointing` CLI
  flag was removed in 0.11.0). On every file-mutating tool call the CLI (a) commits a
  snapshot to a **shadow git repo** at `~/.gemini/history/<project_hash>` (isolated from
  the user's own repo), (b) saves full conversation history, and (c) stores the specific
  pending tool call — all as a JSON blob under
  `~/.gemini/tmp/<project_hash>/checkpoints`. `/restore [checkpoint_file]` reverts files,
  restores conversation history, and re-proposes the original tool call for
  re-approval/edit/skip. Related: `packages/core/src/utils/checkpointUtils.ts`,
  `integration-tests/checkpointing.test.ts`.
- Separately there's an **"auto-memory"** feature (`docs/cli/auto-memory.md`,
  `evals/auto_memory_contract.eval.ts`, `evals/auto_memory_modes.eval.ts`) and a `/rewind`
  command (`docs/cli/rewind.md`) plus `/compress` (`compressCommand.ts` — context
  compaction) distinct from checkpointing.
- Session persistence: `gemini -r "latest"` / `gemini -r "<session-id>"` resumes prior
  sessions (`docs/cli/session-management.md`, `resumeCommand.ts`,
  `integration-tests/resume_repro.test.ts`, `resume-gc.test.ts` — the latter implying
  garbage collection of stale session data).

## Safety / Sandboxing / Permissions

- Sandboxing is a first-class, multi-backend feature (`docs/cli/sandbox.md`):
  - **macOS Seatbelt** (`sandbox-exec`), with six built-in profiles selectable via
    `SEATBELT_PROFILE`: `permissive-open` (default; denies by default, confines writes to
    project dir, broad reads/network allowed), `permissive-proxied`, `restrictive-open`,
    `restrictive-proxied`, `strict-open`, `strict-proxied`.
  - **Container-based** (Docker/Podman), default image `ghcr.io/google/gemini-cli:latest`,
    mounting the project at the _same absolute path_ inside the container as on the host.
    Custom images configurable via `settings.json` `tools.sandbox.image` or
    `GEMINI_SANDBOX_IMAGE`.
  - Also references `runsc` (gVisor) and `lxc` as valid `GEMINI_SANDBOX` values.
  - Enabled via `-s`/`--sandbox` flag, `GEMINI_SANDBOX` env var, or `settings.json`
    `tools.sandbox`.
  - Implementation: `packages/core/src/sandbox/{linux,macos,windows}/*SandboxManager.ts`
    (e.g. `LinuxSandboxManager.ts` using `bwrapArgsBuilder.ts` / bubblewrap,
    `MacOsSandboxManager.ts` using `seatbeltArgsBuilder.ts`, `WindowsSandboxManager.ts`),
    plus `packages/core/src/services/sandboxManager.ts` /
    `sandboxManagerFactory.ts` and CLI-side `packages/cli/src/utils/sandbox.ts`,
    `sandboxBuiltinProfiles.ts`.
- **Policy engine** (`docs/reference/policy-engine.md`,
  `packages/core/src/policy/policy-engine.ts`, `config.ts`, `toml-loader.ts`): TOML rule
  files under `~/.gemini/policies/*.toml`, each rule has `toolName` (supports wildcards
  incl. `mcp_*` patterns for MCP tools), optional `argsPattern` (regex over
  stable-stringified JSON args), optional `interactive` condition, a `priority` (highest
  wins), and a `decision` of `allow` / `deny` / `ask_user`. This is a declarative,
  file-based permission system layered underneath/alongside the interactive
  confirm-before-tool-call UX.
- Tool-call confirmation flows through a dedicated **confirmation bus**
  (`packages/core/src/confirmation-bus/{message-bus,types,index}.ts`) and
  `packages/core/src/scheduler/confirmation.ts` — decoupling the scheduler from whatever
  UI (interactive TUI dialog vs. headless auto-decision) resolves a confirmation request.
  `ToolConfirmationOutcome` / `ApprovalMode` types drive this (`policy/types.ts`).
- Hooks can also gate execution: `BeforeTool` hooks can "Block Tool / Rewrite" arguments,
  `BeforeAgent`/`AfterAgent` can "Block Turn", `BeforeToolSelection` can filter which
  tools the model even sees.

## Configuration & Extensibility

- Settings load order (from `docs/hooks/index.md`, generalizes across the config system):
  project `.gemini/settings.json` > user `~/.gemini/settings.json` > system
  `/etc/gemini-cli/settings.json` > extension-contributed config — highest to lowest
  precedence, with project overriding user overriding system, and extensions layered in
  last. Schema validated via `packages/cli/src/config/settingsSchema.ts` /
  `settings-validation.ts` (zod-based, per `config.ts` importing `zod`).
- **Hooks** (`docs/hooks/index.md`, `packages/core/src/hooks/`, referenced via
  `HookDefinition`/`HookEventName` types in `config.ts`) are the CLI's true "middleware"
  extension point: 11 named lifecycle events (`SessionStart`, `SessionEnd`, `BeforeAgent`,
  `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeToolSelection`, `BeforeTool`,
  `AfterTool`, `PreCompress`, `Notification`). Hooks are external scripts communicating
  over stdin/stdout as strict JSON (any stray stdout text breaks parsing and hook output
  is treated as `Allow` + `systemMessage`); exit code 0 = parse stdout as JSON decision,
  exit code 2 = hard block (stderr = reason), any other code = non-fatal warning.
  Matchers are regex for tool events, exact-string for lifecycle events, `*`/`""` for
  wildcard.
- Extensions are packaged as a directory with `gemini-extension.json` manifest and can
  include: MCP server definitions, custom slash commands (TOML files under
  `commands/`), exclude-tools lists, hooks (`hooks/hooks.json` + scripts), policies
  (`policies/policies.toml`), skills (`skills/<name>/SKILL.md`), and themes.
  CLI commands: `gemini extensions {install,uninstall,enable,disable,update,new,link,
list,validate,configure}` — all under `packages/cli/src/commands/extensions/`.
- **Agent Skills** (a distinct, newer concept, separate from extensions/hooks) surfaced
  via `activate-skill.ts` tool, `SkillCommandLoader.ts`,
  `packages/cli/src/commands/skills/{install,enable,disable,link,list,uninstall}.ts`,
  and `docs/cli/skills.md` / `using-agent-skills.md` / `creating-skills.md` — Gemini CLI
  has its own Claude-Code-Skills-like mechanism with its own `.gemini/skills/` dir
  (visible at repo root under `.gemini/skills/`) full of maintainer-facing skills
  (`ci`, `code-reviewer`, `docs-writer`, `pr-creator`, etc.) used to develop Gemini CLI
  itself.
- Custom slash commands: `packages/cli/src/services/{BuiltinCommandLoader,
FileCommandLoader, McpPromptLoader, SkillCommandLoader, CommandService}.ts` plus
  prompt-processors (`argumentProcessor`, `atFileProcessor`, `injectionParser`,
  `shellProcessor`) — user-defined `.toml` command files support `$ARGUMENTS`,
  `@file` inclusion, and `!{shell}` injection processing.

## Distinctive Design Choices

- **Three-tier + JIT memory model** is more elaborate than a flat "one CLAUDE.md-style
  file" convention — the JIT per-directory GEMINI.md scan (triggered by tool file access,
  not just at startup) is unusual and aimed at large monorepos.
- **Shadow git repo for checkpointing** (`~/.gemini/history/<hash>`) rather than stashing
  in the user's own repo — avoids polluting `.git`, but does mean every approved
  file-editing tool call creates a full snapshot commit when enabled.
- **Declarative TOML policy engine** with FQN wildcard syntax specifically for MCP tools
  (`mcp_<server>_*`, `mcp_*_<toolName>`) is a more structured alternative to Claude Code's
  simpler allow/deny-list permission strings — gives priority-ordered rule composition.
  A separate `mcpName` field is explicitly recommended over string wildcards for MCP
  rules, suggesting the wildcard syntax has known ergonomic sharp edges.
  A dedicated `packages/core/src/safety/conseca/` module ("policy-enforcer.ts",
  "policy-generator.ts") suggests an internal/codename ("Conseca") sub-system generating
  policies programmatically, separate from user-authored TOML.
- **11 distinct hook lifecycle events**, more granular than most competing CLIs' hook
  systems (splitting `BeforeToolSelection` from `BeforeTool`, and adding `PreCompress` as
  its own event) — lets extension authors intervene at the tool-_filtering_ stage before
  the model even sees candidate tools, not just at execution time.
- **First-class background shell process tools** (`list_background_processes`,
  `read_background_output`) baked into the core tool set rather than left to ad hoc shell
  usage.
- **Explicit re-consent on extension update**: `consent.ts` snapshot-tests show it
  specifically warns "if the skill directory cannot be read" and "if hooks are present" —
  security-conscious handling of supply-chain risk in third-party extensions.
- Heavy internal dogfooding: the repo's own `.gemini/` directory contains a large skills
  library, custom TOML slash commands, and GitHub Actions workflows
  (`gemini-cli-bot-brain.yml`, `gemini-automated-issue-triage.yml`, etc.) that use Gemini
  CLI itself to triage issues/PRs — the tool manages its own repository's maintenance.
- A dedicated **ACP (Agent Client Protocol) mode** (`packages/cli/src/acp/*`,
  `docs/cli/acp-mode.md`) exists alongside the normal TUI/headless modes, implying
  Gemini CLI can act as a backend for external IDE/agent-protocol clients (see also
  `docs/ide-integration/ide-companion-spec.md`).
- **Plan Mode** (`enter-plan-mode.ts` / `exit-plan-mode.ts`, `docs/cli/plan-mode.md`,
  `plan-mode-steering.md`) is a first-class tool-gated mode, not just a system-prompt
  convention.
- **Model steering / model routing** (`docs/cli/model-steering.md`,
  `model-routing.md`, `services/modelConfigService.ts`) and a **local model** path
  (`core/localLiteRtLmClient.ts`, `docs/core/local-model-routing.md`,
  `docs/core/gemma-setup.md`, `packages/cli/src/commands/gemma/*`) — the CLI can run/route
  to a local Gemma model via LiteRT, a notably different design point vs. cloud-only
  competitors.

## What's NOT in This Repo

- No model backend/inference implementation — this is entirely a client that calls the
  hosted Gemini API (via `@google/genai`, imported in `turn.ts`) and, optionally, a local
  LiteRT-packaged Gemma model for on-device routing; there's no training code, no weights,
  no serving infrastructure for the primary cloud model.
- No enterprise identity/SSO backend — `docs/admin/enterprise-controls.md` and
  `docs/get-started/authentication.mdx` reference auth flows but the actual auth provider
  (Google's OAuth/IAM backend) lives outside this repo; only the client-side `auth.ts` /
  `AuthDialog.tsx` integration is present.
- No hosted extension registry/gallery backend — `extensionRegistryClient.ts` is a client
  for `geminicli.com/extensions/browse`, but the gallery service itself isn't in this repo.
- No telemetry/analytics backend — `packages/core/src/telemetry/*` emits events
  (`loggers.ts`, `uiTelemetry.ts`) but the collection/dashboard side
  (`monitoring-dashboard-*.png` in docs/assets) is clearly an external Google service.
- No GCS-backed persistence implementation detail beyond a thin client —
  `packages/a2a-server/src/persistence/gcs.ts` exists but is a narrow wrapper; the actual
  Google Cloud Storage service is external.

## What Was Skipped

Given the ~752,773-line size of the flattened dump, exploration was limited to: the
`<directory_structure>` header (~1,000 lines), a targeted `grep` pass to locate `<file
path="...">` block offsets for ~30 candidate files, and full/partial reads of roughly a
dozen of those files plus ~8 docs pages. Not read/explored: the bulk of
`packages/cli/src/ui/**` (React/Ink TUI components — hundreds of files), the full
`evals/` suite bodies, `integration-tests/` bodies, `packages/a2a-server` internals beyond
file listing, `packages/core/src/telemetry` implementation, the auth/billing modules in
depth, and essentially all `.test.ts`/`.snap` files. Anything not explicitly cited above
with a file path should be treated as unverified against source.
