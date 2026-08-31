# Grok Build (xAI CLI Agent) — Architecture Notes

Source: `/Users/coltonajackson/Code/Resources/GitHub/AI/SpaceXAI/grok-build/REPO.md`
(Repomix-flattened dump, ~1.8M lines). This document is based on the
`<directory_structure>` listing plus targeted reads of ~10 files judged most
architecturally significant. The vast majority of the ~1.8M lines (hundreds of
crates' full source, especially UI/rendering/terminal code under
`xai-grok-pager`, and all test/snapshot content) was **not read** — see
"What's NOT in This Repo" / caveats at the end.

## Agent Loop / Core Execution Model

- The core "Agent" abstraction lives in `crates/codegen/xai-grok-agent/src/agent.rs`.
  An `Agent` struct bundles: an `AgentDefinition` (config.rs), a rendered
  system prompt (`PromptContext`), a `ToolBridge` (`Arc<ToolBridge>` — owns
  the tool registry, tool state, and session context), a `ReminderPolicy`,
  and a `CompactionPolicy`. Per the doc comment, the `Agent` is "effectively
  immutable after construction" — mutation goes through the `ToolBridge`'s
  internal locks (`crates/codegen/xai-grok-agent/src/agent.rs:337343-337353`).
- `Agent` is built by `AgentBuilder` (`builder.rs`, referenced from
  `lib.rs:50513`) from an `AgentDefinition` + session context — not read in
  detail, but the module layout (`crates/codegen/xai-grok-agent/src/lib.rs:50500-50510`)
  shows the crate's responsibility split: `agent`, `builder`, `compaction`,
  `config`, `discovery`, `error`, `plugins`, `prompt`, `repo`,
  `system_reminder`, `timing`.
- Turn/session lifecycle appears split across a separate crate,
  `xai-agent-lifecycle` (`crates/codegen/xai-agent-lifecycle/src/`), with
  `local/` and `send/` variants each having `contributors/{command,
session_lifecycle, turn_input, turn_lifecycle}.rs` and a `registry.rs` —
  this looks like a contributor/pipeline pattern for assembling a turn, but
  contents were not read.
- Auto-compaction trigger logic is a pure predicate on `Agent`:
  `should_auto_compact(total_tokens, context_window)` compares
  `total_tokens` against a percentage threshold of the context window via
  `xai_token_estimation::exceeds_threshold` (`agent.rs:337527-337541`), with
  a full set of boundary-condition unit tests in the same file
  (`agent.rs:337589-337626`).
- A "TodoGate" mechanism forces additional turns: `ReminderPolicy` in
  `crates/codegen/xai-grok-agent/src/system_reminder.rs` defines a
  `TodoNudgeConfig` (periodic reminder to call `todo_write`) and a
  `TodoGateConfig` (hard runtime gate that injects a `<system-reminder>`
  and forces another turn if pending todos remain after a content-only
  assistant message, referencing `xai-grok-shell::session::acp_session::
evaluate_todo_gate`). The gate is **disabled by default** and capped at
  `max_fires_per_prompt` (default 2) to bound inference cost
  (`system_reminder.rs:50524-50609`).
- The actual model-calling/streaming layer is `xai-grok-sampler`
  (`crates/codegen/xai-grok-sampler/src/`), with an `actor/` submodule
  (`request_task.rs`, `state.rs`), a `stream/` submodule supporting both
  `chat_completions.rs` and `responses.rs` wire formats, plus
  `doom_loop.rs` / `doom_loop_recovery.rs` (repetition/stuck-loop
  detection — not read in depth, name is suggestive) and `retry.rs`. This
  crate was located but not read in detail; flagging as worth a follow-up
  pass given "doom loop recovery" sounds like a distinctive safety feature.
- Conversation/message types are centralized in a separate crate,
  `xai-grok-sampling-types` (`conversation.rs`, `messages.rs`,
  `tool_overrides.rs`, `provider_error.rs`), supporting both `chat_completions`
  and `responses` (OpenAI-style Responses API) wire shapes as parallel
  modules under `conversation/`.
