# OpenAI Codex CLI — Architecture Notes

Source: Repomix-flattened dump at
`/Users/coltonajackson/Code/Resources/GitHub/AI/OpenAI/codex/REPO.md` (~1.85M lines).
All paths below are relative to the repo root and refer to files inside that
dump (the dump mirrors the real `codex-rs/` and `codex-cli/` tree exactly, so
these paths are also valid paths in a checked-out clone).

This is a large, mature Rust monorepo (~100 crates under `codex-rs/`), not a
small chat-loop CLI. The thin `codex-cli/` directory is just an npm wrapper
(`codex-cli/bin/codex.js`) around prebuilt Rust binaries; essentially all
logic lives in `codex-rs/`.

---

## Agent Loop / Core Execution Model

The core turn loop lives in `codex-rs/core/src/session/turn.rs`, function
`run_turn`. Its own doc comment states the model precisely:

> "Takes initial turn input and runs a loop where, at each sampling request,
> the model replies with either: requested function calls, or an assistant
> message... If the model requests a function call, we execute it and send
> the output back to the model in the next sampling request. If the model
> sends only an assistant message, we record it in the conversation history
> and consider the turn complete."

Concretely (`codex-rs/core/src/session/turn.rs`, function body starting
~line 1792420):

- Before each turn, pending async hook results are drained (`drain_async_hook_results`).
- `run_pre_sampling_compact` may run auto-compaction before the request is built.
- A `ModelClientSession` is created/reused (turn-scoped; caches WebSocket + sticky routing state) and reused across in-turn retries.
- The function enters a `loop { ... }` (line ~1792568) that: drains any pending user input queued mid-turn (steering), runs hooks, captures a `StepContext` (assembled prompt + tool surface for that step), issues the sampling request, and handles the streamed response.
- The loop terminates (`break`) when the model returns a plain assistant message with no further tool calls, when hooks signal early termination, or on unrecoverable errors (several `return Ok(None)` / `return Ok(None)` early-outs for aborted/interrupted turns).
- Tool call results are appended to history and looped back into the next sampling step — this _is_ the "ReAct"-style tool loop, but wrapped in substantial turn/step bookkeeping (`step_context.rs`, `step_activation.rs`, `step_settings.rs`).

Streaming is handled via `ResponseEvent`/`client_common::Prompt` and a set of
event handlers in `codex-rs/core/src/stream_events_utils.rs` (referenced from
`turn.rs`): `handle_output_item_done`, `finalize_non_tool_response_item`,
`handle_non_tool_response_item`, etc. — deltas are surfaced as
`AgentMessageContentDeltaEvent`, `ReasoningContentDeltaEvent`,
`PlanDeltaEvent`, etc. (`codex-rs/protocol/src/protocol.rs`).

Turns are the unit of work; a "Task" wraps turns for higher-level flows
(`codex-rs/core/src/tasks/{regular.rs,compact.rs,review.rs,user_shell.rs,lifecycle.rs}`).
Mid-turn compaction and pre/post-turn compaction are distinct code paths
(`codex-rs/core/src/compact.rs`, `compact_remote.rs`, `compact_remote_v2.rs`).

## Tool/Extension System

Tools are modeled with a `ToolRouter` (`codex-rs/core/src/tools/router.rs`)
that owns a `ToolRegistry`, the model-visible `ToolSpec` list, a `ToolMode`,
and namespace metadata. Key structs/enums:

- `ToolCall { tool_name: ToolName, call_id, payload: ToolPayload, encrypted_function_args }`
- Tool names carry an explicit **namespace** (e.g. `"collaboration"` for
  `spawn_agent`/`send_message`/`followup_task`), letting the router
  distinguish plain function calls from higher-level orchestration calls.
- `codex-rs/core/src/tools/spec_plan.rs` builds the finalized "tool plan" per
  turn (`build_tool_router`), i.e. tool availability is **recomputed per
  turn/step**, not fixed at session start — this lets MCP servers,
  connectors, and plugins come and go mid-session.

