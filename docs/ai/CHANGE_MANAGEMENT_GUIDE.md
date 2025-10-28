# Change Management Guide

This guide explains how to evolve the blueprint, code, tests, security posture, and CI/CD configuration using the autonomous agent network.

## Two Ways to Trigger Change

1. **Chat Mode (manual)** – Paste a structured prompt into your assistant.
2. **File Mode (CI)** – Commit a file into `change_requests/` and let CI orchestrate the workflow automatically.

## Option A — Chat Mode

Start by letting the Product Manager agent capture the request and create the YAML for you:

```
Load ai/context.manifest.yaml and ai/agents.yaml.
Execute ai/prompts/change_intake.yaml with the details below.
```

> If AutoForge lives under `./.autoforge`, use `.autoforge/ai/context.manifest.yaml`,
> `.autoforge/ai/agents.yaml`, and `.autoforge/ai/prompts/change_intake.yaml` instead.

Provide:

- Change summary (feature, bug, migration, knowledge share, etc.)
- Impacted users or systems
- Acceptance criteria
- Deadlines or release constraints

The agent will interview you, populate a new `change_requests/CR-XXXX_*.yaml` file,
and write a log under `ai/logs/change_intake/`.
Review the generated request, make edits if needed, then continue the workflow:

- Standalone: run `ai/prompts/change_request.yaml` → `ai/prompts/impact_analysis.yaml` → downstream prompts.
- Embedded: run `.autoforge/ai/prompts/change_request.yaml` → `.autoforge/ai/prompts/impact_analysis.yaml` → downstream prompts.

Remind the assistant to keep all modifications inside the AutoForge directory (set working directory to `./autoforge` for embedded usage).

If your project stores code/tests outside `../src` or `../tests`, update `codeTargets`
in `autoforge.config.json` and rerun `npx autoforge configure` before running the engineering prompts so they write to the correct locations.

## Option B — File Mode

1. (Optional) Manually copy `change_requests/CR-0000_example.yaml` if you prefer editing without Chat Mode.
2. Fill in metadata, affected areas, and desired outcomes (or let the change_intake agent generate the file, then review/edit).
3. Commit and push. `.github/workflows/agent-change-processor.yml` validates context and summarizes next steps.
   Ensure `contextTargets` in `autoforge.config.json` reflects any custom documentation paths (then run `npx autoforge configure`) before running prompts.

If the change introduces or modifies UI, include the UI/UX designer step:

- Standalone: add `ai/prompts/uiux_designer.yaml` after the Product Manager handoff.
- Embedded: `.autoforge/ai/prompts/uiux_designer.yaml` prior to architectural analysis.

## Workflow Overview

1. **Mastermind Coordinator** logs the request.
2. **UI/UX Designer** updates wireframes/style guide/user flows when UX changes are required.
3. **Architect** runs `impact_analysis.yaml` to determine deltas.
4. **Full-Stack Engineer** implements updates.
5. **QA Engineer** validates and logs results.
6. **Security Engineer** performs audits.
7. **Performance Engineer** plans and executes load tests (as needed).
8. **SRE Engineer** aligns SLOs/dashboards/alerts with the change.
9. **DevOps Engineer** updates CI/CD and deployment plans.
10. **Mastermind Coordinator** compiles the final report and requests human approval.

## Best Practices

- Keep documentation accurate (blueprints, PRD, security policies, runbooks).
- Run `./scripts/validate_context.sh` before submitting change requests.
- Archive completed change reports in `ai/reports/`.
- Always include rollback and observability considerations for production-impacting changes.
- Maintain UI/UX artifacts in `docs/uiux/` so front-end engineers have clear implementation guidance.
