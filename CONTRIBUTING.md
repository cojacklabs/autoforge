
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

AutoForge is designed to live inside another project under `./autoforge`. During development, most changes are documentation, prompts, or CLI code in this repo.

## Working philosophy

- Managed files: `ai/code_targets.yaml` and `ai/context_targets.yaml` are generated from `autoforge.config.json`. Do not hand‑edit them; instead:
  - Edit `autoforge.config.json`
  - Run `npx autoforge configure`
- Planning‑first: Quality gates accept canonical docs under `docs/`, `api/`, `diagrams/` or planning stubs under `.autoforge/ai/reports/**`.
- Shared progress: Keep `ai/AGENTS.md` updated (Progress & Next Steps, Lessons Learned, Rules) so work transfers across IDEs/CLIs.

## Local checks

Before opening a PR, please run:

```bash
npm run build              # refresh dist/
npx autoforge configure    # regenerate managed YAML from config (if changed)
npx autoforge validate     # run quality gates
npm run format:check       # ensure code style
```

Optional:

```bash
npx autoforge load         # generate the copy/paste context prompt for your AI
npx autoforge snapshot     # write REPO.md (context snapshot) if relevant
```

## Commit guidelines

- Follow the conventional style and our playbook: see `docs/ai/COMMIT_PLAYBOOK.md`
- Scope examples: `feat(cli): add load subcommand`, `docs: clarify quality gates`
- Keep commits focused; include rationale and any semantic versioning implications

## Pull request checklist

- [ ] Change is scoped and focused
- [ ] Docs updated (README, prompts, guides) when behavior changes
- [ ] `npm run build` passes; dist contains expected updates
- [ ] `npx autoforge validate` passes (if applicable)
- [ ] Linked to any related issue(s) or discussion

## Finding issues

- Look for issues labeled `good first issue` (great for onboarding) and `help wanted`
- If you’re unsure where to start, open a Discussion or comment on an issue to coordinate

## Code of Conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand expected behavior.

## License

By contributing, you agree that your contributions will be licensed under the repository’s [MIT License](LICENSE).