Individual built-in tools live in `codex-rs/core/src/tools/handlers/*.rs`:
`shell` (`shell_spec.rs`), `apply_patch.rs` (unified diff patch tool, backed
by the separate `codex-rs/apply-patch` crate with its own hunk parser and a
`tests/fixtures/scenarios/NNN_*` fixture suite), `unified_exec/` (interactive
process/PTY exec with stdin write support), `mcp.rs`/`mcp_resource.rs` (MCP
tool + resource bridging), `multi_agents.rs` / `multi_agents_v2.rs` (sub-agent
spawn/send/wait — Codex supports spawning and messaging _other agent
threads_ as a first-class tool surface), `request_permissions.rs`,
`request_user_input.rs`, `view_image.rs`, `tool_search.rs` (a meta-tool for
searching/discovering other tools), `code_mode/` (a distinct "code execution"
tool family, see below).

**MCP support** is extensive and split across several crates:

- `codex-rs/rmcp-client/` — the actual MCP client (`rmcp` = "rust MCP") transport, including an OAuth login flow (`McpServerOauthLogin*`) and elicitation support.
- `codex-rs/codex-mcp/` — connection management, tool catalog caching, per-server plugin config, resource-origin tracking, `connection_manager/` (startup, status, required-server resolution, tool_catalog).
- `codex-rs/mcp-server/` — Codex itself can run _as_ an MCP server (`codex_tool_runner.rs`, `codex_tool_config.rs`), exposing its own agent as a tool to other MCP hosts.
- MCP elicitation (interactive prompts from an MCP server back to the user) is modeled explicitly (`McpServerElicitationRequestParams/Response`, `codex-rs/core/src/elicitation.rs`).
- `dynamic_tools.rs` (both in `core` and `app-server`) lets a host register ad hoc tool specs at runtime, independent of MCP.

There is also a **"Code Mode"** subsystem (`codex-rs/code-mode/`,
`code-mode-host/`, `code-mode-protocol/`, `code-mode-runtime/`) — a gRPC-based
sandboxed JS/V8 execution environment (`v8_init.rs`, `cell_actor/`,
`session_runtime/`) that lets the model execute arbitrary code as a "cell" in
a remote/local runtime, distinct from plain shell exec. This is an unusual,
fairly deep subsystem not typical of chat-loop CLIs.

## Context & Memory Management

**AGENTS.md is the explicit project-memory convention**, implemented in
`codex-rs/core/src/agents_md.rs`. Its module doc:

> "Project-level documentation is primarily stored in files named
> `AGENTS.md`. ... We include the concatenation of all files found along the
> path from the project root to the current working directory as follows: 1.
> Determine the project root by walking upwards ... until a configured
> `project_root_markers` entry is found (default `[".git"]`). 2. Collect
> every `AGENTS.md` found from the project root down to the current working
> directory (inclusive) and concatenate their contents in that order. 3. We
> do not walk past the project root."

Notable details: an override file `AGENTS.override.md` is preferred locally;
concatenation uses a fixed separator `"\n\n--- project-doc ---\n\n"`; size is
capped via `project_doc_max_bytes` (default `32768`, see
`codex-rs/config/defaults.toml`); additional fallback filenames are
configurable (`project_doc_fallback_filenames`, empty by default). Discovery
is done through the sandboxed exec-server filesystem abstraction
(`codex_exec_server::ExecutorFileSystem`), not raw `std::fs`, so it works
identically for local and remote/sandboxed environments.

**Context assembly** happens through a large `context/` module
(`codex-rs/core/src/context/`) with per-concern instruction builders:
`base_instructions.rs`, `environment_context.rs`, `developer_instructions.rs`,
`permissions_instructions.rs`, `plugin_instructions.rs`,
`multi_agent_mode_instructions.rs`, `personality_spec_instructions.rs`,
`guardian_policy.rs` (safety-review context), `token_budget_context.rs`, and
a `world_state/` submodule that snapshots the full renderable state
(agents.md, apps, collaboration mode, environment, permissions, plugins,
realtime) with golden snapshot tests per concern
(`codex_core__context__world_state__*.snap`).

