# AutoForge Quickstart

Get up and running with AutoForge in 5 minutes. Choose your path: **New Project** or **Existing Project**.

---

## Path A: New Project (2 Steps)

Perfect for starting from scratch with full autopilot support.

### Step 1: Install & Initialize

```bash
npm install --save-dev @cojacklabs/autoforge
npx autoforge init
```

This scaffolds `.autoforge/` and creates `autoforge.config.json`.

### Step 2: Load Context & Start Building

```bash
npx autoforge load --copy
```

Copy the output prompt into your coding AI, then run:

```bash
# Start with supervised autopilot (recommended for first projects)
npx autoforge autopilot --level 1 --recipe web_app
```

**Done!** Agents will automatically handle idea → design → code → test → deploy.

---

## Path B: Existing Project (1 Step)

Already have `.autoforge/`? Resume instantly:

```bash
npx autoforge load --resume
```

Paste the prompt into your AI. Your previous session's memory and context automatically load. No reconfiguration needed.

---

## Configure Code Paths (One-Time Setup)

Update `autoforge.config.json` to tell agents where your code lives:

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

See [Autonomy Levels](#autonomy-levels) below to choose the right level for your team.

---

## Autonomy Levels

Choose the right level for your project and team comfort:

| Level | Description | Human Gates | Best For | Time to Setup |
|-------|-------------|-------------|----------|---------------|
| **0** | Manual (every step approved) | 100% | Complex, high-risk, learning | 5 min |
| **1** | Supervised (agents run; pause on critical) | Deployments, security, integrations | Standard projects, proven recipes | 5 min |
| **2** | Full autopilot (autonomous decisions) | Post-deploy monitoring only | Proven recipes, confident teams | 5 min |
| **3** | Adaptive (agents learn & improve) | Model training changes only | Continuous deployment, feedback-driven | 5 min |

Start with **Level 1**. As confidence grows, move to Level 2 or 3.

---

## Running on Autopilot

Once initialized, start your project:

```bash
# Supervised autopilot (recommended for first projects)
npx autoforge autopilot --level 1 --recipe web_app

# Full autopilot (for proven recipes)
npx autoforge autopilot --level 2 --recipe web_app

# Adaptive autopilot (with continuous learning)
npx autoforge autopilot --level 3 --recipe web_app
```

Agents will automatically orchestrate: **Idea → Design → Architecture → Code → Test → Security → Deploy**

Monitor progress with:

```bash
npx autoforge status
```

---

## Manual Orchestration (Optional)

If you prefer to guide agents step-by-step, use the manual orchestration prompt:

```
Read and follow:
- .autoforge/ai/context.manifest.yaml
- .autoforge/ai/agents.yaml
- .autoforge/ai/prompts/kickoff.yaml

While planning, stay inside ./.autoforge for docs/logs.
When writing code/tests, use paths from autoforge.config.json (mirrored to .autoforge/ai/code_targets.yaml).
Confirm the latest idea in ideas/.
Run the kickoff sequence: PM → UI/UX → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective.
Log outputs to .autoforge/ai/logs/** and .autoforge/ai/reports/**.
```

---

## Capture the Idea (Optional, Only Needed for Manual Mode)

If not using autopilot, start with a conversation:

```
Execute .autoforge/ai/prompts/idea_conversation.yaml
Let's explore the product vision, platforms, tech stack, integrations, and risks.
```

Or let the agent interview you:

```
Execute .autoforge/ai/prompts/discovery_researcher.yaml
Help me capture the vision for this project.
```

Then formalize it:

```
Execute .autoforge/ai/prompts/idea_intake.yaml
Translate our notes into the structured plan for downstream agents.
```

---

## Validate Quality Gates

```bash
npx autoforge validate
```

This enforces standards: PRD present, architecture diagrams exist, security checklist ready, observability docs. Gates accept canonical docs or planning stubs. Add missing files or stubs before proceeding.

---

## Shared Memory

After each session, update your memory file so future sessions pick up where you left off:

```bash
# Create memory file (first time)
cp .autoforge/ai/memory/MEMORY_TEMPLATE.yaml .autoforge/ai/memory/ACTIVE_MEMORY.yaml

# Update with latest decisions, blockers, and learnings
# Agents will read this automatically on next session
```

---

## Change Requests

For new features, bugs, or migrations mid-project:

```
Execute .autoforge/ai/prompts/change_intake.yaml
Help me capture this change request with acceptance criteria.
```

The agent interviews you and creates a `change_requests/CR-*.yaml` file. Review, commit, and follow the instructions.

For urgent bug fixes:

```
Execute .autoforge/ai/prompts/hotfix.yaml
Help me fix this single issue reproducibly.
```

---

## Continuous Improvement (Autopilot Only)

Once your system has completed 10+ projects, generate training metrics:

```bash
# Extract patterns and suggest improvements
npx autoforge train --from-last-N-projects 10 --output-report

# View agent performance trends
npx autoforge metrics show --metric agent_success_rate

# View quarterly improvement summary
npx autoforge metrics show --metric recipe_evolution
```

The system learns from failures and successes automatically. Prompts improve, recipes evolve, agents get smarter.

See [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md) for how the training loop works.

---

## Helpful Commands

| Command | What It Does |
|---------|-------------|
| `npx autoforge snapshot [path]` | Generate REPO.md for context sharing |
| `npx autoforge dryrun web_app` | Preview execution plan without writing files |
| `npx autoforge doctor` | Verify setup is complete |
| `npx autoforge validate` | Run quality gate checks |
| `npx autoforge upgrade` | Update to latest framework |

---

## Next Steps

1. **Choose your path** (New Project or Existing Project above)
2. **Run the initialization** (2 steps for new; 1 for existing)
3. **Pick your autonomy level** (start with Level 1)
4. **Start building** with `npx autoforge autopilot --level 1 --recipe web_app`
5. **Monitor progress** with `npx autoforge status`
6. **Review results** after completion

---

## Learn More

- **Expansion Guide:** [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) — 1-page overview of autopilot & training
- **Autopilot Details:** [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md) — Full orchestration spec, state machine, decision trees
- **Training Loop:** [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md) — How models improve continuously
- **Multi-Project:** [AUTOFORGE_MULTI_PROJECT_GUIDE.md](AUTOFORGE_MULTI_PROJECT_GUIDE.md) — Scaling across teams and domains
- **Prompts:** [PROMPT_HANDBOOK.md](PROMPT_HANDBOOK.md) — Ready-made snippets for all agent roles