- The CLI entrypoint binary is `crates/codegen/xai-grok-pager-bin/src/main.rs`.
  It dispatches on a `Command` enum (Agent, Dashboard, Login, Inspect,
  Doctor, Leader, Logout, Mcp, Plugin, Memory, Models, Sessions, Setup,
  Share, Wrap, Export, Trace, Update, Version, Completions, Worktree,
  DiskUsage, Workspace — `main.rs:1747118-1747139`), and wires up an
  optional jemalloc global allocator with profiling config
  (`main.rs:1747069-1747088`). It also handles auto-update
  (`xai_grok_update::auto_update`, `enforce_version_policy_or_exit`) and a
  "leader" process model (`xai_grok_shell::leader`, `connect_or_spawn`,
  `LeaderMode`) — i.e. multiple CLI invocations can share one backing
  daemon/session process, distinguished by `ClientMode`/`LeaderTarget`.
  Not explored further, but this leader/client split is architecturally
  significant and worth its own follow-up read.

## Tool/Extension System

- Tool execution/dispatch machinery is referenced via `xai_grok_tools`
  (`ToolBridge`, `ToolDefinition`, `ToolRegistry`, `ToolState`,
  `SessionContext` per doc comments in `agent.rs`) but this crate itself
  does not appear as a top-level `crates/codegen/xai-grok-tools/` entry in
  the directory listing I read — it may be under `crates/` at a different
  path not captured in the first 2000 lines, or defined elsewhere. **Not
  verified**; flagging as a gap.
- Concrete tool implementations (edit, execute/bash, read, search,
  web_fetch, web_search, memory_search, use_tool, list_dir) live as UI/
  rendering "blocks" under
  `crates/codegen/xai-grok-pager/src/scrollback/blocks/tool/` (e.g.
  `edit.rs`, `execute.rs`, `read.rs`, `search.rs`, `web_fetch.rs`,
  `web_search.rs`, `use_tool.rs` — directory listing only, not read). This
  suggests tool _rendering_ (how a tool call/result appears in the
  scrollback UI) is separated from tool _execution_ (elsewhere, likely
  `xai-grok-tools`, unconfirmed).
- MCP (Model Context Protocol) client support is a first-class crate,
  `xai-grok-mcp` (`crates/codegen/xai-grok-mcp/src/`). `servers.rs` uses
  the official `rmcp` SDK (`ClientHandler`, `ServiceExt`,
  `StreamableHttpClientTransport`) to connect to MCP servers over HTTP or
  presumably stdio, with OAuth support (`oauth.rs`, `oauth_config.rs`,
  `auth_status.rs`) and its own extra-CA-bundle-aware `reqwest` client
  builder (`servers.rs:1458576-1458589`, reusing `xai_grok_extra_ca`).
  Tool names from MCP servers are namespaced as `"server__tool"`
  (`MCP_TOOL_NAME_DELIMITER`, `servers.rs:1458570-1458573`) and validated
  against the _strictest common denominator_ of Anthropic/OpenAI/Gemini
  tool-name regexes: `^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$`
  (`servers.rs:1458591-1458620`) — a cross-provider compatibility design
  choice worth noting.
- A distinct **plugin** system (skills + agents + MCP configs + hooks
  bundled together) is implemented in
  `crates/codegen/xai-grok-agent/src/plugins/` (`discovery.rs`,
  `git_install.rs`, `hooks_adapter.rs`, `install_registry.rs`,
  `local_refresh.rs`, `manifest.rs`, `marketplace.rs`, `registry.rs`,
  `trust.rs`). Per `plugins/mod.rs` (`crates/codegen/xai-grok-agent/src/
plugins/mod.rs:48940-48951`): "A plugin is a self-contained directory
  that bundles skills, agents, MCP server configs, and hooks into a
  namespaced unit," discoverable under `~/.grok/plugins/`,
  `.grok/plugins/` (project-level), or via `--plugin-dir`.
- `PluginRegistry`/`LoadedPlugin` (`plugins/registry.rs:48974-49052`) is
  built once per session ("MvpAgent initialization") and can be rebuilt
  via `/plugins reload`. Each `LoadedPlugin` tracks a `trusted: bool` flag
  — CLI- and User-scope plugins are auto-trusted, but **project-scope
  plugins require an explicit trust grant** before their hooks/MCP/LSP
  components are considered executable (`registry.rs:49001-49004`). This
  is the same "project code shouldn't get free code-execution rights"
  pattern seen elsewhere in the ecosystem.
