# AutoForge Quickstart (Embedded Mode)

Follow these steps to run AutoForge inside an existing project using Chat Mode.

Tip: For a broader, multi‑project overview (roles, approvals, automation features, and recipes), see `docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md`.

## 1. Install & Initialize

```bash
npm install --save-dev @cojacklabs/autoforge
npx autoforge init
npx autoforge load   # emits a copy/paste prompt to train your AI on context + memory
```

This scaffolds `.autoforge/` in your repo and writes `autoforge.config.json`; runtime dependencies arrive with the npm package and the default configuration is applied so everything is ready for your coding assistant.

## 2. Configure Paths

- Update `codeTargets` inside `autoforge.config.json` so backend/frontend/tests (and any extras) point at your project.
- (Optional) adjust `contextTargets` if PRD/blueprint/UI/UX docs live outside the defaults.
- After editing, run `npx autoforge configure` to regenerate the managed `ai/code_targets.yaml` and `ai/context_targets.yaml` files. Avoid hand-editing files under `./.autoforge` unless directed by the framework.

## 3. Capture the Idea

Start with a high-reasoning conversation when you want the agent to brainstorm options:

```
Execute .autoforge/ai/prompts/idea_conversation.yaml
Let's explore the product vision, platforms, tech stack choices, integrations, and risks.
```

When you have the basics, either fill `ideas/IDEA_TEMPLATE.yaml` manually **or** run:

```
Execute .autoforge/ai/prompts/discovery_researcher.yaml
Help me capture the vision for this project.
```

Follow up with:

```
Execute .autoforge/ai/prompts/idea_intake.yaml
Translate our notes into the structured idea plan for downstream agents.
```

The agents write drafts under `ideas/` plus summaries under `ai/logs/`.

### Seed shared memory

- Copy `ai/memory/MEMORY_TEMPLATE.yaml` to `ai/memory/ACTIVE_MEMORY.yaml` (or another descriptive name).
- Capture the latest decisions, corrections, and open questions after each working session.
- When you start a new Chat Mode run—or swap to a different coding agent—tell it to review the active memory file before continuing the work.

## 4. Validate Quality Gates

```bash
npx autoforge validate
```

Quality gates accept either canonical docs under `docs/`, `api/`, `diagrams/` or planning copies under `./.autoforge/ai/reports/**` (e.g., `.autoforge/ai/reports/prd_stub.md`, `.autoforge/ai/reports/openapi_stub.yaml`, `.autoforge/ai/reports/diagrams/*.mmd`).
You can override validation patterns via `contextTargets.requiredGlobs` in `autoforge.config.json`.

## 5. Kick Off (Chat Mode)

Paste the block below into your coding assistant:

```
Read and follow:
- .autoforge/ai/context.manifest.yaml
- .autoforge/ai/agents.yaml
- .autoforge/ai/prompts/kickoff.yaml

While planning, stay inside ./.autoforge for docs/logs.
When writing code/tests, use the paths defined in autoforge.config.json (mirrored to .autoforge/ai/code_targets.yaml).
Confirm the latest idea in ideas/.
Run the kickoff sequence (PM → UI/UX → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective).
Log outputs to .autoforge/ai/logs/** and .autoforge/ai/reports/**.
```

## 6. Change Requests

When you have a new feature, bug, migration, or knowledge share, run:

```
Execute .autoforge/ai/prompts/change_intake.yaml
Work with me to capture the request, fill in acceptance criteria, and create the change request file.
```

The agent interviews you, clones `CR-0000_example.yaml`, and saves the populated request under `change_requests/`. Review/edit the generated file, commit, and follow the Chat Mode instructions posted by the GitHub Action.

> Guidance for humans & agents
>
> - Capturing ideas, refining change requests, and logging updates all happen inside `./.autoforge`.
> - Keep the shared memory file in `ai/memory/` up to date; new agents should review it before acting.
> - Engineering prompts step out only through the code targets defined in `autoforge.config.json` (mirrored to `ai/code_targets.yaml`). Update the config and run `npx autoforge configure` before coding.
> - Agents should announce package installs, migrations, or debugging commands in advance so you can approve or redirect them.
> - Follow `docs/ai/COMMIT_PLAYBOOK.md` when staging commits or running impactful commands.
> - Confirm semantic version bumps in package manifests before the final commit; document the rationale in the commit body.

For single-issue bug fixes that cannot wait for the full change-request workflow, run `Execute .autoforge/ai/prompts/hotfix.yaml` and follow the same memory/commit rules.

## 7. Prompt Jumpstarts

- **Idea workshop** — `Execute .autoforge/ai/prompts/idea_conversation.yaml`
- **Share repo context** — `Execute .autoforge/ai/prompts/context_snapshot.yaml`
- **Normalise change requests** — `Execute .autoforge/ai/prompts/change_intake.yaml`
- **Route any request into automation** — `Execute .autoforge/ai/prompts/automation_bootstrap.yaml`

- **Preview the plan without writing files (dry run)**
  ```
  npx autoforge dryrun web_app   # or analytics_app/mobile_app
  ```

Each prompt includes detailed instructions for the agent and where to record outputs.

## 8. Snapshot the Project (Optional)

To create `REPO.md` for the host project:

```bash
npx autoforge snapshot
```

Run the command from the repo root to capture the current project, or append a path (for example, `npx autoforge snapshot ..`) to target another directory. The snapshot is a flattened context summary so AI tools can ingest the whole repository.

## 9. Update AutoForge

When new framework updates land upstream, run:

```bash
npx autoforge upgrade
```

The CLI auto-stashes your `.autoforge/` edits, applies the latest framework, and restores data directories (logs, memory, change requests). Resolve conflicts if Git raises any, rerun `npx autoforge validate`, log the upgrade in memory, and ask your coding assistant to reload the manifests/playbook.
