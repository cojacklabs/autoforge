---
"@cojacklabs/priozar-core": minor
"@cojacklabs/priozar-protocol": minor
"@cojacklabs/priozar-sdk": minor
---

Rename AutoForge to Priozar. The root Core CLI package is not a workspace member, so its 0.26.0 bump is applied by hand at release time.

- Packages are now published as `@cojacklabs/priozar`, `-core`, `-protocol` and `-sdk`. The `@cojacklabs/autoforge*` names are deprecated, not removed.
- `@cojacklabs/priozar` provides the `priozar` executable and keeps `autoforge` as a deprecated alias for the compatibility window.
- Project state is read from `.priozar/` first, with `.autoforge/` as a fallback. `priozar migrate brand` moves a project with a recoverable backup.
- `PRIOZAR_*` environment variables take precedence over `AUTOFORGE_*`. The protocol and SDK keep their AutoForge identifiers as deprecated aliases.
- `priozar.config.json` is read first, falling back to `autoforge.config.json`.
- New projects still create `.autoforge/` until the Priozar release flips the default.