- A separate marketplace crate, `xai-grok-plugin-marketplace`
  (`crates/codegen/xai-grok-plugin-marketplace/src/lib.rs`), handles
  discovery/install from git-hosted plugin catalogs. It hardcodes an
  official xAI marketplace source
  (`https://github.com/xai-org/plugin-marketplace.git`,
  `lib.rs:434751-434756`) and has careful URL-canonicalization logic
  (`canonical_github_owner_repo`, `lib.rs:434763-434785`, with matching
  tests for HTTPS/SSH/`www.`/`.git`-suffix variants) purely to answer "is
  this the official source" — a supply-chain-adjacent trust decision.
  `scanner.rs` supports both an indexed catalog mode (`plugin-index.json`)
  and filesystem-walk fallback (`scanner.rs:434850-434870`).
- Hooks (pre/post-tool-use style extension points, similar to Claude
  Code's hooks) are implemented in `xai-grok-hooks`
  (`crates/codegen/xai-grok-hooks/src/`). `dispatcher.rs` runs hooks for
  an event **sequentially** as a "gate": each hook can Deny/Block (halts
  further hooks and blocks the tool call), rewrite the tool input
  (`InputRewrite`), or inject `AdditionalContext` text
  (`dispatcher.rs:1342297-1342317`). Notably: **"a hook that errors fails
  open (contributes nothing); only a healthy deny blocks"**
  (`dispatcher.rs:1342319`, explicit code comment) — i.e. a crashing/
  malfunctioning hook cannot itself become a denial-of-service or bypass
  vector by accident, but also cannot enforce policy if it errors instead
  of explicitly denying. Hooks can be disabled via a `DisabledHooks` set
  (`trust.rs`, referenced `dispatcher.rs:1342349`), and "managed-policy"
  hooks are explicitly exempted from being disabled at all
  (`dispatcher.rs:1342268-1342274`: "managed-policy hook cannot be
  disabled; running anyway") — i.e. some hooks are enterprise/org-mandated
  and not user-overridable.
- Example hooks shipped in-repo
  (`crates/codegen/xai-grok-hooks/examples/hooks/`) include
  `safe-shell-guard.sh`, `no-recursive-grep-guard.py`, `session-log.sh`,
  `stop-verify.sh`, `tool-logger.sh` — directory listing only, not read,
  but names suggest a hook-based guardrail pattern for shell command
  vetting.
- Slash commands are their own subsystem:
  `crates/codegen/xai-grok-pager/src/slash/commands/` has ~60 individual
  command files (`compact.rs`, `fork.rs`, `mcps.rs`, `plugin.rs`,
  `rewind.rs`, `workflow.rs`, etc.), each apparently a self-contained
  command module, wired through `registry.rs`/`matcher.rs`/`mru.rs` (most
  recently used) — directory listing only.

## Context & Memory Management

- Long-term/cross-session memory is `xai-grok-memory`
  (`crates/codegen/xai-grok-memory/src/lib.rs`). Per its module doc
  comment (`lib.rs:1046424-1046442`): memory is stored as **markdown
  files** under `~/.grok/memory/` — one global `MEMORY.md`, plus a
  per-workspace subdirectory keyed by `blake3(cwd)[..16]`, each containing
  its own `MEMORY.md` (curated knowledge) and a `sessions/` folder of
  dated session-log markdown files (`YYYY-MM-DD-{slug}-{sid8}.md`). It's
  gated behind a feature flag: `GROK_MEMORY` env var, `[memory] enabled`
  config, or remote settings (`lib.rs:1046439-1046442`) — disabled by
  default at the host level.
- Despite the flat-file storage, there's a real retrieval pipeline: a
  `MemoryIndex` (SQLite + `sqlite-vec`, per `init_sqlite_vec` export and
  `index.rs`/`schema.rs` modules), a `chunker.rs`, an `embedding.rs`
  abstraction (`EmbeddingProvider` trait, batched in groups of 32 —
  `lib.rs:1046475-1046522`), `mmr.rs` (Maximal Marginal Relevance —
  standard diversity-aware re-ranking for retrieval), and
  `query_expansion.rs`. There's also a `dream.rs`/`dream_lock.rs` module
  (name suggestive of an offline/background consolidation or
  summarization pass over memories — not read, but worth flagging as
  distinctive naming).
- Context-window/compaction (summarizing old turns to fit the model's
  context window) is split across two crates:
  - `xai-chat-state` (`crates/codegen/xai-chat-state/src/`) — owns the
    live conversation actor (`actor/{mutations,queries,request_builder,
state}.rs`), `compaction_mode.rs`, `compaction_utils.rs`,
    `image_budget.rs`, `persistence.rs`, `usage.rs`.
  - `xai-grok-agent`'s `compaction.rs` (`CompactionPolicy`, referenced
    from `agent.rs`) — the policy layer (thresholds), separate from the
    mechanics.
  - `compaction_utils.rs` (`crates/codegen/xai-chat-state/src/
compaction_utils.rs`) contains pure, side-effect-free transforms used
    when preparing history for summarization or for a different backend:
    `strip_tool_messages_for_conversation_item` (drops tool
    results/backend-tool-calls, flattens assistant `tool_calls` into a
    `"[Called tools: ...]"` text annotation — `compaction_utils.rs:
1136778-1136813`), `strip_reasoning_blocks` (drops all `Reasoning`
    conversation items — required before sending to backends that reject
    "signed" thinking blocks after any text mutation, or that reject
    structured reasoning entirely — `compaction_utils.rs:1136814-1136824`),
    and `strip_images` (replaces embedded images with a `"[image]"`
    placeholder so summarizer/segment-store payloads don't carry base64
    blobs — `compaction_utils.rs:1136825` onward).
  - A `ModelRequestHistory` newtype wraps "canonical history prepared
    exactly once for a model-facing request" and injects a fixed label
    string, `AGENT_MESSAGE_MODEL_LABEL = "[Message authored by another
agent; not a human request or approval.]"`, in front of any
    synthetic user message that originated from another agent
    (`compaction_utils.rs:1136745-1136773`) — i.e. explicit provenance
    tagging so the model doesn't mistake an inter-agent message for a
    genuine human instruction/approval. This is a notable
    prompt-injection/trust-boundary mitigation.
  - A separate crate, `xai-compaction-transcript`
    (`crates/codegen/xai-compaction-transcript/src/lib.rs`), exists but
    was not read — likely the on-disk transcript format for compacted
    history.
- Session persistence/search: `xai-grok-session-search`
  (bootstrap/db/fts/manager/recovery — SQLite FTS, by module names) and
  `xai-grok-dashboard-store` (a "workspace store" with rich typed errors —
  schema-version mismatch handling that keeps the DB **open read-only**
  rather than erroring when written by a newer build
  (`crates/codegen/xai-grok-dashboard-store/src/error.rs:342904-342910`),
  and explicit "never delete/truncate/quarantine a corrupt store, leave it
  for manual recovery" (`error.rs:342951-342957`) — a fail-safe,
  data-preserving design philosophy that recurs in this codebase.
- A "codebase graph" crate (`xai-codebase-graph`) does static-analysis-style
  indexing (`languages/{golang,javascript,python,rust,ts}.rs`, a
  `scope_graph/` with `edges.rs`/`nodes.rs`/`graph.rs`, `manager/` with
  `builder.rs`/`cache.rs`/`lock.rs`) — presumably backing a code-search or
  code-navigation tool, similar to a symbol index. Not read in detail.

## Safety / Sandboxing / Permissions

- OS-level sandboxing is `xai-grok-sandbox`
  (`crates/codegen/xai-grok-sandbox/src/lib.rs`), built on the `nono`
  crate (Landlock on Linux, Seatbelt on macOS — per doc comment
  `lib.rs:1375071-1375075`). Explicitly scoped: covers in-process
  `tokio::fs` calls and spawned child processes; **network is left open at
  the process level** (the agent itself needs to reach the LLM API), but
  **child-process network is blocked per-subprocess via seccomp**
  (`lib.rs:1375073-1375075`) — i.e. the agent can always talk to its own
  backend, but tools/subprocesses it spawns (e.g. a shell command) get
  network cut off by default.
- Sandbox application is a one-way ratchet: `SandboxManager::apply()` is
  explicitly documented **"Irreversible"** (`lib.rs:1375250`) and is
  applied once at process startup. If the platform doesn't support
  sandboxing, it "degrades gracefully" and logs a warning rather than
  failing the process (`lib.rs:1375267-1375279`), but records a
  `SandboxEvent::apply_failed` for observability.
- Five built-in profiles: `Workspace` (default), `Devbox`, `ReadOnly`,
  `Strict`, `Off`, plus arbitrary `Custom(String)` profiles loaded from
  `~/.grok/sandbox.toml` (global) and `.grok/sandbox.toml` (project,
  additive-only) — `profiles.rs:1177460-1177624`. Only `ReadOnly` and
  `Strict` restrict child network by default
  (`profiles.rs:1177543-1177546`).
- A load-bearing security invariant, stated directly in a code comment: a
  **project-level `sandbox.toml` cannot redefine a profile name already
  defined globally** — "last-write-wins would let a malicious workspace
  hollow out a user/enterprise custom profile (e.g. empty `deny` / broad
  `read_write`) while keeping the trusted name"
  (`profiles.rs:1177577-1177582`, enforced in
  `merge_project_profiles`/`load_sandbox_config`,
  `profiles.rs:1177583-1177631`). `sandbox_profile_conflicts()` surfaces
  a diagnostic when project and global profiles of the same name disagree
  (`profiles.rs:1177601-1177623`).
- A related fail-closed decision, also directly commented: for the Linux
  child-network seccomp filter, the code deliberately arms on the
  _configured_ `restrict_network` value rather than on whether Landlock
  itself actually applied successfully — "arming in those states is the
  fail-closed direction" (i.e. don't silently disarm child-network
  protection just because an unrelated Landlock layer degraded) —
  `lib.rs:1375154-1375162`.
- A separate "hook write-deny" mechanism (`hook_write_deny.rs`) protects
  the hook-definition files themselves from being rewritten by a
  compromised/malicious in-session process — `requires_hook_write_deny()`
  is checked before `Sandbox::apply()`, and the shell "fails closed when
  protection cannot be applied" (per doc comment,
  `lib.rs:1375116-1375118`).
