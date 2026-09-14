# Forger Identity Verification

Status: No-go for implementation
Reviewed: 2026-09-13
Scope: Product name, package, executable, repository, state directory, domain,
and relevant legal/search collision signals

## Conclusion

Do **not** rename AutoForge to Forger or begin the planned package, executable,
or state-directory migration.

Although the expected scoped npm package and CoJack Labs GitHub repository did
not resolve publicly during this review, the overall identity fails the
distinctiveness gate. Existing products occupy the same name, developer-tool
category, command, state-directory convention, and adjacent product position.
A registered United States FORGER software mark adds legal-review risk. A
scoped package alone would not resolve user confusion, executable collisions,
search ambiguity, or state ownership.

AutoForge remains the compatibility identity until a new distinctive name
passes this verification gate. This is a product-risk assessment, not legal
advice or a trademark clearance opinion.

## Evidence

| Surface                    | Finding                                                                                                                                                               | Result                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Product positioning        | [Forger Cloud](https://forger.cloud/) is an active local-first product that installs and coordinates Codex, Claude Code, and Antigravity to create applications       | Blocking collision                                                                             |
| Framework name             | [RyanDev1st/FORGER](https://github.com/RyanDev1st/FORGER) describes an AI-development framework and execution-gated agent harness                                     | Blocking collision                                                                             |
| Executable                 | The existing FORGER quickstart uses `forger init` and `forger run`                                                                                                    | Blocking collision                                                                             |
| Project state              | The existing FORGER quickstart writes `.forger/`                                                                                                                      | Blocking collision                                                                             |
| Unscoped npm               | `npm view forger` resolved `forger@1.4.0`, an existing Node package                                                                                                   | Unavailable                                                                                    |
| Proposed scoped npm        | `npm view @cojacklabs/forger` returned `E404` on 2026-09-13                                                                                                           | Apparently unclaimed publicly, but not sufficient clearance                                    |
| Proposed GitHub repository | GitHub's public API returned `404` for `cojacklabs/forger` on 2026-09-13                                                                                              | Apparently absent publicly, but private/reserved status and future availability are not proven |
| Trademark signal           | Public trademark data reports U.S. registration 7,617,198 for FORGER, owned by MAXON Computer GmbH, covering downloadable design, graphics, GUI, and related software | Requires professional legal review; material adjacent-software risk                            |
| Broader searchability      | Multiple Forge/Forger AI agents, coding harnesses, MCP tools, and developer platforms dominate relevant results                                                       | High confusion and discovery risk                                                              |
| `forger.sh`                | Registry/registrar availability could not be authoritatively verified in this environment                                                                             | Unresolved; domain availability would not cure the other blockers                              |

The absence of a public package or repository is not proof that an identifier
is available, owned, registrable, or legally safe. Final candidates must be
verified through authenticated owner accounts and, before commercial adoption,
appropriate legal review.

## Failed Acceptance Criteria

Forger fails the previously approved identity gate because:

- it is not distinctive within AI-assisted software development;
- the exact `forger` executable is already documented by an adjacent framework;
- the exact `.forger/` project-state directory is already used by that
  framework;
- the product name is already used by an active application-building platform;
- the unscoped npm name is occupied;
- search results would not reliably distinguish the CoJack Labs framework; and
- a registered software mark creates risk that cannot be cleared by technical
  namespace availability.

## Required Next Step

Select a new distinctive framework identity before implementation. Each
candidate must be evaluated as one indivisible identity bundle:

1. product and company-portfolio fit;
2. scoped and unscoped package names;
3. executable and shell discoverability;
4. GitHub organization/repository names;
5. project-state directory and environment-variable prefix;
6. credential-service namespace;
7. primary domains and social/search presence;
8. relevant trademark and international-language risk; and
9. migration, compatibility, deprecation, and rollback behavior.

Prefer an invented or highly distinctive name over another generic variation
of “forge.” Do not reserve, publish, or rename code until the complete bundle is
approved. The compatibility architecture in
[Forger Brand and Compatibility Migration](FORGER_BRAND_AND_COMPATIBILITY_MIGRATION.md)
may be reused after substituting the approved identity, but its Forger-specific
identifiers are not authorized.
