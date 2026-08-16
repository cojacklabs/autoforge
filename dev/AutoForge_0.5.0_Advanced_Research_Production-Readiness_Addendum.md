# AutoForge 0.5.0 Advanced Research and Production-Readiness Addendum

**Prepared by:** Manus AI  
**Date:** August 16, 2026  
**Purpose:** Extend the AutoForge 0.5.0 strategy so the framework can discover important requirements that developers or standard users may not recognize during ordinary application planning.

## Strategic addition

AutoForge should add an **Advanced Research and Readiness Layer** to its orchestration framework. This layer should not merely answer questions that a developer asks. It should proactively investigate the questions that are usually missing from the original request:

> What data will this application collect, infer, store, transmit, or expose? Who could be harmed if it is wrong or misused? Which security, privacy, accessibility, operational, sector-specific, and jurisdictional expectations apply? What evidence is required before public release?

This is a major distinction between a basic coding assistant and a self-sufficient agentic development system. A coding assistant responds to an explicit task. **AutoForge should also perform structured risk discovery, identify hidden obligations, convert them into prioritized work, and prevent the project from silently proceeding with dangerous omissions.**

The layer should be treated as a **research and decision-support capability**, not as an automated legal-compliance authority. AutoForge can identify potentially applicable frameworks, map requirements, generate technical controls, collect evidence, and escalate uncertainty. It must not claim that an application is legally compliant, certify an organization, or replace qualified legal, privacy, security, accessibility, or domain review.

## Why this belongs in AutoForge 0.5.0

The existing 0.5.0 plan focuses on telemetry, failure analysis, suggestions, and metrics. [1] Those capabilities explain how the system performs, but they do not yet ensure that it is asking the right questions about the application being built. A system can achieve excellent test-pass rates while still missing a data-retention requirement, an accessibility barrier, an abuse case, an incident-response capability, or a public-sector security obligation.

Advanced research should therefore be added as an upstream source of **risk-aware context** for the existing telemetry and learning pipeline. Every research finding should be represented as a structured artifact, linked to the relevant work item and project decision. Later, AutoForge can learn which research questions most often uncover defects or rework and improve its discovery recipes.

| Without advanced research                                         | With the Advanced Research and Readiness Layer                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| The user describes features and the system begins implementation. | The system first identifies the application’s domain, users, data, jurisdictions, threat surface, and release exposure. |
| Security is treated as a late scan.                               | Security and abuse cases influence product requirements, architecture, APIs, identity, logging, and deployment design.  |
| Privacy is a policy document written near launch.                 | Data flows, purposes, retention, access, sharing, and deletion behavior are identified during planning.                 |
| Accessibility is a UI test after implementation.                  | Accessibility requirements become part of design, component contracts, automated checks, and human review.              |
| “Compliance” is a vague checklist.                                | The system produces an applicability map, evidence matrix, unresolved questions, and named human reviewers.             |
| Research is repeated manually by each developer.                  | Research recipes and source mappings become reusable organizational assets with versioned evidence.                     |

## Research domains AutoForge should cover

AutoForge should not attempt to memorize every law, standard, or industry practice. It should maintain a **versioned research registry** that identifies authoritative sources, applicability conditions, machine-readable controls where available, and review requirements.

