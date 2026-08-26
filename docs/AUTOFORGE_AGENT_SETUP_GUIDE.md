# AutoForge Agent Setup Guide

Use this procedure whenever a repository-aware coding agent joins a project,
resumes after a handoff, or continues after AutoForge is updated.

## Canonical Startup Prompt

> Use the globally installed AutoForge CLI for this repository. Review `README.md` and follow the current documentation walkthrough in `docs/README.md` to use AutoForge continuously throughout brainstorming, planning, documentation, design, bootstrapping, development, validation, decision-making, and handoff; follow every applicable `AGENTS.md` and summarize the project's current AutoForge state before making changes.

## Required Procedure

### 1. Establish authority and project identity

1. Resolve the Git repository root. AutoForge treats the whole repository as
   one project unless the path belongs to an independent submodule.
2. Read applicable `AGENTS.md` files from the repository root toward the files
   in scope.
3. Read [`docs/README.md`](README.md) and use the
   [CLI reference](AUTOFORGE_CLI_REFERENCE.md) for current syntax.
4. Run:

   ```bash
   autoforge version
   autoforge --project "$PWD" doctor
   autoforge --project "$PWD" bootstrap status
   autoforge --project "$PWD" recap
   ```

If `.autoforge/` is absent, run `autoforge attach "$PWD"`. `attach` both
initializes the repository and registers it in the machine-wide workspace. Do
not use `init` unless the human deliberately wants local-only state.

### 2. Load only the relevant context

When `recap` reports active work:

```bash
autoforge --project "$PWD" context --explain
autoforge --project "$PWD" contract validate
```

Generate a missing contract with the canonical adapter identity:

```bash
autoforge --project "$PWD" agents list
autoforge --project "$PWD" contract generate <agent-id>
autoforge --project "$PWD" contract validate
```

Before editing, summarize:

- objective and active work ID;
- allowed and excluded file patterns;
- applicable governance and doctrines;
- relevant decisions and evidence;
- risks, unknowns, and approval requirements;
- validation commands and completion conditions.

Do not replace a bounded AutoForge packet with an unrestricted repository scan.

### 3. Turn an unstructured request into durable work

If no work is active, do not silently treat a long conversation as the plan.
Inspect the schema and assess the request:

```bash
autoforge intent assess --schema
autoforge intent assess intent.json --kind <implementation|research|architecture|design|planning|data|security>
```

Use the recommended workflow, or create a feature/phase/task or issue with
explicit include and exclude patterns. Ask the human about genuinely material
ambiguity; persist resolved choices with `decide`.

### 4. Keep AutoForge synchronized while working

- Refresh `context --explain` after work, governance, design, or decision state
  changes materially.
- Run `check --path <file>` before or during scoped edits.
- Record research, specifications, trace links, hypotheses, and evidence in the
  corresponding AutoForge domain instead of leaving them only in chat.
- Use `gate check` for retained validation.
- Record a decision linked to the active work before `done`.
- Use a structured handoff when another agent will continue.

### 5. Finish or hand off cleanly

For completion:

```bash
autoforge gate check
autoforge decide --statement "..." --reasoning "..." --consequence "..." --scope <scope> --keyword <keyword> --work <work-id>
autoforge done
```

For continuation, provide a recap or protocol handoff containing changed files,
Git state, decisions, validation, risks, open questions, and one next action.
Raw transcripts and provider messages are not the handoff contract.

## Safety Boundaries

Agents must not silently:

- replace or delete `.autoforge/` project memory;
- broaden active file scope;
- edit generated context or orchestration lease state as source material;
- store API keys in project files;
- claim remote CI, publication, deployment, or approval that did not occur;
- use historical documentation as current command authority.

After an AutoForge update, rerun version, doctor, recap, contract validation,
and context resolution before continuing.
