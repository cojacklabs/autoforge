# 🧠 AutoForge — Embedded Multi-Agent SDLC

[![npm version](https://img.shields.io/npm/v/autoforge?color=0f9d58&label=autoforge)](https://www.npmjs.com/package/@cojacklabs/autoforge)

AutoForge lives as `autoforge/` inside your existing project so coding assistants can plan, design, and ship software autonomously. Planning artifacts stay inside `autoforge/`, while application code and tests write to your project paths.

> 📘 Short on time? See [docs/QUICKSTART.md](docs/QUICKSTART.md). Need prompt examples? See [docs/PROMPT_HANDBOOK.md](docs/PROMPT_HANDBOOK.md).

---

## 1. Install AutoForge via npm

```bash
npm install --save-dev @cojacklabs/autoforge
```

---

## 2. Initialize the framework

```bash
npx autoforge init
```

This copies the framework into `autoforge/`, generates `autoforge.config.json`, and keeps the structure your agents expect. Runtime dependencies are already installed alongside the npm package, and the default configuration is applied automatically—rerun `npx autoforge configure` whenever you change the config.

### Load context for your AI (first run)

```bash
npx autoforge load
```

This emits a copy/paste prompt (also saved under `autoforge/ai/logs/mastermind/`) to help your coding AI reload the rules, roles, progress log (`ai/AGENTS.md`), and the most recent memory file if present.

---

## 3. Configure once via autoforge.config.json

- Update `"codeTargets"` so backend/frontend/tests (and any extras) point to real directories in your project. After editing, run `npx autoforge configure` to regenerate the managed YAML files.
- (Optional) Adjust `"contextTargets"` if your documentation (PRD/blueprint/UI/UX) lives outside the defaults.
- Tweak feature flags or other overrides in `autoforge.config.json` as needed. Avoid editing files inside `autoforge/` directly—those folders are managed by the framework.

You’ve now told the agents where planning docs live and where to generate code.

---

## 4. Capture the idea (human ↔️ AI conversation)

AutoForge expects at least one idea file before kickoff.

- Start a high-reasoning conversation:
  ```
  Execute autoforge/ai/prompts/idea_conversation.yaml
  Help me explore the application vision, platforms, tech stack options, and risks.
  ```
  The agent will interview you, propose stacks/integrations, and log the dialogue under `ai/logs/ideas/`.
- Copy `ideas/IDEA_TEMPLATE.yaml`, fill in the project vision, and save (e.g., `ideas/IDEA-0001_alpha.yaml`). **OR**
- Let the assistant interview you with a tight template:
  ```
  Execute autoforge/ai/prompts/discovery_researcher.yaml
  Help me capture the project idea by asking clarifying questions.
  ```
  The agent writes the filled template plus notes under `ai/logs/research/`.

Continue iterating with the assistant until the idea reflects what you want built.
When you have clarity, run `Execute autoforge/ai/prompts/idea_intake.yaml` to convert the notes into a structured plan for the Assembly Line.
Record the most important decisions or clarifications in `ai/memory/` so future sessions inherit the same story.

---

## 5. Validate quality gates

```bash
npx autoforge validate
```

This enforces everything in `ai/context.manifest.yaml` (PRD present, diagrams exist, security checklist ready, observability docs, etc.). Quality gates now accept either the canonical docs under `docs/`, `api/`, `diagrams/` or planning-first copies under `./autoforge/ai/reports/**` (e.g., `autoforge/ai/reports/openapi_stub.yaml`, `autoforge/ai/reports/diagrams/*.mmd`). If something is missing, add the canonical file or a planning stub before moving on.

---

### Workspace boundaries & approvals

- Planning/logging: keep your assistant in `./autoforge` so ideas, research, and reports stay contained.
- Implementation: agents may only touch the host project through the code targets defined in `autoforge.config.json` (mirrored to the managed `ai/code_targets.yaml`). Update the config and rerun `npx autoforge configure` before coding.
- Elevated actions (package installs, long-running scripts, migrations) should be called out explicitly so the human reviewer can approve before execution.

---

### Guiding your AI teammate

- Kick off every session by pointing the agent at the latest `ideas/IDEA_*.yaml` entry and clarifying the goal in your own words.
- If the agent drifts or makes wrong assumptions, edit the relevant docs (idea, PRD, tech blueprint) or reply with corrections—AutoForge treats those files as the single source of truth.
- Remind the agent to log discoveries under `ai/logs/**` and summaries under `ai/reports/**` so you can audit each step.
- Use change requests when the scope shifts; the prompts walk the agent through impact analysis and give you checkpoints to accept or redirect work.
- Expect the agent to ask before running package installs, migrations, or touching files outside the declared targets—approve or deny explicitly to keep control of your repo.
- Keep an active memory file under `ai/memory/` up to date after each session; direct new assistants to review it before continuing work.
- Before staging commits or running stateful commands, have the agent review `docs/ai/COMMIT_PLAYBOOK.md` so history stays clean and reproducible.
- Confirm semantic version bumps (package.json, etc.) follow the playbook—major for breaking changes, minor for new features, patch for fixes.

---

## 6. Kick off with your coding AI

The kickoff prompt now confirms there is a current idea file before orchestrating
the Assembly Line. If none exists, it will instruct you to run `idea_conversation`
or drop a Markdown brief into `ideas/` so the agents can work autonomously.

Paste the snippet below into your coding assistant (Codex, Claude Code, Gemini Code, Cursor, etc.). This sets the stage for multi-agent handoffs.

```
Read and follow:
- autoforge/ai/context.manifest.yaml
- autoforge/ai/agents.yaml
- autoforge/ai/prompts/kickoff.yaml

While planning: stay inside ./autoforge for docs/logs.
When writing code/tests: use the paths defined in autoforge.config.json (mirrored to autoforge/ai/code_targets.yaml).
Confirm the latest idea in ideas/.
Run the kickoff sequence (Product Manager → UI/UX → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective).
Log outputs to autoforge/ai/logs/** and autoforge/ai/reports/**.
```

### Follow-up prompts

After kickoff completes you can continue agent-by-agent:

- `Execute autoforge/ai/prompts/architect.yaml`
- `Execute autoforge/ai/prompts/fullstack_engineer.yaml`
- … and so on down the chain.

Refer to [docs/prompt_handbook.md](docs/prompt_handbook.md) for ready-made snippet patterns.

---

## 7. Prompt jumpstarts (copy/paste ready)

- **Idea workshop (AI agent interview)**
  ```
  Execute autoforge/ai/prompts/idea_conversation.yaml
  Partner with me on the product vision. Ask layered questions about audience,
  platform (web/mobile/desktop/framework), tech stack options, third-party integrations,
  delivery cadence, and risks. Summarize decisions in ideas/ and ai/logs/ideas/.
  ```
- **Share the current project context**
  ```
  Execute autoforge/ai/prompts/context_snapshot.yaml
  Generate a fresh REPO.md snapshot of the host project with `npx autoforge snapshot`.
  Highlight notable directories, recent changes, and any risks downstream agents should know.
  ```
- **Intake a structured change request**
  ```
  Execute autoforge/ai/prompts/change_intake.yaml
  I have a change request (feature/bug/migration/knowledge share).
  Interview me, capture acceptance criteria, and create the change_requests/ record and intake log.
  ```
- **Route any engagement into the SDLC Assembly Line**
  ```
  Execute autoforge/ai/prompts/automation_bootstrap.yaml
  Diagnose whether I need a new build, help on an existing codebase, a migration, or troubleshooting.
  Offer a fully autonomous plan; once I approve, trigger the right prompts (kickoff, change intake, context snapshot, etc.).
  ```

---

## 8. Change request workflow (human ↔️ AI loop)

1. Tell the assistant what needs to change:
   ```
   Execute autoforge/ai/prompts/change_intake.yaml
   I need help with <feature|bug|migration|knowledge share>.
   Ask follow-up questions, create the change request file for me, and log any open issues.
   ```
   The agent interviews you, clones `CR-0000_example.yaml`, and saves a populated record under `change_requests/`.
2. Review or edit the generated change request if needed, then commit/push. The GitHub Action validates and posts instructions in the run summary.
3. In Chat Mode, run the prompts in order:
   - `Execute autoforge/ai/prompts/change_request.yaml`
   - (If UX involved) `Execute autoforge/ai/prompts/uiux_designer.yaml`
   - `Execute autoforge/ai/prompts/impact_analysis.yaml`
   - Follow the chain (Fullstack → QA → Security → Performance → SRE → DevOps → Retrospective)
4. Record outputs to the paths defined in each prompt (`ai/logs/**`, `ai/reports/**`, etc.).

> Urgent defect? Run `Execute autoforge/ai/prompts/hotfix.yaml` instead. It keeps the scope to a single bug, enforces reproducibility, and still requires you to follow the commit rules in `docs/ai/COMMIT_PLAYBOOK.md`.

---

## 9. Stage gate checklist

Tick these items before shipping a slice:

- ✔ Idea: `autoforge/ideas/IDEA_*.yaml`
- ✔ UI/UX: `autoforge/docs/uiux/style_guide.md`, `wireframes.md`, `user_flows.md`, `accessibility_guidelines.md`, `ai/reports/uiux/*.md`
- ✔ Architecture: `autoforge/docs/blueprint/*.md`, `autoforge/diagrams/*.mmd`, `autoforge/api/openapi.yaml`
- ✔ Engineering outputs: code targets from `autoforge.config.json` (mirrored to `autoforge/ai/code_targets.yaml`) contain new code (`../src/backend`, `../src/frontend`, `../tests` by default)
- ✔ QA: `autoforge/ai/logs/test_runs/latest_report.md`, `autoforge/qa/reports/defects.md`
- ✔ Security: `autoforge/security/reports/security_audit.md`, `autoforge/security/reports/findings.json`
- ✔ Performance: `autoforge/docs/perf/plan.md`, `autoforge/docs/perf/scripts/*`, `autoforge/ai/reports/perf/*.md`
- ✔ Observability: `autoforge/docs/observability/dashboards.md`, `alerts.md`, `slo.md`, `autoforge/ai/reports/observability/*.md`
- ✔ DevOps: `autoforge/devops/runbooks/deploy.md`, `autoforge/ai/logs/deployments/*_deploy.md`
- ✔ Retrospective: `autoforge/ai/reports/retrospective_*.md`
- ✔ Versioning: package manifests bumped per docs/ai/COMMIT_PLAYBOOK.md and rationale captured in commits/memory.

---

## 10. Demo slice (optional)

Need a sample to test? Update `codeTargets` in `autoforge.config.json` (then run `npx autoforge configure`) to point at the demo directories and try:

- `examples/fullstack_todo_app/demo_src/backend/server.js`
- `examples/fullstack_todo_app/demo_src/frontend/index.html`
- `node --test examples/fullstack_todo_app/demo_src/tests/todo.test.js`

CI already runs this example as part of `.github/workflows/ci.yml`.

---

## 11. Generate repository snapshot (optional)

From your project root (or to targeted `<path`> for safe keeping):

```bash
npx autoforge snapshot <path>        # writes REPO.md next to the folder you target
```

The generated `REPO.md` makes it easy to share the entire codebase with an AI model.

---

## 12. Update AutoForge

```bash
npx autoforge upgrade
```

The CLI auto-stashes any local changes inside `autoforge/`, applies the latest framework snapshot, and restores your data directories (`ai/memory`, `ai/logs`, `change_requests`, etc.). If Git reports conflicts, resolve them, then rerun `npx autoforge validate`.

After upgrading:

- Note the change in your active memory file so the next session knows which rules changed.
- Tell your assistant to reload `autoforge/ai/context.manifest.yaml`, `autoforge/ai/agents.yaml`, and `docs/ai/COMMIT_PLAYBOOK.md`.

---

## 13. CLI reference

- `autoforge init [--force]` — scaffold or refresh `./autoforge/` and create `autoforge.config.json`.
- `autoforge upgrade` — replace framework-managed files while preserving logs, memory, ideas, and change requests.
- `autoforge configure` — regenerate managed files (ai/code_targets.yaml, ai/context_targets.yaml) from `autoforge.config.json`.
- `autoforge load` — emit a copy/paste prompt (and log to ai/logs/mastermind/) that instructs your AI tool to reload rules, roles, progress, and memory from the latest context and most recent memory. Alias: `autoforge refresh`.
- `autoforge validate` — runs the quality gate checks.
- `autoforge doctor` — verifies required files and config are present.
- `autoforge version` — prints the installed package version.

Need framework commands from inside CI or scripts? Prefix with `npx` (e.g., `npx autoforge validate`).

---

## Links & resources

- 📘 General docs: [`docs/`](docs/)
- ⚡ Quickstart: [`docs/QUICKSTART.md`](docs/QUICKSTART.md)
- 🧪 Change requests: [`change_requests/`](change_requests/)
- 🧩 Prompts: [`ai/prompts/`](ai/prompts/)
- 🧠 Prompt patterns: [`docs/PROMPT_HANDBOOK.md`](docs/PROMPT_HANDBOOK.md)
- 📦 Example project: [`examples/fullstack_todo_app/`](examples/fullstack_todo_app/)

> “AutoForge lets you build software at the speed of thought — ideas in, deployments out.”

---

## License

Released under the [MIT License](LICENSE). © 2025 CoJack Labs.
