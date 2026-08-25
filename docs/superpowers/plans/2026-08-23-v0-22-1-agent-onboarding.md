# v0.22.1 Agent Onboarding & CLI Reference Currency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give solo devs a copy/paste onboarding prompt in `README.md` that points agentic AIs at a fully current `docs/AUTOFORGE_CLI_REFERENCE.md`, and remove hardcoded version numbers from doc prose so this never needs updating again.

**Architecture:** Pure documentation edits across three files (`README.md`, `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md`, `docs/AUTOFORGE_CLI_REFERENCE.md`). No code, no schema, no tests beyond manual verification against `src/cli/help.ts`.

**Tech Stack:** Markdown only.

## Global Constraints

- No version numbers may appear anywhere in documentation prose (spec decision, durable going forward).
- The README "Starting From Scratch" prompt and `AUTOFORGE_AGENT_SETUP_GUIDE.md`'s "Canonical Startup Prompt" must remain near-duplicates — edit both, in lockstep, with the same added clause.
- Do not touch `docs/AUTOFORGE_AGENTIC_AI_GUIDE.md` (out of scope per spec).
- No new CLI commands or source code changes.
- `AUTOFORGE_CLI_REFERENCE.md` must, after this work, contain an accurate counterpart for every command line printed by `src/cli/help.ts`'s `AUTOFORGE_HELP` (read at `src/cli/help.ts:1-183`).

---

### Task 1: De-version README title and bring CLI reference doc fully current

**Files:**

- Modify: `README.md`
- Modify: `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md`
- Modify: `docs/AUTOFORGE_CLI_REFERENCE.md`

**Interfaces:** None — documentation only, no code interfaces produced or consumed.

- [ ] **Step 1: De-version the README title**

In `README.md`, change line 1 from:

```markdown
# AutoForge 0.21.0
```

to:

```markdown
# AutoForge
```

- [ ] **Step 2: Extend the README canonical startup prompt with a CLI reference pointer**

In `README.md`, the "Starting From Scratch" prompt block (currently lines 17-19) reads:

```markdown
We will use the globally installed AutoForge CLI for this repository (available via https://github.com/cojacklabs/autoforge): run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`, initialize or attach the project only when needed, refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.
```

Replace it with (one clause added before the final "summarize" clause, same voice, no version numbers):

```markdown
We will use the globally installed AutoForge CLI for this repository (available via https://github.com/cojacklabs/autoforge): run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`, initialize or attach the project only when needed, refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; read `docs/AUTOFORGE_CLI_REFERENCE.md` for the complete current command surface so you can govern, scaffold, categorize, organize, prioritize, and reorganize this project's work using the full AutoForge CLI; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.
```

- [ ] **Step 3: Sync the same prompt into AUTOFORGE_AGENT_SETUP_GUIDE.md**

In `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md`, the "Canonical Startup Prompt" block (line 5) currently reads:

```markdown
> Use the globally installed AutoForge CLI for this repository: run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`, initialize or attach the project only when needed, refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.
```

Replace it with (matching the README's added clause, keeping this file's own leading phrasing which omits the GitHub URL):

```markdown
> Use the globally installed AutoForge CLI for this repository: run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`, initialize or attach the project only when needed, refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; read `docs/AUTOFORGE_CLI_REFERENCE.md` for the complete current command surface so you can govern, scaffold, categorize, organize, prioritize, and reorganize this project's work using the full AutoForge CLI; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.
```

- [ ] **Step 4: Add a "Learning and Evidence" section to AUTOFORGE_CLI_REFERENCE.md**

In `docs/AUTOFORGE_CLI_REFERENCE.md`, insert a new section directly after the "## Memory and Planning" section (after line 39, before `## Governance and Domain Intelligence`):

````markdown
## Learning and Evidence

```bash
autoforge learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <work-id>]
autoforge learning hypothesis list [--status <proposed|testing|confirmed|refuted>]
autoforge learning hypothesis show <id>
autoforge learning hypothesis status <id> --status <proposed|testing|confirmed|refuted>
autoforge learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text>
autoforge learning experiment list [--status <planned|running|completed|abandoned>]
autoforge learning experiment show <id>
autoforge learning experiment complete <id>
autoforge learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <work-id>]
autoforge learning evidence list [--kind <kind>]
autoforge learning evidence show <id>
autoforge decide --evidence <evidence-id> ...
```
````

`learning hypothesis` records a testable belief with a free-text `--metric`
and `--target`. `learning experiment` may test multiple hypotheses at once
via repeated `--hypothesis` flags. `learning evidence` accepts nine kinds
(`analytics`, `beta-feedback`, `support-ticket`, `bug-report`,
`usability-study`, `experiment-result`, `performance-metric`, `interview`,
`ai-evaluation`) and links to an experiment, a hypothesis, and/or a work item
simultaneously — the links are not mutually exclusive. Passing `--evidence
<id>` to `autoforge decide` closes the loop: it stamps that decision back
onto every referenced evidence record.

````

- [ ] **Step 5: Add `changelog compile` to AUTOFORGE_CLI_REFERENCE.md**

In `docs/AUTOFORGE_CLI_REFERENCE.md`, the "## Memory and Planning" section's code block (lines 29-39) currently ends with:

```markdown
autoforge planning handoff <kind> --phase <phase-id> --include "docs/**"
````

````

Add one line inside that same code block, directly after the `autoforge doctrine` line (after line 32, before `autoforge intent assess ...`):

```markdown
autoforge changelog compile [--since <git-tag>]
````

So the block reads (showing the relevant excerpt):

```markdown
autoforge decide --statement "..." --reasoning "..." --consequence "..." --scope project --keyword architecture
autoforge why --query "..."
autoforge doctrine
autoforge changelog compile [--since <git-tag>]
autoforge intent assess <json-file> --kind implementation
```

- [ ] **Step 6: Fix the stale version-pinned closing line**

In `docs/AUTOFORGE_CLI_REFERENCE.md`, the final line (line 204) currently reads:

```markdown
Legacy commands not shown by `autoforge help` are not part of the supported v0.16 workflow.
```

Replace it with:

```markdown
Legacy commands not shown by `autoforge help` are not part of the supported workflow.
```

- [ ] **Step 7: Verify every help.ts command has a counterpart in the reference doc**

Read `src/cli/help.ts` (the `AUTOFORGE_HELP` string) and `docs/AUTOFORGE_CLI_REFERENCE.md` side by side. Confirm every top-level command listed in help.ts's "Commands:" block (`add`, `changelog`, `check`, `context`, `decide`, `design`, `doctrine`, `doctor`, `done`, `gate`, `help`, `init`, `intent`, `learning`, `research`, `knowledge`, `planning`, `workflow`, `orchestrate`, `schemas`, `contract`, `projects`, `attach`, `detach`, `use`, `agents`, `assets`, `bootstrap`, `migrate`, `update`, `recap`, `start`, `tui`, `version`, `why`, `trace`, `evidence`, `twin`) has an accurate, current usage example somewhere in the reference doc. This is a read-only check — Steps 4-6 above are expected to close every gap identified during spec research (`learning`, `changelog`). If this check finds any further gap, fix it inline in `docs/AUTOFORGE_CLI_REFERENCE.md` before proceeding to Step 8.

- [ ] **Step 8: Run format check**

Run: `npm run format:check`
Expected: PASS (no formatting violations in the three edited Markdown files). If Prettier reports violations, run `npx prettier --write README.md docs/AUTOFORGE_AGENT_SETUP_GUIDE.md docs/AUTOFORGE_CLI_REFERENCE.md` and re-run the check.

- [ ] **Step 9: Commit**

```bash
git add README.md docs/AUTOFORGE_AGENT_SETUP_GUIDE.md docs/AUTOFORGE_CLI_REFERENCE.md
git commit -m "docs: onboard agents to the full CLI reference and drop version numbers from prose"
```

---

## Testing

Documentation-only change; no automated tests apply. Step 7 is the concrete verification step: every command `autoforge help` prints must appear, accurately, in `AUTOFORGE_CLI_REFERENCE.md`. Step 8 runs the project's existing Prettier format check against the edited files.
