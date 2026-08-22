# 📖 AutoForge CLI Command Reference & Manual

> **Package:** `@cojacklabs/autoforge` | **Version:** `0.16.x` | **License:** MIT  
> **Scope:** Canonical reference for all CLI subcommands, flags, exit codes, and workflows.

---

## 🧭 Command Overview

| Command                                                     | Purpose                                                                      | When to Use                                                      |
| :---------------------------------------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| [`autoforge init`](#1-autoforge-init)                       | Scaffolds `.autoforge/` and configuration files into host repo               | First time setting up AutoForge in a project                     |
| [`autoforge load`](#2-autoforge-load)                       | Prints strict orchestrator context for copy/pasting into AI assistants       | Starting a new chat session with Claude, Gemini, ChatGPT, Cursor |
| [`autoforge autopilot`](#3-autoforge-autopilot)             | Previews recipe execution plans or starts a state-tracked run                | Running automated/supervised multi-agent SDLC slices             |
| [`autoforge research scan`](#4-autoforge-research-scan)     | Scans repo & goals for financial/auth/AI risks and scaffolds readiness docs  | Upstream planning before architecture or coding begins           |
| [`autoforge readiness check`](#5-autoforge-readiness-check) | Verifies presence of security, privacy, and accessibility artifacts          | Pre-release audits or before advancing past planning gates       |
| [`autoforge gate check`](#6-autoforge-gate-check)           | Executes sequential quality gates (secrets, parse, format, lint, tsc, tests) | Pre-commit verification or pre-apply patch validation            |
| [`autoforge audit`](#7-autoforge-audit)                     | Generates SOC 2 / ISO 27001 SDLC Traceability Matrix evidence                | Compliance auditing and release verification                     |
| [`autoforge status`](#8-autoforge-status)                   | Displays real-time run state, risk tier, and pending approvals               | Monitoring an active run or checking blocked gates               |
| [`autoforge approve`](#9-autoforge-approve)                 | Approves or rejects sensitive operations (migrations, deploys)               | Unblocking runs paused at human approval gates                   |
| [`autoforge update`](#10-autoforge-update)                  | Checks npm registry for new versions and prompts upgrade commands            | Keeping AutoForge and managed policies up to date                |
| [`autoforge metrics`](#11-autoforge-metrics)                | Displays real-time SDLC health, gate pass rates, and token consumption       | Periodic retrospectives or monitoring quality trends             |
| [`autoforge train`](#12-autoforge-train)                    | Analyzes failure patterns from telemetry and suggests prompt improvements    | Governed continuous learning and recipe optimization             |
| [`autoforge doctor`](#13-autoforge-doctor)                  | Verifies directory health, manifest integrity, and config files              | Troubleshooting installation or environment issues               |
| [`autoforge snapshot`](#14-autoforge-snapshot)              | Packages entire repo into a clean, audited `REPO.md` snapshot                | Handover, AI context injection, or code reviews                  |
| [`autoforge configure`](#15-autoforge-configure)            | Regenerates managed target YAMLs from `autoforge.config.json`                | After updating custom source/test paths in config                |
| [`autoforge refresh`](#16-autoforge-refresh)                | Generates a context-reload prompt with latest rules and memory               | Mid-session context reloads without resetting state              |
| [`autoforge version`](#17-autoforge-version)                | Prints current CLI and engine version                                        | Verifying installed package version                              |

---

## 🛠️ Detailed Command Reference

> **Current command note:** The supported v0.16 CLI is discoverable with `autoforge help`. Historical commands in this document are retained for reference only; use the current README and `autoforge help` as the authoritative command surface.

### 1. `autoforge init`

Scaffolds the `.autoforge/` control-plane directory, `autoforge.config.json`, and `repomix.config.json` into the root of the host project.

```bash
npx autoforge init [--force]
```

- **Flags:**
  - `--force`: Overwrites existing `.autoforge/` directory (use with caution; will back up user data during upgrade flows).
- **Output:** Creates `.autoforge/` containing agent prompts, schemas, memory directories, and quality policies.

---

### 2. `autoforge load`

Outputs a copy/paste-ready orchestrator prompt containing strict single-session multi-agent operating rules, governance boundaries, and context manifest files.

```bash
npx autoforge load
```

- **Use Case:** Paste output into Claude Code, Gemini CLI, Cursor, or ChatGPT to instantly turn the AI into a disciplined engineering team.

---

### 3. `autoforge autopilot`

Coordinates the multi-agent assembly line. Supports preflight recipe inspection (dry-run) and state-machine-backed execution.

```bash
# Preview recipe execution plan without writing any code
npx autoforge autopilot --dry-run [--recipe <name>]

# Initialize an orchestrated run with a specific objective
npx autoforge autopilot --level <0-3> --task "<objective>" [--recipe <name>]
```

- **Flags:**
  - `--dry-run`: Runs preflight checks (ideas, PRD, OpenAPI) and outlines the stage DAG without writing files.
  - `--level <0-3>`: Sets autonomy level (`0`=manual, `1`=supervised with approvals, `2`=full, `3`=adaptive). Default: `1`.
  - `--task "<objective>"`: Plain-language description of the work item.
  - `--recipe <name>`: Target recipe under `docs/blueprint/recipes/` (default: `web_app`).
- **Persistence:** Creates a `WorkItem` and `Run` in `.autoforge/runtime/autoforge.db`.

---

### 4. `autoforge research scan`

Proactively discovers domain risks (PCI-DSS financial triggers, OWASP auth requirements, NIST AI oversight) by inspecting `package.json` dependencies and task objectives.

```bash
npx autoforge research scan [--task "<objective>"] [--generate]
```

- **Flags:**
  - `--task "<objective>"`: Task goal to analyze for sensitive data/model requirements.
  - `--generate`: Scaffolds standard readiness documents directly into `docs/`:
    - `docs/security/APPLICATION_RISK_PROFILE.md`
    - `docs/privacy/DATA_INVENTORY.yaml`
    - `docs/security/THREAT_MODEL.md`
    - `docs/uiux/ACCESSIBILITY_PLAN.md` (WCAG 2.2 AA)

---

### 5. `autoforge readiness check`

Audits the project to ensure that all required security, privacy, accessibility, and risk artifacts are present and tracked prior to code construction or release.

```bash
npx autoforge readiness check
```

- **Exit Code:** `0` if all required artifacts are present; `1` if required planning artifacts are missing.

---

### 6. `autoforge gate check`

Executes the sequential, hard quality gates across the codebase or against a list of changed files (secret scanning, file syntax parsing, Prettier formatting, ESLint rules, TypeScript compile check, and unit test suites).

```bash
# Run all quality gates on the repository
npx autoforge gate check

# Run quality gates scoped to specific changed files
npx autoforge gate check --files src/index.ts,tests/index.test.ts [--format-write]
```

- **Flags:**
  - `--files <paths>`: Comma-separated list of files to check.
  - `--format-write`: Automatically formats code with Prettier and applies ESLint fixes if issues are found.

---

### 7. `autoforge audit`

Audits the repository and generates an audit-ready **SDLC Traceability Matrix** (`evidence/traceability_matrix.json`) mapped against SOC 2 Type II and ISO 27001 Secure SDLC criteria across all 7 phases.

```bash
npx autoforge audit [--generate]
```

- **Output:** Creates or updates `evidence/traceability_matrix.json`.

---

### 8. `autoforge status`

Inspects the live state of an active or completed run, showing linked WorkItem metadata, risk tiers, and pending human approvals.

```bash
npx autoforge status <run-id>
```

- **Example:** `npx autoforge status RUN-1786910970560`

---

### 9. `autoforge approve`

Resolves blocking human approvals for high-risk operations (e.g. database schema migrations, secret provisioning, production releases).

```bash
# Approve a pending request
npx autoforge approve <approval-id> [--note "<note>"]

# Reject a pending request
npx autoforge approve <approval-id> --reject [--note "<reason>"]
```

- **Example:** `npx autoforge approve APP-001 --note "Indexes verified, safe for staging"`

---

### 10. `autoforge update`

Queries the npm registry for the latest release of `@cojacklabs/autoforge`, compares against the currently installed version, and prints package manager upgrade commands (`npm`, `pnpm`, `yarn`).

```bash
npx autoforge update
```

---

### 11. `autoforge metrics`

Reads telemetry event stream (`.autoforge/training/telemetry.jsonl`) and displays real-time SDLC efficiency and quality metrics.

```bash
npx autoforge metrics
```

- **Metrics Shown:** Total runs, first-pass gate success rate (%), agent retry counts, estimated token usage, and failure breakdowns per gate.

---

### 9. `autoforge train`

Extracts failure patterns from historical telemetry and generates governed prompt and recipe optimizations.

```bash
# Preview suggested optimizations
npx autoforge train [--from-last-N <N>]

# Apply optimizations to .autoforge/ai/memory/learnings.yaml
npx autoforge train [--from-last-N <N>] --apply
```

- **Flags:**
  - `--from-last-N <N>`: Number of recent runs to evaluate (default: `10`).
  - `--apply`: Automatically writes approved prompt adjustments into project memory.

---

### 10. `autoforge doctor`

Performs an environment and health diagnostic check on `.autoforge/`, `autoforge.config.json`, and required context manifests.

```bash
npx autoforge doctor
```

---

### 11. `autoforge snapshot`

Bundles the host repository into a clean, audited `REPO.md` file using `repomix`.

```bash
npx autoforge snapshot [targetDir]
```

---

### 12. `autoforge configure`

Safely regenerates managed YAML files (`ai/code_targets.yaml`, `ai/context_targets.yaml`) from `autoforge.config.json` without modifying user-authored files.

```bash
npx autoforge configure
```

---

### 13. `autoforge refresh`

Generates a context-reload prompt and saves a timestamped log to force an AI assistant to reload latest memory, active decisions, and quality rules.

```bash
npx autoforge refresh
```

---

### 14. `autoforge version`

Prints the installed version of `@cojacklabs/autoforge`.

```bash
npx autoforge version
```
