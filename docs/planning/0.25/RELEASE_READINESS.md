# AutoForge 0.25 Release Readiness

## Status

Locally audited release checkpoint; final 0.25.1 remote verification pending.

The implementation milestone and local codebase audits are complete, but
publication remains deliberately blocked on pushed CI, the published-dependency
smoke test, and explicit release approval. No tag, GitHub release, npm
publication, or hosted deployment is authorized by this document.

## Release Set

| Package                           | Candidate version | Role                                                 |
| --------------------------------- | ----------------: | ---------------------------------------------------- |
| `@cojacklabs/autoforge-protocol`  |           `0.1.0` | Versioned contracts and capabilities                 |
| `@cojacklabs/autoforge-core`      |           `0.1.1` | Model-independent project intelligence               |
| `@cojacklabs/autoforge-sdk`       |           `0.1.1` | Supported programmatic facade                        |
| `@cojacklabs/autoforge`           |          `0.25.1` | Deterministic Core CLI and optional Agent launcher   |
| `@cojacklabs/autoforge-agent`     |           `0.1.0` | Experimental local Agent; independent approval       |
| `@cojacklabs/autoforge-providers` |           `0.1.0` | Experimental provider boundary; independent approval |

Production Web and hosted Service packages are explicitly deferred.

## Validation Evidence

Validated locally on 2026-08-25 with the release runtime, Node.js 22.19.0,
and pnpm 11.22.0. The repaired Node.js 22 Linux jobs and native Windows launcher
job passed remotely; the final 0.25.1 identity commit must reproduce that result.