| Research domain                   | Questions AutoForge should proactively ask                                                                                                                 | Typical output                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Product and user risk             | Who uses the system? Who is excluded? What happens if a user misunderstands, cannot access, or is harmed by an outcome?                                    | User-impact and harm analysis.                                    |
| Data governance                   | What personal, sensitive, financial, health, location, biometric, behavioral, or confidential data is collected or inferred? Why is each field needed?     | Data inventory, classification, lineage, and lifecycle map.       |
| Privacy                           | What is the purpose of processing? What notice, choice, access, deletion, retention, transfer, and processor controls may apply?                           | Privacy applicability memo and control backlog.                   |
| Security                          | What are the assets, trust boundaries, abuse cases, identities, secrets, dependencies, and likely attack paths?                                            | Threat model, security requirements, and verification plan.       |
| Accessibility and inclusion       | Can users with visual, auditory, motor, cognitive, language, or other access needs complete the key journeys?                                              | Accessibility requirements and automated/human evaluation plan.   |
| Compliance and sector obligations | Which jurisdictions, markets, customers, contracts, and sectors are in scope? Which requirements are legally binding, contractual, voluntary, or advisory? | Applicability matrix with confidence and reviewer assignment.     |
| AI and automation risk            | Does the application use models for ranking, recommendation, generation, moderation, identity, eligibility, safety, or decisions affecting people?         | AI risk profile, evaluation plan, human-oversight requirements.   |
| Reliability and operations        | What availability, latency, recovery, monitoring, incident response, backup, and rollback expectations exist?                                              | SLO/SLI plan, runbook, recovery and release-readiness evidence.   |
| Supply chain and licensing        | What dependencies, model providers, datasets, SDKs, fonts, media, and open-source licenses are introduced?                                                 | Dependency, provenance, license, and provider-risk report.        |
| Financial and domain integrity    | Are transactions, pricing, calculations, records, or other high-consequence outputs involved?                                                              | Domain control checklist and independent validation requirements. |

## Standards and source strategy

The research agent should use a **source hierarchy**. It should prefer legislation, regulators, government guidance, recognized standards bodies, and official project specifications. Secondary articles can help explain a source but should not be the sole basis for a release-blocking finding.

NIST describes its AI Risk Management Framework as a voluntary framework for incorporating trustworthiness considerations into the design, development, use, and evaluation of AI systems. Its core concepts—**Govern, Map, Measure, and Manage**—are a useful structure for AutoForge’s own AI-risk research workflow. [2]

OWASP’s Application Security Verification Standard provides a basis for testing web-application technical security controls and gives developers requirements for secure development. Its version-qualified requirement identifiers are especially useful for evidence records and reproducible gates. [3]

W3C WCAG 2.2 defines testable success criteria and conformance levels, while also recognizing that accessibility evaluation should combine automated testing with human evaluation. AutoForge should therefore generate automated accessibility checks but should not treat a clean automated scan as a complete accessibility conclusion. [4]

NIST describes its Privacy Framework as a voluntary tool for identifying and managing privacy risk while protecting individuals. AutoForge can use it to structure data inventory and privacy-risk research, while leaving applicability and legal decisions to authorized human reviewers. [5]

The European Commission explains that EU data-protection law includes the GDPR and that data protection is a fundamental right under EU law. It also explicitly notes that its web guidance is explanatory and that the GDPR text has legal force. AutoForge should mirror this distinction: it can provide research guidance and evidence mapping, but it must not present a generated report as legal certification. [6]

CISA’s Secure by Design guidance frames security as a core product requirement and encourages addressing exploitable flaws during design before widespread release. This supports making security research an intake and architecture activity rather than a final-stage scan. [7]

## The advanced research workflow

Advanced research should be executed at several points in the application lifecycle. It should be **progressive**: the first scan identifies likely risk areas; deeper research is triggered when the project’s domain, data, architecture, or release plan warrants it.

```text
User goal / idea
      ↓
1. Discovery scan: domain, users, data, jurisdictions, public exposure
      ↓
2. Risk profile: impact, uncertainty, threat surface, applicable standards
      ↓
3. Targeted research: privacy, security, accessibility, AI, sector, operations
      ↓
4. Requirements and control mapping
      ↓
5. Architecture and design review
      ↓
6. Evidence collection during implementation
      ↓
7. Pre-release readiness review and human sign-off
      ↓
8. Post-release monitoring, incident learning, and source refresh
```

### Stage 1: Discovery scan

