# AutoForge Agent Review Prompt

Use this canonical one-liner at the beginning of an agent session:

> Use the globally installed AutoForge CLI for this repository: run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`, initialize or attach the project only when needed, refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before proceeding.

The agent should complete this review before editing files or starting implementation work. The prompt is intentionally tool-neutral and works with Codex, Claude Code, Gemini/Antigravity, Grok Build, Cursor, and other repository-aware agents.
