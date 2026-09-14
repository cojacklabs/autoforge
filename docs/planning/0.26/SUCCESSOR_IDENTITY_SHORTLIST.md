# Successor Identity Shortlist

Status: Priozar selected by maintainer; reservation and legal clearance pending
Reviewed: 2026-09-13
Recommended candidate: Priozar

## Recommendation

The maintainer selected **Priozar** as the successor identity. The name combines
the product's priority-oriented role with a distinct, command-friendly form and
does not present the framework as an AI. Priozar remains a deterministic
framework for structuring instructions, scoping work, ordering priorities,
preserving context, and validating execution by external agents.

Selection authorizes a bounded identity-reservation and migration-planning gate;
it does not yet authorize code renaming, package publication, domain purchase,
or project-state migration. Those actions require authenticated availability
checks, controlled identifiers, and appropriate trademark review.

The naming vocabulary should draw from four framework behaviors:

- orchestrate: coordinate, conduct, direct, marshal, synchronize;
- organize: arrange, order, structure, classify, systematize;
- prioritize: rank, sequence, focus, weight, triage; and
- govern: align, guide, steward, reconcile, regulate.

Common dictionary forms are already crowded. Prefer a short coined name that
combines two behaviors, works naturally as a shell command, and looks credible
as `<name>.sh`.

The existing tagline remains compatible:

> **Human intent. AI execution. One shared understanding.**

## Previously Screened Identity Bundle

The following Unisonry bundle remains availability research, not the current
product recommendation.

| Surface                   | Proposed identity                                 |
| ------------------------- | ------------------------------------------------- |
| Product                   | Unisonry                                          |
| Display name              | `Unisonry`                                        |
| Executable                | `unisonry`                                        |
| Primary CLI package       | `@cojacklabs/unisonry`                            |
| Protocol package          | `@cojacklabs/unisonry-protocol`                   |
| Core package              | `@cojacklabs/unisonry-core`                       |
| SDK package               | `@cojacklabs/unisonry-sdk`                        |
| Project state             | `.unisonry/`                                      |
| Environment prefix        | `UNISONRY_`                                       |
| Credential service        | `com.cojacklabs.unisonry` plus component suffixes |
| GitHub repository         | `cojacklabs/unisonry`                             |
| Preferred domain          | `unisonry.sh`                                     |
| Defensive/redirect domain | `unisonry.com`                                    |

One product word is used consistently across display, command, package, and
state identities. Unlike the rejected Forger proposal, this bundle does not
introduce a generic third shorthand such as `forge`.

## Selected Priozar Identity Bundle

| Surface                   | Selected identity                                |
| ------------------------- | ------------------------------------------------ |
| Product                   | Priozar                                          |
| Display name              | `Priozar`                                        |
| Executable                | `priozar`                                        |
| Primary CLI package       | `@cojacklabs/priozar`                            |
| Protocol package          | `@cojacklabs/priozar-protocol`                   |
| Core package              | `@cojacklabs/priozar-core`                       |
| SDK package               | `@cojacklabs/priozar-sdk`                        |
| Project state             | `.priozar/`                                      |
| Environment prefix        | `PRIOZAR_`                                       |
| Credential service        | `com.cojacklabs.priozar` plus component suffixes |
| GitHub repository         | `cojacklabs/priozar`                             |
| Preferred domain          | `priozar.sh`                                     |
| Defensive/redirect domain | `priozar.com`                                    |

Pronounce the name **PRY-oh-zar**. Product copy should emphasize prioritization,
shared context, governance, and validation rather than autonomous execution.

## Priozar Preliminary Verification

Checks captured on 2026-09-13:

| Surface                   | Observation                                                                                                                                 | Interpretation                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Unscoped npm              | `npm view priozar` returned `E404`                                                                                                          | No public unscoped package resolved at review time                              |
| Scoped npm                | The proposed CLI, Core, Protocol, and SDK packages under `@cojacklabs` each returned `E404`                                                 | No proposed scoped package resolved at review time                              |
| CoJack Labs repository    | GitHub's API returned `404` for `cojacklabs/priozar`                                                                                        | The proposed repository did not exist publicly at review time                   |
| GitHub account            | GitHub's API returned `404` for the exact `priozar` user or organization                                                                    | The exact account did not exist publicly at review time                         |
| GitHub name search        | GitHub's repository and user search APIs each returned zero exact-name results                                                              | No indexed GitHub identity collision was found                                  |
| Adjacent-product search   | No exact software framework, AI platform, CLI, or developer-tool use was found                                                              | Strong preliminary category clearance, not exhaustive                           |
| USPTO exact wordmark      | The official Trademark Search system returned `No results found`, including live and dead records                                           | No exact US federal wordmark record was found                                   |
| International trade marks | EUIPO-coordinated TMview returned `No rows found` across participating offices                                                              | No exact record was found in that aggregated search; TMview is not a register   |
| Other exact uses          | An unrelated Spanish entity named `PRIOZAR 95, S.L.` and a Second Life marketplace seller using `Priozar` appeared in public search results | The word is not globally unique, but neither use is currently category-adjacent |

These results establish a favorable preliminary collision screen, not legal
clearance or ownership. An `E404`, API `404`, or empty search result can change
and does not reserve an identifier. Before public launch or commercial
investment, CoJack Labs should perform authenticated reservation checks, search
confusingly similar spellings and relevant common-law uses, choose the intended
goods and services classes, and obtain qualified trademark advice.