**Compaction** is a first-class, multi-strategy subsystem:
`codex-rs/core/src/compact.rs` (local/inline auto-compact),
`compact_remote.rs` / `compact_remote_v2.rs` (server-side compaction via the
Responses API, with an image-budget variant), plus pre-turn, mid-turn, and
manual compaction paths, all covered by golden-shape snapshot tests
(`core/tests/suite/snapshots/all__suite__compact__*.snap`). Compaction is
explicitly hooked (`run_pre_compact_hooks`/`run_post_compact_hooks`) and
tracked with dedicated analytics events (`CodexCompactionEvent`,
`CompactionPhase`, `CompactionTrigger`, `CompactionStrategy`).

**Session persistence** is handled by `codex-rs/rollout/` (a "rollout" is a
persisted transcript/session file — `rollout/src/list.rs`, `metadata.rs`,
`maintenance.rs`, plus `rollout-trace/` for structured tracing) and
`codex-rs/thread-store/` for higher-level thread resume/fork/revert/rollback
operations exposed over the app-server protocol (`ThreadResumeParams`,
`ThreadForkParams`, `ThreadRevertParams`, `ThreadRollbackParams` in
`app-server-protocol/schema/json/v2/`). Sessions can be forked, reverted to
an earlier turn, or rolled back, which is more session-management machinery
than a typical CLI exposes.

## Safety / Sandboxing / Permissions

This is the most elaborate subsystem in the repo, split across three crates
plus per-OS helper binaries:

- **`codex-rs/sandboxing/`** — the OS-agnostic policy/manager layer
  (`manager.rs`: `SandboxManager`, `SandboxType`, `get_platform_sandbox`,
  `compatibility_sandbox_policy_for_permission_profile`). Per-OS backends are
  conditionally compiled: `bwrap.rs` + `landlock.rs` (Linux), `seatbelt.rs`
  (macOS, `#[cfg(target_os = "macos")]`, with `.sbpl` seatbelt-policy source
  files checked into the crate: `seatbelt_base_policy.sbpl`,
  `seatbelt_network_policy.sbpl`, `seatbelt_preferences_policy.sbpl`,
  `seatbelt_read_only_platform_defaults.sbpl`), and `windows.rs`
  (restricted-token / elevated backends, re-exporting
  `codex_windows_sandbox::WindowsSandboxProxySettingsMode`). It also tracks
  **sandbox violations** as first-class events
  (`FileSystemSandboxViolation`, `NetworkSandboxViolation`,
  `record_filesystem_sandbox_violation`, `record_network_sandbox_violation`)
  and has heuristics to detect "was this exec denied by the sandbox"
  (`denial::is_likely_sandbox_denied`, `is_likely_executor_managed_sandbox_denied`).
- **`codex-rs/linux-sandbox/`** — a standalone Linux sandbox launcher binary
  wrapping `bubblewrap` (bwrap) and Landlock, with its own bundled/vendored
  bwrap binary (`bundled_bwrap.rs`) as a fallback when the system doesn't
  have one, plus a network proxy indirection layer (`proxy_routing.rs`,
  `proxy_lifecycle.rs`).
- **`codex-rs/windows-sandbox-rs/`** and `codex-rs/execpolicy/` (a rule-based
  command-execution policy: `policy.rs`, `rule.rs`, `decision.rs`,
  `amend.rs`, with a `.codexpolicy` DSL, `example.codexpolicy`).
- **`codex-rs/exec-server/`** — a large "executor" abstraction: shell
  commands, file reads/writes, and even sub-agent processes are routed
  through a remote-capable RPC/relay layer (`relay.rs`, `noise_relay/` —
  Noise-protocol encrypted channel — `websocket.rs`) so that command
  execution can run in a genuinely separate (possibly remote/cloud) sandboxed
  environment, not just an in-process fork/exec. This lets Codex run "cloud
  sandboxes" as an alternative to local OS sandboxing.

Policy model (`codex-rs/protocol/src/protocol.rs`, ~line 1709509 in the dump):

- `AskForApproval` enum: `UnlessTrusted` (untrusted projects — deny unless an
  explicit exec-policy rule allows it), `OnRequest` (default — model decides
  when to ask), `Granular(GranularApprovalConfig)` (independent booleans for
  `sandbox_approval`, `rules`, `skill_approval`, `request_permissions`,
  `mcp_elicitations` — each category can be auto-approved or auto-denied
  separately), and `Never` (fully autonomous; failures returned to the model,
  never surfaced to a human).