- Fine-grained, rule-based **tool-call permission policy** (distinct from
  the OS sandbox) lives in `xai-grok-config-types::permission`
  (`crates/codegen/xai-grok-config-types/src/permission.rs`). A
  `PermissionConfig` is a list of `PermissionRule { action, tool, pattern,
pattern_mode }`. Actions are `Allow | Deny | Ask`, and — flagged
  explicitly in a comment referencing **CWE-1188** — the enum's `#[serde
(default)]` was deliberately changed to `Deny` (not `Allow`) so that
  omitting the `action` field in a TOML rule cannot silently create a
  catch-all allow rule (`permission.rs:342821-342833`). `ToolFilter` is a
  closed enum over tool categories (`Bash`, `Edit`, `Read`, `Grep`, `Mcp`,
  `WebFetch`, `AgentMessage`) with `#[non_exhaustive]` for forward
  compatibility, plus a `PatternMode::Domain` variant specifically for
  matching a `WebFetch(domain:...)` pattern against the URL host rather
  than the full URL string (`permission.rs:342816-342850`) — i.e.
  domain-scoped web-fetch allow/deny rules are a first-class concept.
- A "folder trust" gate also exists (referenced heavily in
  `xai-grok-pager` test names — `folder_trust_cwd_is_home_git_repo_no_prompt.rs`,
  `folder_trust_decline_quits_without_grant.rs`,
  `folder_trust_question_renders_and_accept_persists_grant.rs`) — i.e. the
  CLI prompts for and persists a trust grant per project directory before
  running, similar to VS Code / Claude Code's workspace-trust model. Not
  read directly, inferred from test file names only.
