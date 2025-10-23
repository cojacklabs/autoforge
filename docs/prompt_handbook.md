# Prompt Handbook

Use these patterns when working with coding assistants (Codex, Claude Code, Gemini Code, Cursor, VS Code Copilot, etc.). Replace placeholders with your context.

## 1. Describe the environment

```
The AutoForge folder is located at ./autoforge. Treat that directory as your working root.
Code should be written to the paths defined in autoforge/ai/code_targets.yaml.
```

## 2. Load mandatory context

```
Read the following files:
- autoforge/ai/context.manifest.yaml
- autoforge/ai/agents.yaml
- autoforge/ai/prompts/<agent>.yaml (as needed)
- For kickoff: autoforge/ai/prompts/kickoff.yaml
```

## 3. Capture the vision (idea stage)

```
Execute autoforge/ai/prompts/discovery_researcher.yaml
Help me capture the project idea by asking targeted questions.
```

## 4. Create structured plans

```
Execute autoforge/ai/prompts/idea_intake.yaml
Using ideas/IDEA-2025...yaml and the discovery note, produce the idea intake plan.
```

## 5. Kickoff / Change flow

Refer to kickoff snippet in README or Quickstart. After kickoff, target prompts role-by-role (`Execute autoforge/ai/prompts/architect.yaml`, etc.).

## 6. Record decisions

```
Write a summary of this discussion to autoforge/ai/logs/research/...
```

## 7. Give go/no-go

```
The idea is approved. Please begin the full kickoff sequence.
```
