// Human-oriented output belongs to the deterministic Core CLI application.
export const PRIOZAR_HELP = `Priozar — AI development context and control plane

Usage:
  priozar [command]

Commands:
  add        Create a feature, phase, task, or issue
  artifact   Register, inspect, approve, or supersede shared project artifacts
  changelog  Compile documented bugfix and feature-note decisions into CHANGELOG.md
  check      Evaluate work, session, context, and edit guardrails
  constitution Manage project constitution rules and governance checks
  context    Generate the active work build packet
  credentials Manage local Agent provider credentials
  decide     Record or supersede an architectural decision
  design     Validate, import, list, or show design specifications
  doctrine   List doctrines or show doctrine guidance
  doctor     Check Priozar installation health
  domain     Manage domain concepts and domain checks
  done       Complete active work and close its session
  evidence   Inspect persisted validation evidence and readiness
  gate       Run retained quality and security checks
  help       Show this command reference
  init       Initialize Priozar in the current project
  intent     Assess intent and generate planning artifacts
  learning   Record hypotheses, experiments, and product evidence
  strategy   Record explainable strategy assessments and their decision label
  research   Register research artifacts
  knowledge  List and show intent and research artifacts
  planning   Inspect generated planning artifacts and freshness
  workflow   Start, inspect, and advance workflow runs
  orchestrate Coordinate concurrent agent assignments and scoped leases
  pause      Pause active work and close its session
  schemas    List and inspect JSON input schemas
  contract   Generate and validate the agent execution contract
  projects   List and register globally known projects
  attach     Initialize and register a project
  detach     Remove a project from the global registry
  use        Run a command against a registered project name
  agents     List supported agent adapters and capabilities
  assets     List global templates and doctrines
  bootstrap  Inspect project readiness for structured initialization
  migrate    Back up and migrate a legacy Priozar installation
  update     Check, preview, or apply a global Priozar update
  recap      Summarize current work and session state
  resume     Resume paused work and open a new session
  start      Start a task or issue and open a session
  status     Show concise project status and relevant next commands
  trace      Record and inspect traceability links and impact
  tui        Deprecated compatibility alias for status
  twin       Generate and query the project digital twin
  version    Show the installed Priozar version
  why        Search decision rationale

Add work:
  priozar add feature --name <name> --description <text>
  priozar add phase --feature <feature-id> --name <name> --description <text>
  priozar add task --phase <phase-id> --name <name> --description <text> --include <pattern> [--include <pattern>] [--exclude <pattern>]
  priozar add issue --name <name> --description <text> --include <pattern> [--include <pattern>] [--exclude <pattern>]

Shared artifacts:
  priozar artifact register <json-file>
  priozar artifact import <file> --id <artifact-id> --kind <kind> --title <title> --agent <agent-id> --work <work-id>
  priozar artifact list
  priozar artifact show <artifact-id>
  priozar artifact approve <artifact-id> --by <actor>
  priozar artifact supersede <artifact-id> <json-file>

Decision memory:
  priozar decide --statement <text> --reasoning <text> --consequence <text> --scope <tag> --keyword <tag> [--consequence <text>] [--scope <tag>] [--keyword <tag>] [--work <work-id>] [--supersedes <decision-id>] [--kind <architecture|bugfix|feature-note>] [--evidence <evidence-id>]
  priozar why [--query <text>] [--work <work-id>] [--work <work-id>] [--history] [--limit <count>]

Learning and evidence:
  priozar learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <work-id>]
  priozar learning hypothesis list [--status <proposed|testing|confirmed|refuted>]
  priozar learning hypothesis show <id>
  priozar learning hypothesis status <id> --status <proposed|testing|confirmed|refuted>
  priozar learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text>
  priozar learning experiment list [--status <planned|running|completed|abandoned>]
  priozar learning experiment show <id>
  priozar learning experiment complete <id>
  priozar learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <work-id>]
  priozar learning evidence list [--kind <kind>]
  priozar learning evidence show <id>

Strategy and prioritization:
  priozar strategy assess <work-id> --alignment <low|medium|high|uncertain> --value <low|medium|high|uncertain> --risk <low|medium|high|uncertain> --cost <low|medium|high|uncertain> --evidence-strength <low|medium|high|uncertain> --dependency-pressure <low|medium|high|uncertain> --complexity <low|medium|high|uncertain> --release-constraint <low|medium|high|uncertain> --decision <now|next|later|backlog> --rationale <text> [--evidence <evidence-id>] [--supersedes <strategy-id>]
  priozar strategy list [--decision <now|next|later|backlog>] [--work <work-id>]
  priozar strategy show <id>
  priozar strategy history <work-id>

Doctrines:
  priozar doctrine
  priozar doctrine <name>

Work lifecycle:
  priozar status [--json] [--view <summary|work|next>]
  priozar start <task|issue> <id>
  priozar recap
  priozar done [--no-decision "<reason>"]
  priozar pause "<reason>"
  priozar resume <task|issue> <id>

Agent credentials:
  priozar credentials set openai
  priozar credentials status openai
  priozar credentials delete openai

Context packets:
  priozar context
  priozar context --explain

Deprecated TUI compatibility:
  priozar tui [--snapshot] [--view <view>] [--no-color]
  tui now renders status; interactive experiences move to Priozar Agent

Migration and brand transition:
  priozar migrate --dry-run [--json]
  priozar migrate [--json]
  priozar migrate brand --dry-run [--json]
  priozar migrate brand [--json]

Guardrails:
  priozar check [--path <file>] [--agent <id>]
  priozar check --refresh [--path <file>] [--agent <id>]
  priozar check --repair [--refresh]
  priozar check --install --agent <id>

Quality gates:
  priozar gate check [--path <file>] [--path <file>] [--json]
  priozar gate check --files <file,file> [--json]

Design context:
  priozar design validate <file>
  priozar design import <file>
  priozar design update <file>
  priozar design list [--type <screen|component|token|flow|state|responsive>]
  priozar design search <query>
  priozar design check [--json]
  priozar design show <id>

Intent assessment:
  priozar intent assess <json-file> --kind <implementation|research|architecture|design|planning|data|security> [--artifact <kind>]
  priozar intent assess --schema
  intent assess also returns deterministic workflow stages and rationale
  priozar intent register <json-file>
  priozar research register <json-file>
  priozar research register --schema
  priozar knowledge list [--type <intent|research>]
  priozar knowledge show <id>
  priozar knowledge extract <file>
  priozar knowledge context <id>
  priozar planning list [--source <intent.json>]
  priozar planning show <kind> [--source <intent.json>]
  priozar planning handoff <kind> --phase <phase-id> --include <pattern>
  priozar workflow start <id> <kind>
  priozar workflow list
  priozar workflow show <id>
  priozar workflow advance <id> [--skip-optional]
  priozar workflow handoff <json-file>
  priozar workflow handoff --schema
  priozar orchestrate plan [json-file]
  priozar orchestrate status
  priozar orchestrate ready
  priozar orchestrate claim <work-id> --agent <id> [--role <role>] [--read-only] [--ttl <minutes>]
  priozar orchestrate handoff <assignment-id> <json-file>
  priozar orchestrate release <assignment-id>
  priozar orchestrate approve <gate-id> [--by <actor>]
  priozar orchestrate prioritize <work-id> <0-100>
  priozar orchestrate explain <work-id>
  priozar schemas list
  priozar schemas show <id>
  priozar contract generate <agent-id>
  priozar contract show
  priozar contract validate
  priozar projects list [--json]
  priozar projects list --json
  priozar projects show <path|project_name> [--json]
  priozar projects relocate <path|project_name> <new-path> [--planned]
  priozar projects move <path|project_name> <new-path> [--planned]
  priozar projects storage <path> [--json]
  priozar projects global-storage <path> [--json]
  priozar projects global-export <path> [--json]
  priozar projects global-import <path> <bundle> [--json]
  priozar projects archive <path>
  priozar projects restore <path>
  priozar projects update <path> [--name <name>] [--alias <alias>] [--lifecycle <state>] [--retention-days <n>]
  priozar projects register <path>
  priozar projects prune [--dry-run]
  priozar attach <path> [--dry-run [--json]]
  priozar detach <path>
  priozar use <project-name> <command>
  priozar agents list
  priozar assets list templates|doctrines
  priozar bootstrap inspect|scaffold|status|gates|vision|vision-amend|vision-check <idea>|vision-approve <idea>|discovery-questions <json-file>|discover <json-file>|approve <artifact-id> [--evidence <path|workflow-id>]
  priozar bootstrap approve <artifact-id> [--evidence <path|workflow-id>]
  priozar constitution init|list|show <id>|check <objective>
  priozar domain init|list|show <id>|check
  priozar changelog compile [--since <git-tag>]
  priozar update
  priozar trace add <source> <relationship> <target>
  priozar trace list
  priozar trace check
  priozar trace impact <artifact> [--depth <n>] [--direction <forward|reverse|both>]
  priozar evidence list [--json]
  priozar evidence summary [--json]
  priozar twin generate [--json]
  priozar twin show [--json]
  priozar twin query [--type <type>] [--relationship <name>] [--depth <n>] [--limit <n>] [--json]

Options:
  -h, --help       Show this command reference
  --project <path> Resolve project-scoped commands from another repository
  -v, --version    Show the installed Priozar version
`;