- Secrets handling has its own crate, `xai-grok-secrets`
  (`sanitizer.rs`) — not read, but its existence as a standalone crate
  (rather than ad hoc regexes scattered around) suggests centralized
  secret redaction, consistent with the `debug_redact.rs` module also
  seen in `xai-proto-build`.

## Configuration & Extensibility

- Config loading is `xai-grok-config`
  (`crates/codegen/xai-grok-config/src/loader.rs`). TOML files are read
  and parsed with `$VAR` environment-variable expansion
  (`load_toml_file`, `loader.rs:1140589-1140594`), and parse errors are
  deliberately rendered **without** ever including the offending source
  line — because `toml::de::Error`'s `Display` impl echoes the source
  line verbatim, "which may carry a secret," so a custom
  `toml_error_detail()` formats only `"line L, column C: <message>"`
  (`loader.rs:1140596-1140612`) — this same redacted-error string is
  reused by a diagnostic "trace `config_files` artifact" so the
  redaction rule lives in exactly one place (comment,
  `loader.rs:1140598-1140600`).
- Layered config resolution: user config (`$GROK_HOME/config.toml`),
  `managed_config.toml` (presumably org/enterprise-controlled — separate
  filename constant, `loader.rs:1140647-1140648`), and a
  `requirements.toml` described as "the sibling server-synced artifact"
  (cloud-cache of policy requirements, `loader.rs:1140650-1140651`) —
  each layer merged via `crate::validation`, with config files sitting
  underneath requirements layers per the module doc
  (`loader.rs:1140553-1140556`).
