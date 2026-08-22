# AutoForge Bootstrap Pipeline

Bootstrap defines which project artifacts must exist. The `intent`, `workflow`,
`planning`, `design`, and `research` command families produce those artifacts;
bootstrap approvals connect completed work back to the readiness manifest.

## 1. Scaffold and Discover

```bash
autoforge bootstrap scaffold
autoforge bootstrap discover --schema
autoforge bootstrap discover discovery.json
autoforge bootstrap vision
autoforge bootstrap vision-approve "Approve the current project vision"
```

`vision-approve` records the human approval and marks the manifest's `vision`
artifact approved. When `VISION.md` exists, it is recorded as evidence.

## 2. Produce a Gated Artifact

Inspect the expected intent input without reading bundled source:

```bash
autoforge intent assess --schema
autoforge intent assess architecture-intent.json --kind architecture --persist
```

The intent kind describes the discipline being assessed. Workflow kinds
describe executable lifecycle templates. AutoForge accepts intent aliases when
starting workflows, so `architecture` normalizes to `architecture-change`:

```bash
autoforge workflow start architecture-v1 architecture
autoforge workflow advance architecture-v1
autoforge workflow advance architecture-v1
autoforge workflow advance architecture-v1
```

## 3. Approve With Evidence

After the workflow reports `status: "completed"`, attach it to the bootstrap
artifact:

```bash
autoforge bootstrap approve architecture --evidence architecture-v1
autoforge bootstrap gates
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
autoforge schemas list
autoforge schemas show intent-assess
autoforge workflow handoff --schema
autoforge research register --schema
autoforge orchestrate plan --schema
```

The emitted documents are JSON Schema Draft 2020-12 and match the runtime Zod
validators used by the installed CLI.
