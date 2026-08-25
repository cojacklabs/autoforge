# AutoForge Core CLI

`apps/core-cli` owns deterministic command routing and human-oriented terminal
formatting for the existing `@cojacklabs/autoforge` package and `autoforge`
executable.

For the v0.25 compatibility release, the repository-root manifest and bundle
entry remain the public package host while `apps/core-cli` owns new application
source. `src/cli` remains a thin re-export and composition boundary so existing
imports continue to work. Physical manifest and binary relocation waits until
the application no longer imports root implementation files. Project
intelligence is consumed through `@cojacklabs/autoforge-sdk`; the application
remains responsible for argument parsing, terminal output, exit-code mapping,
and local adapters.

Bare interactive invocation and the allowlisted `credentials` namespace cross
the application boundary through version-negotiated process delegation to the
separately installed `autoforge-agent`. Core retains no Agent, provider, or
credential dependency. Noninteractive and unavailable-Agent bare invocation
falls back to deterministic status.
