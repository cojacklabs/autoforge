# Prompt Handbook

Use these patterns when working with coding assistants (Codex, Claude Code, Gemini Code, Cursor, VS Code Copilot, etc.). Replace placeholders with your context.

## 1. Describe the environment

```
The AutoForge folder is located at ./autoforge. Treat that directory as your working root.
Code should be written to the paths defined in autoforge.config.json (mirrored to .autoforge/ai/code_targets.yaml). Legacy installs may use `autoforge/`; the CLI supports both.
```

## 2. Load mandatory context

```
Read the following files:
- .autoforge/ai/context.manifest.yaml
- .autoforge/ai/agents.yaml
- .autoforge/ai/prompts/<agent>.yaml (as needed)
- For kickoff: .autoforge/ai/prompts/kickoff.yaml
```

## 3. Explore the vision (high reasoning)

```
Execute .autoforge/ai/prompts/idea_conversation.yaml
Partner with me on the product vision. Ask layered questions about user goals,
platform (web/mobile/desktop/framework), data, integrations, and delivery cadence.
Summarise decisions under ideas/ and ai/logs/ideas/.
```

## 4. Capture the vision (idea stage template)

```
Execute .autoforge/ai/prompts/discovery_researcher.yaml
Help me capture the project idea by asking targeted questions.
```

## 5. Create structured plans

```
Execute .autoforge/ai/prompts/idea_intake.yaml
Using ideas/IDEA-2025...yaml and the discovery note, produce the idea intake plan.
```

## 6. Share repository context

```
Execute .autoforge/ai/prompts/context_snapshot.yaml
Run `npx autoforge snapshot` to regenerate REPO.md and brief me on the layout,
tech stack, and hotspots the next agents should prioritise.
```

## 7. Kickoff / Change flow

Refer to kickoff snippet in README or Quickstart. After kickoff, target prompts role-by-role (`Execute .autoforge/ai/prompts/architect.yaml`, etc.).

## 8. Record decisions

```
Write a summary of this discussion to .autoforge/ai/logs/research/...
Update ai/AGENTS.md (Progress & Next Steps, Lessons Learned) with the current status so any IDE/CLI can resume.
A: Save the session by appending the key updates to ai/memory/ACTIVE_MEMORY.yaml (follow the template). Confirm the file was written before ending the session.
```

## 9. Give go/no-go

```
The idea is approved. Please begin the full kickoff sequence.
```