- `NetworkAccess` enum: `Restricted` (default) / `Enabled`.
- `SandboxPolicy` enum: `DangerFullAccess`, `ReadOnly { network_access }`,
  `ExternalSandbox { network_access }` (process already inside an external
  sandbox — trust it, just track the network setting), `WorkspaceWrite {
writable_roots, network_access, exclude_tmpdir_env_var, ... }` (read-only
  everywhere plus explicit writable roots, defaulting to cwd + `$TMPDIR` +
  `/tmp`).

Approval requests themselves are typed RPCs the client must answer
(`ExecCommandApprovalParams/Response`, `ApplyPatchApprovalParams/Response`,
`CommandExecutionRequestApprovalParams/Response`,
`FileChangeRequestApprovalParams/Response`,
`PermissionsRequestApprovalParams/Response` — all in
`app-server-protocol/schema/json/`), i.e. approval is a first-class part of
the wire protocol, not just a CLI prompt.

There's also a **"Guardian"** layer (`codex-rs/core/src/guardian/`,
`context/guardian_*`) — a distinct, higher-level safety-review pass with its
own risk levels (`GuardianRiskLevel`), approval-review lifecycle
(`GuardianApprovalReviewStatus`), and prompt templates
(`core/assets/guardian/policy.md`, `policy_template.md`,
`node_repl_policy.md`) — seemingly a secondary reviewer/critic model or
policy engine layered on top of the sandbox+approval system, specifically
flagged for command sources like the "node REPL" (code-mode's JS runtime).

## Configuration & Extensibility

Config is TOML-based, layered, and quite sophisticated
(`codex-rs/config/src/`):

- `defaults.toml` — fixed baked-in defaults (e.g.
  `cli_auth_credentials_store = "file"`, `mcp_oauth_credentials_store =
"auto"`, `project_doc_max_bytes = 32768`, `project_root_markers = [".git"]`,
  `[history] persistence = "save-all"`).
- A `ConfigLayer`/`ConfigLayerSource` model
  (`config_layer_source.rs`, `merge.rs`, `merge_toml_values`) supports
  multiple config sources merged with defined precedence — user config,
  project config, managed/enterprise-pushed config
  (`requirements_layers/` — `hooks.rs`, `permissions.rs`, `rules.rs`,
  `models.rs`, with a "requirements stack" model, `stack.rs`), cloud-bundle
  config (`cloud_config_bundle.rs`, `cloud_config_layers.rs`), and CLI
  overrides (`overrides.rs`).
- `config/src/loader/` handles discovery (`project_discovery.rs`,
  `managed_project_discovery_tests.rs`) and per-OS specifics (`macos.rs`).
- **Profiles**: `profile_toml.rs`.
- **Permission profiles**: a named, reusable bundle of sandbox/network/tool
  settings (`permission_profile_catalog.rs`,
  `permission_profile_selection.rs`, exposed over the protocol as
  `PermissionProfileListParams/Response`,
  `RequestPermissionProfile`, `ActivePermissionProfile`).
- **MCP server config**: `mcp_edit.rs`, `mcp_types.rs`, `mcp_requirements.rs` — MCP servers are configured declaratively and can be required/optional per project via the requirements-layer stack.
- **Plugin/marketplace mechanism**: a genuine plugin system exists —
  `codex-rs/app-server/src/request_processors/plugins/` (local + search),
  `plugin_edit.rs`, `PluginInstallParams/Response`,
  `MarketplaceAddParams/Response`, `PluginShare*` (a plugin can be shared with
  other users/orgs — `PluginShareCheckout`, `PluginShareSaveParams`,
  `PluginSharePrincipal` with roles). This is a full plugin marketplace with
  install/uninstall/search/share, not just a config toggle.
- **Skills**: `codex-rs/skills/` is a separate first-class "skills" system
  (matching Claude's own SKILL.md convention) — bundled sample skills exist
  under `core/assets/agent/builtins/` and `skills/src/assets/samples/*`
  (`imagegen`, `openai-docs`, `plugin-creator`, `skill-creator`,
  `skill-installer`, `review-agent`), each with its own `SKILL.md`,
  `references/`, `scripts/`. `.codex/skills/` at the repo root shows this
  dogfooded on Codex's own repo (e.g. `babysit-pr`, `code-review-*`,
  `test-tui`).

## Distinctive Design Choices

- **Sub-agents / multi-agent orchestration as a core primitive**, not a
  bolt-on: `codex-rs/core/src/tools/handlers/multi_agents_v2/` (spawn, list,
  interrupt, send_message, followup_task, wait), `codex-rs/agent-roles/`
  (declarative agent role config + discovery), `codex-rs/agent-identity/`,
  `codex-rs/agent-graph-store/` (persisted graph of agent relationships),
  and a `CollaborationMode`/`MultiAgentMode` concept baked into the protocol
  and context builders.
- **"Code Mode"**: letting the model write and execute actual JS/TS code
  against a structured tool API (via an embedded V8 runtime,
  `code-mode-runtime/src/v8_init.rs`) instead of one JSON tool-call per
  action — a notably different tool-calling paradigm from plain
  function-calling, aimed at multi-step tool orchestration in fewer round
  trips.
- **Remote/cloud sandboxed execution as a peer of local sandboxing**: the
  `exec-server` crate's Noise-encrypted relay and `remote_process.rs` /
  `remote_file_system.rs` let shell/file operations run against a remote
  execution environment transparently, with the same approval/sandbox policy
  model applying either way.
- **A distinct "Guardian" safety-critic layer** on top of approval
  policies — effectively a second opinion / policy engine for
  higher-risk actions, with its own prompt templates and risk-level taxonomy.
- **Plugin marketplace with sharing/roles** (`PluginShare*` types) — treats
  plugins as shareable, ACL'd artifacts, closer to an app store than a config
  file.
- **Rollout fork/revert/rollback** as protocol-level operations
  (`ThreadForkParams`, `ThreadRevertParams`, `ThreadRollbackParams`) — session
  history is treated as an editable, branchable artifact, not just an
  append-only log.
- **Windows is genuinely first-class**: dedicated `windows-sandbox-rs`,
  Windows restricted-token vs. elevated sandbox modes
  (`windows_sandbox_uses_elevated_backend`), PowerShell-specific dangerous
  command detection with a tree-sitter PowerShell parser
  (`shell-command/src/command_safety/powershell_tree_sitter.rs`) — sandboxing
  isn't a Unix-only afterthought here.
- **Analytics/telemetry as a dedicated crate** (`codex-rs/analytics/`) with
  typed fact/event schemas (`facts.rs`, `events.rs`, `reducer.rs`) rather than
  ad hoc logging calls scattered through the codebase.

## What's NOT in This Repo

- No evidence of a Python or non-Rust "core" — `codex-cli/` (npm) is purely a
  thin launcher (`bin/codex.js`) for prebuilt native binaries; all logic is
  in `codex-rs/`.
- Did not find (and did not have budget to fully confirm the absence of) a
  vector-store/RAG-style semantic memory subsystem — the "memory" primitives
  found (`codex-rs/memories/read/`, `memories/write/`) appear oriented around
  citation-tracked "memory write/read" phases tied to specific extensions
  (`ad_hoc.rs`, `prune.rs`) rather than a general embeddings/vector-DB layer;
  this would need a dedicated follow-up read to characterize precisely.
- The TUI (`codex-rs/tui/`, ~1,700 directory-listing lines, not opened in
  this pass) and the full MCP `rmcp-client` transport internals were located
  but not read in depth — flagged as the largest remaining gaps if deeper
  UI or MCP wire-protocol detail is needed later.
- Full contents of `app-server/` request processors (60+ files) were seen
  only in directory-listing form, not read — this is where most of the
  IDE/desktop-app-facing RPC surface (thread lifecycle, remote control,
  realtime voice, environments) lives, and is worth a dedicated pass if the
  goal is to understand the desktop/IDE integration surface specifically.