At intake, AutoForge should extract or infer a preliminary **Application Risk Profile**. It should identify the product type, user groups, public or private availability, geographic markets, data categories, integrations, authentication model, payment or financial functions, AI usage, and operational criticality. Where confidence is low, AutoForge should ask a small number of high-value questions rather than generate a long questionnaire.

The result should include both known facts and assumptions. An assumption such as “the application does not process sensitive personal data” must remain visible and should trigger a confirmation before the system treats related controls as out of scope.

### Stage 2: Risk triage

Research depth should be selected using an explicit score rather than intuition alone. A practical model is:

```text
priority = impact × likelihood × exposure × uncertainty × irreversibility
```

The factors need not be mathematically perfect. Their value is to make prioritization explainable. A public application that handles financial or health-related data, has automated decisions, or cannot easily undo an incorrect action should receive deeper research and stronger human gates than a private internal documentation tool.

| Tier                     | Example                                                                                                                  | Required behavior                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| R0: Low exposure         | Local prototype with synthetic data and no external users                                                                | Lightweight research scan; no public-release claim.                                                                  |
| R1: Standard application | Public web application with ordinary account data                                                                        | Security, privacy, accessibility, dependency, and operational research.                                              |
| R2: Elevated risk        | Payments, location, behavioral profiling, minors, sensitive data, or automated recommendations                           | Expanded threat model, data assessment, human domain review, release evidence.                                       |
| R3: High consequence     | Health, employment, credit, public services, safety-critical, regulated financial, or materially consequential decisions | Mandatory qualified review, formal evidence package, explicit risk acceptance, and no autonomous production release. |

These tiers are not legal classifications. They are **engineering orchestration tiers** used to determine how much research, evidence, and human review are needed.

### Stage 3: Research and evidence collection

Each research task should produce a structured finding with a source, version or publication date, claim, applicability rationale, confidence, affected artifact, recommended action, risk if unresolved, and required reviewer. AutoForge should distinguish:

| Finding type     | Meaning                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `fact`           | A verified property of the repository, configuration, or cited source. |
| `assumption`     | A project statement that still requires confirmation.                  |
| `risk`           | A plausible negative outcome requiring mitigation or acceptance.       |
| `requirement`    | A testable product, technical, operational, or governance obligation.  |
| `control`        | A design or process measure intended to reduce a risk.                 |
| `evidence`       | A test result, configuration, document, approval, or other proof.      |
| `legal_question` | A question that requires qualified legal or privacy counsel.           |
| `research_gap`   | An unresolved question preventing confident planning or release.       |

### Stage 4: Conversion into development work

The research layer should not stop at a report. It should convert material findings into linked work items with owners, due points, dependencies, and release impact. Examples include adding data deletion behavior, implementing consent or notice flows where applicable, creating an access-control test matrix, adding keyboard navigation tests, documenting incident response, pinning a dependency, adding audit logs, or obtaining a domain review.

Every generated work item should include the evidence needed to close it. A security task should not be marked complete because an agent wrote “secure.” It should link to a test, scan, configuration, review, or documented exception.

## Required readiness artifacts

The Advanced Research and Readiness Layer should add the following artifacts to the context manifest and work-item model.

| Artifact                      | Purpose                                                                                                 | Release significance                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `APPLICATION_RISK_PROFILE.md` | Records users, exposure, domain, impact, assumptions, and risk tier                                     | Determines research depth and autonomy eligibility.          |
| `DATA_INVENTORY.yaml`         | Lists data elements, classifications, sources, purposes, destinations, retention, and deletion behavior | Makes data use explicit and reviewable.                      |
| `DATA_FLOW_MAP.mmd`           | Shows movement between clients, services, databases, vendors, and analytics systems                     | Reveals transfer, access, and trust-boundary risks.          |
| `RESEARCH_REGISTER.yaml`      | Tracks questions, claims, sources, versions, confidence, and applicability                              | Makes advanced research auditable and refreshable.           |
| `CONTROL_MATRIX.yaml`         | Maps risks and external requirements to application controls and evidence                               | Connects research to implementation and gates.               |
| `THREAT_MODEL.md`             | Records assets, actors, trust boundaries, abuse cases, mitigations, and residual risk                   | Moves security into design.                                  |
| `ACCESSIBILITY_PLAN.md`       | Maps key journeys to WCAG targets, automated tests, manual checks, and findings                         | Prevents accessibility from becoming a late checklist.       |
| `AI_RISK_PROFILE.md`          | Covers model purpose, users, data, failure modes, human oversight, evaluation, and monitoring           | Required when the application uses AI in consequential ways. |
| `PUBLIC_RELEASE_READINESS.md` | Summarizes unresolved risks, evidence, approvals, exceptions, and rollback readiness                    | Provides the release decision packet.                        |

