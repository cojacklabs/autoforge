# AutoForge Documentation Standardization Guide (v0.3.0)

**Version:** 1.0
**Date:** 2025-10-29
**Purpose:** Establish consistent documentation patterns for user interaction through simple commands and copy/paste prompts

---

## Overview

AutoForge documentation is standardized around a simple user workflow:

1. **Users run simple commands** — `git clone`, `npm install`, `npx repomix snapshot`
2. **Users copy/paste prompts** — From README or QUICKSTART into their AI agent
3. **AI agents handle everything** — Execution, coordination, logging

This document codifies the documentation standards to ensure consistency across all materials.

---

## Core Principles

### 1. Copy/Paste First Design

- Every prompt should be copy/paste ready
- Code blocks use triple bacbackticks with language tag
- No modifications needed before pasting into AI

### 2. Command Simplicity

- Minimize number of steps
- Use descriptive output messages
- Provide clear feedback to user

### 3. Prompt-Driven Interaction

- All agent actions triggered by pasting prompts
- Prompts include context and instructions
- Prompts are self-contained and explicit

### 4. Clear Navigation

- Users should never be confused about what to do next
- Each section leads naturally to the next
- Multiple entry points for different skill levels

---

## Documentation Structure

### Top-Level Documentation (3 files)

```
README.md
├─ Features overview
├─ Installation (npm install)
├─ Quick-start paths (New Project / Existing Project)
├─ Copy/paste prompts for common tasks
└─ Links to detailed docs

docs/QUICKSTART.md
├─ Path-based setup (New / Existing)
├─ Configuration guide
├─ Autonomy levels explanation
├─ Copy/paste prompts for each path
└─ Helpful commands reference

docs/DOCUMENTATION_ROADMAP.md
├─ Decision tree ("What should I read?")
├─ Role-based reading paths
├─ Document reference table
└─ Quick links
```

### Reference Documentation (4 files for features)

```
docs/AUTOFORGE_EXPANSION_QUICK_START.md
├─ 1-page overview
├─ Key innovations
├─ Autonomy levels table
└─ Implementation timeline

docs/AUTOFORGE_AUTOPILOT_ENGINE.md
├─ Full orchestration spec
├─ State machine
├─ Autonomy matrix
└─ Implementation details

docs/AUTOFORGE_AI_MODEL_TRAINING.md
├─ Training pipeline
├─ Feedback loops
├─ Learning patterns
└─ Implementation roadmap

docs/AUTOFORGE_EXPANSION_SYNTHESIS.md
├─ Big picture
├─ Real-world examples
├─ Implementation roadmap
└─ Success metrics
```

### Supporting Documentation (4 files for migration/understanding)

```
docs/UPDATE_SUMMARY.md
├─ What changed in v0.3
├─ Migration path
└─ New features summary

docs/BEFORE_AFTER_COMPARISON.md
├─ Time savings
├─ Feature improvements
└─ Visual examples

docs/PROMPT_HANDBOOK.md
├─ Ready-made prompt snippets
├─ Organized by agent role
└─ Copy/paste examples

docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md
├─ Multi-project workflows
├─ Recipes
└─ Team coordination
```

### Example Project Documentation

```
examples/fullstack_todo_app/README.md
├─ What the example demonstrates
├─ How to run it
├─ Copy/paste prompts for this project
└─ Expected results
```

---

## Copy/Paste Prompt Standards

### Format

Every copy/paste prompt follows this structure:

```
[Optional: Context about what you're about to do]

Execute [.autoforge/ai/prompts/ROLE.yaml]

[Your custom instruction for this execution]

Key points:
- Point 1
- Point 2
- Point 3
```

### Example: Good Copy/Paste Prompt

```
You're about to start the architecture design phase. The Product Manager
has created a PRD, and now the Architect needs to design the system.

Execute .autoforge/ai/prompts/architect.yaml

Design the system architecture based on the PRD. Create:
1. System diagram (architecture/diagrams/system.mmd)
2. API contract (api/openapi.yaml)
3. Database schema (docs/blueprint/schema.md)

Reference:
- PRD in docs/prd/PRODUCT_REQUIREMENTS.md
- Tech stack choice in docs/blueprint/tech.md
- Quality gates in .autoforge/ai/context.manifest.yaml
```

