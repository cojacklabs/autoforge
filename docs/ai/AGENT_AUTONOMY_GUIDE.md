# Agent Autonomy Guide

This guide explains how the ROS AI agent network navigates and operates inside the repository.

## Two-World Model

- **Human Realm** – Source-of-truth docs live under `docs/`, operational configs under `devops/`, security policies under `security/`, and product artifacts under `api/`, `diagrams/`, and `qa/`. When AutoForge is embedded in another project, these folders reside under `./autoforge/`.
- **AI Realm** – Manifests, prompts, and logs live under `ai/`. Agents never guess where context lives; they read `ai/context.manifest.yaml` for the canonical map.

> Application code/output paths are defined in `ai/code_targets.yaml`. Update that file to match the host project’s structure before running engineering prompts.

## Entry Sequence

1. Begin in the planning zone: set `cwd` to the folder that contains this guide (for embedded installs that is `./autoforge`).
2. Read `ai/context.manifest.yaml` to discover context roots and quality gates.
3. Load entrypoint files (`docs/blueprint/AGENTIC_BLUEPRINT.md`, `api/openapi.yaml`, etc.).
4. Expand using `include_globs` while honouring `exclusions`.
5. Validate quality gates via `scripts/validate_context.sh` when available.
6. Switch to a build zone only when writing code/tests: consult `ai/code_targets.yaml`, operate inside each declared `code_targets.*.path`, then return to the planning zone to update docs and logs.
7. Record outputs to `ai/logs/` or the designated deliverable path and log every movement between planning and build zones in the activity notes.

### Approval cadence

- Mention any package install, migration, or long-running command before you execute it, including which directories it will modify.
- If you must touch a path that is not listed in `ai/code_targets.yaml` or under the planning zone, pause and request human approval.
- Keep debugging commands scoped (e.g., `npm test -- some-pattern`), describe expected side effects, and revert back to the planning zone after they finish.

## Handoffs

- Agents communicate through structured prompts defined in `ai/prompts/`.
- Every handoff includes a JSON snippet (see `docs/MASTERMIND_PROMPTING_GUIDE.md`) capturing sender, receiver, artifact path, and status.
- If context is missing or invalid, agents do **not** forge ahead—they raise a context gap and notify the Mastermind Coordinator.
- UI/UX artifacts should be stored under `docs/uiux/` and summarized in `ai/reports/uiux/`.

## Human Responsibilities

- Keep documentation up to date; the agents rely entirely on the files referenced in the manifest.
- Approve GO/NO-GO decisions, especially for production deployments or security findings.
- Review retrospectives in `ai/reports/` and schedule follow-up actions.
- Maintain `ai/context_targets.yaml` so documentation references stay accurate.
- Maintain `ai/code_targets.yaml` so engineering agents place code and tests in the correct host-project locations.
- Use `ai/logs/uiux/` and `ai/reports/uiux/` to audit UI/UX decisions before engineering begins.

By maintaining clear boundaries and accurate context, we allow autonomous agents to handle the heavy lifting while humans steer vision and approval.

## Context Snapshots

- Use `npm run repomix -- [path]` (or run from `./autoforge` with `-- ..`) to produce REPOMIX.md when sharing context with LLMs.

- Update `repomix.config.json` if you need to include/exclude additional folders when generating snapshots.
