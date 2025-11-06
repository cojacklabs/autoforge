# Loading AutoForge Context into Your AI IDE

Goal: Provide a single copy/paste prompt that loads strict AutoForge policies into your AI IDE (Claude Code, Codex, Gemini). The prompt comes directly from `autoforge load` and contains the full orchestrator context.

## Files
- Full context (strict): `.autoforge/ai/prompts/orchestrator_context.md`

## Recommended Flow (Single Paste)
1) Run `npx autoforge load`.
2) Copy the printed orchestrator context and paste it into your AI IDE chat as the first message.
3) Wait for the confirmation: `AutoForge context loaded (strict). Ready for your prompt.`
4) Now send your actual prompt (e.g., “Fix button UX to match inspiration and improve focus states”).

### Notes
- The full context lives in your repo so updates are auditable and consistent across sessions.
- Some AI IDEs may truncate very long messages; if that happens, paste in multiple chunks and wait for acknowledgement before proceeding.

## Why this approach
- Short stub keeps copy/paste simple.
- The full prompt lives in your repo so policies are versioned and auditable.
- Works with any AI IDE without requiring filesystem read access.

## Tips
- If the AI IDE truncates large messages, paste the context in multiple chunks. The assistant should acknowledge receipt and wait for completion before acting.
- If your project paths differ, edit the placeholders in `.autoforge/ai/prompts/orchestrator_context.md` (codeTargets section) to reflect your actual backend/frontend/tests directories.
- Keep governance in strict mode for client IP by default. Only approve egress (e.g., UI/UX inspiration) when necessary.
