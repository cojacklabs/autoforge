# GitHub Workflow Audit for AutoForge 0.8+

## Findings

| File                                           | Problem                                                                                                                             | Disposition                                                                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                     | Uses Node 18 while the package requires Node `>=20`.                                                                                | Update to Node 20 and use the frozen lockfile install.                                                                                        |
| `.github/workflows/ci.yml`                     | Runs missing `examples/fullstack_todo_app/**` demo paths.                                                                           | Remove the demo slice or restore it as a maintained fixture; prefer replacing it with the real foundation/legacy test commands.               |
| `.github/workflows/ci.yml`                     | Uses `npm install` despite maintaining npm and pnpm lockfiles.                                                                      | Choose one release CI package manager; use `npm ci` for npm lockfile validation or `pnpm install --frozen-lockfile` in a separate matrix job. |
| `.github/workflows/agent-change-processor.yml` | Depends on legacy prompt files and `change_requests/**`; it only emits a manual summary and does not execute an AutoForge workflow. | Replace with an issue/intent validation workflow or retire it until 0.9 orchestration exists.                                                 |
| `.github/workflows/deploy.yml`                 | Calls legacy context validation and performs placeholder deployment.                                                                | Rename to a release-validation workflow or keep manual deployment disabled until a real deployment target exists.                             |
| `.github/PULL_REQUEST_TEMPLATE.md`             | References removed `configure` and `validate` commands.                                                                             | Replace with `doctor`, `gate check`, `format:check`, `typecheck`, and test/build checks.                                                      |
| `.github/ISSUE_TEMPLATE/*`                     | Templates are generic and do not capture AutoForge work IDs or context packets.                                                     | Add optional work ID, reproduction intent, packet, and adapter fields.                                                                        |

## Recommended v0.8 Workflow Set

### `ci.yml`

Use the actual released contract:

```text
checkout
setup Node 20
npm ci
npm run format:check
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Add a separate smoke test that installs the packed tarball in a temporary project and runs `autoforge version`, `doctor`, and `help`.

### `planning.yml`

Add a pull-request planning validation workflow that:

- checks changed Markdown/YAML planning documents;
- verifies the Planning Bundle is synchronized;
- validates intent/research fixtures;
- runs triage and readiness golden tests;
- reports stale planning artifacts without mutating the pull request.

### `release.yml`

Replace the placeholder deploy workflow with a tag-driven release verification workflow:

- verify tag matches `package.json`;
- run the full release gate;
- run `npm pack --dry-run`;
- publish only with an explicit environment approval and npm provenance/OTP policy;
- do not deploy application infrastructure because AutoForge has no hosted runtime in v0.7/0.8.

### Legacy workflow retirement

Retire `agent-change-processor.yml` until workflow orchestration is designed for 0.9. The v0.8 replacement is structured intent and research artifacts, not prompt-chain execution from GitHub.

## Pull Request Guidance

Replace removed commands with:

```text
npm run format:check
npm run typecheck
npm test
npm run build
npx autoforge doctor
npx autoforge gate check
```

When behavior changes, include the relevant AutoForge work ID and context-packet or fixture evidence.

## Implementation Order

1. Repair CI Node/version/install/test paths.
2. Add package smoke testing from the packed tarball.
3. Replace stale PR template commands.
4. Add Planning Bundle synchronization checks.
5. Retire or replace the legacy agent-change workflow.
6. Convert deploy to release verification only.

## Non-Goals

- Do not make GitHub Actions an autonomous coding agent.
- Do not reintroduce `autopilot`, `load`, `configure`, `refresh`, or legacy research chains.
- Do not publish from every push.
- Do not add deployment infrastructure to a local control-plane product.