## Human review boundaries

Advanced research is intended to discover and prioritize issues, not to remove human accountability. AutoForge must stop and escalate when it encounters legal interpretation, high-consequence decisions, unresolved sensitive-data use, security exceptions, production changes with irreversible impact, or conflicting authoritative sources.

| AutoForge may do autonomously                                                   | AutoForge must escalate or require approval                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Identify likely applicable sources and explain why they may apply               | Decide that a law definitively applies or does not apply to a specific organization.   |
| Inventory observed data fields, flows, endpoints, permissions, and dependencies | Approve collection or processing of sensitive personal data.                           |
| Generate threat models, test cases, control mappings, and evidence requests     | Accept an unresolved critical security, privacy, safety, or compliance risk.           |
| Run non-mutating scans and compare implementation evidence to requirements      | Waive a release-blocking gate or approve a security exception.                         |
| Create prioritized work items and recommend an owner                            | Make a final legal, regulatory, contractual, or domain-risk determination.             |
| Detect stale sources or changed assumptions and reopen research                 | Declare that an application is compliant or production-safe without authorized review. |

This boundary should be encoded in the policy engine and recorded in telemetry. A human approval should identify exactly what was reviewed, the scope of the approval, its expiration, and any conditions.

## 0.5.0 additions and revised sequencing

The advanced research layer can be added without losing the original 0.5.0 focus. It should be delivered in controlled increments.

| Release increment                  | Additions                                                                                                                                  | Completion evidence                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **0.5.0a: Research contracts**     | Schemas for risk profile, research finding, source, control, evidence, and readiness decision                                              | Schemas validate; sample project produces all artifacts.                                        |
| **0.5.0b: Discovery scan**         | Repository/configuration scan, goal normalization, data-surface inventory, public-exposure detection, dependency and integration inventory | Scan identifies known facts, assumptions, and research gaps without modifying application code. |
| **0.5.0c: Source-backed research** | Source registry, official-source preference, citation/version capture, source freshness checks, confidence and applicability fields        | Every high-priority finding has a traceable source and reviewer assignment.                     |
| **0.5.0d: Control mapping**        | Convert findings into requirements, controls, evidence requests, and linked work items                                                     | A reviewer can trace source → finding → control → implementation → gate evidence.               |
| **0.5.0e: Readiness gates**        | Security, privacy/data, accessibility, operations, dependency, and public-release readiness checks                                         | A risk-tiered readiness report blocks or escalates unresolved material issues.                  |
| **0.5.0f: Learning integration**   | Telemetry records research questions, findings, escalations, missed risks, reviewer overrides, and post-release outcomes                   | The learning engine can identify which research patterns prevent rework or incidents.           |

## Suggested CLI surface

```text
autoforge research scan
  Run the initial application and repository risk scan.

autoforge research plan
  Select research domains, source sets, depth, and required reviewers.

autoforge research run --profile <id>
  Perform approved research and emit cited findings.

autoforge research status
  Show open research gaps, stale sources, unresolved assumptions, and high-risk findings.

autoforge controls map
  Convert findings into controls, work items, and evidence requests.

autoforge readiness report
  Generate the current public-release readiness packet.

autoforge readiness check
  Execute deterministic technical gates and list human-review requirements.

autoforge research refresh
  Re-check sources, standards versions, dependencies, and assumptions.
```

