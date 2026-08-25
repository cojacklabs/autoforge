# AutoForge Changesets

Changesets owns independent version planning and package changelog generation
for AutoForge's public workspace packages.

The v0.25 release set is the imported baseline because its candidate versions
were assigned before Changesets was introduced. Its package-level metadata is
recorded in the root `CHANGELOG.md` and
`docs/planning/0.25/RELEASE_READINESS.md`; adding a pending changeset for that
already-versioned work would incorrectly calculate another version bump.

Every public-package change after this baseline must add a changeset:

```bash
pnpm changeset
pnpm release:status
```

Release preparation applies reviewed changesets with `pnpm release:version`.
Publication remains a separate, explicitly approved operation invoked with
`pnpm release:publish` only after all release gates pass.

`@cojacklabs/autoforge-agent` and `@cojacklabs/autoforge-providers` remain
private experimental packages and are ignored until separately approved for
public release. The root-hosted `@cojacklabs/autoforge` compatibility package is
included in Changesets package discovery for v0.25.
