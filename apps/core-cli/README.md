# AutoForge Core CLI

`apps/core-cli` owns deterministic command routing and human-oriented terminal
formatting for the existing `@cojacklabs/autoforge` package and `autoforge`
executable.

During the compatibility-first source relocation, `src/cli` remains a thin
re-export boundary so existing imports and the published bundle entry continue
to work. Project intelligence is consumed through `@cojacklabs/autoforge-sdk`;
the application remains responsible for argument parsing, terminal output,
exit-code mapping, and local adapters.
