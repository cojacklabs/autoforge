# 🧠 AutoForge — Multi-Agent SDLC with Autopilot & Continuous Learning

[![npm version](https://img.shields.io/npm/v/autoforge?color=0f9d58&label=autoforge)](https://www.npmjs.com/package/@cojacklabs/autoforge)

AutoForge is a multi-agent orchestration framework that lives as `.autoforge/` inside your project. AI agents collaboratively plan, design, code, test, and deploy—while improving autonomously with every project through continuous feedback loops.

**What's new in this release:**
- ✨ **Autopilot orchestration** – Agents run 24/7 without manual blocking; choose autonomy level (0=manual → 3=adaptive)
- 🎓 **Continuous learning** – Every execution trains models; prompts/recipes improve automatically
- 🚀 **Faster initialization** – 2-step setup for new projects; 1-step resume for existing ones
- 📊 **Real-time observability** – Track agent performance and system improvements quarterly

Planning artifacts stay inside `.autoforge/`, while application code and tests write to your project paths. (Legacy installs used `autoforge/`; the CLI recognises both.)

> 📘 **Quick start:** [docs/QUICKSTART.md](docs/QUICKSTART.md)
> 📚 **Expansion guide:** [docs/AUTOFORGE_EXPANSION_QUICK_START.md](docs/AUTOFORGE_EXPANSION_QUICK_START.md)
> 🎯 **Autopilot architecture:** [docs/AUTOFORGE_AUTOPILOT_ENGINE.md](docs/AUTOFORGE_AUTOPILOT_ENGINE.md)
> 🧠 **Model training:** [docs/AUTOFORGE_AI_MODEL_TRAINING.md](docs/AUTOFORGE_AI_MODEL_TRAINING.md)
> 📖 **Handbook:** [docs/PROMPT_HANDBOOK.md](docs/PROMPT_HANDBOOK.md)

---

## Quick Start: New Project (2 Steps)

```bash
# Step 1: Install and initialize
npm install --save-dev @cojacklabs/autoforge
npx autoforge init

# Step 2: Load context into your AI
npx autoforge load --copy
```

Done! The framework is ready. The `--copy` flag outputs a ready-to-paste prompt for your coding AI. Paste it and you're set to start building.

---

## Quick Resume: Existing Project (1 Step)

Already have a `.autoforge/` directory? Resume with:

```bash
npx autoforge load --resume
```

This reloads all context, memory, and agent state from your last session. Your AI picks up where you left off.

---

## Configure Code & Documentation Paths

Update `autoforge.config.json` once to tell agents where your code lives:

```json
{
  "codeTargets": {
    "backend": "src/server",
    "frontend": "src/client",
    "tests": "tests"
  },
  "contextTargets": {
    "ideas": "ideas",
    "prd": "docs/prd",
    "blueprints": "docs/blueprint"
  },
  "autopilot": {
    "defaultAutonomyLevel": 1
  }
}
```

Then regenerate managed files:

```bash
npx autoforge configure
```

See the [autonomy levels guide](docs/AUTOFORGE_EXPANSION_QUICK_START.md) to choose the right level (0=manual, 1=supervised, 2=full, 3=adaptive).

---

## Start Your Project with Autopilot

Once initialized and configured, choose your autopilot level and start building:

```bash
# Supervised autopilot (recommended for first time)
npx autoforge autopilot --level 1 --recipe web_app

# Full autopilot (for proven recipes)
npx autoforge autopilot --level 2 --recipe web_app

# Full autopilot with continuous learning
npx autoforge autopilot --level 3 --recipe web_app
```

Agents will orchestrate the full SDLC: idea → design → architecture → code → test → security → deploy.

See [AUTOFORGE_AUTOPILOT_ENGINE.md](docs/AUTOFORGE_AUTOPILOT_ENGINE.md) for detailed autonomy levels and configurations.

---

## Capture the Idea (Optional Manual Step)

AutoForge expects at least one idea file before kickoff.

- Start a high-reasoning conversation:
  ```
  Execute .autoforge/ai/prompts/idea_conversation.yaml
  Help me explore the application vision, platforms, tech stack options, and risks.
  ```
  The agent will interview you, propose stacks/integrations, and log the dialogue under `ai/logs/ideas/`.
- Copy `ideas/IDEA_TEMPLATE.yaml`, fill in the project vision, and save (e.g., `ideas/IDEA-0001_alpha.yaml`). **OR**
- Let the assistant interview you with a tight template:
  ```
  Execute .autoforge/ai/prompts/discovery_researcher.yaml
  Help me capture the project idea by asking clarifying questions.
  ```
  The agent writes the filled template plus notes under `ai/logs/research/`.

Continue iterating with the assistant until the idea reflects what you want built.
When you have clarity, run `Execute .autoforge/ai/prompts/idea_intake.yaml` to convert the notes into a structured plan for the Assembly Line.
Record the most important decisions or clarifications in `ai/memory/` so future sessions inherit the same story.

---

## Validate Quality Gates

```bash
npx autoforge validate
```

This enforces quality standards: PRD, architecture diagrams, API contracts, security checklists, observability. Quality gates accept either canonical docs or planning stubs under `.autoforge/ai/reports/`. If something is missing, add the file or stub before moving on.

---

## Monitor Agent Performance (Autopilot Only)

Once agents are running autonomously, track their performance:

```bash
# View real-time autopilot status
npx autoforge status

# Generate training metrics (after 10+ projects)
npx autoforge train --from-last-N-projects 10 --output-report

# View agent success rates and improvements
npx autoforge metrics show --metric agent_success_rate
```

The system learns from every execution. After each project, prompts and recipes improve automatically. See [AUTOFORGE_AI_MODEL_TRAINING.md](docs/AUTOFORGE_AI_MODEL_TRAINING.md) for how the training loop works.

---

## Workspace Boundaries & Approvals

- Planning/logging: keep your assistant in `./.autoforge` so ideas, research, and reports stay contained. (Legacy: `./autoforge`)
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

## Manual Orchestration (If Not Using Autopilot)

If you prefer manual control, paste this into your coding assistant:

```
Read and follow:
- .autoforge/ai/context.manifest.yaml
- .autoforge/ai/agents.yaml
- .autoforge/ai/prompts/kickoff.yaml

While planning, stay inside ./autoforge for docs/logs.
When writing code/tests, use the paths in autoforge.config.json (mirrored to .autoforge/ai/code_targets.yaml).
Confirm the latest idea in ideas/.
Run the kickoff sequence: Product Manager → UI/UX → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective.
Log outputs to .autoforge/ai/logs/** and .autoforge/ai/reports/**.
```

Continue agent-by-agent as needed. See [docs/PROMPT_HANDBOOK.md](docs/PROMPT_HANDBOOK.md) for ready-made prompts.

---

## Prompt Jumpstarts (Copy/Paste Ready)

- **Idea workshop (AI agent interview)**
  ```
  Execute .autoforge/ai/prompts/idea_conversation.yaml
  Partner with me on the product vision. Ask layered questions about audience,
  platform (web/mobile/desktop/framework), tech stack options, third-party integrations,
  delivery cadence, and risks. Summarize decisions in ideas/ and ai/logs/ideas/.
  ```
- **Share the current project context**
  ```
  Execute .autoforge/ai/prompts/context_snapshot.yaml
  Generate a fresh REPO.md snapshot of the host project with `npx autoforge snapshot`.
  Highlight notable directories, recent changes, and any risks downstream agents should know.
  ```
- **Intake a structured change request**
  ```
  Execute .autoforge/ai/prompts/change_intake.yaml
  I have a change request (feature/bug/migration/knowledge share).
  Interview me, capture acceptance criteria, and create the change_requests/ record and intake log.
  ```
- **Route any engagement into the SDLC Assembly Line**
  ```
  Execute .autoforge/ai/prompts/automation_bootstrap.yaml
  Diagnose whether I need a new build, help on an existing codebase, a migration, or troubleshooting.
  Discover available recipes under docs/blueprint/recipes/*.yaml and propose the best fit.
  STOP for approval, then trigger the right prompts (kickoff, change intake, context snapshot, etc.).
  ```

- **Preview the plan without writing files (dry run)**
  ```
  npx autoforge dryrun web_app   # or analytics_app/mobile_app
  # Prints a step-by-step checklist from the selected recipe, preflight checks,
  # and approval gates — no files are written.
  ```

---

## Change Request Workflow

1. Tell the assistant what needs to change:
   ```
   Execute .autoforge/ai/prompts/change_intake.yaml
   I need help with <feature|bug|migration|knowledge share>.
   Ask follow-up questions, create the change request file for me, and log any open issues.
   ```
   The agent interviews you, clones `CR-0000_example.yaml`, and saves a populated record under `change_requests/`.
2. Review or edit the generated change request if needed, then commit/push. The GitHub Action validates and posts instructions in the run summary.
3. In Chat Mode, run the prompts in order:
   - `Execute .autoforge/ai/prompts/change_request.yaml`
   - (If UX involved) `Execute .autoforge/ai/prompts/uiux_designer.yaml`
   - `Execute .autoforge/ai/prompts/impact_analysis.yaml`
   - Follow the chain (Fullstack → QA → Security → Performance → SRE → DevOps → Retrospective)
4. Record outputs to the paths defined in each prompt (`ai/logs/**`, `ai/reports/**`, etc.).

> Urgent defect? Run `Execute .autoforge/ai/prompts/hotfix.yaml` instead. It keeps the scope to a single bug, enforces reproducibility, and still requires you to follow the commit rules in `docs/ai/COMMIT_PLAYBOOK.md`.

---

## Stage Gate Checklist

Tick these items before shipping a slice:

- ✔ Idea: `.autoforge/ideas/IDEA_*.yaml`
- ✔ UI/UX: `.autoforge/docs/uiux/style_guide.md`, `wireframes.md`, `user_flows.md`, `accessibility_guidelines.md`, `ai/reports/uiux/*.md`
- ✔ Architecture: `.autoforge/docs/blueprint/*.md`, `.autoforge/diagrams/*.mmd`, `.autoforge/api/openapi.yaml`
- ✔ Engineering outputs: code targets from `autoforge.config.json` (mirrored to `.autoforge/ai/code_targets.yaml`) contain new code (`../src/backend`, `../src/frontend`, `../tests` by default)
- ✔ QA: `.autoforge/ai/logs/test_runs/latest_report.md`, `.autoforge/qa/reports/defects.md`
- ✔ Security: `.autoforge/security/reports/security_audit.md`, `.autoforge/security/reports/findings.json`
- ✔ Performance: `.autoforge/docs/perf/plan.md`, `.autoforge/docs/perf/scripts/*`, `.autoforge/ai/reports/perf/*.md`
- ✔ Observability: `.autoforge/docs/observability/dashboards.md`, `alerts.md`, `slo.md`, `.autoforge/ai/reports/observability/*.md`
- ✔ DevOps: `.autoforge/devops/runbooks/deploy.md`, `.autoforge/ai/logs/deployments/*_deploy.md`
- ✔ Retrospective: `.autoforge/ai/reports/retrospective_*.md`
- ✔ Versioning: package manifests bumped per docs/ai/COMMIT_PLAYBOOK.md and rationale captured in commits/memory.

Tip: Recipe-driven CI templates live under `devops/ci/` (e.g., `devops/ci/web_app.yml`). Copy and adapt them in your host repo or reference as examples.

---

## CLI Reference

Essential commands for the new autopilot/training features:

- `autoforge init [--force]` — scaffold `.autoforge/` and `autoforge.config.json`
- `autoforge load [--copy|--resume]` — emit copy/paste prompt (--copy) or resume from memory (--resume)
- `autoforge configure` — regenerate managed YAML files from config
- `autoforge validate` — run quality gate checks
- `autoforge autopilot --level [0-3] --recipe [name]` — start orchestration
- `autoforge status` — view real-time autopilot progress
- `autoforge train --from-last-N-projects [N]` — extract patterns and suggest improvements
- `autoforge metrics show --metric [name]` — view agent performance trends
- `autoforge snapshot [path]` — generate REPO.md for context sharing
- `autoforge dryrun [recipe]` — preview execution plan (no writes)
- `autoforge upgrade` — update to latest framework version
- `autoforge doctor` — verify required files and config

---

## Demo Slice (Optional)

Need a sample to test? Update `codeTargets` in `autoforge.config.json` (then run `npx autoforge configure`) to point at the demo directories and try:

- `examples/fullstack_todo_app/demo_src/backend/server.js`
- `examples/fullstack_todo_app/demo_src/frontend/index.html`
- `node --test examples/fullstack_todo_app/demo_src/tests/todo.test.js`

CI already runs this example as part of `.github/workflows/ci.yml`.

---

## Update AutoForge

```bash
npx autoforge upgrade
```

The CLI auto-stashes local changes, applies the latest framework, and restores your data (logs, memory, change requests). If conflicts occur, resolve them and rerun `npx autoforge validate`.

After upgrading, note the change in your active memory file and have your AI reload the context manifests.

---

## Documentation & Resources

| Resource | What it covers |
|----------|---------------|
| [docs/QUICKSTART.md](docs/QUICKSTART.md) | Fast setup for new and existing projects |
| [docs/AUTOFORGE_EXPANSION_QUICK_START.md](docs/AUTOFORGE_EXPANSION_QUICK_START.md) | One-page guide to autopilot & training |
| [docs/AUTOFORGE_AUTOPILOT_ENGINE.md](docs/AUTOFORGE_AUTOPILOT_ENGINE.md) | Full orchestration spec, autonomy levels, state machine |
| [docs/AUTOFORGE_AI_MODEL_TRAINING.md](docs/AUTOFORGE_AI_MODEL_TRAINING.md) | Training data collection, feedback loops, continuous improvement |
| [docs/AUTOFORGE_EXPANSION_SYNTHESIS.md](docs/AUTOFORGE_EXPANSION_SYNTHESIS.md) | How it all fits together + implementation roadmap |
| [docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md](docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md) | Multi-project workflows and recipes |
| [docs/PROMPT_HANDBOOK.md](docs/PROMPT_HANDBOOK.md) | Ready-made prompts for all agent roles |
| [examples/fullstack_todo_app/](examples/fullstack_todo_app/) | Working example: idea → code → tests |

> “AutoForge lets you build software at the speed of thought — ideas in, deployments out.”

---

## License

Released under the [MIT License](LICENSE). © 2025 CoJack Labs.

---

## Contributing

We welcome contributions! Please:

- Read the [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md)
- Look for issues labeled `good first issue` or `help wanted`
- Follow the commit guidance in `docs/ai/COMMIT_PLAYBOOK.md`
- Run local checks before opening a PR:
  - `npm run build`
  - `npx autoforge configure` (if config changed)
  - `npx autoforge validate`

Use Discussions and Issues to coordinate. Assign/mention teammates to draw attention when needed.
