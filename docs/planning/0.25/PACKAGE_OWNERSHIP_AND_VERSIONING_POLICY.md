# AutoForge v0.25 Package Ownership and Versioning Policy

## Status

Accepted for the v0.25 workspace migration. This policy must be implemented
before source relocation and reviewed whenever a package boundary changes.

## Goals

- Preserve the existing `@cojacklabs/autoforge` package and `autoforge`
  executable throughout v0.25.
- Give Core, Agent, Web, and Service explicit ownership boundaries.
- Prevent model providers, hosted services, authentication, and billing from
  becoming dependencies of Core.
- Allow independently releasable products without losing protocol
  compatibility or project-state readability.
- Keep the monorepo usable locally without a cloud account or remote cache.

## Workspace and Release Tooling

AutoForge will use pnpm workspaces and Turborepo. pnpm owns dependency
installation and workspace linking; Turborepo owns the task graph and caching.
Turborepo does not own package versioning or publication.

Changesets records package-level changes, calculates independent versions, and
produces release notes. The already-versioned v0.25 release set is its explicit
baseline import; package metadata is recorded in the root changelog and release
readiness document without creating a second version bump. Every subsequent
public-package change requires a changeset. Public packages are published under
the existing `@cojacklabs` npm scope. Changing npm scopes is not part of v0.25.

For v0.25, the repository root remains the compatibility release host for
`@cojacklabs/autoforge`. `apps/core-cli` owns new routing, terminal formatting,
status, and Agent-launcher source, while the root manifest, binary shim, bundle
entry, and remaining command adapters preserve the existing package artifact.
The boundary checker treats that root manifest as the Core CLI application
manifest. This exception avoids moving a partially extracted application into
a package that still imports repository-root implementation files.

The root becomes private only after the Core CLI is self-contained under
`apps/core-cli`; that physical packaging move is deferred beyond v0.25 and must
preserve the package name, executable, command behavior, and installation
artifact. Remote caching remains optional.

## Package and Application Ownership

| Workspace                                        | Package identity                  | Distribution                                              | Functional owner     | Responsibility                                                                                              |
| ------------------------------------------------ | --------------------------------- | --------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Root release host + `apps/core-cli` source owner | `@cojacklabs/autoforge`           | Public npm package; `autoforge` binary                    | Core CLI             | Deterministic command routing and output, compatibility aliases, and thin optional Agent process delegation |
| `apps/agent-cli`                                 | `@cojacklabs/autoforge-agent`     | Public experimental npm package; `autoforge-agent` binary | Agent                | Interactive prompting, model selection, streaming, approvals, and bounded agent execution                   |
| `apps/web`                                       | `@cojacklabs/autoforge-web`       | Private deployable application                            | Web                  | Account, organization, usage, and billing interfaces                                                        |
| `apps/service`                                   | `@cojacklabs/autoforge-service`   | Private deployable application                            | Service              | Hosted identity, entitlements, usage metering, model gateway, and service APIs                              |
| `packages/protocol`                              | `@cojacklabs/autoforge-protocol`  | Public npm library                                        | Protocol             | Versioned schemas, wire contracts, capability identifiers, and shared error shapes                          |
| `packages/core`                                  | `@cojacklabs/autoforge-core`      | Public npm library                                        | Core                 | Project truth, governance, work, context, decisions, validation, handoffs, and orchestration services       |
| `packages/sdk`                                   | `@cojacklabs/autoforge-sdk`       | Public npm library                                        | SDK                  | Supported programmatic facade over Core operations                                                          |
| `packages/providers`                             | `@cojacklabs/autoforge-providers` | Public only after its provider interface stabilizes       | Agent integrations   | Model-provider interfaces and adapters; never project-state ownership                                       |
| `packages/client`                                | `@cojacklabs/autoforge-client`    | Public only with a supported hosted API                   | Service integrations | Typed, transport-level client for AutoForge Service                                                         |
| `packages/config`                                | `@cojacklabs/autoforge-config`    | Private workspace package                                 | Developer experience | Shared TypeScript, lint, formatting, test, and build configuration                                          |

The paths above are targets, not permission to create empty packages. A package
is created only when a real implementation and focused validation move into it.

The human maintainer is the release authority for every public package and
deployed application during v0.25. CI may validate and prepare releases, but it
must not publish without an explicitly approved release action. Package-level
ownership metadata and repository review rules should mirror the functional
owners in this table when those controls are introduced.

## Dependency Direction

