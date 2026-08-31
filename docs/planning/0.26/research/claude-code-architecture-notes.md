# Claude Code CLI Repo — Architecture Notes

Source: Repomix dump at
`/Users/coltonajackson/Code/Resources/GitHub/AI/Anthropic/claude-code/REPO.md` (~51,000 lines, 227 files).

**Critical framing finding up front:** this repository is NOT the Claude Code
implementation. Its own `<file_summary>` and directory structure show it is the
public _distribution/meta_ repo: `.github/` issue templates and workflows,
`.devcontainer/`, `examples/` (gateway terraform, MDM policies, settings
snippets, one hook example), `plugins/` (11 bundled plugins), `scripts/`
(issue-triage automation in TS/bash), and top-level docs (README, CHANGELOG,
SECURITY.md). There is no `src/`, no core engine, no model-calling code, no
tool-dispatch loop implementation anywhere in the tree.

---

## Agent Loop / Core Execution Model

**Not present in this repo at all.** No source implements the read-eval loop,
streaming, turn structure, or tool-call dispatch. The closest artifacts are
_prompts that describe desired agent behavior_ (e.g. plugin agent/command
markdown files instructing a model on how to behave), not code that runs a
loop. If this needs answering definitively, it requires the closed-source CLI
binary or the (also-not-here) TypeScript core, not this repo.

## Tool/Extension System

The plugin and marketplace mechanism is fully documented here, though the
built-in tool set (Read/Write/Bash/etc.) is only referenced, never defined.

- `.claude-plugin/marketplace.json` (line 39831) is the actual first-party
  plugin catalog: 11 plugins, each with `name`, `description`, `version`,
  `author`, `source` (relative path), `category`. Categories used:
  `development`, `productivity`, `learning`, `security`.
- Plugin manifest schema fully specified in
  `plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md`
  (line 27322): required `.claude-plugin/plugin.json`, `name` must match
  `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, optional `version`/`description`/`author`/
  `homepage`/`repository`/`license`/`keywords`, and **component path fields**
  — `commands`, `agents`, `hooks` — each defaulting to a conventional
  directory (`./commands`, `./agents`, `./hooks/hooks.json`) and each
  _supplementing_ rather than replacing the default location. `hooks` can
  also be an inline object instead of a file path.
- Concrete plugin examples in the repo (each is a real, working plugin):
  `agent-sdk-dev`, `claude-opus-4-5-migration`, `code-review`,
  `commit-commands`, `explanatory-output-style`, `feature-dev`,
  `frontend-design`, `hookify`, `learning-output-style`, `plugin-dev`,
  `pr-review-toolkit`, `ralph-wiggum`, `security-guidance`.
- Plugins can bundle their own sub-agents (markdown files with YAML
  frontmatter: `name`, `description`, `model`) — e.g.
  `plugins/agent-sdk-dev/agents/agent-sdk-verifier-py.md` (line 2260) is a
  full verifier-agent prompt spec, not code.
- MCP integration is documented as a first-class plugin extension point:
  `plugins/plugin-dev/skills/mcp-integration/` covers stdio/SSE/HTTP server
  configs and auth patterns — plugins can ship MCP server definitions
  alongside commands/agents/hooks.

## Context & Memory Management

Nothing here implements context assembly, compaction, or transcript storage —
this is entirely CLI-external behavior. The only session-adjacent artifacts:

- `CLAUDE_ENV_FILE`, `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT` are
  referenced as hook-visible environment variables (e.g.
  `plugins/plugin-dev/skills/hook-development/references/patterns.md`, line 19247) — a `SessionStart` hook can `echo "export X=..." >> "$CLAUDE_ENV_FILE"`
  to inject session-scoped env vars, which is the closest thing to a
  documented "session state" surface.
- `plugins/security-guidance/hooks/session_state.py` (line 38116) exists as a
  plugin-local helper for persisting hook state across tool calls within a
  session (e.g. tracking whether a security review already ran) — this is
  plugin-authored state, not core session/memory management.
- `CLAUDE.md` project-memory convention is referenced only in passing (e.g. in
  `.claude/commands/triage-issue.md` as a signal that an issue is about
  Claude Code), never defined/implemented here.

## Safety / Sandboxing / Permissions

This is the best-documented area in the repo — real, concrete configuration
surface for permission and sandbox policy.

- `examples/settings/settings-strict.json`, `settings-lax.json`,
  `settings-bash-sandbox.json` (lines 2187–2246) show the actual settings
  schema:
  - `permissions.disableBypassPermissionsMode: "disable"` — blocks
    `--dangerously-skip-permissions`.
  - `permissions.ask` / `permissions.deny` arrays gate specific tools (e.g.
    `"ask": ["Bash"]`, `"deny": ["WebSearch", "WebFetch"]`).
  - `allowManagedPermissionRulesOnly` / `allowManagedHooksOnly` /
    `strictKnownMarketplaces` — enterprise-only lockdown flags that only take
    effect from managed/enterprise settings, not user-level.
  - `sandbox.enabled`, `sandbox.autoAllowBashIfSandboxed`,
    `sandbox.allowUnsandboxedCommands`, and a full `sandbox.network` block
    (`allowUnixSockets`, `allowAllUnixSockets`, `allowLocalBinding`,
    `allowedDomains`, `httpProxyPort`, `socksProxyPort`,
    `enableWeakerNestedSandbox`) — the sandbox is explicitly scoped to the
    Bash tool only (README notes it does not cover Read/Write/MCP/hooks).
- `.devcontainer/init-firewall.sh` (line 39984) is a real, runnable iptables
  firewall script for the devcontainer: default-deny egress, an
  allowlist ipset seeded from GitHub's published IP ranges plus a short list
  of Anthropic/npm/VSCode domains, and a self-verification step (`curl
