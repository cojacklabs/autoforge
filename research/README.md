# Research Stage

This folder stores research plans, feasibility briefs, and data sourcing policies.

- `plans/` – Structured research plans generated from ideas or change requests.
- `briefs/` – Completed research findings and feasibility reports.
- `RESEARCH_BRIEF_TEMPLATE.md` – Template for documenting results.
- `SOURCES_POLICY.md` – Guidelines for citing and vetting external data.

Workflow:

1. Create or update a research plan (`plans/plan_*.md`).
2. Run due diligence via the research prompts; store outputs in `briefs/`.
3. Reference findings when updating PRD, blueprint, or change requests.

## Prompts

- `.autoforge/ai/prompts/idea_intake.yaml` (planning)
- `.autoforge/ai/prompts/research_due_diligence.yaml` (execution)
