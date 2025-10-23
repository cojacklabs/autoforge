# AI Orchestration Guide

This folder contains playbooks and guides for running AutoForge via AI coding tools.

- `AGENT_AUTONOMY_GUIDE.md` – How agents operate, required files, and working directory rules.
- `AGENT_KICKOFF_INSTRUCTIONS.md` – Prompt instructions for starting the full chain.
- `CHANGE_MANAGEMENT_GUIDE.md` – How to submit and process change requests.
- `reviews/` – SDLC review documentation and improvement plans.

Agents and developers should reference this folder before running any prompts to
understand expectations, quality gates, and handoffs.

- Update `ai/context_targets.yaml` if documentation lives outside the defaults.

## Prompts

- `autoforge/ai/prompts/kickoff.yaml`
- `autoforge/ai/prompts/change_request.yaml`
- `autoforge/ai/prompts/retrospective.yaml`
