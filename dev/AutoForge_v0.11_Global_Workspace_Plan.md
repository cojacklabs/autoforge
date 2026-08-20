# AutoForge v0.11 — Global Workspace & Operating-System Integration

## Mission

Allow AutoForge to operate as a **global development framework** across a user's operating system while preserving strict per-project isolation.

AutoForge v0.11 should let a user install AutoForge once and then use it with any supported project on the machine without manually reinstalling or rebuilding the framework inside every repository.

AutoForge remains **not an AI agent**.

It becomes a globally available project contract, workspace manager, and context-control layer that can attach itself to individual projects when needed.

---

# Primary Question

> How can AutoForge be available everywhere on a developer's machine while keeping project state, permissions, context, and decisions isolated per repository?

---

# 1. Global vs Project Scope

AutoForge should distinguish two scopes.

## Global Scope

Stored at the user level.

Example:

```text
~/.autoforge/
```

Possible contents:

```text
~/.autoforge/
├── config.json
├── registry.json
├── adapters/
├── templates/
├── doctrines/
├── cache/
└── logs/
```

Global scope may contain:

- user preferences;
- installed adapter metadata;
- shared templates;
- default doctrines;
- project registry;
- CLI configuration;
- compatibility information;
- reusable schemas;
- cached non-project-specific assets.

Global scope must **not** automatically contain private project source code or project-specific context.

---

## Project Scope

Stored inside the repository.

Example:

```text
project/
└── .autoforge/
```

Project scope contains:

- project state;
- active work;
- decisions;
- research;
- specifications;
- design context;
- context packets;
- project-specific doctrines;
- adapter settings;
- permissions;
- project memory.

Project state must remain isolated from other projects.

---

# 2. Installation Model

Users should be able to install AutoForge globally.

Potential installation methods:

```bash
npm install -g @cojacklabs/autoforge
```

or:

```bash
pnpm add -g @cojacklabs/autoforge
```

Future platform packaging may include:

```text
Homebrew
Scoop
Chocolatey
Linux package managers
Standalone binaries
```

The npm package remains the canonical initial distribution mechanism unless another distribution method is explicitly adopted.

---

# 3. Global CLI

After global installation:

```bash
autoforge
```

should work from any directory.

Possible commands:

```bash
autoforge init
autoforge status
autoforge projects
autoforge attach
autoforge detach
autoforge doctor
autoforge config
autoforge recap
autoforge context
```

Optional future alias:

```bash
af
```

The alias should only be added if naming conflicts and packaging implications are understood.

---

# 4. Project Detection

AutoForge should determine project context from the current working directory.

Resolution order:

```text
Current directory
   ↓
Look for .autoforge/
   ↓
If not found, walk upward toward filesystem root
   ↓
Find nearest project root
   ↓
Load that project's AutoForge contract
```

Potential project-root indicators:

```text
.git/
package.json
pyproject.toml
Cargo.toml
go.mod
pom.xml
*.sln
.autoforge/
```

AutoForge should not assume every project is Node.js.

---

# 5. Project Registry

Maintain a lightweight registry:

```text
~/.autoforge/registry.json
```

Example:

```json
{
  "projects": [
    {
      "id": "project.virdua",
      "name": "Virdua",
      "path": "/Users/example/code/virdua",
      "lastSeen": "2026-08-20T15:00:00Z",
      "contractVersion": "1"
    }
  ]
}
```

The registry should store metadata only.

Do not duplicate full project context globally.

---

# 6. Project Attachment

AutoForge should support attaching to an existing repository.

Example:

```bash
cd my-project
autoforge init
```

or:

```bash
autoforge attach .
```

Expected flow:

```text
Detect repository
   ↓
Inspect project type
   ↓
Create .autoforge/
   ↓
Create project manifest
   ↓
Register project globally
   ↓
Detect available AI adapters
   ↓
Install or generate project-specific instructions
   ↓
Run doctor
```

Do not modify unrelated application files unless required and explicitly defined.

---

# 7. New Project Bootstrapping

AutoForge may also help initialize brand-new projects.

Example:

```bash
autoforge new
```

or:

```bash
autoforge init
```

inside an empty directory.

Possible workflow:

```text
User Intent
   ↓
Project Discovery
   ↓
AutoForge specification generation
   ↓
Architecture / Design / Planning
   ↓
Host AI agent implementation
```

AutoForge itself does not generate the application independently.

The host AI agent performs reasoning and implementation under the AutoForge contract.

---

# 8. Multi-Project Awareness

The user should be able to inspect known projects.

Example:

```bash
autoforge projects
```

Possible output:

```text
Virdua
~/Projects/virdua
Active: TASK-42 Candidate Dashboard

AutoForge
~/Projects/autoforge
Active: none

Analytics App
~/Work/analytics
Active: ISSUE-17
```

AutoForge must never mix project contexts.

---

# 9. Explicit Project Switching

Potential commands:

```bash
autoforge use virdua
```

or:

```bash
autoforge --project ~/Projects/virdua recap
```

However, current-directory resolution should remain the normal behavior.

Explicit targeting is useful for:

- scripts;
- automation;
- CI;
- editor integrations;
- external orchestration.

---

# 10. Global User Preferences

Global configuration may define defaults.

Example:

```json
{
  "defaultContextBudget": 12000,
  "defaultPlanningDepth": "medium",
  "preferredAdapters": ["codex", "claude"],
  "telemetry": false
}
```

Project configuration may override these defaults.

Resolution:

```text
Built-in defaults
   ↓
Global user configuration
   ↓
Project configuration
   ↓
Task-specific configuration
```

The most specific scope wins.

---

# 11. Global Doctrines and Templates

AutoForge may ship reusable global doctrines and templates.

Example:

```text
~/.autoforge/templates/
~/.autoforge/doctrines/
```

Projects may:

- inherit;
- extend;
- override;
- disable where appropriate.

Project-specific doctrine must take precedence over a global default.

Do not silently overwrite project-owned doctrine during package upgrades.

---

# 12. Agent Adapter Discovery

Global AutoForge should detect compatible tools installed on the system.

Potential examples:

```text
Codex
Claude Code
Cursor
Gemini CLI
other supported clients
```

Detection should be capability-based.

Example:

```json
{
  "id": "codex",
  "detected": true,
  "capabilities": ["repository_instruction", "context_packet"]
}
```

Do not claim functionality that cannot be technically enforced.

---

# 13. Universal Project Contract

Every attached repository should expose a predictable entry point.

Example:

```text
.autoforge/AGENT.md
```

This file should tell the current host AI:

- AutoForge is installed;
- AutoForge is not another AI;
- determine current work before action;
- resolve context before implementation;
- follow applicable doctrines;
- respect project scope;
- validate;
- persist important decisions.

This contract should work whether AutoForge itself was installed locally or globally.

---

# 14. Security Model

Global operation introduces significant security responsibilities.

AutoForge v0.11 must follow:

> Global availability does not imply global permission.

AutoForge should **not** automatically:

- scan the entire home directory;
- read arbitrary repositories;
- modify unknown projects;
- share context between repositories;
- upload source code;
- execute privileged commands;
- traverse sensitive directories.

Project registration should occur through explicit use or well-defined discovery rules.

---

# 15. Project Isolation

Each project must have an isolation boundary.

Example identity:

```text
project_id
canonical_path
repository_root
contract_version
```

Context resolver operations must be scoped to a single project root.

Reject:

```text
../other-project
```

or symlink/path traversal when it escapes configured boundaries unless explicitly allowed.

---

# 16. Filesystem Permission Policy

AutoForge should distinguish:

```text
READ_ALLOWED
WRITE_ALLOWED
EXECUTE_ALLOWED
DENIED
REQUIRES_APPROVAL
```

Permissions should be configurable per project and potentially per workflow.

A globally installed CLI must never treat system-wide installation as authorization to write everywhere.

---

# 17. Cross-Project Knowledge

Default:

```text
DISABLED
```

AutoForge must not automatically share decisions, specs, research, or source context between projects.

Future shared knowledge should require explicit user action.

Examples:

```text
shared doctrine
shared template
shared component specification package
```

This is fundamentally different from silently combining project memory.

---

# 18. Repository-Agnostic Support

AutoForge v0.11 should begin reducing Node-only assumptions.

Potential project types:

```text
Node.js / TypeScript
Python
Rust
Go
Java
.NET
Mobile
Monorepos
Documentation repositories
Design-system repositories
Infrastructure repositories
```

AutoForge's contract and knowledge model should remain mostly language-independent.

Language-specific behaviors belong in adapters, templates, or project profiles.

---

# 19. Project Profiles

AutoForge may infer or configure project capabilities.

Example:

```yaml
project:
  type: web-application

languages:
  - typescript

frameworks:
  - nextjs

capabilities:
  frontend: true
  backend: true
  database: true
  design: true
```

Profiles help context resolution and workflow selection without redefining the core contract.

---

# 20. Monorepo Support

v0.11 should account for repositories containing multiple apps/packages.

Example:

```text
company-platform/
├── apps/
│   ├── web/
│   ├── admin/
│   └── mobile/
├── packages/
│   ├── ui/
│   └── api/
└── .autoforge/
```

AutoForge should support scopes such as:

