# Antigravity CLI — Architecture Notes (from REPO.md, Repomix dump)

Source: `/Users/coltonajackson/Code/Resources/GitHub/AI/Google/antigravity-cli/REPO.md`
(1115 lines: file summary, directory tree, two GitHub issue templates, two example
scripts (statusline, title), README.md, and a full CHANGELOG.md from v1.0.0 to v1.1.22.)
This is confirmed to be the public wrapper repo — no source code is present, only
docs/examples/changelog, as expected. All findings below are inferred from changelog
entries describing user-visible behavior, not from reading implementation code.

## Agent Loop / Core Execution Model

- "Shared Core Agent Engine": both the CLI (TUI) and Antigravity 2.0 (GUI) run on
  the same underlying agent engine; settings/permissions sync bidirectionally, and
  a terminal session can be exported to continue in the GUI.
- Execution modes cycle via `shift+tab` / `--mode`: `default` -> `accept-edits` -> `plan`,
  plus `request-review` (the default) which pauses before file writes to show a
  line-level diff for accept/reject. Cycling is described as "publicly available" in
  1.1.0, implying it existed internally earlier.
  - Permission modes referenced elsewhere include `always-proceed`,
    `proceed-in-sandbox`, and `strict`/request-review — auto-approval behavior
    differs materially by mode (1.1.21, 1.1.11, 1.0.1).
- 1.1.17: "Improved the agent execution harness by consolidating onto a single
  execution path, giving more consistent tool, hook, and prompt behavior" — implies
  there previously were multiple divergent execution paths (interactive vs
  headless/print vs subagent), later unified.
- Background tasks and subagents run concurrently with the main loop and are
  tracked in a status line / `/tasks` panel; a "forced-continuation deadlock" bug
  (1.1.12) describes a coordinator injecting empty "continue" steps while waiting on
  active subagents/background tasks, up to an "invocation limit" — implying a
  bounded-turn-count safety valve on the loop.
- Reasoning "effort" is a first-class, model-independent axis (`/effort`, `--effort`),
  separate from model selection (`/model`, `--model`), with per-model support for
  effort variants.
- Print/headless mode (`-p`/`--print`) is a distinct non-interactive execution path
  with its own structured output (`--output-format json|stream-json`), its own
  event schema (`init`, `step_update`, `result` with a closed `step_type` vocabulary),
  and historically several parity bugs vs interactive mode (permission handling,
  model/effort flags being ignored, sandbox flag not propagating, stdin swallowing).
- Conversations are persisted (moved to SQLite `.db`/`.db-wal` in 1.0.4/1.0.9) and
  support rewind/revert/branch/fork; trajectory (transcript) has a compaction /
  truncation mechanism with protected "checkpoints" and a documented bug where
  truncation logic mis-charged its size budget (1.1.11).
- `/btw` is a lighter-weight "side question" mechanism that runs against the current
  conversation without being a full turn, with its own planner/config path distinct
  from the main agent.

## Tool/Extension System

- Built-in tools mentioned by name: `manage_task`, `manage_inbox`, `manage_subagents`,
  `invoke_subagent`, `define_subagent`, `send_message`, `generate_image`,
  `read_url_content`, `search_web`, `schedule` (with `DurationSeconds`/`MaxIterations`
  params), `read_resource` (MCP), and an embedded `ripgrep` binary used for code
  search instead of shelling out to a system copy (content-addressed SHA-256
  verified, cached, atomic-rename installed — 1.1.21/1.1.16).
- MCP (Model Context Protocol) is a core extension mechanism:
  - `mcp` subcommands (`add`, `remove`, `list`, `enable`, `disable`) manage a
    user-level `mcp_config.json`, supporting both stdio and HTTP/URL-based servers,
    with `--type`, `--env`, `--header` flags.
  - MCP OAuth support including client-ID metadata documents and relaxed issuer
    validation for non-strict providers (Salesforce, Atlassian).
  - MCP tool call results can include embedded/binary resources; large blobs are
    offloaded to disk, small text/image inlined.
  - Startup loads MCP servers with timeouts (default increased to 60s in 1.0.15) and
    in parallel (1.0.4) so one slow server doesn't block others; interactive mode
    loads MCP in background so a hanging server doesn't stall the first turn, while
    headless/one-shot runs still block to guarantee full toolset visibility.
  - A configurable per-session tool-declaration limit exists and was raised to
    accommodate large MCP/plugin/skill setups (1.1.12).
