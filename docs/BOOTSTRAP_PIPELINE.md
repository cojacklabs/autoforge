# Priozar Bootstrap Pipeline

Bootstrap defines which project artifacts must exist. The `intent`, `workflow`,
`planning`, `design`, and `research` command families produce those artifacts;
bootstrap approvals connect completed work back to the readiness manifest.

## 1. Scaffold and Discover

```bash
priozar bootstrap scaffold
priozar bootstrap discover --schema
priozar bootstrap discover discovery.json
priozar bootstrap vision
priozar bootstrap vision-approve "Approve the current project vision"
```

`vision-approve` records the human approval and marks the manifest's `vision`
artifact approved. When `VISION.md` exists, it is recorded as evidence.

## 2. Produce a Gated Artifact

Inspect the expected intent input without reading bundled source:

```bash
priozar intent assess --schema
priozar intent assess architecture-intent.json --kind architecture --persist
```

The intent kind describes the discipline being assessed. Workflow kinds
describe executable lifecycle templates. Priozar accepts intent aliases when
starting workflows, so `architecture` normalizes to `architecture-change`:

```bash
priozar workflow start architecture-v1 architecture
priozar workflow advance architecture-v1
priozar workflow advance architecture-v1
priozar workflow advance architecture-v1
```

## 3. Approve With Evidence

After the workflow reports `status: "completed"`, attach it to the bootstrap
artifact:

```bash
priozar bootstrap approve architecture --evidence architecture-v1
priozar bootstrap gates
```

Evidence may be a completed workflow ID or a project-contained artifact path.
Workflow evidence is rejected until the run is completed. Approvals record
`approvedAt` and the normalized evidence path in
`.autoforge/bootstrap/manifest.json`.

Repeat the same production-and-approval flow for `design`, `data`, and
`security`. `bootstrap gates` becomes ready only when all four gated artifacts
are approved.

## JSON Input Discovery

```bash
priozar schemas list
priozar schemas show intent-assess
priozar workflow handoff --schema
priozar research register --schema
priozar orchestrate plan --schema
```

The emitted documents are JSON Schema Draft 2020-12 and match the runtime Zod
validators used by the installed CLI.
