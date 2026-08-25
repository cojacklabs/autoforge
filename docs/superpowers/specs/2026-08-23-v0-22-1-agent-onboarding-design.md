# v0.22.1 — Agent Onboarding & CLI Reference Currency — Design

**Date:** 2026-08-23
**Status:** Approved, pending implementation plan

## Problem

A solo developer starting a new AI-assisted session (Claude Code, Codex,
Cursor, Gemini/Antigravity, Grok Build, or a generic agent) has no single
copy/paste artifact in `README.md` that both (a) bootstraps the agent into
AutoForge's governed workflow and (b) points it at a genuinely current
catalog of every available command and its purpose, so the agent can
categorize, prioritize, and reorganize work using the full CLI surface
rather than guessing or re-deriving commands from source.

`README.md` already has a "Starting From Scratch" canonical prompt
(matching `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md`'s "Canonical Startup
Prompt" almost verbatim), but neither mentions
`docs/AUTOFORGE_CLI_REFERENCE.md` — the one existing doc shaped correctly
for "every command and its purpose." That reference doc is itself stale:
it was last synced at the v0.21 orchestration commit and has zero mentions
of the `learning` command family or `changelog compile`, both shipped in
v0.22.0. `README.md`'s title also hardcodes a version number (`# AutoForge
0.21.0`) that already reads wrong post-release.

## Non-Goals

- No changes to `docs/AUTOFORGE_AGENTIC_AI_GUIDE.md`'s behavioral content
  — that document teaches _how_ an agent should think and act (workflow
  discipline, scope respect, evidence handling); this work is about _what
  commands exist_, a different concern, and is out of scope here.
- No automated CI/test enforcing ongoing parity between
  `src/cli/help.ts` and `AUTOFORGE_CLI_REFERENCE.md`. This pass fixes
  current staleness; a drift-prevention mechanism (if wanted) is a
  separate follow-up, not bundled into this release.
- No new CLI commands or code changes. This is a documentation-only
  release.

## Design

### 1. De-version `README.md`'s title

`# AutoForge 0.21.0` → `# AutoForge`. Per explicit instruction, no version
number should appear in prose documentation anywhere going forward, so
this line never needs updating on future releases. Confirmed via grep
that this is the only hardcoded version-number occurrence across
`README.md` and the three existing agent-facing docs — no other line
needs the same fix.

### 2. Extend the existing canonical startup prompt (one prompt, not two)

`README.md`'s "Starting From Scratch" prompt block and
`docs/AUTOFORGE_AGENT_SETUP_GUIDE.md`'s "Canonical Startup Prompt" are
already near-duplicates and must stay in lockstep. Both gain one clause
directing the agent to `docs/AUTOFORGE_CLI_REFERENCE.md` for the full
command catalog, inserted in the same voice/style as the existing
sentence — not a second, separate prompt block. The existing prompt's
structure (confirm version → doctor → bootstrap status → review
`AGENTS.md` → inspect `.autoforge/` → resolve context) is preserved
unchanged; the new clause is additive.

### 3. Bring `docs/AUTOFORGE_CLI_REFERENCE.md` fully current

- Add a new section covering all `autoforge learning
hypothesis|experiment|evidence` subcommands (12 total: `add`/`list`/
  `show`/`status` for hypothesis; `add`/`list`/`show`/`complete` for
  experiment; `add`/`list`/`show` for evidence) and the `decide
--evidence <id>` flag that closes the loop.
- Add `autoforge changelog compile [--since <git-tag>]`.
- Verify every other section against `src/cli/help.ts`'s actual usage
  lines directly (not a fuzzy text diff, which produces too much noise
  given formatting differences between the two files) — read both files
  side by side and confirm every command `help.ts` prints has an accurate
  counterpart in the reference doc.
- Fix the doc's own stale closing line, which currently reads "Legacy
  commands not shown by `autoforge help` are not part of the supported
  v0.16 workflow" — remove the specific version number per the
  no-version-numbers-in-prose decision above, rephrasing to state the
  rule without pinning it to a release.

## Testing

This is a documentation-only change; no unit tests apply. Verification is
manual and concrete: every `autoforge <command>` line printed by `node
bin/autoforge.js --help` must appear, accurately, somewhere in
`AUTOFORGE_CLI_REFERENCE.md`. This check will be performed directly during
implementation (both files read side by side), not skipped or assumed.

## Rollout

Implemented as AutoForge work on itself, tracked through the normal
`autoforge add` → `autoforge start` → `autoforge decide` (linked) →
`autoforge done` lifecycle, per the documentation gate. Ships as v0.22.1
— the release itself will exercise the very prompt this work adds, since
future onboarding sessions (including the agent implementing this) can
use it to confirm the updated reference doc is genuinely complete.