- Custom Agents: Markdown-based (`agent.md` with YAML frontmatter + H1 system
  prompt) since 1.1.6, supporting fields like `mainAgent`, `subagent`, `hidden`,
  `inheritMcp`, `commandExecutionPolicy`, `model` (defaulting to `inherit`), `rules`,
  and later a single `inheritCustomizations` switch replacing several per-kind
  inheritance defaults. Dynamically defined subagents (`define_subagent`) also write
  this Markdown format.
- Skills: `SKILL.md` frontmatter-driven, discovered from workspace/global/plugin
  directories; supports `metadata.icon` (emoji), `disable-slash-command: true` to
  hide from the `/` menu while remaining invocable by the model, and a built-in
  `antigravity_guide` reference skill.
- Plugins: top-level manifest declares skills/rules/hooks/MCP servers they ship;
  enablement state lives centrally in `config.json` seeded from the plugin manifest
  (so a plugin's own `"disabled": true` default can't silently flip existing users);
  plugins can be installed from GitHub subpaths with branch resolution and support
  Git submodules.
- Hooks: `hooks.json` supports `PreInvocation`/`PostInvocation`/`Stop`/pre-tool
  hooks; ordering was fixed so custom hooks run before built-in termination checks;
  a `Stop` hook that always blocks is now capped after N consecutive continuations
  to prevent infinite hangs.
- Subagents nest arbitrarily deep ("grandchild and deeper"), with tool-confirmation
  and state relayed recursively to the root conversation; stopping a subagent tree
  was buggy (only stopped the invoking conversation, not descendants) until fixed.

## Context & Memory Management

- `/context` and `/usage` panels show context-window usage; status line JSON
  exposes `context_window.used_percentage` (used by the example statusline script).
- Context compaction exists with visible boundary indicators in the transcript
  (1.1.3) and a truncation algorithm that charges byte budget only against
  reclaimable step content, not protected checkpoints (1.1.11 fix).
- "Customizations" (rules, skills, agents, hooks, plugins) are discovered via
  directory walks that are cached/consolidated for startup latency, with
  deterministic sort order specifically to avoid "needless prompt-cache misses" —
  i.e., prompt-cache stability is a designed-for concern.
- A `rules:` frontmatter key lets an agent pin specific rule files instead of
  inheriting the full rule tree (1.1.15).
- No detail on long-term/cross-session memory beyond conversation persistence
  (SQLite-backed transcripts, resumable via `/resume`, exportable to the GUI).

## Safety / Sandboxing / Permissions

- Sandbox is explicit and separately toggleable (`sandbox.enabled` in statusline
  JSON; `--sandbox` flag; `proceed-in-sandbox` permission mode auto-approves only
  commands staying inside it).
- Sandbox grants read-only access to a repo's `.git` directory (not writable) so
  the agent can inspect but not rewrite repo metadata (1.1.10); `.git` was also
  added to a "dangerous paths" list requiring hardening against sandbox escapes
  (1.0.9).
- Permission engine matches shell commands using tokenization; multiple historical
  bugs involved command-splitting on quoted metacharacters, regex-vs-exact matching
  of allow-rules (exact match is default; explicit `regex:` prefix opts into regex,
  1.1.13), and a critical bug where an allowlist entry tokenizing to zero words
  (e.g. `command(time)`, a comment, or `()`) matched _every_ command and
  auto-approved anything (1.1.11 fix) — a real security-relevant finding.
- Compound/chained shell commands (`git fetch && git rebase`) can be saved as a
  single allow-always rule; permission prompts show the full compound command when
  any part needs approval.
- Default access model: read access to the workspace root and system temp dir is
  auto-granted under default review mode; writes still prompt unless
  allowlisted/mode overrides. "Access outside workspace" setting was changed to
  grant read-only by default, with writes still gated by the mode's approval cycle
  (1.1.14).