### Example: Poor Copy/Paste Prompt (Don't Do This)

```
Now run architect.yaml and create the architecture. Make sure it's good
and follows the stuff we talked about earlier. Use the API and schemas
and all that. Log things in logs.
```

Why it's bad:

- Unclear what output is expected
- Vague references to prior context
- No structure or organization

---

## Documentation for Different User Paths

### Path 1: New User (Never Used AutoForge)

**Entry point:** README.md (top 1/3)
**Flow:**

1. Read feature overview (3 min)
2. Run installation: `npm install --save-dev @cojacklabs/autoforge`
3. Follow QUICKSTART.md Path A (New Project) (5 min)
4. Copy/paste first prompt from README or QUICKSTART
5. Done! Interact with AI agent via pasted prompts

**Documentation provided:**

- README.md — Overview + installation
- QUICKSTART.md Path A — Step-by-step setup
- PROMPT_HANDBOOK.md — Reference for available prompts

### Path 2: Existing User (Has AutoForge Already)

**Entry point:** QUICKSTART.md Path B
**Flow:**

1. Run: `npx repomix snapshot` (to get fresh code snapshot)
2. Copy/paste prompt from QUICKSTART.md Path B
3. Continue where you left off
4. Use PROMPT_HANDBOOK.md for additional prompts as needed

**Documentation provided:**

- QUICKSTART.md Path B — Resume instructions
- DOCUMENTATION_ROADMAP.md — Find what you need
- PROMPT_HANDBOOK.md — Reference for all prompts

### Path 3: Framework Developer (Implementing Autopilot)

**Entry point:** DOCUMENTATION_ROADMAP.md (pick Framework Developer path)
**Flow:**

1. Read AUTOFORGE_EXPANSION_SYNTHESIS.md (big picture)
2. Read AUTOFORGE_AUTOPILOT_ENGINE.md (detailed spec)
3. Read AUTOFORGE_AI_MODEL_TRAINING.md (training spec)
4. Implement Phase 1-4 per roadmap
5. Reference REPO.md for codebase structure

**Documentation provided:**

- DOCUMENTATION_ROADMAP.md — Navigation guide
- AUTOFORGE_EXPANSION_SYNTHESIS.md — Overview + roadmap
- AUTOFORGE_AUTOPILOT_ENGINE.md — Architecture
- AUTOFORGE_AI_MODEL_TRAINING.md — Training system
- REPO.md — Full codebase snapshot

### Path 4: Team Lead (Rolling Out AutoForge)

**Entry point:** README.md (full) + BEFORE_AFTER_COMPARISON.md
**Flow:**

1. Read README.md to understand features
2. Review BEFORE_AFTER_COMPARISON.md to show team impact
3. Share QUICKSTART.md with team (pick appropriate path)
4. Create team autonomy policies using AUTOFORGE_AUTOPILOT_ENGINE.md
5. Reference AUTOFORGE_MULTI_PROJECT_GUIDE.md for multi-project setups

**Documentation provided:**

- README.md — Feature overview
- BEFORE_AFTER_COMPARISON.md — Impact metrics
- QUICKSTART.md — Setup for team members
- AUTOFORGE_MULTI_PROJECT_GUIDE.md — Multi-project coordination
- DOCUMENTATION_ROADMAP.md — Navigation by role

---

## Prompt Organization in Framework

### Prompt Location

All prompts live in: `.autoforge/ai/prompts/ROLE.yaml`

### Prompt Naming

- `product_manager.yaml` — PRD generation
- `architect.yaml` — Architecture design
- `fullstack_engineer.yaml` — Code implementation
- `qa_engineer.yaml` — Testing
- `security_engineer.yaml` — Security review
- `devops_engineer.yaml` — Deployment
- `uiux_designer.yaml` — UI/UX design
- `performance_engineer.yaml` — Performance optimization
- `sre_engineer.yaml` — Observability & SRE
- And others...

### Prompt Reference in Documentation

