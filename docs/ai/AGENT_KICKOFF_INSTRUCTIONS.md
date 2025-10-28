# AI Agent Kickoff Instructions

Use this playbook when onboarding a code assistant (Codex, Claude Code, Gemini Code, Cursor, VS Code Copilot, etc.) so it can recognise the ROS AI agent network and initiate an autonomous development cycle.

## Quick Start Message

Copy/paste one of the following into your assistant to load the essential context:

```
# Standalone (AutoForge at repo root)
Read and follow:
- ai/context.manifest.yaml
- ai/agents.yaml
- ai/prompts/kickoff.yaml

Confirm when you have loaded all files, list the available entrypoints from the manifest,
and acknowledge readiness to run the kickoff sequence (Product Manager → Architect →
Full-Stack Engineer → QA → Security → DevOps → Retrospective). Do not code yet.
Review the latest memory file in ai/memory/ before proceeding.
```

```
# Embedded (AutoForge cloned into ./.autoforge)
Read and follow:
- .autoforge/ai/context.manifest.yaml
- .autoforge/ai/agents.yaml
- .autoforge/ai/prompts/kickoff.yaml

Confirm when you have loaded all files, list the available entrypoints from the manifest,
and acknowledge readiness to run the kickoff sequence (Product Manager → Architect →
Full-Stack Engineer → QA → Security → DevOps → Retrospective). Do not code yet.
Review the latest memory file in .autoforge/ai/memory/ before proceeding.
```

After the assistant acknowledges, instruct it to set the working directory to `./.autoforge`
so all outputs remain inside the AutoForge folder.
Then confirm it has absorbed the active project memory so it continues from the latest state.
Before any staging or commits, direct the assistant to follow `docs/ai/COMMIT_PLAYBOOK.md`.

## Repository Checklist

Ensure an idea exists before running kickoff (fill ideas/IDEA\_\*.yaml or run the discovery_researcher prompt). Then confirm these paths exist:

- `docs/blueprint/AGENTIC_BLUEPRINT.md`
- `docs/prd/PRODUCT_REQUIREMENTS.md`
- `api/openapi.yaml`
- `diagrams/*.mmd`
- `qa/tests.md`
- `security/SECURITY_READINESS.md`
- `devops/devops.yaml`
- `ideas/`, `research/`, and `change_requests/` for intake workflows
- `ai/memory/` with an active memory file tracking recent decisions and follow-ups
- `scripts/validate_context.sh` for quality gate verification

> When AutoForge is embedded in another project, these paths reside under `./.autoforge/` (legacy: `./autoforge/`).

Also review the managed `ai/context_targets.yaml` (or `.autoforge/ai/context_targets.yaml`); if documentation lives outside the defaults, ask the human to update `contextTargets` in autoforge.config.json and rerun `npx autoforge configure`.
Also review the managed `ai/code_targets.yaml` (or `.autoforge/ai/code_targets.yaml`) so the
engineering prompts know where to place application code and tests in your project.

## How To Trigger

1. Share the product vision and success metrics with the Product Manager agent (execute the kickoff prompt via your coding AI, using either `ai/prompts/kickoff.yaml` or `.autoforge/ai/prompts/kickoff.yaml`).
2. Allow the chain to progress through each role (Product Manager → UI/UX Designer → Architect → Full-Stack Engineer → QA → Security → DevOps → Retrospective). Each agent leaves artifacts in its designated directory.
3. Review the retrospective in `ai/reports/` and issue GO/NO-GO.
4. Append major decisions, corrections, and outstanding actions to the shared memory file (`ai/memory/*.yaml`) before ending the session.

For incremental work, use the change request workflow described in `docs/ai/CHANGE_MANAGEMENT_GUIDE.md`.
