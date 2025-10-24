# QA Test Matrix – Team Todo App

| ID          | Scenario                              | Type        | Priority | Status |
| ----------- | ------------------------------------- | ----------- | -------- | ------ |
| QA-TODO-001 | Create task with valid data           | Integration | P0       | ☐      |
| QA-TODO-002 | Update task status to completed       | Integration | P1       | ☐      |
| QA-TODO-003 | Filter tasks by assignee              | Integration | P1       | ☐      |
| QA-TODO-004 | Unauthorized user cannot access tasks | Security    | P0       | ☐      |

## Notes

- Update this matrix as features land.
- Tests should run in the directory configured via `codeTargets` in autoforge.config.json (mirrored to ai/code_targets.yaml).