When referencing a prompt in documentation:

```
Execute .autoforge/ai/prompts/architect.yaml
```

Never say:

- "Run the architect prompt"
- "Use architect.yaml"
- "Execute architect"

Always use the full path for clarity.

---

## Documentation Standards Checklist

### For Every README or QUICKSTART Section

- [ ] Clear entry point — "Do this first"
- [ ] Simple steps — Maximum 5 steps per section
- [ ] Copy/paste blocks — Every instruction is executable
- [ ] Helpful output — Explain what should happen next
- [ ] Clear navigation — "Next step is X" at the end of each section
- [ ] No assumptions — Every prerequisite mentioned

### For Every Copy/Paste Prompt

- [ ] Context provided — Why you're doing this
- [ ] Full path given — `.autoforge/ai/prompts/ROLE.yaml`
- [ ] Clear instructions — Specific outputs expected
- [ ] Reference information — Links to relevant files
- [ ] Key points — Critical things to know
- [ ] Exactly copy/paste ready — No edits needed

### For Every Feature Documentation

- [ ] What it does — Clear description
- [ ] Why it matters — User benefit
- [ ] How to use it — Step-by-step
- [ ] Examples provided — Real scenarios
- [ ] Troubleshooting — Common issues
- [ ] Next steps — Where to go after reading

### For Every Decision/Navigation Point

- [ ] Clear options — What are the choices?
- [ ] Consequences — What happens with each choice?
- [ ] Recommendation — What should most users choose?
- [ ] Links — Where to read more

---

## Documentation Template: Setting Up a New Feature

When documenting a new feature, use this template:

```markdown
## Feature Name

### What It Does

[2-3 sentences explaining the feature]

### Why It Matters

[Benefit to users; what problem does it solve?]

### How to Use It

**Step 1: [Action]**
[Explanation]

**Step 2: [Action]**
[Explanation]

### Copy/Paste Prompt

Execute .autoforge/ai/prompts/ROLE.yaml

[Your specific instructions for this feature]

Reference:

- [Link to related docs]
- [Link to example]

### Example Output

[What the user should expect to see]

### Troubleshooting

**If X happens:**
[Solution]

**If Y happens:**
[Solution]

### Next Steps

- Try [related feature]
- Read [related documentation]
- Review [example]
```

---

## Documentation Template: Command Documentation

When documenting a command, use this template:

```markdown
## Command: [Command Name]

### What It Does

[Clear description of command purpose]

### When to Use It

[Scenarios where this command is appropriate]

### Syntax

\`\`\`bash
[Command with all options]
\`\`\`

### Options

| Option      | Purpose        | Example                   |
| ----------- | -------------- | ------------------------- |
| `--option1` | [What it does] | `command --option1 value` |
| `--option2` | [What it does] | `command --option2 value` |

### Examples

**Example 1: [Scenario]**
\`\`\`bash
[Full command]
\`\`\`
Output:
\`\`\`
[Expected output]
\`\`\`

**Example 2: [Scenario]**
[Same as above]

### Next Steps

[What to do after running this command]
```

---

## Examples in Documentation

### Good Example (Runnable)

```bash
# New project setup
npm install --save-dev @cojacklabs/autoforge
cd my-project
npx repomix snapshot
```

Then copy/paste this into your AI:

```
Read and understand:
- REPO.md (full codebase snapshot)
- docs/QUICKSTART.md
- docs/PROMPT_HANDBOOK.md

Execute .autoforge/ai/prompts/idea_conversation.yaml

Help me brainstorm the product vision, platforms, tech stack, and risks.
Log the conversation to ideas/IDEA_DISCUSSION.md
```

### Bad Example (Unclear)

"Run the framework to set up your project. You'll need Node and then do
the thing with the snapshot. After that you use the ideas prompt to talk
about your idea."

---

## Standards for Cross-Linking

### How to Link to Other Docs

**From README to QUICKSTART:**

```markdown
[QUICKSTART Guide](docs/QUICKSTART.md)
```

**From QUICKSTART to feature docs:**

```markdown
[Autonomy Levels Explained](docs/AUTOFORGE_EXPANSION_QUICK_START.md)
```