## Preliminary Verification

Checks captured on 2026-09-13:

| Surface                    | Observation                                                                       | Interpretation                                                 |
| -------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Exact-name web search      | No relevant Unisonry software, AI, developer-tool, or business result was found   | Promising, not exhaustive                                      |
| Unscoped npm               | `npm view unisonry` returned `E404`                                               | No public package resolved at review time                      |
| Scoped npm                 | `npm view @cojacklabs/unisonry` returned `E404`                                   | No public scoped package resolved at review time               |
| GitHub repository          | GitHub's public API returned `404` for `cojacklabs/unisonry`                      | No public repository resolved at review time                   |
| `.com` registry            | Verisign RDAP returned `404` for `unisonry.com`                                   | Domain was not found in registry data at review time           |
| `.sh` registry             | Google Registry RDAP returned `404` for `unisonry.sh`                             | Domain was not found in registry data at review time           |
| Exact trademark web search | No exact UNISONRY result was found                                                | Insufficient for legal clearance                               |
| International meaning      | No adverse exact-name meaning surfaced in the preliminary English-language search | Requires broader linguistic review before commercial expansion |

A `404` or search absence is not proof of ownership, registrability, or legal
safety. npm, GitHub, registrar, and relevant social identities must be confirmed
while authenticated immediately before reservation. A qualified professional
should review relevant marks before commercial adoption.

## Candidate Screening

| Candidate     | Disposition | Reason                                                                                                                                                                                                               |
| ------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forger        | Reject      | Active adjacent AI products; exact CLI and `.forger/` collision; occupied npm name; registered adjacent software mark                                                                                                |
| Orcher        | Reject      | Two active AI-agent products use the exact name; Dipp AI describes Orcher as a provider-neutral agentic control plane between human authority and executing models, creating a direct category and message collision |
| Coordinal     | Reject      | Active AI automation company and AI-safety research organization                                                                                                                                                     |
| Ordinara      | Reject      | Active AI systems and engineering-delivery business                                                                                                                                                                  |
| Cohestra      | Reject      | Active data-orchestration and enterprise AI-control-plane products                                                                                                                                                   |
| Sequora       | Reject      | Active infrastructure, blockchain, and healthcare coordination products                                                                                                                                              |
| Methodry      | Reject      | Active operational-AI business and established innovation-framework consultancy                                                                                                                                      |
| Taskrail      | Reject      | Existing deterministic, repository-native execution framework for humans and AI agents with strongly overlapping behavior                                                                                            |
| Workcanon     | Reject      | Active work-management platform and exact domain                                                                                                                                                                     |
| Priorium      | Reject      | Active business-systems identity                                                                                                                                                                                     |
| Structa       | Reject      | Existing TypeScript API framework with the exact `structa` CLI, an established data-analysis CLI, and several AI software products                                                                                   |
| Concorda      | Reject      | Multiple active AI, legal, compliance, contract-management, and engineering products, including a sourced shared-context platform with closely adjacent positioning                                                  |
| Unisara       | Reject      | Exact active foundation and `.com` identity, additional company records, and an existing software-professional handle reduce global distinctiveness                                                                  |
| Unisonara     | Hold        | Preliminary identity checks were clear, but the name overemphasizes human-AI unity rather than the framework's structure, priority, and governance role                                                              |
| Scopewright   | Reject      | Active AI proposal product and agentic-development review framework                                                                                                                                                  |
| Intentwright  | Reject      | Active B2B revenue-engineering and AI-assisted product identity                                                                                                                                                      |
| Contextwright | Reject      | Active AI and data-automation identity                                                                                                                                                                               |
| Accordwright  | Reject      | Existing application identity; weaker semantic fit                                                                                                                                                                   |
| Veriduct      | Reject      | Active security-testing framework and domain                                                                                                                                                                         |
| Intentrail    | Reject      | Active agent-authorization specification, packages, and SDKs                                                                                                                                                         |
| Workbraid     | Reject      | Active agentic software-architecture tool                                                                                                                                                                            |
| Alignary      | Reject      | Existing software-development/risk-management company                                                                                                                                                                |
| Clarifold     | Reject      | Existing software product with expressly reserved brand identity                                                                                                                                                     |
| Concordry     | Hold        | Preliminary collision screen was relatively clear, but pronunciation and spelling are weaker than Unisonry                                                                                                           |
| Unisonry      | Hold        | Preliminary identity checks were clear, but the name overemphasizes human-AI unity rather than the framework's structure, priority, and governance role                                                              |
| Priozar       | Advance     | Maintainer-selected, distinctive priority/governance identity; no adjacent software or AI collision found in preliminary public searches; reservation and legal clearance remain pending                             |

## Human Review Questions

Before approval, the maintainer should confirm that:

- the name sounds like a framework external agents use, not an AI agent;
- the executable is comfortable to pronounce, type, and dictate;
- the hidden state-directory name is acceptably explicit;
- the name is distinct enough from the separate future CoJack Labs AI; and
- the migration cost is justified compared with retaining AutoForge under a
  clarified brand.

## Approval Boundary

The maintainer approved Priozar. Record the superseding architecture decision
and create an identity-reservation gate before implementation. The compatibility
architecture remains the one documented in
[Forger Brand and Compatibility Migration](FORGER_BRAND_AND_COMPATIBILITY_MIGRATION.md),
with every rejected Forger identifier replaced by the selected Priozar bundle.