- Admin/enterprise controls can restrict which MCP servers are permitted; a caching
  bug (5-minute window) let servers run before an auth-gated admin-controls check
  completed (1.1.11).
- The CLI enforces sandbox isolation in headless print mode too (was previously
  dropped — 1.0.6 fix), and print mode was hardened to soft-deny (not hang or
  silently auto-approve) tools requiring confirmation with no human present
  (1.1.3), later improved so the agent settles ambiguous choices itself rather than
  stalling (1.1.12).
- Terms of Service section explicitly names the risk categories: "autonomous code
  execution, data exfiltration, prompt injection, and supply chain risks" and asks
  users to monitor/verify agent actions — an unusually direct safety disclosure for
  a product README.
- Path/name validation hardening: `define_subagent` previously let a model-supplied
  agent name containing `..` write `agent.md` outside the conversation's artifact
  directory — a path-traversal bug fixed by validating names at both tool and
  handler layers (1.1.11).

## Configuration & Extensibility

- Config file layout (inferred from changelog): `~/.gemini/antigravity-cli/settings.json`
  and `~/.gemini/config/` (shared/global config dir), `~/.gemini/config/mcp_config.json`,
  `~/.gemini/config/hooks.json`, `~/.gemini/config/projects/` (project-specific
  permission overrides, which take precedence over global settings), and a
  `~/.gemini/antigravity-cli/cache/projects.json` workspace-to-project map. Several
  historical bugs involved writes going to the wrong/legacy path and later being
  migrated/unified.
- `keybindings.json` is fully user-remappable, generated only on first explicit use
  (not eagerly), with strict key-name validation and dedicated protection so
  `ctrl+c` can't be fully overridden (always available as interrupt/exit).
- `settings.json` writes are atomic (crash/concurrent-writer safe) and preserve
  unknown/unrecognized fields and unparseable content rather than truncating or
  reverting to defaults on parse failure — explicit design choices called out
  repeatedly across releases (1.1.20, 1.1.11, 1.0.7).
- Environment variables control CLI behavior directly: `GEMINI_API_KEY`,
  `GOOGLE_GEMINI_BASE_URL`, `AGY_CLI_HIDE_LOGO`,
  `AGY_CLI_DISABLE_ESCAPE_SEQUENCE_OPTIMIZATIONS`, `AGY_CLI_HIDE_ACCOUNT_INFO`,
  `AGY_CLI_CMD_OUTPUT_PERCENTAGE`, `AGY_CLI_DISABLE_LATEX`.
- Auth supports: system keyring (with fallbacks/timeouts tuned over many releases),
  Google Sign-In (browser-based, with SSH-aware URL printing), Gemini API key direct
  mode (`modelProvider: "gemini"`), Application Default Credentials, Workforce
  Identity Federation, and "Business" Gemini Enterprise sign-in with GCP-project
  licensing/region selection and org admin controls.
- Status line and window title are user-scriptable via stdin JSON payload (documented
  fields include `agent_state`, `vcs.branch`/`dirty`, `context_window.used_percentage`,
  `sandbox.enabled`, `artifact_count`, `subagents` (array), `task_count`, `model.display_name`,
  `terminal_width`, `cost`, `workspace.current_dir`) — a stable, documented external
  contract for building custom UI, with a `stack_with_default` option to show both
  built-in and custom status lines.
- `--output-format json|stream-json` and `--json-schema` give print mode a
  contractable, machine-checkable output shape, positioning the CLI for CI/eval
  harness use.

## Distinctive Design Choices

- Deliberate architectural split between "Antigravity CLI" (TUI, speed/keyboard/SSH-
  optimized) and "Antigravity 2.0" (GUI, orchestration-optimized) sharing one agent
  engine and settings — a documented two-surface strategy rather than a single client.
  Session export lets a terminal conversation continue in the GUI.