example.com` must fail, `curl api.github.com` must succeed) run at
  container start — a genuine defense-in-depth pattern for agent sandboxing.
- `examples/mdm/` provides enterprise policy deployment templates: macOS
  `.mobileconfig`/`.plist`, Windows ADMX/ADML + PowerShell, and a
  `managed-settings.json` — i.e. permissions/sandbox policy pushed via MDM,
  not just local config files.
- Hook-based approval gates are a real mechanism: hooks can return
  `approve` / `deny` / `ask` decisions from a `"type": "prompt"` hook (see
  Pattern 1 and Pattern 7 in
  `plugins/plugin-dev/skills/hook-development/references/patterns.md`),
  letting a plugin author implement custom pre-tool-use confirmation gates in
  natural language rather than code.

## Configuration & Extensibility

- **Settings hierarchy**: referenced (not fully specified here) via
  `settings.json` / `settings.local.json` / `managed-settings.json`, with
  `examples/settings/README.md` (line 2149) noting some keys only apply at
  the enterprise/managed tier.
- **Hooks**: `hooks.json` schema covers events `SessionStart`,
  `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `Notification`, and
  more (per `plugins/plugin-dev/skills/hook-development/`). Hook `type` can be
  `"command"` (shell) or `"prompt"` (LLM-evaluated). Matchers support regex
  against tool names/inputs (e.g. `"matcher": "mcp__.*__delete.*"`), and a
  hook entry can carry an `"if"` condition scoped to a specific Bash command
  pattern (`"if": "Bash(git commit:*)"`).
- **Distinctive hook mechanism — `asyncRewake`**: seen in
  `plugins/security-guidance/hooks/hooks.json` (line 33399). A `PostToolUse`
  hook on `git commit`/`git push` can run a slower LLM-based security review
  in the background (`asyncRewake: true`) and later "wake" the agent with a
  `rewakeMessage`/`rewakeSummary`, injecting findings into the conversation
  without blocking the foreground turn. This is a genuinely novel async
  hook-callback pattern worth studying for AutoForge's own gate/hook design.
- **Slash commands**: plain markdown files under `commands/` with YAML
  frontmatter (`allowed-tools`, `description`) and a body that becomes the
  prompt; supports `$ARGUMENTS` interpolation and inline `!`command`` shell
  execution for context gathering (see `.claude/commands/commit-push-pr.md`,
  line 379).
- **Skills**: markdown-based, discovered via `SKILL.md` with structured
  `references/`, `examples/`, `scripts/` subdirectories — e.g.
  `plugins/plugin-dev/skills/plugin-structure/` is itself a skill teaching
  skill/plugin authoring, i.e. the repo dogfoods its own extension model.
- **Agents (subagents)**: markdown files with YAML frontmatter (`name`,
  `description`, `model`) defining a specialized system prompt + verification
  checklist — no code, purely prompt-defined roles (verifier agents, code
  reviewers, architects).

## Distinctive Design Choices

- **Config-file-driven behavior everywhere, code nowhere**: nearly all
  "extension" surfaces (commands, agents, output styles, hook prompts) are
  markdown + JSON, not scripts — the one exception is Python/bash hook
  handlers for cases needing real logic (`hookify`, `security-guidance`).
- **`asyncRewake`** (above) — background review that defers findings back
  into the live conversation rather than blocking synchronously. Elegant
  solution to "slow safety check vs. fast turn latency" tension.
- **Hookify plugin** (`plugins/hookify/`) is meta: it lets an end user
  describe an unwanted behavior in plain English and have Claude _generate_
  the hook rule (`core/rule_engine.py`, `commands/hookify.md`) — hooks
  authoring hooks.
- **Ralph Wiggum plugin** — an intentionally named "self-referential loop":
  Claude repeatedly re-attempts the same task, seeing its own prior output,
  via a `Stop` hook that re-invokes the loop (`hooks/stop-hook.sh`) until a
  completion condition is met. A minimal, hook-only implementation of an
  agentic retry loop, built entirely out of the public hook API rather than
  needing native support.
- **Output styles as plugins**: `explanatory-output-style` and
  `learning-output-style` reconstruct deprecated/unshipped first-party
  behaviors purely via `SessionStart` hooks injecting instructions — showing
  the hook system is expressive enough to simulate "core" product features.
- **Firewall-verify-itself pattern**: `init-firewall.sh` doesn't just apply
  iptables rules, it tests its own negative and positive cases immediately
  after applying them and hard-fails the container boot if either check is
  wrong — a good "trust but verify" pattern for any sandboxing feature.
- **Confidence-scored automated PR review**: `code-review` plugin explicitly
  advertises "confidence-based scoring to filter false positives" — relevant
  prior art if AutoForge's own quality/gate scoring wants a similar
  reviewer-agent design.

## What's NOT in This Repo

- No agent loop, streaming, or tool-dispatch source (confirmed: no `src/`
  directory of any kind exists in the tree).
- No tool _definitions_ (Read/Write/Bash/Grep/etc.) — only references to
  their names in hook matchers and settings examples.
- No model-calling / API-client code, no prompt-construction pipeline for the
  main agent (the Claude API/SDK docs are referenced by URL for plugin
  authors, e.g. `https://docs.claude.com/en/api/agent-sdk/python`, but not
  vendored).
- No context-window management, compaction, or transcript persistence logic.
- No implementation of the permission-enforcement engine itself — only its
  _configuration schema_ (settings JSON) and _policy examples_. The engine
  that reads `settings.json` and actually enforces `ask`/`deny`/sandbox rules
  lives in the closed-source binary.
- No VS Code / JetBrains extension source, despite being referenced in issue
  templates.
