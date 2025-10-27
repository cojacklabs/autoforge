# Agent Autonomy Guide

This guide explains how the ROS AI agent network navigates and operates inside the repository.

## Two-World Model

- **Human Realm** – Source-of-truth docs live under `docs/`, operational configs under `devops/`, security policies under `security/`, and product artifacts under `api/`, `diagrams/`, and `qa/`. When AutoForge is embedded in another project, these folders reside under `./autoforge/`.
- **AI Realm** – Manifests, prompts, and logs live under `ai/`. Agents never guess where context lives; they read `ai/context.manifest.yaml` for the canonical map.

> Application code/output paths are defined in `autoforge.config.json` and mirrored to the managed `ai/code_targets.yaml`. Ask the human to update the config and rerun `npx autoforge configure` before running engineering prompts.
> The same applies to documentation overrides: `ai/context_targets.yaml` is managed—coordinate any changes through `autoforge.config.json` + `npx autoforge configure`.

## Entry Sequence

1. Begin in the planning zone: set `cwd` to the folder that contains this guide (for embedded installs that is `./autoforge`).
2. Read `ai/context.manifest.yaml` to discover context roots and quality gates.
3. Review `ai/memory/ACTIVE_MEMORY.yaml` to absorb the latest decisions, corrections, and outstanding tasks. Always append new updates before ending a session.
4. Consult and maintain `ai/AGENTS.md` (Progress & Next Steps, Lessons Learned, and Rules). Update it at each major handoff so humans and future tools have the same context.
5. Load entrypoint files (`docs/blueprint/AGENTIC_BLUEPRINT.md`, `api/openapi.yaml`, etc.).
6. Expand using `include_globs` while honouring `exclusions`.
7. Validate quality gates via `scripts/validate_context.sh` when available.
8. Switch to a build zone only when writing code/tests: consult the managed `ai/code_targets.yaml` (generated from `autoforge.config.json`), operate inside each declared `code_targets.*.path`, then return to the planning zone to update docs and logs.
9. Record outputs to `ai/logs/` or the designated deliverable path and log every movement between planning and build zones in the activity notes. Update the memory file (`ai/memory/ACTIVE_MEMORY.yaml`) with new outcomes before handing off or ending the session; sync changes back to `ai/AGENTS.md` if the high-level progress shifts.

### Approval cadence

- Mention any package install, migration, or long-running command before you execute it, including which directories it will modify.
- If you must touch a path that is not listed in the managed code targets or under the planning zone, pause and request human approval.
- Keep debugging commands scoped (e.g., `npm test -- some-pattern`), describe expected side effects, and revert back to the planning zone after they finish.
- Consult `docs/ai/COMMIT_PLAYBOOK.md` before staging commits or running stateful commands so outputs stay auditable.

## Handoffs

- Agents communicate through structured prompts defined in `ai/prompts/`.
- Every handoff includes a JSON snippet (see `docs/MASTERMIND_PROMPTING_GUIDE.md`) capturing sender, receiver, artifact path, and status.
- If context is missing or invalid, agents do **not** forge ahead—they raise a context gap and notify the Mastermind Coordinator.
- UI/UX artifacts should be stored under `docs/uiux/` and summarized in `ai/reports/uiux/`.

## Human Responsibilities

- Keep documentation up to date; the agents rely entirely on the files referenced in the manifest.
- Approve GO/NO-GO decisions, especially for production deployments or security findings.
- Review retrospectives in `ai/reports/` and schedule follow-up actions.
- Keep the active memory file in `ai/memory/` current so future sessions inherit the latest state.
- Enforce the commit/command rules documented in `docs/ai/COMMIT_PLAYBOOK.md` during reviews.
- Verify semantic version changes are applied (or explicitly waived) per the playbook before approving merges.
- Run `npm update @cojacklabs/autoforge || npx autoforge upgrade` periodically to pull upstream framework changes and rerun guardrails (local AutoForge edits are auto-stashed and restored).
- After updating, append a memory entry summarising new guidance and require agents to reload the manifests before resuming work.
- Ensure `contextTargets` in `autoforge.config.json` stays accurate and rerun `npx autoforge configure` so documentation references stay aligned.
- Maintain code target settings in `autoforge.config.json` (then rerun `npx autoforge configure`) so engineering agents place code and tests in the correct host-project locations.
- Use `ai/logs/uiux/` and `ai/reports/uiux/` to audit UI/UX decisions before engineering begins.

By maintaining clear boundaries and accurate context, we allow autonomous agents to handle the heavy lifting while humans steer vision and approval.

## Context Snapshots

- Use `npx autoforge snapshot [path]` (run from the repo root, or from `./autoforge` and pass `..`) to produce `REPO.md` when sharing context with LLMs. Prefer the `context_snapshot` prompt when humans request help refreshing repository knowledge.

- Update `repomix.config.json` if you need to include/exclude additional folders when generating snapshots.
