# Audit: First-Party AutoForge Agent Compatibility Surfaces and Retirement Plan

- **Work item:** `issue.audit-and-retire-first-party-autoforge-agent-compatibility-surfaces`
- **Date:** 2026-09-13
- **Status:** Complete (Audit & Proposal)

## 1. Executive Summary

During v0.25, an experimental local interactive agent runtime (`apps/agent-cli` / `@cojacklabs/autoforge-agent`) and provider wrapper (`packages/providers`) were introduced alongside a bare CLI delegation launcher (`apps/core-cli/src/agent-launcher.ts`).

Following maintainer review and strategic reconciliation:

1. **AutoForge / Priozar is an engineering control plane and framework**, not an AI agent product or conversational runtime.
2. The interactive AI experience belongs to the future separate **CoJack Labs AI**.
3. The framework's core responsibilities are vendor-neutral agent contracts, context packets, governance, doctrines, work lifecycle, and deterministic validation.
4. First-party agent runtime code, model provider wrappers, and OS credential management for OpenAI keys create unnecessary maintenance overhead and architectural confusion within the framework repository.

This document inventories all first-party agent compatibility surfaces, distinguishes reusable third-party agent contracts from abandoned product behavior, and provides a staged retirement plan.

---

## 2. Comprehensive Inventory of First-Party Agent Surfaces

### A. Packages & Applications

1. **`apps/agent-cli/` (`@cojacklabs/autoforge-agent`)**
   - Private experimental package (`package.json`, `bin/autoforge-agent.js`).
   - Implements an interactive terminal prompt loop (`src/cli.ts`, `src/runtime.ts`).
   - Implements native OS key storage (`keytar`) for OpenAI keys (`src/credentials.ts`).
   - Implements local workspace temporary file editing with bounded paths (`src/workspace.ts`).
   - Directly depends on `@ai-sdk/openai`, `keytar`, `ai`, `@cojacklabs/autoforge-providers`.

2. **`packages/providers/` (`@cojacklabs/autoforge-providers`)**
   - Private package wrapping `@ai-sdk/openai` (`src/index.ts`).
   - Defines `DEFAULT_OPENAI_AGENT_MODEL = "gpt-5.6-sol"`.
   - Used only by `apps/agent-cli`.

### B. Core CLI & Protocol Surfaces

1. **`apps/core-cli/src/agent-launcher.ts` & `src/router.ts`**
   - Implements `launchAutoForgeAgent()`, launching `autoforge-agent` (or `autoforge-agent.cmd` on Windows) when `autoforge` is invoked with no arguments in an interactive TTY.
   - Forwards credentials commands (`autoforge credentials ...`) by attempting to delegate to `autoforge-agent`.
2. **`packages/protocol/src/agent-launcher.ts`**
   - Defines `AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION = 1`.
   - Defines `agentLauncherInfoSchema` with literal `@cojacklabs/autoforge-agent`.
3. **Tests**
   - `test/agent-launcher.test.ts`: Tests launcher discovery, recursion prevention, and Windows `.cmd` execution.
   - `test/agent-safety.test.ts`: Validates path traversal and bounds for the experimental agent.
   - `apps/agent-cli/test/*` and `packages/providers/test/*`.

### C. Documentation & Guides

1. `docs/LOCAL_PROVIDER_CREDENTIALS.md`: Documents `autoforge-agent credentials` and native keychain storage.
2. `docs/AUTOFORGE_CLI_REFERENCE.md`: Mentions bare command delegation to `autoforge-agent`.
3. `README.md` and `CHANGELOG.md`: Reference `@cojacklabs/autoforge-agent` as a private experimental runtime.

---

## 3. Surface Categorization: Retain vs. Retire

| Surface / Capability                                                                      | Classification       | Rationale                                                                                                                                                                                  |
| :---------------------------------------------------------------------------------------- | :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor-neutral Agent Contracts (`src/contract/`, `src/agents/`)**                       | **RETAIN**           | Core framework capability. Generates contracts for Claude Code, Codex, Cursor, Gemini/Antigravity, Grok, and generic agents.                                                               |
| **Structured Agent Handoffs (`src/workflows/agent-handoff-store.ts`, Protocol handoffs)** | **RETAIN**           | Essential for multi-agent interoperability and cross-agent context resumption.                                                                                                             |
| **Agent Orchestration & Assignment (`src/orchestration/`)**                               | **RETAIN**           | Framework capability for claims, leases, roles, and verifier gates.                                                                                                                        |
| **Bare CLI Delegation (`apps/core-cli/src/agent-launcher.ts`)**                           | **RETIRE**           | Bare `autoforge` (and successor `priozar`) should deterministically output project status, help, or diagnostic state rather than attempting to launch a nonexistent external agent binary. |
| **Credentials Command Routing (`autoforge credentials ...`)**                             | **RETIRE**           | The framework does not manage API keys or model accounts. External agents (Claude, Codex, Cursor) manage their own authentication.                                                         |
| **`apps/agent-cli` (`@cojacklabs/autoforge-agent`)**                                      | **RETIRE / ARCHIVE** | Abandoned prototype; the generalist AI product is relocated to CoJack Labs AI.                                                                                                             |
| **`packages/providers` (`@cojacklabs/autoforge-providers`)**                              | **RETIRE / ARCHIVE** | Unneeded model wrapper in a deterministic control-plane repository.                                                                                                                        |

---

## 4. Staged Retirement & Transition Plan

### Stage 1: Deprecation & Safe Neutralization (v0.26 Compatibility Window)

1. **Bare Command Behavior**:
   - Revert bare `autoforge` invocation to always render deterministic project status (`autoforge status`) across all environments, eliminating the conditional spawn of `autoforge-agent`.
2. **Credentials Command**:
   - Mark `autoforge credentials` as deprecated with a clear notice explaining that agent authentication is managed directly by the host agent environment (e.g. `CLAUDE_CODE`, `OPENAI_API_KEY`, etc.).
3. **Protocol Clean-up**:
   - Deprecate `agentLauncherInfoSchema` and `AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION` in `@cojacklabs/autoforge-protocol` or make it an optional compatibility export.

### Stage 2: Workspace Boundary Removal

1. Remove `apps/agent-cli` and `packages/providers` from the active pnpm/Turborepo workspace.
2. Archive the prototype implementation into a historical branch or dedicated reference repository if needed for CoJack Labs AI.
3. Remove dependencies on `@ai-sdk/openai`, `keytar`, and related AI packages from the root workspace.

### Stage 3: Documentation & Successor Alignment (`priozar`)

1. Update `docs/AUTOFORGE_CLI_REFERENCE.md` and `docs/README.md` to present the framework strictly as an engineering control plane.
2. Remove `docs/LOCAL_PROVIDER_CREDENTIALS.md` or replace it with a brief external agent auth guide.
3. Ensure the successor binary (`priozar`) ships with zero reference to first-party agent execution.