```text
protocol
|-- core -- sdk -- core-cli
|             `-- agent-cli
|-- providers -------^
|-- client ----------+-- agent-cli
|                    `-- web
|
`-- service (which may also consume core, providers, and sdk)
```

The diagram expresses allowed direction, not required dependencies. The rules
below are authoritative:

1. `protocol` has no internal AutoForge dependency and performs no filesystem,
   Git, environment, network, credential, terminal, or provider access.
2. `core` may depend only on `protocol` and general-purpose third-party
   libraries. External effects are supplied through explicit adapters.
3. `sdk` may depend on `core` and `protocol`; it returns protocol objects and
   never terminal-formatted text.
4. `providers` may depend on `protocol`. It does not read or write Core stores.
5. `client` may depend on `protocol`. It does not become a required dependency
   of Core or the Core CLI.
6. `core-cli` may depend on `sdk`, `core`, and `protocol`; it never depends on
   Agent, providers, Web, Service, authentication, or billing.
7. `agent-cli` may depend on `sdk`, `protocol`, `providers`, and `client`. It
   uses SDK operations instead of creating parallel project-state stores. Its
   local credential adapter may access native operating-system credential
   facilities; credential values never enter another workspace package.
8. `web` uses `client` and `protocol` for Service communication. It does not
   access local Core stores directly.
9. `service` may consume `protocol`, `core`, `sdk`, and `providers`, but hosted
   persistence and identity remain Service-owned adapters.
10. Applications may import packages. Packages never import applications, and
    circular workspace dependencies are prohibited.

Workspace dependencies use pnpm's `workspace:^` protocol unless an exact pin is
required by a documented compatibility constraint. The workspace task graph
must build dependencies before dependents and expose boundary checks as a
normal validation task.

## Command Ownership

`autoforge` remains the Core-owned command router. Explicit Core subcommands,
including `autoforge status`, are deterministic and never call a model. With no
subcommand, the v0.25 target behavior is to launch the separately installed
Agent in an eligible interactive terminal. In CI, pipes, redirected output, or
when the Agent is unavailable, bare `autoforge` renders the same concise project
status, relevant next commands, and `autoforge help` guidance available today.

`autoforge-agent` owns the interactive experience and remains directly
invocable. The Core package discovers and spawns that executable as a thin
process boundary; it must not bundle or import provider SDKs, Agent code,
credential stores, or model-runtime dependencies. Delegation forwards terminal
streams, signals, and exit codes, prevents recursive launch, and returns
actionable installation guidance before falling back to status when the Agent
is missing or incompatible.

In v0.25, interactive `autoforge tui` is deprecated. `autoforge tui
--snapshot` remains a compatibility alias for deterministic status output
through v0.26. Removal may occur no earlier than v0.27 and requires release
notes and migration guidance.

## Versioning Policy

Packages and deployable applications use independent semantic versions:

- `@cojacklabs/autoforge` advances from `0.24.x` to `0.25.2` for the Core CLI
  migration and remains the public product version users see today.
- Newly extracted public libraries begin at `0.1.0` when first published. They
  may exist as private `0.0.0` workspace packages before their public contract
  is ready.
- AutoForge Agent begins at `0.1.0` when its experimental package is first
  published. Its version is not coupled to the Core CLI version.
- Web and Service use independent deployment versions and release records;
  neither determines the local Core version.

Before `1.0.0`, breaking public API changes require a minor version bump and
clear migration notes; additive features use a minor bump; compatible fixes use
a patch bump. After `1.0.0`, normal semantic-versioning major, minor, and patch
rules apply. Changes to private workspace packages do not create public release
obligations.

Every release records the supported versions of its direct AutoForge
dependencies. The Agent and hosted clients must perform capability negotiation
instead of assuming that matching package versions imply matching features.

## Compatibility Promises

### CLI compatibility

- Existing supported v0.24 commands, the `@cojacklabs/autoforge` package name,
  and the `autoforge` binary remain available in v0.25.
- Automation must use explicit Core subcommands. Bare invocation remains safe
  for legacy automation through deterministic fallback whenever the process is
  noninteractive or its output is piped or redirected.
- Structured JSON fields and exit-code meanings are compatibility surfaces.
  Human-oriented prose may improve provided it does not break a documented
  parsing contract; consumers should use JSON or the SDK.
- A renamed or moved command requires a temporary alias and deprecation
  guidance for at least one minor Core CLI release.

### Protocol compatibility

- Serialized protocol objects include an explicit schema or protocol version;
  the npm package version is not used as the wire version.
- Additive optional fields are compatible. Removing a field, changing its
  meaning, or making an optional field required is breaking.
- Consumers reject unsupported protocol versions with a structured,
  actionable error and may negotiate capabilities independently.

### Project-state compatibility

- v0.25 must read every supported v0.24 project without knowledge loss.
- Durable state changes are additive when possible. A write migration requires
  a dry-run preview, backup or atomic rollback path, and fixture coverage.
- Core remains the sole owner of canonical project state. Agent, Web, and
  Service may propose or transport changes only through supported Core/SDK
  operations.
- Credentials, raw provider transcripts, caches, leases, and machine-specific
  paths never enter tracked project state.
- Validated cross-agent handoffs are canonical tracked state under
  `.autoforge/handoffs/`; generated context, orchestration packets, provider
  runtime data, and raw conversations remain ignored.

### Local-first compatibility

Core and local Agent workflows must not require an AutoForge account, Service,
Web application, networked remote cache, or hosted credential store. Hosted
features are additive capabilities and must fail without disabling local Core
operations.

## Publication Gates

A public package is publishable only when:

- its responsibility and dependency boundary match this policy;
- its exported API and serialized contracts have focused tests;
- package build, typecheck, format, test, and boundary checks pass;
- its dependency compatibility range is recorded;
- changeset, changelog, migration notes, and deprecations are complete;
- no credential, private workspace path, generated state, or unpublished
  application dependency enters the package artifact; and
- an explicit human release approval is recorded.

The v0.25 Core CLI additionally requires the full foundation, legacy, project
fixture, command compatibility, and installation gates defined in the platform
migration plan.

## Source-Relocation Gate

Bounded source relocation may begin only after the workspace-foundation task
confirms:

- pnpm and Turborepo configuration implement these package identities;
- the root compatibility manifest remains the release host for
  `@cojacklabs/autoforge` until `apps/core-cli` is self-contained;
- the repository boundary checker evaluates that compatibility manifest as the
  Core CLI application manifest;
- dependency and task graphs are acyclic and enforce the allowed directions;
- current v0.24 build, typecheck, format, and test commands work through the
  workspace task graph; and
- no behavioral redesign is bundled into the relocation commit.

Privatizing the root and moving the public manifest into `apps/core-cli` is a
separate future gate. It requires eliminating upward imports from
`apps/core-cli` into root `src`, moving the binary and bundle entry atomically,
and passing the same packed-install and command-compatibility suites before and
after the move.
