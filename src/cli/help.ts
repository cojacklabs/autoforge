export const AUTOFORGE_HELP = `AutoForge — AI development context and control plane

Usage:
  autoforge [command]

Commands:
  add        Create a feature, phase, task, or issue
  check      Evaluate work, session, context, and edit guardrails
  context    Generate the active work build packet
  decide     Record or supersede an architectural decision
  design     Validate, import, list, or show design specifications
  doctrine   List doctrines or show doctrine guidance
  doctor     Check AutoForge installation health
  done       Complete active work and close its session
  gate       Run retained quality and security checks
  help       Show this command reference
  init       Initialize AutoForge in the current project
  intent     Assess intent and generate planning artifacts
  research   Register research artifacts
  knowledge  List and show intent and research artifacts
  planning   Inspect generated planning artifacts and freshness
  workflow   Start, inspect, and advance workflow runs
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
  tui        Open the terminal UI or print a view snapshot
  version    Show the installed AutoForge version
  why        Search decision rationale

Add work:
  autoforge add feature --name <name> --description <text>
  autoforge add phase --feature <feature-id> --name <name> --description <text>
  autoforge add task --phase <phase-id> --name <name> --description <text> --include <pattern> [--include <pattern>] [--exclude <pattern>]
  autoforge add issue --name <name> --description <text> --include <pattern> [--include <pattern>] [--exclude <pattern>]

Decision memory:
  autoforge decide --statement <text> --reasoning <text> --consequence <text> --scope <tag> --keyword <tag> [--consequence <text>] [--scope <tag>] [--keyword <tag>] [--work <work-id>] [--supersedes <decision-id>]
  autoforge why [--query <text>] [--work <work-id>] [--work <work-id>] [--history] [--limit <count>]

Doctrines:
  autoforge doctrine
  autoforge doctrine <name>

Work lifecycle:
  autoforge start <task|issue> <id>
  autoforge recap
  autoforge done

Context packets:
  autoforge context
  autoforge context --explain

Terminal UI:
  autoforge tui
  autoforge tui --snapshot [--view <view>] [--no-color]

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
  autoforge intent assess <json-file> --kind <implementation|research|architecture|design|planning> [--artifact <kind>]
  intent assess also returns deterministic workflow stages and rationale
  autoforge intent register <json-file>
  autoforge research register <json-file>
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
  autoforge contract generate <agent-id>
  autoforge contract show
  autoforge contract validate
  autoforge projects list
  autoforge projects list --json
  autoforge projects show <path> [--json]
  autoforge projects storage <path> [--json]
  autoforge projects update <path> [--name <name>] [--alias <alias>] [--lifecycle <state>]
  autoforge projects register <path>
  autoforge projects prune [--dry-run]
  autoforge attach <path>
  autoforge detach <path>
  autoforge use <project-name> <command>
  autoforge agents list
  autoforge assets list templates|doctrines
  autoforge bootstrap inspect|scaffold|status|gates|vision|vision-amend|vision-check <idea>|vision-approve <idea>|discovery-questions <json-file>|discover <json-file>
  autoforge constitution init|list|show <id>|check <objective>
  autoforge domain init|list|show <id>|check
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