- Heavy investment in headless/print-mode parity as a first-class citizen (not an
  afterthought): structured NDJSON streaming with a closed step-type vocabulary,
  schema enforcement, exit-code correctness, sandbox/permission parity with
  interactive mode — evidence of designing for CI and scripted/agentic callers.
  Notably a large fraction of the 1.0.x–1.1.x changelog is _fixing_ interactive-vs-
  headless behavioral drift, suggesting these were built as separate paths initially
  and are being converged over time (explicit in 1.1.17's "single execution path").
  This convergence-through-bugfixes theme is one of the strongest signals in the file.
  For AutoForge/AI-CLI-comparison purposes, this pattern (twin execution paths,
  slow convergence via many point releases) is worth treating as a design case
  study on "if you build a headless mode later, budget for years of parity bugs."
- Model-provider abstraction: same CLI can run against Google's hosted models,
  direct Gemini API keys, GCP-billed enterprise inference, or ADC/workforce-identity
  federated auth — multiple auth/billing paths converge on one execution engine.
- Reasoning "effort" is decoupled from model choice as an orthogonal, user-facing
  dial (`/effort`, per-model effort variants, effort badges in `/model` picker and
  status line).
- Strong terminal-compatibility engineering effort: OSC 8 hyperlink detection with
  fallback, Kitty keyboard protocol re-arming guarded to avoid leaking control
  sequences as literal text on terminals that don't support it, AES-NI compile-time
  optimization to avoid DPI-firewall TLS resets, ARM64/no-AES-NI crash fixes,
  Cloud Shell rendering workaround — the CLI clearly targets a very heterogeneous
  terminal/OS/network matrix (enterprise networks, ARM SBCs, Wayland, Windows
  ConPTY, tmux/screen) as a first-order concern.
- Command-permission allowlisting bugs/fixes are numerous and specific (zero-token
  allowlist entries matching everything, tokenization of quoted/redirected/compound
  commands, nested command substitution double-counting) — the permission engine is
  clearly built on a bespoke shell-command tokenizer/matcher rather than a simple
  string/regex match, and that tokenizer has had a long tail of correctness bugs.
- Vim modal editing is a first-class, deeply implemented feature (motions,
  operators, text objects, insert-mode submission bindings) — unusual depth for a
  CLI agent's prompt editor.

## What's NOT in This Repo

This is unambiguously the public wrapper repo, not the proprietary agent
implementation. Confirmed absent:

- No source code at all: no Go/Rust/TypeScript implementation files, no build
  system, no package manifests (go.mod, Cargo.toml, package.json), no internal
  module/package structure. (The changelog mentions Go idioms like "goroutine and
  database connection leaks," suggesting a Go implementation, and Bubble Tea v2 is
  named as the TUI framework — but no code confirms this beyond changelog prose.)
- No system prompt, agent instructions, or planning/tool-selection logic — nothing
  on how the model decides which tool to call, how multi-step plans are formed, or
  what "the agent's prompt registry" (mentioned once, 1.0.13) actually contains.
- No MCP server implementation, no actual tool schemas/JSON definitions for any
  built-in tool.
- No permission-engine source — only behavioral bug descriptions of the command
  tokenizer/matcher, never its code or algorithm.
- No sandbox implementation — no detail on whether it's a container, a namespace/
  seccomp sandbox, a VM, or a network proxy process (a "network proxy" is mentioned
  being disabled/enabled and hijacking connections on Windows, implying some kind
  of local proxy-based network sandbox, but the mechanism is never described).
- No details of the model backend/serving infrastructure, no prompt-caching
  implementation (only that cache stability is a design goal), no context-
  compaction algorithm.
- No test suite, no CI configuration, no architecture diagrams, no design docs.
- No hook/plugin API reference (parameter shapes, lifecycle contract) — only
  changelog mentions of hook types (`PreInvocation`, `PostToolUse`, `Stop`) with no
  schema.
- No pricing, quota, or billing implementation details beyond user-facing behavior
  (credits, G1 credits, quota buckets).
- Two example scripts (statusline.sh, title.sh) are the only "real" code in the
  repo, and they only consume a documented JSON contract over stdin — they reveal
  the external status-line schema but nothing about internals.

Bottom line: treat this file purely as a product-changelog / release-notes corpus.
It is useful for behavioral/UX comparison (execution modes, permission UX, MCP
management, headless-mode design lessons) but has zero value for understanding
actual agent-loop algorithms, prompt engineering, or sandbox mechanics — those
live in Google's private repo.
