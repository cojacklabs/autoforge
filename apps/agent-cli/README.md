# AutoForge Agent CLI

`@cojacklabs/autoforge-agent` is the experimental, local-first interactive
Agent for AutoForge. It is a separate application from deterministic AutoForge
Core and consumes project operations through `@cojacklabs/autoforge-sdk`.

## Experimental workflow

The direct `autoforge-agent` entry point:

1. requires an attached project with active AutoForge work;
2. loads canonical project context through the SDK compatibility adapter;
3. asks only material clarification questions;
4. renders a bounded edit plan and waits for explicit human approval;
5. preflights every proposed path through AutoForge guardrails before writing;
6. applies project-contained atomic writes, runs the configured validation
   gate, streams a completion summary, and persists a protocol-v1 handoff.

Raw prompts and model transcripts are not persisted. The handoff contains only
structured project truth: active work, scope, Git refs, changed files,
validation, risks, open questions, next action, and a context fingerprint.

## Local development

For this first experiment, OpenAI is the single supported provider and
`gpt-5.6-sol` is the default model. Store its key in the current user's native
operating-system credential store:

```bash
autoforge-agent credentials set openai
autoforge-agent credentials status openai
autoforge-agent "Describe the change"
autoforge-agent credentials delete openai
```

Secret entry uses a hidden TTY prompt. The Agent does not accept the key as a
command argument and never prints it from `status`. macOS uses Keychain,
Windows uses Credential Manager, and Linux uses Secret Service through the
native keyring binding; the user's keyring must be available and unlocked.

`AUTOFORGE_OPENAI_MODEL` may override the non-secret model ID. Do not write
credentials to the repository, `.env`, or `.autoforge/`. This application
requires a TTY and does not require an AutoForge account.

The current local gateway is a transitional SDK adapter over Core's structured
status and validation commands. Moving that adapter directly onto exported
Core operations is later hardening work; Agent orchestration itself does not
own or create a parallel project-state store.

## Validation

```bash
pnpm --filter @cojacklabs/autoforge-agent typecheck
pnpm --filter @cojacklabs/autoforge-agent test
pnpm --filter @cojacklabs/autoforge-agent boundaries
```

Tests use the AI SDK mock model and never call a paid provider.
