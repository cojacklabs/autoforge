# Priozar Release Checklist (Human Steps)

This checklist covers the outward-facing steps of the AutoForge → Priozar
rename. Everything in the repository is already prepared. **No agent publishes
packages, renames the GitHub repository, or changes DNS.** A maintainer with the
right credentials performs the steps below, in order.

Related: [Priozar Brand Migration Guide](PRIOZAR_BRAND_MIGRATION_GUIDE.md).

## Preconditions

- [ ] The release changeset and versions are merged
      (`task.add-the-release-changeset-and-versions-for-the-priozar-package-rename`).
- [ ] The init/attach default is decided and, if switching to `.priozar`, merged
      (`task.switch-init-and-attach-to-create-priozar-at-release`).
- [ ] Naming, trademark and domain review are complete. The README does not
      claim they are; do not announce the name until they are.
- [ ] `pnpm install --frozen-lockfile`, `pnpm workspace:check`,
      `pnpm exec turbo run build typecheck test format:check` and
      `pnpm release:status` pass on the release commit.

## Evidence gathered on 2026-11-22 (dry run, nothing published)

| Package                         | Version | Visibility | npm registry today             |
| ------------------------------- | ------- | ---------- | ------------------------------ |
| `@cojacklabs/priozar-protocol`  | 0.1.0   | public     | not found (name available)     |
| `@cojacklabs/priozar-core`      | 0.1.1   | public     | not found (name available)     |
| `@cojacklabs/priozar-sdk`       | 0.1.1   | public     | not found (name available)     |
| `@cojacklabs/priozar`           | 0.25.3  | public     | not found (name available)     |
| `@cojacklabs/priozar-agent`     | 0.1.0   | private    | not published                  |
| `@cojacklabs/priozar-providers` | 0.1.0   | private    | not published                  |
| `@cojacklabs/autoforge`         | —       | —          | 0.25.3 (the package to retire) |

The packages were packed locally with `pnpm pack` and installed into an empty
project, mirroring the "Pack and smoke test public package set" step in
`.github/workflows/deploy.yml`. Protocol, Core and SDK imported cleanly, and
both `priozar version` and the deprecated `autoforge version` printed
`Priozar 0.25.3`.

The npm names were free at the time of the check. Another publisher could claim
one at any time, so claim them early in the sequence.

## Versions (decided: minor bump)

The first Priozar packages publish as a minor bump. The new npm names have no
history, so this signals the visible rename without a 1.0 promise.

| Package                        | Now    | Release |
| ------------------------------ | ------ | ------- |
| `@cojacklabs/priozar-protocol` | 0.1.0  | 0.2.0   |
| `@cojacklabs/priozar-core`     | 0.1.1  | 0.2.0   |
| `@cojacklabs/priozar-sdk`      | 0.1.1  | 0.2.0   |
| `@cojacklabs/priozar`          | 0.25.3 | 0.26.0  |

- [ ] Run `pnpm release:version`. The reviewed changeset
      (`.changeset/rename-autoforge-to-priozar.md`) bumps Protocol, Core and SDK.
- [ ] Bump the root `@cojacklabs/priozar` package to `0.26.0` by hand in
      `package.json`. It is not a pnpm workspace member, so Changesets cannot
      version it. Then re-run the full gate.
- [ ] Tag the release with the same version as the root `package.json`;
      `deploy.yml` fails when they differ.

## 1. npm

1. Sign in as a member of the `@cojacklabs` scope with publish rights and 2FA.
2. Publish in dependency order, using the repository's release flow
   (`pnpm release:version`, then `pnpm release:publish`), or by hand:
   1. `@cojacklabs/priozar-protocol`
   2. `@cojacklabs/priozar-core`
   3. `@cojacklabs/priozar-sdk`
   4. `@cojacklabs/priozar` (the Core CLI)
3. Verify from a clean directory:
   ```bash
   npm install --global @cojacklabs/priozar
   priozar version
   autoforge version   # deprecated alias, must still work
   ```
4. Retire the old package only after step 3 passes. Prefer a deprecation
   message over unpublishing, so existing installs keep working:
   ```bash
   npm deprecate @cojacklabs/autoforge "Renamed to @cojacklabs/priozar. Install @cojacklabs/priozar; the autoforge command remains available there during the compatibility window."
   ```
   Do the same for `-core`, `-protocol` and `-sdk` under their old names if they
   were ever published.
5. Do not unpublish anything.

## 2. GitHub repository

1. Rename `cojacklabs/autoforge` to `cojacklabs/priozar` in the repository
   settings. GitHub redirects the old URL, so existing clones keep working.
2. Update the local remote: `git remote set-url origin https://github.com/cojacklabs/priozar.git`.
3. Update the URLs that still name the old repository: `CONTRIBUTING.md`
   (fork and upstream clone commands) and `.changeset/README.md`. Test fixtures
   under `test/` and the historical `CHANGELOG.md` and `CHANGES_COMPLETE.md`
   keep the old URL on purpose. `package.json` and `.github/` contain none.
4. Check that the CI and deploy workflows still run, and that any secrets,
   branch protection rules and the npm token are attached to the renamed
   repository.
5. Do not create a new repository named `autoforge`; that would break the
   redirect.

## 3. Domain and URLs

1. Decide the canonical domain. The open issues for `autoforge.sh` and
   `autoforgerai.com` are reservation items and are separate from this rename.
2. Register the new domain, then point DNS at the documentation host.
3. Keep the old domain redirecting to the new one for the whole
   compatibility window.
4. Update any hard-coded URLs in the README and docs once the domain is live.
   There are no `autoforge.sh` links in the repository today.

## 4. After the release

- [ ] Install Priozar globally on the machines that use it. Until then the
      globally installed `autoforge` 0.25.3 cannot read `.priozar/`.
- [ ] Migrate registered projects one at a time with
      `priozar migrate brand --dry-run`, then `priozar migrate brand`
      (`task.migrate-registered-projects-to-priozar`).
- [ ] Open the follow-up for installed agent hooks and managed-block markers
      (`issue.migrate-installed-agent-hooks-and-managed-block-markers-to-priozar`).
- [ ] Rename `docs/planning/0.26/AUTOFORGE_FRAMEWORK_NORTH_STAR.md` after its
      artifact is approved and superseded.
- [ ] Announce the compatibility window, and later its end date.

## Rollback

- npm: publish a patch version; do not unpublish. The old `@cojacklabs/autoforge`
  package keeps working until it is deprecated.
- GitHub: rename the repository back. The redirect follows the rename.
- Project state: every `migrate brand` run leaves a recoverable
  `.autoforge.backup-*` directory beside the project.
