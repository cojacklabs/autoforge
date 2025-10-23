# Project Memory

AutoForge stores durable session notes in this folder so every agent—no matter the model or provider—can pick up where the last session ended.

## How it works

- Use `MEMORY_TEMPLATE.yaml` to create a memory file per project, initiative, or feature slice (e.g., `MEMORY_mainline.yaml`).
- Capture:
  - Key decisions and context corrections supplied by the human.
  - Outstanding follow-ups or risks that the next agent must address.
  - Reference pointers to docs, PRs, or commits that explain the current state.
- Append to the latest memory entry at the end of every session. Keep the most recent items near the top for fast scanning.

## Loading memory

- Prompts reference this directory through `ai/context.manifest.yaml` so agents automatically read the latest memory alongside ideas and change requests.
- When switching tools (e.g., Codex → Claude Code) tell the new agent to review the active memory file before continuing.

## Writing back

- After each major milestone (idea intake, impact analysis, implementation, QA) update the memory file instead of relying on transient chat history.
- Summaries should be concise bullet points; link to deeper artifacts (logs, reports, commits) instead of pasting large excerpts.
- When items are completed, move them to a `history` or `resolved` section so the file stays focused on actionable context.

Keeping a living memory gives every coding assistant shared situational awareness while leaving you in control of what persists between sessions.
