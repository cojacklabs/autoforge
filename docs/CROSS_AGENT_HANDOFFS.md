# Cross-Agent Handoffs

AutoForge transfers durable project truth between agents through structured
handoffs rather than raw conversation transcripts. The provider-neutral
contract uses wire protocol version `1`.

## Canonical payload

Each handoff records project and session identity, source and target agent,
active work and scope, Git refs and changed files, decisions, validation,
risks, open questions, one next action, and the source context fingerprint.

The strict schema rejects unknown fields, absolute or escaping file paths,
duplicate changed files, and a source agent handing off to itself. Transcript
or message fields are rejected instead of silently retained.

## Tracked and ignored state

| State                             | Location                                                     | Git policy                             |
| --------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| Canonical cross-agent handoffs    | `.autoforge/handoffs/*.json`                                 | Tracked                                |
| Durable project knowledge         | Existing canonical AutoForge stores                          | Tracked according to repository policy |
| Context packets                   | `.autoforge/context/`                                        | Ignored; reproducible                  |
| Sessions and orchestration leases | `.autoforge/state/session.json`, `.autoforge/orchestration/` | Ignored; runtime state                 |
| Raw transcripts                   | `.autoforge/transcripts/`                                    | Ignored; disabled by default           |
| Provider caches and logs          | `.autoforge/provider-cache/`, `.autoforge/provider-logs/`    | Ignored                                |
| Credentials                       | `.autoforge/credentials/`                                    | Ignored; use OS credential storage     |

Machine-specific project roots and provider secrets are not handoff fields.
Changed files must be relative to the canonical project root.

## Continuity flow

1. The source gathers current work, scope, Git, decisions, and validation.
2. Core validates the payload and writes it atomically through an injected
   repository.
3. The target validates protocol compatibility, reads the handoff, and
   refreshes canonical AutoForge context before continuing.
4. The target verifies the context fingerprint and Git refs instead of trusting
   stale conversational memory.

The fixture at `test/fixtures/handoffs/claude-to-codex.json` proves continuity
without messages or a raw transcript.