| Gate                         | Result | Evidence                                                                                                                                                              |
| ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen install               | Pass   | `pnpm install --frozen-lockfile --offline`                                                                                                                            |
| Workspace dependency policy  | Pass   | Repository boundary checker: 6 workspaces                                                                                                                             |
| Authored-source boundaries   | Pass   | Repository source/package checker; 6 workspaces, no issues                                                                                                            |
| Package builds               | Pass   | Protocol, Core, SDK, Providers, and Agent                                                                                                                             |
| Package typechecks           | Pass   | All 5 package workspaces                                                                                                                                              |
| Package tests                | Pass   | 34 tests across Protocol, Core, SDK, Providers, and Agent                                                                                                             |
| Package formatting           | Pass   | All 5 package workspaces                                                                                                                                              |
| Root typecheck               | Pass   | `tsc --noEmit`                                                                                                                                                        |
| Root formatting              | Pass   | Full repository Prettier check                                                                                                                                        |
| Planning synchronization     | Pass   | Canonical planning bundle synchronized                                                                                                                                |
| AutoForge selected-file gate | Pass   | Installation, containment, secret scan, structured syntax, typecheck, format, and tests                                                                               |
| Foundation suite             | Pass   | 150 test files, 712 passed and 1 native-Windows test skipped locally                                                                                                  |
| Legacy suite                 | Pass   | 17 Node tests                                                                                                                                                         |
| Compatibility fixture        | Pass   | Frozen 0.24 work/session state loads without mutation                                                                                                                 |
| Cross-agent continuity       | Pass   | Claude-to-Codex handoff validates without transcript/message fields                                                                                                   |
| Launcher matrix              | Pass   | TTY eligibility, CI/pipes/disable/recursion fallback, missing/incompatible Agent, exit codes, signals, and platform invocation selection                              |
| Native Windows launcher      | Pass   | The focused `windows-latest` job passed through the production process host in [CI run 32919412472](https://github.com/cojacklabs/autoforge/actions/runs/32919412472) |
| Optional-store recovery      | Pass   | Missing bootstrap manifest returns actionable `not-scaffolded` status                                                                                                 |
| Relocation recovery          | Pass   | Existing Agent contract root is repaired; missing contract is accepted                                                                                                |
| Package contents             | Pass   | Core CLI tarball contains only license, README, bin, bundle, source map, and manifest                                                                                 |
| Isolated package-set install | Pass   | Locally packed Protocol/Core/SDK/Core CLI plus cached public dependencies install and report `AutoForge 0.25.1`                                                       |
| Release metadata             | Pass   | Changesets configured for independent public packages; v0.25 recorded as the already-versioned baseline import                                                        |

An earlier evidence-collection run executed `npm pack` concurrently with the
foundation suite. Because `prepack` intentionally cleans and rebuilds `dist/`,
it briefly removed the integration-test entrypoint. That run was discarded;
the counts above come from the subsequent isolated, uncontended run.

## Findings Resolved During Release Preparation

1. Four tests pinned the previous package version. They now compare CLI output
   against the package manifest, retaining coverage across future releases.
2. The root public manifest used `workspace:^` for Protocol, Core, and SDK.
   `npm pack` preserved those values and a consumer install failed with
   `EUNSUPPORTEDPROTOCOL`. The public Core CLI now records `^0.1.0` compatibility
   ranges while the lockfile continues linking the matching local workspaces.
3. Nine historical documentation/test files failed the repository-wide
   formatting gate. They were mechanically normalized without behavioral edits.
4. The previous standalone Turborepo boundary scanner could include generated
   output. CI now runs the repository's authored-source/package dependency
   checker directly, so the result is independent of build-output state.
5. The package policy previously required the repository root to become private
   during v0.25 even though the compatibility build intentionally uses the root
   manifest as the Core CLI release host. The policy now records that exception:
   `apps/core-cli` owns new application source, while physical manifest and
   binary relocation waits until the application is self-contained.
6. Changesets 3 is configured for independent public-package releases. Because
   the v0.25 candidate versions predate that tooling, the current release set is
   recorded as the baseline import instead of adding a changeset that would
   incorrectly calculate another minor bump.
7. Every GitHub workflow now installs from `pnpm-lock.yaml` with the official
   pnpm setup action. CI and release verification build and pack Protocol, Core,
   SDK, then the Core CLI, and install all four local tarballs together so no
   unpublished AutoForge dependency is resolved from npm.
8. Windows Agent delegation now invokes the npm-generated `.cmd` shim through
   `cmd.exe` with a constrained argument vocabulary. Unix platforms continue to
   spawn the Agent executable directly, avoiding a shell.
9. Repository formatting now ignores Claude's machine-local settings file, so
   local quality gates are deterministic without committing or rewriting that
   user-specific artifact.
10. The release documentation now has one current entry point for humans and
    agents. The README explains the continuous idea-to-handoff lifecycle,
    `docs/README.md` separates operational guidance from historical plans, and
    stale v0.4/v0.7 agent instructions no longer advertise removed commands as
    current v0.25 behavior.
11. The first Core and SDK registry artifacts preserved `workspace:^` ranges
    because they were published with npm rather than the repository's pnpm
    release path. Their corrected `0.1.1` manifests use explicit public ranges;
    the unusable `0.1.0` artifacts are excluded from supported installation.

## Independent Review

Claude's 2026-08-25 audit independently reproduced the build, typecheck,
foundation, legacy, and boundary checks and found no correctness or credential
handling defect. Its report is preserved in
[`CLAUDE_AUDIT_REPORT.md`](./CLAUDE_AUDIT_REPORT.md).

A subsequent line-by-line review covered the surfaces Claude explicitly left
open: Protocol schemas and strict rejection, Core dependency isolation, SDK
effect injection, and launcher negotiation/process behavior. No public-release
blocker was found. The review did identify a separate experimental-Agent risk:
model-generated file contents rely on prompt-level prohibitions before being
written. AutoForge now tracks code-level content validation and stream
sanitization as a required issue before Agent or Providers publication.

## Required Publication Order

1. Audit and approve Protocol, then publish `@cojacklabs/autoforge-protocol`.
2. Audit and approve Core, then publish `@cojacklabs/autoforge-core`.
3. Audit and approve SDK, then publish `@cojacklabs/autoforge-sdk`.
4. Re-run the normal npm tarball-install smoke test against those published
   dependency versions.
5. Audit and approve the Core CLI, create the matching tag, and publish
   `@cojacklabs/autoforge`.
6. Approve Agent and Providers independently; neither blocks local Core use.

## Maintainer Audit Checklist

- [x] Review every accumulated source change and split it into bounded,
      reviewable commits.
- [x] Confirm no unrelated user files, local learning state, credentials,
      generated context, or raw transcripts enter a commit or package.
- [x] Review Protocol schemas for compatibility and strict rejection behavior.
- [x] Review Core for prohibited Agent, provider, credential, Web, Service,
      billing, or authentication dependencies.
- [x] Review SDK exports and ensure terminal/filesystem behavior remains adapter
      supplied.
- [x] Review launcher process negotiation, signal forwarding, recursion
      prevention, fallback behavior, and Windows executable handling.
- [ ] Before separate Agent approval, exercise native credential-store behavior
      on macOS, Linux, and Windows.
- [x] Confirm the pushed Node.js 22 Linux jobs and focused native Windows
      launcher job pass in GitHub Actions.
- [ ] Re-run a normal isolated npm install after Protocol, Core, and SDK are
      published.
- [ ] Verify the tag exactly matches the root package version.
- [ ] Record explicit human approval before any publication.

## Known Non-Release State

- The globally installed 0.24.0 CLI still throws `ENOENT` for an absent
  bootstrap manifest; the 0.25.1 worktree bundle returns actionable
  `not-scaffolded` output. This is the bug the upgrade resolves.
- Production Web, Service, payments, cloud synchronization, hosted credential
  custody, multi-model autonomy, native OS installers, and raw transcript
  storage are not part of this release.
- Experimental Agent and Providers publication is blocked separately on
  code-level generated-content validation and sanitization. This does not block
  Protocol, Core, SDK, or deterministic Core CLI publication.
- Candidate implementation, release tooling, documentation, and AutoForge state
  are split into bounded local commits for remote review.
- The public Core CLI is packaged from the repository root for v0.25. Moving its
  manifest and binary into `apps/core-cli` is a later packaging migration, not a
  requirement for this release candidate.

## Approval

Release approval: **PENDING**

Approver and timestamp must be recorded here or in the release workflow before
publication.
