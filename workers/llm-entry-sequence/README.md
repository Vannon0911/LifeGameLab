# LLM Entry Worker Map (Role-Based)

This worker layout is role-driven to accelerate development, not only gate reading.

## Core Roles
1. 01-workflow: Task-Orchestrator
2. 02-entry: Arbiter-Coder (primary coding worker)
3. 03-operating-protocol: Protocol-Enforcer
4. 04-architecture: Architecture-Guardian
5. 05-status: Documentation-Auditor
6. 06-task-entry-matrix: Scope-Router
7. 07-task-gate-index: Quality-Reviewer
8. 08-scope-entries: Domain-Coordinator
9. 09-global-minimum-gates: Gate-Compliance-Checker (mandatory after each task)

## Domain Coding Workers
- 08-scope-entries/01-ui: UI-Coder
- 08-scope-entries/02-sim: SIM-Coder
- 08-scope-entries/03-contracts: Contract-Coder
- 08-scope-entries/04-testing: Test-Engineer
- 08-scope-entries/05-versioning: Versioning-Release

## Workflow Contract
1. Orchestrator slices tasks.
2. Arbiter-Coder and domain coders implement.
3. Documentation-Auditor verifies docs after each task.
4. Gate-Compliance-Checker runs mandatory gate check after each task.
5. Quality-Reviewer + Architecture-Guardian sign off risks.

## Ownership Rule
- Each worker owns only its own folder artifacts.
- Product-code edits are executed by Arbiter-Coder and domain coders only.