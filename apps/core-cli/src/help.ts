// Human-oriented output belongs to the deterministic Core CLI application.
export const AUTOFORGE_HELP = `AutoForge — AI development context and control plane

Usage:
  autoforge [command]

Commands:
  add        Create a feature, phase, task, or issue
  changelog  Compile documented bugfix and feature-note decisions into CHANGELOG.md
  check      Evaluate work, session, context, and edit guardrails
  context    Generate the active work build packet
  credentials Manage local Agent provider credentials
  decide     Record or supersede an architectural decision
  design     Validate, import, list, or show design specifications
  doctrine   List doctrines or show doctrine guidance
  doctor     Check AutoForge installation health
  done       Complete active work and close its session
  gate       Run retained quality and security checks
  help       Show this command reference
  init       Initialize AutoForge in the current project
  intent     Assess intent and generate planning artifacts
  learning   Record hypotheses, experiments, and product evidence
  strategy   Record explainable strategy assessments and their decision label
  research   Register research artifacts
  knowledge  List and show intent and research artifacts
  planning   Inspect generated planning artifacts and freshness
  workflow   Start, inspect, and advance workflow runs
  orchestrate Coordinate concurrent agent assignments and scoped leases
  schemas    List and inspect JSON input schemas
  contract   Generate and validate the agent execution contract
  projects   List and register globally known projects
  attach     Initialize and register a project
  detach     Remove a project from the global registry
  use        Run a command against a registered project name
  agents     List supported agent adapters and capabilities
  assets     List global templates and doctrines
  bootstrap  Inspect project readiness for structured initialization
  migrate    Back up and migrate a legacy AutoForge installation
  update     Check, preview, or apply a global AutoForge update
  recap      Summarize current work and session state
  start      Start a task or issue and open a session
  status     Show concise project status and relevant next commands
  tui        Deprecated compatibility alias for status
  version    Show the installed AutoForge version
  why        Search decision rationale

Add work:
  autoforge add feature --name <name> --description <text>
  autoforge add phase --feature <feature-id> --name <name> --description <text>
  autoforge add task --phase <phase-id> --name <name> --description <text> --include <pattern> [--include <pattern>] [--exclude <pattern>]
  autoforge add issue --name <name> --description <text> --include <pattern> [--include <pattern>] [--exclude <pattern>]

Decision memory:
  autoforge decide --statement <text> --reasoning <text> --consequence <text> --scope <tag> --keyword <tag> [--consequence <text>] [--scope <tag>] [--keyword <tag>] [--work <work-id>] [--supersedes <decision-id>] [--kind <architecture|bugfix|feature-note>] [--evidence <evidence-id>]
  autoforge why [--query <text>] [--work <work-id>] [--work <work-id>] [--history] [--limit <count>]

Learning and evidence:
  autoforge learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <work-id>]
  autoforge learning hypothesis list [--status <proposed|testing|confirmed|refuted>]
  autoforge learning hypothesis show <id>
  autoforge learning hypothesis status <id> --status <proposed|testing|confirmed|refuted>
  autoforge learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text>
  autoforge learning experiment list [--status <planned|running|completed|abandoned>]
  autoforge learning experiment show <id>
  autoforge learning experiment complete <id>
  autoforge learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <work-id>]
  autoforge learning evidence list [--kind <kind>]
  autoforge learning evidence show <id>

Strategy and prioritization:
  autoforge strategy assess <work-id> --alignment <low|medium|high|uncertain> --value <low|medium|high|uncertain> --risk <low|medium|high|uncertain> --cost <low|medium|high|uncertain> --evidence-strength <low|medium|high|uncertain> --dependency-pressure <low|medium|high|uncertain> --complexity <low|medium|high|uncertain> --release-constraint <low|medium|high|uncertain> --decision <now|next|later|backlog> --rationale <text> [--evidence <evidence-id>] [--supersedes <strategy-id>]
  autoforge strategy list [--decision <now|next|later|backlog>] [--work <work-id>]
  autoforge strategy show <id>
  autoforge strategy history <work-id>

Doctrines:
  autoforge doctrine
  autoforge doctrine <name>

Work lifecycle:
  autoforge status [--json] [--view <summary|work|next>]
  autoforge start <task|issue> <id>
  autoforge recap
  autoforge done [--no-decision "<reason>"]

Agent credentials:
  autoforge credentials set openai
  autoforge credentials status openai
  autoforge credentials delete openai

Context packets:
  autoforge context
  autoforge context --explain

Deprecated TUI compatibility:
  autoforge tui [--snapshot] [--view <view>] [--no-color]
  tui now renders status; interactive experiences move to AutoForge Agent

Legacy migration:
  autoforge migrate --dry-run [--json]
  autoforge migrate [--json]

Guardrails:
  autoforge check [--path <file>] [--agent <id>]
  autoforge check --refresh [--path <file>] [--agent <id>]
  autoforge check --repair [--refresh]
  autoforge check --install --agent <id>

Quality gates:
  autoforge gate check [--path <file>] [--path <file>] [--json]
  autoforge gate check --files <file,file> [--json]

Design context:
  autoforge design validate <file>
  autoforge design import <file>
  autoforge design update <file>
  autoforge design list [--type <screen|component|token|flow|state|responsive>]
  autoforge design search <query>
  autoforge design check [--json]
  autoforge design show <id>

Intent assessment:
  autoforge intent assess <json-file> --kind <implementation|research|architecture|design|planning|data|security> [--artifact <kind>]
  autoforge intent assess --schema
  intent assess also returns deterministic workflow stages and rationale
  autoforge intent register <json-file>
  autoforge research register <json-file>
  autoforge research register --schema
  autoforge knowledge list [--type <intent|research>]
  autoforge knowledge show <id>
  autoforge knowledge extract <file>
  autoforge knowledge context <id>
  autoforge planning list [--source <intent.json>]
  autoforge planning show <kind> [--source <intent.json>]
  autoforge planning handoff <kind> --phase <phase-id> --include <pattern>
  autoforge workflow start <id> <kind>
  autoforge workflow list
  autoforge workflow show <id>
  autoforge workflow advance <id> [--skip-optional]
  autoforge workflow handoff <json-file>
  autoforge workflow handoff --schema
  autoforge orchestrate plan [json-file]
  autoforge orchestrate status
  autoforge orchestrate ready
  autoforge orchestrate claim <work-id> --agent <id> [--role <role>] [--read-only] [--ttl <minutes>]
  autoforge orchestrate handoff <assignment-id> <json-file>
  autoforge orchestrate release <assignment-id>
  autoforge orchestrate approve <gate-id> [--by <actor>]
  autoforge orchestrate prioritize <work-id> <0-100>
  autoforge orchestrate explain <work-id>
  autoforge schemas list
  autoforge schemas show <id>
  autoforge contract generate <agent-id>
  autoforge contract show
  autoforge contract validate
  autoforge projects list [--json]
  autoforge projects list --json
  autoforge projects show <path|project_name> [--json]
  autoforge projects relocate <path|project_name> <new-path> [--planned]
  autoforge projects move <path|project_name> <new-path> [--planned]
  autoforge projects storage <path> [--json]
  autoforge projects global-storage <path> [--json]
  autoforge projects global-export <path> [--json]
  autoforge projects global-import <path> <bundle> [--json]
  autoforge projects archive <path>
  autoforge projects restore <path>
  autoforge projects update <path> [--name <name>] [--alias <alias>] [--lifecycle <state>] [--retention-days <n>]
  autoforge projects register <path>
  autoforge projects prune [--dry-run]
  autoforge attach <path> [--dry-run [--json]]
  autoforge detach <path>
  autoforge use <project-name> <command>
  autoforge agents list
  autoforge assets list templates|doctrines
  autoforge bootstrap inspect|scaffold|status|gates|vision|vision-amend|vision-check <idea>|vision-approve <idea>|discovery-questions <json-file>|discover <json-file>|approve <artifact-id> [--evidence <path|workflow-id>]
  autoforge bootstrap approve <artifact-id> [--evidence <path|workflow-id>]
  autoforge constitution init|list|show <id>|check <objective>
  autoforge domain init|list|show <id>|check
  autoforge changelog compile [--since <git-tag>]
  autoforge update
  trace      Record and inspect traceability links and impact
  evidence   Inspect persisted validation evidence and readiness
  twin       Generate and query the project digital twin
  autoforge update
  autoforge trace add <source> <relationship> <target>
  autoforge trace list
  autoforge trace check
  autoforge trace impact <artifact> [--depth <n>] [--direction <forward|reverse|both>]
  autoforge evidence list [--json]
  autoforge evidence summary [--json]
  autoforge twin generate [--json]
  autoforge twin show [--json]
  autoforge twin query [--type <type>] [--relationship <name>] [--depth <n>] [--limit <n>] [--json]

Options:
  -h, --help       Show this command reference
  --project <path> Resolve project-scoped commands from another repository
  -v, --version    Show the installed AutoForge version
`;