- `xai-grok-config` also has a `signed_policy/` module and a
  `managed_cache/` module (`claim_tests.rs`, `tests.rs` in each) —
  suggesting managed/enterprise config is cryptographically signed and
  cached, distinct from ordinary user TOML. Not read in depth.
- Model definitions ship as static JSON:
  `crates/codegen/xai-grok-models/default_models.json`
  (directory-listing only) alongside a small `lib.rs`.
- Slash commands (`/model`, `/effort`, `/personas`, `/mcps`, `/plugin`,
  `/workflow`, etc. — `crates/codegen/xai-grok-pager/src/slash/commands/`)
  are the primary in-session extensibility surface exposed to the end
  user, distinct from the plugin/marketplace system that extends the
  agent's own tool/skill/hook surface.
- Distribution: the CLI ships via npm with per-platform packages
  (`crates/codegen/xai-grok-pager/npm/grok-{darwin,linux,win32}-{arm64,x64}/`,
  a shim `grok` package with `postinstall.js`), plus native install
  scripts (`install.sh`, `install.ps1`, `install-enterprise.sh/.ps1`) —
  directory-listing only.

## Distinctive Design Choices

- **Leader/client daemon architecture**: `main.rs` resolves a "leader
  mode" (`resolve_leader_mode`, `resolve_use_leader`,
  `connect_or_spawn`) allowing multiple CLI front-ends to attach to one
  shared backing process/session (`main.rs:1747093-1747107`) — a
  client/server split not obviously present in comparable single-process
  CLI agents.
- **Fail-closed defaults, applied consistently across layers**: permission
  rules default to `Deny` (CWE-1188 comment,
  `permission.rs:342826-342833`), child-network seccomp arms on configured
  intent rather than confirmed enforcement (`lib.rs:1375154-1375162`),
  sandbox hook-write-deny fails closed if it can't be applied
  (`lib.rs:1375116-1375118`), and a compromised workspace cannot override
  a global custom sandbox profile of the same name
  (`profiles.rs:1177577-1177582`). This is a recurring, explicitly
  reasoned-about theme rather than one-off hardening.
- **Hooks fail open, not closed, on error** — the inverse policy from the
  above, deliberately: "only a healthy deny blocks"
  (`dispatcher.rs:1342319`) so a broken third-party hook script can't
  itself become a denial-of-service that blocks all tool calls.
- **Explicit provenance-tagging against prompt injection**: synthetic
  user-role messages that actually originated from another agent are
  labeled in-band before being sent to the model — `"[Message authored by
another agent; not a human request or approval.]"`
  (`compaction_utils.rs:1136745-1136773`) — a lightweight but concrete
  mitigation against an agent-to-agent (subagent/multi-agent) message
  being mistaken for a genuine user instruction or approval.
- **TodoGate**: a runtime mechanism that can forcibly continue a turn
  (inject a system-reminder and prevent `TurnOutcome::Completed`) if
  todos are left pending, but ships **disabled by default** and is capped
  at a small number of fires per prompt specifically to bound worst-case
  extra inference cost (`system_reminder.rs:50581-50609`) — a rare
  instance of a "nag the model to finish its task list" feature with an
  engineered cost ceiling.