```text
workspace
app
package
feature
task
```

A task targeting `apps/web` should not automatically load every package in the monorepo.

---

# 21. Operating System Support

Target:

```text
macOS
Linux
Windows
```

Path handling must be platform-safe.

Avoid assumptions around:

- path separators;
- shell availability;
- `$HOME`;
- executable locations;
- symlink behavior;
- permissions.

Use platform-aware Node.js APIs.

---

# 22. Global Doctor

Extend:

```bash
autoforge doctor
```

to check:

```text
AutoForge CLI
Global config
Global registry
Project detection
Project contract
Project schema
Detected AI adapters
Filesystem permissions
Path safety
Version compatibility
```

Example:

```text
AutoForge 0.11.0

Global Installation
✓ Configuration
✓ Registry

Current Project
✓ /Users/colt/Projects/virdua
✓ Contract v1
✓ Specs valid

Agents
✓ Codex
✓ Claude Code
⚠ Generic adapter advisory-only
```

---

# 23. Upgrade Strategy

A global installation may be newer than a project's schema.

Therefore AutoForge must detect:

```text
CLI version
contract version
project schema version
```

Do not silently migrate project data if the migration is destructive.

Possible:

```bash
autoforge migrate --check
autoforge migrate
```

---

# 24. Global Context Command

Potential:

```bash
autoforge context
```

from a registered project.

It should still generate context only for the current project/task.

Global installation changes availability, **not context scope**.

---

# 25. v0.11 Suggested Epics

## Epic 11.1 — Global Home

Implement:

```text
~/.autoforge/
```

with:

- config;
- registry;
- path helpers;
- platform-safe initialization.

---

## Epic 11.2 — Project Discovery

Implement:

- current-directory discovery;
- upward project-root search;
- `.autoforge` detection;
- supported root markers.

---

## Epic 11.3 — Project Registry

Implement:

```text
register
list
remove
resolve
```

Registry metadata only.

---

## Epic 11.4 — Global CLI Behavior

Ensure commands operate correctly when AutoForge is installed globally.

Test outside the AutoForge repository.

---

## Epic 11.5 — Project Attach / Detach

Implement explicit attachment and registry lifecycle.

Detach must not delete project data by default.

---

## Epic 11.6 — Global + Project Configuration

Implement deterministic configuration inheritance.

---

## Epic 11.7 — Adapter Discovery

Detect installed agent clients and report capabilities.

---

## Epic 11.8 — Cross-Platform Filesystem Layer

Normalize:

- Windows paths;
- Unix paths;
- home directory resolution;
- repository roots;
- symlinks;
- permission failures.

---

## Epic 11.9 — Security Boundaries

Add tests for:

- project-root escape;
- path traversal;
- cross-project reads;
- accidental global scans;
- unapproved writes.

---

## Epic 11.10 — Monorepo Context Scope

Allow task-level context resolution inside subprojects/packages.

---

## Epic 11.11 — Global Doctor

Build a full environment + current-project health report.

---

# 26. Golden Tests

## Test A — Two Isolated Projects

```text
~/code/project-a
~/code/project-b
```

Given work in Project A:

Expected:

```text
Project A specs included
Project A decisions included
```

Must exclude:

```text
Project B specs
Project B decisions
```

---

## Test B — Global Installation

From:

```text
~/code/project-a
```

running:

```bash
autoforge recap
```

must find Project A without requiring local AutoForge package installation.

---

## Test C — Unregistered Directory

From:

```text
~/Downloads
```

AutoForge must not inspect unrelated files or infer a project aggressively.

It should report that no AutoForge project is active and provide a safe initialization option.

---

## Test D — Monorepo Slice

Task:

```text
Update JobCard in apps/web
```

Expected:

```text
apps/web
packages/ui where required
relevant specs
```

Excluded unless related:

```text
apps/mobile
apps/admin
unrelated backend packages
```

---

# 27. Success Criteria

AutoForge v0.11 is successful when:

- AutoForge can be installed once for the user;
- `autoforge` can run from any supported project directory;
- projects are discovered reliably;
- projects remain isolated;
- global configuration and project configuration compose predictably;
- multiple agent adapters can be discovered;
- users can list registered projects;
- global installation never implies unrestricted filesystem access;
- monorepos can resolve task-specific context;
- macOS, Linux, and Windows path handling are tested;
- AutoForge remains useful without becoming a background AI agent or mandatory cloud service.

---

# Canonical v0.11 Statement

> AutoForge v0.11 makes the framework globally available to the user while keeping knowledge, permissions, context, and execution strictly scoped to the active project.

The machine may know about many AutoForge projects.

The agent should only receive the project slice relevant to the work currently being performed.