The CLI should clearly label outputs as **research guidance**, **technical evidence**, **open questions**, or **human decision required**. This prevents a generated report from being mistaken for a legal certificate or an unconditional release authorization.

## Advanced research telemetry

The original 0.5.0 telemetry should be extended to observe the research process itself. Important events include `research_started`, `source_consulted`, `finding_created`, `finding_rejected`, `assumption_confirmed`, `control_mapped`, `research_escalated`, `evidence_attached`, `source_expired`, and `readiness_decided`.

These events allow AutoForge to learn questions such as:

- Which discovery questions most often reveal missing requirements?
- Which application types repeatedly omit data retention, access control, or accessibility work?
- Which sources or standards produce actionable controls rather than generic advice?
- Which findings are frequently overridden by reviewers, and why?
- Which readiness gaps correlate with post-release incidents, defects, or rework?
- How often does the system produce false-positive compliance concerns?

The system should measure both **risk discovery** and **research quality**. A framework that raises every possible concern is not useful; it must prioritize accurately, explain its reasoning, and learn when a concern is not applicable.

## Definition of done for this expansion

The Advanced Research and Readiness Layer should be considered successful when:

1. A developer can provide a plain-language application goal and receive an initial risk profile, research plan, list of assumptions, and high-priority unknowns.
2. The system inventories observed data, integrations, dependencies, public exposure, authentication, and other material risk surfaces without claiming that its inventory is complete.
3. Every major finding is linked to an authoritative or clearly labeled explanatory source, a version/date, applicability reasoning, confidence, and a required reviewer.
4. Research findings can become prioritized development tasks with owners, acceptance criteria, and evidence requirements.
5. Technical readiness gates can be executed automatically, while legal, privacy, security-exception, accessibility-human-review, and high-consequence decisions remain explicitly gated.
6. A public-release readiness packet shows completed controls, missing evidence, unresolved risks, stale assumptions, human approvals, and rollback readiness.
7. Telemetry captures what AutoForge researched, what it missed, which findings were accepted or rejected, and what happened after release.
8. The system can refresh its source registry and reopen affected research when an important standard, dependency, architecture decision, or data flow changes.
9. The framework never represents a generated research result as legal advice, formal certification, or guaranteed compliance.
10. The entire process remains local-first, redacted, auditable, and configurable for the developer’s project and jurisdiction.

## Final recommendation

Add advanced research as a **first-class orchestrator capability**, not as an optional documentation prompt. It should run before detailed architecture and re-run at major change and release points. It should use authoritative sources, create structured evidence, discover assumptions, prioritize hidden risks, and produce the work required to address them.

The expanded AutoForge vision becomes:

> **A self-sufficient, evidence-driven application development system that not only builds what developers ask for, but also investigates what they may not know to ask, turns hidden risks into prioritized work, and requires the right human decisions before public release.**

The sequence remains disciplined:

> **Discover broadly. Verify against authoritative sources. Prioritize by risk. Convert findings into work. Collect evidence. Escalate material uncertainty. Release only with explicit readiness decisions.**

## References

[1]: file:///home/ubuntu/upload/AutoForge_0.5.0_Plan.md "AutoForge 0.5.0 Development Plan, supplied by the user"
[2]: https://www.nist.gov/itl/ai-risk-management-framework "NIST AI Risk Management Framework"
[3]: https://owasp.org/www-project-application-security-verification-standard/ "OWASP Application Security Verification Standard"
[4]: https://www.w3.org/TR/WCAG22/ "W3C Web Content Accessibility Guidelines 2.2"
[5]: https://www.nist.gov/privacy-framework "NIST Privacy Framework"
[6]: https://commission.europa.eu/law/law-topic/data-protection_en "European Commission: Data protection"
[7]: https://www.cisa.gov/securebydesign "CISA: Secure by Design"
