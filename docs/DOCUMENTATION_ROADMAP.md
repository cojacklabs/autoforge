# Documentation Roadmap: What to Read When

**TL;DR:** Start with README or QUICKSTART. Everything else is optional reference material.

---

## Quick Decision Tree

**Question 1: Are you new to AutoForge?**
- **Yes** → Read [README.md](../README.md) (top 1/3) → [QUICKSTART.md](QUICKSTART.md) (Path A)
- **No** → Go to Question 2

**Question 2: Do you have an existing `.autoforge/` directory?**
- **Yes** → Read [QUICKSTART.md](QUICKSTART.md) (Path B) → You're done!
- **No** → Go to Question 1

**Question 3: Want to understand autopilot in detail?**
- **Yes** → Read [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) → [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md)
- **No** → You're all set; start building!

**Question 4: Want to understand how the training loop works?**
- **Yes** → Read [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md)
- **No** → You're all set; start building!

---

## Doc by Use Case

### Use Case: "I'm completely new to AutoForge"

**Time commitment:** 10-15 minutes

**Read these in order:**

1. [README.md](../README.md) — Top 1/3 (feature overview + what's new)
   - 3 min read
   - Understand what AutoForge does
   - See 4 autonomy levels

2. [QUICKSTART.md](QUICKSTART.md) — Path A (New Project section)
   - 5 min read
   - Follow 2-step setup
   - Configure your code paths

3. [QUICKSTART.md](QUICKSTART.md) — Autonomy Levels table
   - 2 min read
   - Understand which level to use

4. Start building with `npx autoforge autopilot --level 1`

**You're done!** Reference other docs only as questions arise.

---

### Use Case: "I have an existing AutoForge project"

**Time commitment:** 2-5 minutes

**Do this:**

1. Run: `npx autoforge load --resume`
2. Copy the prompt into your AI
3. Continue where you left off!

**Optional — understand what's new:**

1. [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md) — What changed (5 min read)
2. [BEFORE_AFTER_COMPARISON.md](BEFORE_AFTER_COMPARISON.md) — Quick visual comparisons (5 min read)

**That's it!** Everything is backwards compatible.

---

### Use Case: "I want to use Level 2 or 3 autopilot"

**Time commitment:** 20-30 minutes

**Read these in order:**

1. [QUICKSTART.md](QUICKSTART.md) — Autonomy Levels table
   - Understand the difference between levels

2. [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) — Sections 2-3
   - 1-page overview of autopilot architecture
   - See success metrics

3. [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md) — Sections 1-3
   - Full orchestration spec
   - Understand state machine and decision making

4. Try Level 1 first; graduate to Level 2/3 after 3-5 projects

---

### Use Case: "I want to understand the training loop"

**Time commitment:** 30-40 minutes

**Read these in order:**

1. [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) — Section 5 (Training Pipeline)
   - 2 min overview

2. [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md) — Sections 1-3
   - What data is collected
   - How patterns are extracted
   - How feedback loops work

3. [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md) — Sections 4-5
   - Deep dive: learning patterns
   - Closed-loop feedback systems

4. [AUTOFORGE_EXPANSION_SYNTHESIS.md](AUTOFORGE_EXPANSION_SYNTHESIS.md) — Section 5
   - How training loop improves system

**Then track metrics:** `npx autoforge metrics show --metric agent_success_rate` after 10+ projects.

---

### Use Case: "I'm a framework developer implementing autopilot"

**Time commitment:** 2-4 hours (reading); 4+ weeks (implementation)

**Read all expansion docs in order:**

1. [AUTOFORGE_EXPANSION_SYNTHESIS.md](AUTOFORGE_EXPANSION_SYNTHESIS.md) (100 KB)
   - Big picture overview
   - 8-week implementation roadmap
   - Success criteria

2. [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md) (130 KB)
   - Detailed orchestration spec
   - State machine definition
   - Decision authority matrix
   - Quality gate auto-correction

3. [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md) (120 KB)
   - Training data schema
   - Learning patterns
   - Feedback loops
   - Implementation details

4. [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) (25 KB)
   - Reference guide while building

5. [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md) (this folder)
   - Migration notes
   - CLI reference

Follow Phase 1-4 roadmap in EXPANSION_SYNTHESIS.md.

---

### Use Case: "I manage a team rolling out AutoForge"

**Time commitment:** 1-2 hours

**Read:**

1. [README.md](../README.md) — Entire document
   - Understand all features

2. [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md)
   - Understand autonomy levels
   - Understand decision tree for your team

3. [AUTOFORGE_MULTI_PROJECT_GUIDE.md](AUTOFORGE_MULTI_PROJECT_GUIDE.md) (existing doc)
   - Multi-project workflows
   - Recipes and templates

4. [BEFORE_AFTER_COMPARISON.md](BEFORE_AFTER_COMPARISON.md)
   - Show team the improvements
   - Understand time savings

5. Draft autonomy policies for your org:
   - What decisions require human approval?
   - What can agents decide autonomously?
   - Document in `ai/agents_autonomy.yaml`

**Then roll out:** Start with Level 1; move to Level 2/3 as team gains confidence.

---

### Use Case: "I just want to get started (no reading)"

**Time commitment:** 5 minutes

```bash
# New project
npm install --save-dev @cojacklabs/autoforge
npx autoforge init
npx autoforge load --copy
npx autoforge autopilot --level 1 --recipe web_app

# Existing project
npx autoforge load --resume
npx autoforge autopilot --level 1
```

**That's it!** Come back and read docs when questions arise.

---

## Document Reference Table

| Document | Best For | Length | Read If | Skip If |
|----------|----------|--------|---------|---------|
| [README.md](../README.md) | Feature overview | 12 min | New user, want full picture | Returning user, already familiar |
| [QUICKSTART.md](QUICKSTART.md) | Getting started | 10 min | First time using AutoForge | Already running projects |
| [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md) | What changed in v0.3 | 8 min | Migrating from v0.2 | New user, not relevant |
| [BEFORE_AFTER_COMPARISON.md](BEFORE_AFTER_COMPARISON.md) | Visual improvements | 8 min | Want to see impact clearly | Just want to build |
| [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) | Autopilot 101 | 5 min | Want 1-page overview | Skip if just getting started |
| [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md) | Autopilot deep-dive | 45 min | Implementing or troubleshooting | Just want to use it |
| [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md) | Training loop details | 40 min | Implementing or tuning | Using L1 autopilot |
| [AUTOFORGE_EXPANSION_SYNTHESIS.md](AUTOFORGE_EXPANSION_SYNTHESIS.md) | Big picture + roadmap | 30 min | Framework developers or architects | End users |
| [AUTOFORGE_MULTI_PROJECT_GUIDE.md](AUTOFORGE_MULTI_PROJECT_GUIDE.md) | Multi-project workflows (existing doc) | 25 min | Managing teams/domains | Single project user |
| [PROMPT_HANDBOOK.md](PROMPT_HANDBOOK.md) | Ready-made prompts (existing doc) | 10 min | Need prompt examples | Using autopilot |

---

## Reading Paths by Role

### Product Manager / Non-Technical Founder

**Goal:** Understand what AutoForge does and how to use it

**Read:** (15 min)
1. [README.md](../README.md) — top 1/3
2. [QUICKSTART.md](QUICKSTART.md) — Path A or B
3. [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) — Section 2 (autonomy levels)

**Skip:** All technical implementation docs

---

### Software Engineer / Developer

**Goal:** Get up and running quickly; understand how it works

**Read:** (30 min)
1. [README.md](../README.md) — full
2. [QUICKSTART.md](QUICKSTART.md) — Your path (A or B)
3. [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) — Full document
4. [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md) — Sections 1-3 (optional, for deep understanding)

**Reference:** [PROMPT_HANDBOOK.md](../docs/PROMPT_HANDBOOK.md) when you need custom prompts

---

### DevOps/SRE Engineer

**Goal:** Understand deployment orchestration and observability

**Read:** (45 min)
1. [QUICKSTART.md](QUICKSTART.md) — Your path
2. [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) — Full
3. [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md) — Section 8 (Observability)

**Focus:** Deployment automation, metrics, monitoring

---

### Tech Lead / Architect

**Goal:** Understand the full system and implementation roadmap

**Read:** (2 hours)
1. All expansion docs in order (see Framework Developer path above)
2. [AUTOFORGE_MULTI_PROJECT_GUIDE.md](AUTOFORGE_MULTI_PROJECT_GUIDE.md)
3. [PROMPT_HANDBOOK.md](../docs/PROMPT_HANDBOOK.md) for architecture patterns

**Focus:** Design decisions, autonomy policies, multi-project scaling

---

### Framework Contributor

**Goal:** Implement autopilot and training features

**Read:** (4 hours)
1. All 3 expansion docs (SYNTHESIS, ENGINE, TRAINING)
2. Existing codebase and test examples
3. CI/CD workflows and deployment

**Do:** Implement Phase 1-4 per EXPANSION_SYNTHESIS.md roadmap

---

## Quick Links

**Getting Started:**
- New user → [README.md](../README.md) top 1/3 → [QUICKSTART.md](QUICKSTART.md) Path A
- Existing user → [QUICKSTART.md](QUICKSTART.md) Path B
- Just want code → Run `npx autoforge init && npx autoforge load --copy && npx autoforge autopilot --level 1`

**Understanding Autopilot:**
- Quick overview → [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md)
- Full details → [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md)

**Understanding Training:**
- Quick overview → [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) Section 5
- Full details → [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md)

**Implementation:**
- Roadmap → [AUTOFORGE_EXPANSION_SYNTHESIS.md](AUTOFORGE_EXPANSION_SYNTHESIS.md) Section 6
- Full spec → [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md) + [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md)

**Comparing Versions:**
- What changed → [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)
- Before/after → [BEFORE_AFTER_COMPARISON.md](BEFORE_AFTER_COMPARISON.md)

---

## Pro Tips

1. **Bookmark QUICKSTART.md** — You'll come back to it often
2. **Skim expansion docs first** — Don't need to read every word; get the gist
3. **Refer to BEFORE_AFTER_COMPARISON.md when onboarding others** — Fastest way to show value
4. **Use decision tree at top of this doc** — It'll guide you to what you need
5. **Everything is backwards compatible** — Old workflows still work; new features are opt-in

---

## Still Confused?

**Common questions:**

- "Where do I start?" → Read the decision tree at the top of THIS document
- "How do I set up?" → [QUICKSTART.md](QUICKSTART.md)
- "What changed?" → [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md) or [BEFORE_AFTER_COMPARISON.md](BEFORE_AFTER_COMPARISON.md)
- "How does autopilot work?" → [AUTOFORGE_EXPANSION_QUICK_START.md](AUTOFORGE_EXPANSION_QUICK_START.md) then [AUTOFORGE_AUTOPILOT_ENGINE.md](AUTOFORGE_AUTOPILOT_ENGINE.md)
- "How does training work?" → [AUTOFORGE_AI_MODEL_TRAINING.md](AUTOFORGE_AI_MODEL_TRAINING.md)
- "I want to implement this" → [AUTOFORGE_EXPANSION_SYNTHESIS.md](AUTOFORGE_EXPANSION_SYNTHESIS.md) then the detail docs
- "I don't have time to read" → `npx autoforge init && npx autoforge load --copy && npx autoforge autopilot --level 1`

**Still stuck?** Check [../README.md](../README.md#help) for additional resources.

---

**Happy learning! 🚀**
