# 🧠 AutoForge — Project Overview

> Generated: 2026-08-16 | Version: 0.4.1 | License: MIT © CoJack Labs

**AutoForge** (`@cojacklabs/autoforge`) is a **multi-agent SDLC orchestration framework** published as an npm package by CoJack Labs. It's a developer tool that coordinates AI agents (like Claude, Gemini, or Codex) to collaboratively build software through the full software development lifecycle — from idea to deployment.

---

## 🗂 Project Structure Breakdown

| Directory/File     | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `bin/autoforge.js` | CLI entry point — provides `npx autoforge` commands                              |
| `scripts/`         | Build, validate, snapshot, quality gate scripts                                  |
| `ai/`              | Agent definitions, prompts, memory, context manifests, policies, logs, reports   |
| `docs/`            | Full documentation (autopilot engine, training, quality policies, PRD, UX, etc.) |
| `api/`             | OpenAPI spec for the framework                                                   |
| `devops/`          | CI/CD templates and runbooks                                                     |
| `security/`        | Security audit reports                                                           |
| `qa/`              | QA reports and defect tracking                                                   |
| `diagrams/`        | Architecture diagrams (Mermaid)                                                  |
| `change_requests/` | Structured change request records                                                |
| `.autoforge/`      | The runtime directory the CLI scaffolds into host projects                       |
| `dist/`            | Built/packaged output for npm                                                    |
| `examples/`        | Usage examples                                                                   |
| `research/`        | Research artifacts                                                               |
| `ideas/`           | Idea capture YAML files                                                          |

---

## ⚙️ Key Features (v0.4.1)

- **Autopilot Orchestration** — Agents run 24/7 with 4 autonomy levels (0=manual → 3=adaptive)
- **Multi-Agent Assembly Line** — Specialized agents (PM, UI/UX, Architect, Engineer, QA, Security, SRE, DevOps) each handle their SDLC role
- **Continuous Learning** — Execution telemetry trains models; prompts/recipes improve automatically
- **Quality Gates** — Enforces TypeScript typecheck, ESLint, Prettier, and artifact validation
- **CLI commands**: `init`, `load`, `snapshot`, `configure`, `refresh`, `version`

---

## 🔧 Tech Stack

- **Runtime**: Node.js (ESM)
- **Published**: npm as `@cojacklabs/autoforge`
- **Key deps**: `glob`, `yaml`, `repomix`, `ignore`
- **Dev tools**: `prettier`
- **License**: MIT

---

## 💡 Summary

AutoForge is the orchestration layer _between_ you and AI coding assistants. It structures how agents are prompted, what they can touch, how decisions are logged, and how the system learns from every project session. It's meant to be installed as a dev dependency in any project.

When a user installs AutoForge, the CLI scaffolds a `.autoforge/` directory into their project containing:

- Agent role definitions (`agents.yaml`)
- Prompt templates for each SDLC phase
- Memory and logging directories
- Policy enforcement files
- Context manifests for AI session loading

---

## 🔗 Key Documentation

| Resource                              | Description                                                      |
| ------------------------------------- | ---------------------------------------------------------------- |
| `docs/QUICKSTART.md`                  | Fast setup for new and existing projects                         |
| `docs/AUTOFORGE_AUTOPILOT_ENGINE.md`  | Full orchestration spec, autonomy levels, state machine          |
| `docs/AUTOFORGE_AI_MODEL_TRAINING.md` | Training data collection, feedback loops, continuous improvement |
| `docs/PROMPT_HANDBOOK.md`             | Ready-made prompts for all agent roles                           |
| `docs/QUALITY_POLICIES.md`            | TypeScript/ESLint/Prettier/artifact validation policies          |
| `docs/GOVERNANCE_AND_MEMORY.md`       | Memory enforcement and governance rules                          |
| `README.md`                           | Full project README with CLI reference and quickstart            |