**From any doc to PROMPT_HANDBOOK:**

```markdown
[Ready-made Prompts](docs/PROMPT_HANDBOOK.md)
```

**From feature docs to examples:**

```markdown
[See example in fullstack_todo_app](examples/fullstack_todo_app/README.md)
```

### Never Link To:

- `.autoforge/ai/logs/**` (internal, changes frequently)
- `.autoforge/ai/reports/**` (internal, project-specific)
- `dist/**` (generated files)
- `node_modules/**` (external dependencies)

---

## Version Management

### When Documentation Changes

1. **Increment version in doc header**

   ```markdown
   **Version:** 1.0 → 1.1
   **Date:** YYYY-MM-DD
   ```

2. **Update CHANGELOG.md**

   ```markdown
   ## [1.1] - 2025-10-29

   ### Changed

   - Updated prompt examples in QUICKSTART
   - Added new section on autonomy levels

   ### Fixed

   - Fixed broken link to PROMPT_HANDBOOK
   ```

3. **For major changes:** Update UPDATE_SUMMARY.md

---

## Documentation Release Checklist for v0.3.0

### Content Completeness

- [ ] README.md — Updated with v0.3 features
- [ ] QUICKSTART.md — Path A and B complete
- [ ] DOCUMENTATION_ROADMAP.md — Navigation clear
- [ ] AUTOFORGE_EXPANSION_QUICK_START.md — 1-page reference
- [ ] AUTOFORGE_AUTOPILOT_ENGINE.md — Full spec
- [ ] AUTOFORGE_AI_MODEL_TRAINING.md — Full spec
- [ ] AUTOFORGE_EXPANSION_SYNTHESIS.md — Big picture
- [ ] BEFORE_AFTER_COMPARISON.md — Visual improvements
- [ ] UPDATE_SUMMARY.md — Migration guide
- [ ] PROMPT_HANDBOOK.md — All prompts referenced
- [ ] AUTOFORGE_MULTI_PROJECT_GUIDE.md — Multi-project workflows
- [ ] examples/fullstack_todo_app/README.md — Example walkthrough

### Copy/Paste Prompts

- [ ] Every prompt is exactly copy/paste ready
- [ ] No manual edits needed before pasting
- [ ] Full paths given (.autoforge/ai/prompts/ROLE.yaml)
- [ ] Context provided for each prompt
- [ ] Expected outputs explained

### Cross-Linking

- [ ] All references are correct
- [ ] No dead links
- [ ] Navigation flows naturally
- [ ] Decision trees clearly marked

### Consistency

- [ ] Formatting consistent across all docs
- [ ] Terminology consistent
- [ ] Code block syntax correct
- [ ] Command examples tested

### Accessibility

- [ ] Clear for non-technical users
- [ ] Role-based paths work
- [ ] Decision tree helps navigation
- [ ] Multiple entry points covered

### Release

- [ ] All files committed to git
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] REPO.md regenerated with `npx repomix`

---

## FAQ: Documentation Standards

**Q: Can I include code that isn't copy/paste ready?**
A: Only in "Advanced" sections, clearly marked. Main user flow must be copy/paste ready.

**Q: How long should copy/paste prompts be?**
A: As long as needed, but organized in clear sections. Aim for readability over length.

**Q: Should I document every CLI flag?**
A: Document commonly used flags. Reference main help for exhaustive list.

**Q: What if documentation becomes outdated?**
A: Update it immediately. Version the doc, update CHANGELOG, note the change in ACTIVE_MEMORY.

**Q: How do I handle multiple platforms (Node, Python, etc)?**
A: Create separate sections for each platform. Cross-link between them.

---

## Standards Evolution

As AutoForge evolves, these standards evolve with it. This document should be:

- **Reviewed quarterly** — Ensure still relevant
- **Updated when patterns emerge** — New common practices documented
- **Referenced in code reviews** — Enforce consistency in PRs

---

**This document is the single source of truth for AutoForge documentation standards. All new documentation should conform to these standards.**

**Last Updated:** 2025-10-29
**Maintained By:** AutoForge Documentation Team
