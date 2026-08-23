# Contributing to @cojacklabs/autoforge

Thanks for your interest in contributing! AutoForge is an embedded, multi‑agent SDLC framework. This guide helps you get set up, make changes confidently, and submit high‑quality pull requests.

## Quick start

- Fork the repo to your GitHub account
- Clone your fork locally and add the upstream remote
- Create a feature branch for your change

```bash
git clone https://github.com/<you>/autoforge.git
cd autoforge
git remote add upstream https://github.com/cojacklabs/autoforge.git
git checkout -b feat/<short-topic>
```

## Dev setup

- Node.js 18+ recommended
- Install dev dependencies (already vendored in package.json)

```bash
npm install
npm run build
```

Install the CLI globally to exercise it the way an end user would (`npm install --global @cojacklabs/autoforge`), or run it from this checkout via `node bin/autoforge.js <command>` while iterating. Most changes here are documentation, prompts, or CLI code in this repo.

## Working philosophy

- Planning‑first: Quality gates accept canonical docs under `docs/`, `api/`, `diagrams/` or planning stubs under `.autoforge/ai/reports/**`.
- Shared progress: Keep `ai/AGENTS.md` updated (Progress & Next Steps, Lessons Learned, Rules) so work transfers across IDEs/CLIs.
- Documentation currency: every implementation change must update the relevant documentation before completion — see `docs/AUTOFORGE_CLI_REFERENCE.md` for the canonical, currently-maintained command surface, and treat `autoforge help`'s own output as the source of truth for what commands actually exist today.

## Local checks

Before opening a PR, please run:

```bash
npm run build              # refresh dist/
npm run typecheck          # tsc --noEmit
npm run format:check       # ensure code style
npm test                   # full test suite
autoforge gate check       # run this repo's own retained quality gates, dogfooding the CLI
```

## Commit guidelines

- Follow the conventional style and our playbook: see `docs/ai/COMMIT_PLAYBOOK.md`
- Scope examples: `feat(cli): add load subcommand`, `docs: clarify quality gates`
- Keep commits focused; include rationale and any semantic versioning implications

## Pull request checklist

- [ ] Change is scoped and focused
- [ ] Docs updated (README, `docs/AUTOFORGE_CLI_REFERENCE.md`, guides) when behavior changes
- [ ] `npm run build` passes; dist contains expected updates
- [ ] `npm test` and `autoforge gate check` pass
- [ ] Linked to any related issue(s) or discussion

## Finding issues

- Look for issues labeled `good first issue` (great for onboarding) and `help wanted`
- If you’re unsure where to start, open a Discussion or comment on an issue to coordinate

## Code of Conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand expected behavior.

## License

By contributing, you agree that your contributions will be licensed under the repository’s [MIT License](LICENSE).
