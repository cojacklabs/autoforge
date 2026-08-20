# AutoForge Agent Review Prompt

Use this canonical one-liner at the beginning of an agent session:

> Review the repository's AutoForge instructions and current project infrastructure, bring your understanding up to date using `AGENTS.md`, `npx autoforge doctor`, and `npx autoforge context --explain`, then summarize the governing rules, active work, relevant decisions, and validation requirements before proceeding.

The agent should complete this review before editing files or starting implementation work. The prompt is intentionally tool-neutral and works with Codex, Claude Code, Gemini/Antigravity, Grok Build, Cursor, and other repository-aware agents.
