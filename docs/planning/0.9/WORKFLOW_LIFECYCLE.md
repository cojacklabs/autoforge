# v0.9 Workflow Lifecycle

AutoForge v0.9 workflows move structured project knowledge through ordered,
validated stages without forcing every workflow through the same disciplines.

## Commands

```bash
autoforge workflow start <run-id> <workflow-kind>
autoforge workflow show <run-id>
autoforge workflow advance <run-id>
autoforge workflow advance <run-id> --skip-optional
```

## State

Workflow runs persist under `.autoforge/workflows/<run-id>.json` and contain:

- workflow kind and definition version;
- current stage;
- completed stages, including intentionally skipped optional stages;
- active or completed status;
- last update timestamp.

## Transition Rules

- Stages advance in the order defined by the workflow.
- `--skip-optional` bypasses optional stages until the next required stage.
- The final stage transition marks the run `completed`.
- Completed runs cannot advance again.
- Invalid workflow kinds, missing runs, and invalid transitions return usage errors.

## Design Principle

Workflow orchestration governs sequencing and handoffs; it does not replace the
host coding, design, or research agent.