- **Cross-provider tool-name normalization**: MCP tool names are
  validated against the intersection of Anthropic/OpenAI/Gemini naming
  rules up front (`servers.rs:1458591-1458620`), rather than per-provider
  at request time — this CLI is evidently built to be backend-agnostic
  across model providers, not xAI-only, despite being xAI's own product.
- **Data-preserving failure modes for local stores**: the workspace/
  dashboard SQLite store never deletes or truncates a corrupt or
  newer-schema file — it stays on disk, read-only if necessary, for
  manual recovery (`error.rs:342904-342957`). Consistent with the
  fail-closed-but-preserve-user-data ethos above.
- **Markdown-as-database for memory**: cross-session memory is stored as
  human-readable/editable markdown files on disk (not just an opaque
  vector DB), with a SQLite+`sqlite-vec` index layered on top purely for
  retrieval — the source of truth is the markdown (`lib.rs:1046424-1046437`).

## What's NOT in This Repo

Given the scale of the dump (~1.8M lines) and the incremental-read
constraint, the following is either genuinely absent, only partially
verified from directory names, or simply not investigated — flagged
honestly rather than guessed at:

- **`xai-grok-tools` crate contents were never located/read.** `ToolBridge`,
  `ToolRegistry`, `ToolDefinition`, `SessionContext`, and `ToolState` are
  referenced throughout (`agent.rs`, `servers.rs`) as living in
  `xai_grok_tools`, but this crate did not appear as a top-level path in
  the portion of `<directory_structure>` I read (offset 1–2000 lines,
  which only reached partway through `crates/codegen/`). It's plausible
  the crate lives further down the (very long) directory tree, past what
  was read, or under a different top-level `crates/` subdirectory (e.g.
  `crates/` itself, outside `codegen/`) not covered by the 2000-line
  window. **This is the single biggest gap** — the actual tool-dispatch/
  execution engine (as opposed to its UI rendering and its MCP/plugin
  wrappers) was not confirmed.
- **`xai-agent-lifecycle`'s contributor/pipeline pattern** (`local/` vs
  `send/`, each with `contributors/{command,session_lifecycle,turn_input,
turn_lifecycle}.rs`) was identified by directory listing only — not
  read. This is likely where the actual "turn loop" orchestration lives,
  and is a strong candidate for a follow-up deep-read.
- **The `doom_loop.rs` / `doom_loop_recovery.rs` modules** in
  `xai-grok-sampler` were not read — name suggests detection/recovery
  from repetitive or stuck model behavior, but the mechanism is
  unverified.
- **The `dream.rs` / `dream_lock.rs` modules** in `xai-grok-memory` were
  not read — plausibly a background memory-consolidation ("dreaming")
  pass, but unverified.
- **No test/snapshot content was read** (the `tests/`, `snapshots/`,
  `scenarios/*.yaml` trees under `xai-grok-pager` alone list hundreds of
  files) — these encode a huge amount of expected TUI/PTY behavior but
  were skipped entirely as out of scope for an architecture pass.
- **The terminal-rendering stack** (`xai-grok-pager-render`,
  `xai-grok-markdown`, `xai-grok-mermaid`, the `scrollback/` module tree
  with dozens of `blocks/*.rs` and `views/*.rs` files) was only seen via
  directory listing — this is clearly a large, sophisticated custom TUI
  engine (image overlays, kitty keyboard protocol, bidi text, OSC8
  hyperlinks, tmux probing, mouse/scroll handling) but none of it was
  read; this document makes no claims about its internals.
- **`xai-fast-worktree`** (git worktree pooling with btrfs/overlay/NFS
  copy-on-write backends, `db/`, `git/safety/`, `nfs/`) looks like a
  significant, separate piece of engineering for fast workspace cloning —
  not investigated.
- **Voice input** (`xai-grok-pager/src/voice/`), **screen sharing**
  (`share_cmd.rs`), and **subscription/billing** (`billing.rs`,
  `subscription.rs`) surfaces exist per directory listing but were not
  examined.
- No claims are made here about the **actual LLM/model backend
  integration details** (auth flow specifics beyond noting `xai-grok-auth`
  exists, rate limiting, retry/backoff tuning) beyond what was directly
  read in `servers.rs` and the crate names in `xai-grok-sampler`.
